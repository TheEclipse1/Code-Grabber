// popup.js
const statusEl = document.getElementById("status");

function setStatus(text) {
  statusEl.textContent = text;
}

document.getElementById("connect").addEventListener("click", () => {
  setStatus("Connecting...");
  chrome.runtime.sendMessage({ type: "SIGN_IN" }, (resp) => {
    if (resp?.ok) {
      setStatus("Connected");
    } else {
      setStatus("Could not connect: " + (resp?.error || "unknown error"));
    }
  });
});

document.getElementById("check-now").addEventListener("click", () => {
  setStatus("Checking your inbox...");
  chrome.runtime.sendMessage({ type: "POLL_NOW" }, (resp) => {
    if (!resp?.ok) {
      setStatus("Error: " + (resp?.error || "unknown error"));
    } else if (resp.found) {
      setStatus("Found a code! Check the page for the popup.");
    } else {
      setStatus("No new verification codes found.");
    }
  });
});

document.getElementById("disconnect").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "SIGN_OUT" }, () => {
    setStatus("Disconnected.");
  });
});

chrome.runtime.sendMessage({ type: "GET_STATUS" }, (resp) => {
  setStatus(resp?.signedIn ? "Connected." : "Not connected yet.");
});
