// background.js
// Polls Gmail for new messages, looks for verification codes, and tells the
// active tab to show a popup offering to fill the code in.

const POLL_ALARM = "poll-gmail";
const POLL_INTERVAL_MINUTES = 1; // 

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(POLL_ALARM, { periodInMinutes: POLL_INTERVAL_MINUTES });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(POLL_ALARM, { periodInMinutes: POLL_INTERVAL_MINUTES });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === POLL_ALARM) {
    pollGmail().catch((e) => console.warn("pollGmail failed:", e));
  }
});

// Messages from popup.html / content scripts
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "SIGN_IN") {
    getAuthToken(true)
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  if (msg.type === "SIGN_OUT") {
    signOut().then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === "POLL_NOW") {
    pollGmail({ force: true })
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  if (msg.type === "GET_STATUS") {
    getAuthToken(false)
      .then((token) => sendResponse({ signedIn: !!token }))
      .catch(() => sendResponse({ signedIn: false }));
    return true;
  }
});

// --- Auth helpers -----------------------------------------------------

function getAuthToken(interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(chrome.runtime.lastError?.message || "No token");
      } else {
        resolve(token);
      }
    });
  });
}

async function signOut() {
  try {
    const token = await getAuthToken(false);
    await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
    chrome.identity.removeCachedAuthToken({ token });
  } catch (e) {
    // not signed in, nothing to do
  }
}

// --- Gmail polling -------------------------------------------------------

async function pollGmail({ force = false } = {}) {
  const token = await getAuthToken(false);

  const { seenIds = [] } = await chrome.storage.local.get("seenIds");
  const seenSet = new Set(seenIds);

  // Look only at recent mail to keep this fast and avoid surfacing old codes.
  const listUrl =
    "https://gmail.googleapis.com/gmail/v1/users/me/messages" +
    "?maxResults=10&q=" +
    encodeURIComponent("newer_than:1d");

  const listResp = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!listResp.ok) throw new Error(`Gmail list failed: ${listResp.status}`);
  const listData = await listResp.json();

  if (!listData.messages || listData.messages.length === 0) {
    return { found: false };
  }

  for (const { id } of listData.messages) {
    if (seenSet.has(id) && !force) continue;

    const msgResp = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!msgResp.ok) continue;
    const msg = await msgResp.json();

    seenSet.add(id);

    const text = getMessageText(msg);
    const code = extractCode(text);

    if (code) {
      await chrome.storage.local.set({ seenIds: trimSeen(seenSet) });
      await notifyActiveTab(code, getHeader(msg, "Subject"), getHeader(msg, "From"));
      return { found: true, code };
    }
  }

  await chrome.storage.local.set({ seenIds: trimSeen(seenSet) });
  return { found: false };
}

function trimSeen(seenSet) {
  const arr = Array.from(seenSet);
  return arr.slice(-300); // keep the list from growing forever
}

function getHeader(msg, name) {
  const headers = msg.payload?.headers || [];
  const h = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : "";
}

// Recursively pull text out of a Gmail message payload (handles multipart).
function getMessageText(msg) {
  let text = msg.snippet ? msg.snippet + " " : "";

  function decodeBase64Url(data) {
    try {
      const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = atob(normalized);
      // Strip simple HTML tags so regexes don't get confused by markup.
      return decoded.replace(/<[^>]+>/g, " ");
    } catch {
      return "";
    }
  }

  function walk(part) {
    if (!part) return;
    if (part.body?.data) {
      text += " " + decodeBase64Url(part.body.data);
    }
    if (part.parts) part.parts.forEach(walk);
  }

  walk(msg.payload);
  return text;
}

// Heuristic extraction of a verification / one-time code from email text.
function extractCode(text) {
  const cleaned = text.replace(/\s+/g, " ");

  // 1) "your verification code is 123456", "security code: 482910", etc.
  const keywordCodePattern =
    /(verification|security|confirmation|authentication|access|login|sign[- ]?in|one[- ]?time|otp|2fa|two[- ]?factor|passcode)[^\d]{0,30}\b(\d[\d -]{3,8}\d)\b/i;
  let match = cleaned.match(keywordCodePattern);
  if (match) return normalizeCode(match[2]);

  // 2) "code: 123456" / "code is 123456"
  match = cleaned.match(/\bcode\b[^\d]{0,10}\b(\d[\d -]{3,8}\d)\b/i);
  if (match) return normalizeCode(match[1]);

  // 3) Fallback: a standalone 6-digit number (common OTP length).
  match = cleaned.match(/\b\d{6}\b/);
  if (match) return match[0];

  // 4) Fallback: a standalone 4-8 digit number near "PIN".
  match = cleaned.match(/\bPIN\b[^\d]{0,10}\b(\d{4,8})\b/i);
  if (match) return match[1];

  return null;
}

function normalizeCode(raw) {
  return raw.replace(/[\s-]/g, "");
}

async function notifyActiveTab(code, subject, from) {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab || !tab.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "SHOW_CODE_POPUP",
      code,
      subject,
      from,
    });
  } catch {
    // content script may not be injected on this page (e.g. chrome:// pages)
  }
}
