// content.js
// Shows a small floating card when the background script finds a
// verification code, with "Use this code" / "Not that code" buttons.

let lastTextInput = null;

document.addEventListener(
  "focusin",
  (e) => {
    const el = e.target;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
      lastTextInput = el;
    }
  },
  true
);

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SHOW_CODE_POPUP") {
    showCodePopup(msg.code, msg.subject, msg.from);
  }
});

function showCodePopup(code, subject, from) {
  removeExistingPopup();

  const root = document.createElement("div");
  root.id = "eca-root";

  root.innerHTML = `
    <div class="eca-card" role="dialog" aria-label="Verification code found">
      <button class="eca-close" aria-label="Dismiss">&times;</button>
      <div class="eca-header">
        <span class="eca-icon">✉️</span>
        <span>Verification code found</span>
      </div>
      ${
        subject
          ? `<div class="eca-meta">${escapeHtml(truncate(subject, 60))}</div>`
          : ""
      }
      ${from ? `<div class="eca-meta eca-from">${escapeHtml(truncate(from, 60))}</div>` : ""}
      <div class="eca-code">${escapeHtml(code)}</div>
      <div class="eca-buttons">
        <button class="eca-btn eca-btn-primary" id="eca-yes">Use this code</button>
        <button class="eca-btn eca-btn-secondary" id="eca-no">Not that code</button>
      </div>
    </div>
  `;

  document.documentElement.appendChild(root);

  root.querySelector("#eca-yes").addEventListener("click", () => {
    fillCode(code);
    root.remove();
  });

  root.querySelector("#eca-no").addEventListener("click", () => {
    root.remove();
  });

  root.querySelector(".eca-close").addEventListener("click", () => {
    root.remove();
  });

  // Auto-dismiss after 30s so it doesn't linger forever.
  setTimeout(() => {
    if (document.documentElement.contains(root)) root.remove();
  }, 30000);
}

function removeExistingPopup() {
  const existing = document.getElementById("eca-root");
  if (existing) existing.remove();
}

function fillCode(code) {
  let target = lastTextInput;

  // If the previously-focused field is gone or not text-like, try to find
  // a likely OTP input on the page.
  if (!target || !document.contains(target) || !isFillable(target)) {
    target = findLikelyOtpField();
  }

  if (!target) {
    // Last resort: copy to clipboard so the user can paste manually.
    navigator.clipboard?.writeText(code).catch(() => {});
    return;
  }

  target.focus();
  setNativeValue(target, code);
  target.dispatchEvent(new Event("input", { bubbles: true }));
  target.dispatchEvent(new Event("change", { bubbles: true }));
}

function isFillable(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag !== "INPUT" && tag !== "TEXTAREA") return false;
  if (el.disabled || el.readOnly) return false;
  const type = (el.getAttribute("type") || "text").toLowerCase();
  return ["text", "tel", "number", "search", "password"].includes(type);
}

function findLikelyOtpField() {
  const selectors = [
    'input[autocomplete="one-time-code"]',
    'input[name*="otp" i]',
    'input[id*="otp" i]',
    'input[name*="code" i]',
    'input[id*="code" i]',
    'input[placeholder*="code" i]',
    'input[type="tel"]',
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && isFillable(el)) return el;
  }
  return null;
}

// React and some frameworks track input values via a setter on the
// prototype; using this ensures their state updates correctly.
function setNativeValue(element, value) {
  const proto = element.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
  if (descriptor && descriptor.set) {
    descriptor.set.call(element, value);
  } else {
    element.value = value;
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}
