# Quick Share
Quick Share allows you to copy the current tab's title and URL to the clipboard.

## Technical notes
The extension now ships a single Manifest V3 configuration (`src/manifest.json`) that works across Chrome and Firefox. The background definition provides both a service worker (used by Chromium-based browsers) and a traditional background script fallback for Firefox, where MV3 service workers remain disabled. The runtime logic relies on `chrome.scripting.executeScript` when the API exists (Chrome/Edge) and automatically falls back to `tabs.executeScript` for browsers that are still catching up (Firefox). This keeps the code path unified while continuing to support the keyboard shortcut workflow defined in the `commands` section.
