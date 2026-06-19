# Code Crabber
# A Chrome Extension that finds the verification code in your inbox and offers to fill it in
## Overview
Email Code Autofill watches your Gmail inbox for recent verification codes such as 2FA or OTP emails. When it finds one, a small card pops up in the bottom right corner with the code and a Use this code button. Nothing is filled in automatically until you click it.
## How to Install this Extension
This extension is shared as a .crx file rather than through the Chrome Web Store, so it needs to be loaded manually.
1. Save the .crx file somewhere you can find it, like your Downloads folder.
2. Open Chrome and go to chrome://extensions.
3. Turn on Developer mode using the toggle in the top right corner.
4. Drag the .crx file from your folder and drop it onto the extensions page.
5. Click Add extension when the prompt appears.

If Chrome blocks the drag and drop install or shows a corrupted file warning, use this fallback instead:
1. Rename the .crx file to end in .zip, then extract it into its own folder.
2. Go to chrome://extensions with Developer mode still on.
3. Click Load unpacked and select that extracted folder.
## How to Use this App
1. Click the extension's toolbar icon.
2. Click Connect Gmail and sign in to grant access.
3. That's it. It checks for new codes about once a minute, or you can click Check for a code now any time.
