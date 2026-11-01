# Reading Habit

A personal reading tracker for Android. *Book first, video after.*

The whole app is one file, `index.html`, with all HTML, CSS and JavaScript inline. It makes no network requests, has no accounts, and keeps all data in your phone's browser storage (localStorage).

## Why it isn't just a file on the phone

Opening a local HTML file in Chrome on Android doesn't reliably keep data:

- Opening it from the Files app or Downloads gives Chrome a `content://` link. Those pages have no stable storage, so your data can disappear when the tab closes.
- Typing `file:///sdcard/...` is often blocked on Android 11+ with `ERR_ACCESS_DENIED`.

So the same file is published as a static page on **GitHub Pages** (free) and installed to your home screen. After the first visit it runs fully offline. GitHub only serves the file; your reading data never leaves the phone.

The other files in this folder exist only to make the install and offline mode work:

| File | Purpose |
|---|---|
| `index.html` | The whole app |
| `sw.js` | Tiny service worker that caches the app so it opens offline |
| `manifest.webmanifest`, `icon-*.png` | Let Chrome install it as an app with an icon |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are |

## One-time setup (about 5 minutes)

1. **Get the files onto `main`.** Merge the branch `claude/reading-habit-app-az890s` into `main` (open a pull request on GitHub and merge it).
2. **Turn on GitHub Pages.** On GitHub go to the repository **Settings → Pages**. Under *Build and deployment* choose **Deploy from a branch**, then branch **`main`** and folder **`/docs`**, and press **Save**.
3. Wait a minute or two. The app will be at:
   **https://pubudu20.github.io/pubudu20/**

> The repository must be public for free GitHub Pages. Anyone with the link could open the *empty* app, but nobody can see your data. It lives only on your phone.

## Install it on your Android phone

1. Open **https://pubudu20.github.io/pubudu20/** in **Chrome**.
2. Tap the **⋮** menu → **Add to Home screen** (or **Install app**) → **Install**.
3. From now on, open **Reading Habit** from your home screen. It opens full-screen and works with no internet.

Tip: long-press the icon for a **Start reading** shortcut that jumps straight into the timer. Put the icon where YouTube used to be.

## Backups (important)

Browser storage can still be wiped, for example by *Clear browsing data*, by uninstalling Chrome, or when you change phones. So:

- **Settings → Export JSON** saves a backup file to Downloads. **Share backup** sends it straight to Google Drive, email and so on.
- **Settings → Import JSON** restores from a backup file.
- The Today screen reminds you if you haven't exported in 7 days.

Always use the installed app rather than a normal Chrome tab. They share the same storage, but the installed app is less likely to have its storage cleared.

## Updating the app later

If `index.html` changes on `main`, the installed app picks up the new version in the background. Close and reopen it once or twice to see it. Your data is not affected.

## Running it without GitHub Pages (not recommended)

You *can* copy `index.html` to the phone and open it in Chrome, but storage may not survive (see above). If you do, export after every session.

## What's inside

- **Today:** ramp-up week and target, Daily Laws checkbox, current deep and practical books, reading timer (vibrates at the target), audio log, the *Bored?* helper, streak and *never miss twice*, the YouTube reward, and the Sunday review prompt.
- **Plan:** the 7 phases with progress, next-up suggestions, and reorder / move to phase / swap.
- **Library:** search and filters, book details and notes, sessions, and the *Finish* form (3 key ideas + 1 action).
- **Stats:** heatmap, streaks, minutes per week (paper and audio), books per month, yearly totals and past weekly reviews.
- **Settings:** start date, editable ramp-up targets, export / import, and reset.
