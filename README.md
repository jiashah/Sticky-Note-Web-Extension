# StickyTab — Sticky Notes for Every Webpage

Attach persistent sticky notes to any website. Notes survive tab closures and browser restarts so they're always there when you return.

---

## Features

- **Per-URL notes** — each unique page gets its own note storage
- **Multiple notes** — add as many notes as you want per page, navigate via tabs
- **Collapsible** — minimise the note so it doesn't block your view; a small pill stays in the corner
- **Persistent** — notes are saved to Chrome's local storage, no server needed

---

## How to use this extension

1. **Download** the `.zip` file and unzip it then you'll get a folder called `sticky-notes-extension`
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** using the toggle in the top-right corner
4. Click **Load unpacked**
5. Select the `sticky-notes-extension` folder (the one that contains `manifest.json`)
6. Done! Visit any webpage and the sticky note will appear in the top-right corner.

---

## How Storage Works

Notes are saved using `chrome.storage.local`, keyed by `hostname + pathname`.  
Example: visiting `youtube.com/watch?v=abc` saves to key `stickytab_youtube.com/watch`.

No data ever leaves your device. No accounts, no server.

---

![screenshot_1](<SS1.png>)
![screenshot_2](<SS2.png>)
