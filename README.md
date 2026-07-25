# Lane 1 — pool gate entry verification

A small installable web app with one public landing page and a PIN-gated gate app behind it.

## How it's structured now

- **`index.html`** — the whole app: public landing page + the gate app (Scan / Members / Today / Settings), gated by a PIN.
- **`config.js`** — the only file anyone should need to edit: the Google Sheet link, column names, the gate PIN, and the landing page copy (pool name, timings, contact). No sheet URL or column mapping is entered in the browser anymore — it's all here, on purpose, so a stranger who gets to the PIN screen can't also point the app at a different sheet.
- **`sw.js`** — offline app-shell cache. `index.html` and `config.js` are always fetched fresh over the network first (so a fix I ship shows up immediately); icons/manifest are cached for speed.
- **`manifest.webmanifest` + `icons/`** — what makes it installable as a home-screen app.

## What the public sees vs. what's gated

- **Anyone with the link** sees a landing page: pool name, timings, contact, a note on renewing — no member data, no functionality. A **Staff Login** button is the only way in further.
- **Staff Login** asks for the 4-digit gate PIN (`CONFIG.PIN` in `config.js`) — shared only with the coach and gatekeeper. Once entered correctly, that **device** stays unlocked (until someone deliberately locks it again from Settings) — no re-entering it every morning.
- Behind the PIN: **Scan** (the gate screen), **Members**, **Today** (the log), and **Settings** (sync status + "Lock this device").

This is a deterrent, not encryption — anyone who views page source can read the PIN. Its job is to stop a casual visitor who finds the link from opening member phone numbers or the scanner, not to resist a determined attacker.

## Does the Google Sheet stay in sync?

Yes. Once unlocked, the app re-reads the sheet **every 60 seconds**, whenever the window regains focus, and on **Sync now** in Settings.

It also **retries on a miss**: if a scanned card isn't found, the app re-pulls the sheet immediately and checks again *before* showing NOT REGISTERED. Someone who registered five minutes ago can walk straight to the gate.

## Setup — what needs to be in `config.js`

```js
SHEET_URL: '...'          // the sheet's normal Share link
COLUMNS: { roll, name, paymentDate, amount, category, end, phone, status, gender }
PLANS:   { 'category': { amount: months } }   // the fee table — see below
GRACE_DAYS: 0              // extra days allowed after expiry (0 = enforce to the day)
PIN: '1234'                // shared with coach + gatekeeper only
SITE: { poolName, tagline, location, timings, contact, renewNote }  // public landing page copy
```

The sheet must be shared as **Anyone with the link → Viewer**. Column names are matched case- and space-insensitively; if one is left blank or turns out wrong, the app falls back to guessing the roll-number column by data shape (`ms24btech11021`-style patterns) and other columns by common header names — so a typo doesn't silently break scanning.

## How expiry is worked out

The sheet records **payments**, not expiry dates: who paid, when, how much, what category. The app derives the rest.

- **Plan length** comes from `PLANS`, keyed by category then the exact amount paid. ₹500 as a student = 1 month; ₹200 guest = a single-day pass. An amount that matches no tier gives **NO END DATE — check manually**, never a guess: guessing either locks out someone who paid or lets someone in free.
- **Expiry is a date, not a month.** Paid ₹500 on 10 June ⇒ valid 10 June through 9 July. On 10 July they're expired, not "expired at the end of July". `GRACE_DAYS` buys back a few days if the pool prefers to be lenient — those show as an amber **IN GRACE** card, never a green one.
- **Renewals chain.** One person is many rows, one per payment. Rows are sorted by payment date and each period starts either on its payment date or the day after the previous one ended, whichever is later — so renewing early *adds* time instead of throwing away days already paid for, and renewing after a lapse simply starts fresh. Row order in the sheet doesn't matter. Guest day-passes never chain.
- **An explicit expiry column wins.** If the sheet ever grows one (map it to `end`), a value there overrides the whole calculation for that row — the hand-override hatch. A month-only value there ("August 2026") means the *last* day of that month.

A member's profile shows their full payment history and what each payment bought, so a disputed expiry can be traced.

`node tests/expiry.test.js` runs 57 assertions over all of the above — date formats, tiers, renewal chains, grace, overrides. Run it after touching any of that logic.

## Daily use (gatekeeper)

Once the device is unlocked, it opens straight to **Scan** — no landing page, no PIN, every time after the first.

| Verdict | Meaning |
|---|---|
| ✔ **PAID** (green) | Valid subscription, entry logged |
| ! **EXPIRES IN N DAYS** / **LAST DAY** (amber) | Valid, but ≤7 days left — remind them to renew |
| ! **GRACE PERIOD** (amber) | Expired, but inside `GRACE_DAYS` — let in, must renew |
| ! **2ND ENTRY TODAY** (amber) | Already came in today — shows the earlier time. Guard decides. |
| ! **NO END DATE** (amber) | Can't work out an expiry from their row — check manually |
| ✕ **EXPIRED** (red) | Plan ended, shows the date and how many days over — send to office |
| ✕ **NOT ACTIVE** (red) | Status column says inactive/cancelled |
| ✕ **NOT REGISTERED** (red) | Card not in the sheet |

Each verdict has its own sound, so the guard doesn't need to watch the screen. If the scanner fails, type the roll number and press Enter — same result. Typing a **name** also works.

## Member profiles

Click any row in **Members** or **Today's log**:
- Valid-through date and days left, plus the full payment history behind it
- Total sessions, this month, last 30 days, average per week, days since last visit, week streak
- **6-month attendance calendar** — green = came, cyan = scanned twice, dark blue = subscribed but didn't come
- One-click WhatsApp renewal message, pre-written

A "session" is one *day* with a valid scan. Second scans the same day are logged as REPEAT and never double-counted.

## Installing on the gatekeeper's device

Needs to be **hosted** (a real URL), not opened as a local file — that's what makes "Add to Home Screen" work and lets updates reach the device automatically.

- **Android (Chrome):** banner "Add Lane 1 to Home screen", or ⋮ → **Install app**
- **iPhone/iPad (Safari):** Share → **Add to Home Screen**
- **Windows/Mac (Chrome):** install icon (⊕) in the address bar

## Notes

- The sheet is read-only. The app never writes to it.
- Entry logs and attendance history are stored **in that device's browser**. Download the CSV from **Today** before clearing, and don't use the browser's "clear site data".
- `Status` column values that block entry: inactive, cancelled, stopped, suspended, left, no, expired.
- Dates: `dd/mm/yyyy`, `yyyy-mm-dd` and `31 Aug 2026` all work. Ambiguous ones like `1-9-2026` are read as **dd/mm**.

## Not built yet

- Writing entry logs back to the Google Sheet (needs Apps Script) — attendance history currently lives only in each device's browser storage, not shared across devices
- Automatic WhatsApp renewal reminders (currently one-click, manual, from a member's profile)
- Multi-device shared history (each installed device has its own independent log)
