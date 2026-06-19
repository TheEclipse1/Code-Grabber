# Email Code Autofill (Chrome Extension)

Watches your Gmail inbox for recent verification codes (2FA / OTP emails)
and shows a small popup on the page you're on, letting you choose whether
to fill that code in.

**How it works**
- A background service worker checks your Gmail inbox roughly once a
  minute (and on demand from the toolbar button) for messages from the
  last day.
- It scans the message text for things like "your verification code is
  123456" or a standalone 6-digit number.
- If it finds one, it sends it to the tab you're currently looking at.
- A small card appears in the bottom-right corner with the code and two
  buttons: **Use this code** (fills the focused/most-likely input field
  and dispatches the right events for React/Vue/etc.) and **Not that
  code** (dismisses it).
- Nothing is filled in automatically without you clicking "Use this code".

---

## 1. Connect your Gmail

1. Click the extension's toolbar icon.
2. Click **Connect Gmail** and sign in / grant access.
3. That's it — it'll check for new codes about once a minute, or click
   **Check for a code now** any time.


