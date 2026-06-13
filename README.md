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

## 1. Create a Google Cloud OAuth client (required)

Gmail access requires an OAuth client ID tied to *your* Google Cloud
project — you can't reuse someone else's.

1. Go to https://console.cloud.google.com/ and create a new project (or
   use an existing one).
2. Enable the **Gmail API**: APIs & Services → Library → search "Gmail
   API" → Enable.
3. Configure the **OAuth consent screen**:
   - User type: External (or Internal if you're on Google Workspace and
     only need it for yourself).
   - Add the scope `https://www.googleapis.com/auth/gmail.readonly`.
   - Add your Gmail address as a **test user** (this lets you use it
     immediately without Google's full app-verification review, as long
     as you're a test user).
4. Load the extension in Chrome first (see step 2) so you have its
   Extension ID, then come back here.
5. Create credentials: APIs & Services → Credentials → Create Credentials
   → OAuth client ID → Application type **Chrome Extension** → paste in
   your Extension ID.
6. Copy the generated Client ID.

## 2. Load the extension

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select this folder.
4. Note the **Extension ID** shown on the card — you'll need it for step
   1.5 above.
5. Open `manifest.json` and replace:
   ```json
   "client_id": "YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com"
   ```
   with the Client ID from step 1.6.
6. Reload the extension (the refresh icon on its card in
   `chrome://extensions`).

## 3. Connect your account

1. Click the extension's toolbar icon.
2. Click **Connect Gmail** and sign in / grant access.
3. That's it — it'll check for new codes about once a minute, or click
   **Check for a code now** any time.

---

## Notes & limitations

- **Read-only access**: the extension only requests
  `gmail.readonly`, so it can read messages but can't send, delete, or
  modify anything.
- **Heuristic matching**: code detection is regex-based (looks for
  phrases like "verification code", "security code", "OTP", "passcode",
  or a standalone 6-digit number). It can occasionally miss unusual
  formats or pick up an unrelated number — that's exactly why the popup
  asks before filling anything in.
- **Where it fills**: it tries the input field you last focused on; if
  that's gone, it looks for a likely OTP field (`autocomplete="one-time-code"`,
  fields with "code"/"otp" in their name, etc.). If nothing is found, it
  copies the code to your clipboard instead.
- **Polling, not push**: this checks Gmail every ~1 minute rather than
  using real-time push notifications, which would require a small backend
  with Google Pub/Sub. That's a reasonable next step if you want
  near-instant detection.
- **Privacy**: the OAuth token is stored by Chrome's identity API, not by
  this extension's code, and all requests go directly from your browser to
  Google's API — no third-party server is involved.

## Possible improvements

- Filter by sender/subject keywords you trust (e.g. only look at emails
  from senders containing "noreply").
- Mark messages as read once a code has been used.
- Support multiple codes found in one poll (currently shows the first
  one found).
- Use Gmail push notifications (Pub/Sub) instead of polling for
  near-instant alerts.
