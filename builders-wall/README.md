# The Builder's Wall

> **I am a Calm and Disciplined Builder**

A gamified habit tracker for Android. You earn XP, levels, streaks, quests, badges and coins, and every day of the challenge (3 Nov 2026 → 28 Feb 2027, 118 days) is a brick in your wall.

- No accounts, no server, no internet. **All data stays on your phone.**
- Installs from an APK file that GitHub builds for you. No Play Store or computer needed.

---

## 1. One-time setup: add 4 secrets (phone browser, ~5 minutes)

These secrets let GitHub sign the app with **your** key. Android only lets a new version install over the old one if both were signed with the same key.

1. In Chrome, open **github.com/pubudu20/pubudu20** and sign in.
2. Tap **Settings** in the repo's top tab bar. On a small screen you may need to scroll the tab bar sideways. If you still can't see it, open Chrome's **⋮** menu and tick **Desktop site**.
3. In the left menu, go to **Secrets and variables → Actions**.
4. Tap **New repository secret**. Add each of these four secrets (the name exactly as written; values were given to you separately in the Claude chat):

   | Name | Value |
   |---|---|
   | `ANDROID_KEYSTORE_BASE64` | the long text (one line, about 3,600 characters) |
   | `ANDROID_KEYSTORE_PASSWORD` | the password |
   | `ANDROID_KEY_ALIAS` | `builderswall` |
   | `ANDROID_KEY_PASSWORD` | the same password again |

5. **Save the password and the keystore text somewhere safe**, for example a password manager or a private note in Google Drive. If you lose them, future updates can't install over the old app. You'd have to uninstall, which deletes your data unless you restore a backup.

## 2. Get a build

Every push to the `main` branch builds the app automatically. It takes about 15–25 minutes.

- To watch it, go to the repo → **Actions** tab → **Build Android APK**. A green tick means it worked.
- To run it by hand, open the **Actions** tab → **Build Android APK** → **Run workflow**.

## 3. Install on your phone

1. Open **github.com/pubudu20/pubudu20/releases/latest** in Chrome.
2. Under **Assets**, tap **builders-wall-v1.0.X.apk** to download it.
3. When the download finishes, tap **Open**.
4. The first time, Android says Chrome isn't allowed to install apps. Tap **Settings**, switch on **Allow from this source**, then go back.
5. Tap **Install**. If Play Protect warns you about an unknown app, tap **More details → Install anyway**. This warning is normal for apps that don't come from the Play Store.
6. Open **Builder's Wall** and allow notifications when it asks.

### Add the home-screen widget
Go to **Settings (⚙) → Home-screen widget → Add widget**. You can also long-press an empty spot on your home screen → **Widgets** → **Builder's Wall**. Tap a habit on the widget to tick or untick it.

### Make reminders reliable
Some phones (Samsung, Xiaomi, Oppo, vivo…) put apps to sleep and drop their reminders. To stop that, go to Android **Settings → Apps → Builder's Wall → Battery** and choose **Unrestricted** (on some phones it's called "No restrictions").

## 4. Update later

When there's a new version, download the newer APK from **Releases** and install it over the old one. Tap **Update**. **Don't uninstall first**: your data stays as long as you install over the top.

## 5. Back up your data

Go to **Settings → Backup → Export backup**. The share sheet opens, so you can send the JSON file to **Google Drive**, **WhatsApp** (to yourself) or email. If you haven't exported in 7 days, the app reminds you.

To restore, go to **Settings → Backup → Restore from backup**, pick the file, and confirm. This replaces everything in the app.

---

## How the game works

| Thing | Rule |
|---|---|
| **Your day** | Ends at **3 am**, not midnight. Anything you tick before 3 am counts for the previous day. |
| **Day X of 118** | Day 1 = 3 Nov 2026, Day 118 = 28 Feb 2027. When it ends, start a new cycle in Settings. All your history is kept. |
| **XP** | Each habit's XP when ticked. **+50** for a perfect day (every habit scheduled that day is done). **+5 extra** per habit once its streak is 7+ days. Quests give their XP per step. XP is recalculated from history, so unticking removes it. |
| **Levels** | Apprentice 0 → Bricklayer 400 → Mason 1,000 → Foreman 1,800 → Site Engineer 2,900 → Builder 4,300 → Systems Builder 6,000 → Architect 8,200 → Strategic Architect 11,000 → Calm & Disciplined Builder 14,500 |
| **Streaks** | Days in a row a habit was done. Days the habit isn't scheduled don't break it. Today doesn't break it until the day is over. |
| **Don't miss twice** | If you missed a habit last time and haven't done it today, you get a red warning. |
| **Freeze tokens 🧊** | You earn 1 for every Mon–Sun week with 5+ perfect days, and can hold up to 3. Spend one on a missed habit to protect its streak. A freeze doesn't count toward goals or XP. |
| **Spare days ("lives")** | Each 100-day goal has 118 − 100 = **18** misses allowed. Every missed day uses one. The counter turns red at 5 or fewer. |
| **Coins 🪙** | 1 per habit tick, 10 per perfect day, 20 per quest step. Spend them in the Shop. |

## Notifications

All notifications are local, and you can switch each one on or off and change its time in **Settings**:

- A reminder at each habit's time, for example "3 pm · Apex (1 hour) time · +25 XP waiting". You won't get it if the habit is already ticked.
- A morning briefing (8 am): the day number, your streaks and today's vision statement.
- A "Don't miss twice" check (11:15 pm) listing the habits you haven't done yet.
- A weekly review (Sunday 11 am): perfect days, XP gained and spare days left.

Behind the scenes, the app plans the next 7 days of notifications and re-plans whenever you tick something, change settings, or open the app. If you don't open the app or widget for over a week, reminders pause until you do.

---

## For developers (or Claude)

You never need to run these commands; they're notes for whoever maintains the code.

```
builders-wall/
  App.tsx               navigation, fonts, celebration overlay
  index.ts              registers the app and the widget task handler
  app.config.ts         Expo config (package name, permissions, widget, plugins)
  plugins/withReleaseSigning.js   signs release builds from env vars
  src/core/             pure game logic: dates (3 am cut-off), engine (XP/streaks/freezes/goals),
                        levels, badges, stats, notification plan, backup format, defaults + seed
  src/core/__tests__/   unit tests
  src/data/             SQLite schema + migrations (db.ts), queries (repo.ts), backup files
  src/notifications/    expo-notifications scheduling
  src/widget/           home-screen widget layout + tap handler
  src/state/            React store, widget/notification sync
  src/screens/          Today, Wall, Goals, Shop, Stats, Settings, Day
  src/ui/               theme, components, feedback (haptics, confetti, toasts)
```

- `npm test`: unit tests (run in Asia/Colombo time)
- `npx tsc --noEmit`: type check
- `npx expo prebuild --platform android`: generates `android/` (not committed; CI generates it every build)

**Data model.** Every SQLite row has a `profile_id`, so a second profile can be added later. The schema version is stored in `PRAGMA user_version`. To change the schema, append a migration to `MIGRATIONS` in `src/data/db.ts`.

**Fonts.** Big Shoulders Display, Inter and JetBrains Mono are bundled from `assets/fonts` under the SIL Open Font License.
