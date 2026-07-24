/* =====================================================================
   LANE 1 — CONFIG
   The only file that should need editing day to day. Everything here is
   plain values — change something, redeploy, done. No UI in the app
   exposes these anymore; they're baked in on purpose so a stranger who
   finds the gate PIN screen can't also rewrite where the data comes from.
   ===================================================================== */
const CONFIG = {

  /* ---- Google Sheet (source of truth for members) ----
     Paste the normal "Share" link, e.g.
     https://docs.google.com/spreadsheets/d/1AbCdEf.../edit#gid=0
     The sheet must be shared as "Anyone with the link — Viewer". */
  SHEET_URL: '',   // ← waiting on Chandan's sheet link

  /* ---- Column mapping ----
     Exact column header text from row 1 of the sheet. Leave a field ''
     if that column doesn't exist. If ROLL or END is wrong/missing the
     app will fall back to guessing by data shape, but exact names are
     safer once you know them.

     'end' does NOT need an exact date — the sheet only has to say the
     MONTH a subscription ends (e.g. "July", "Aug 2026", "2026-09", or
     a full date if you ever have one). The app computes everything
     else itself: expired / expiring-this-month / active, months left,
     sorting — all done live from just that one month value. */
  COLUMNS: {
    roll:     '',   // e.g. 'Roll No'
    name:     '',   // e.g. 'Name'
    end:      '',   // e.g. 'Subscription Ending Month'
    start:    '',   // optional, not required
    phone:    '',   // optional — only used for the WhatsApp renewal button
    status:   '',   // e.g. 'Status'
    category: '',   // e.g. 'Category' — NSO / Inter-IIT / Training / Beginner / Usual / Professional...
    gender:   '',   // e.g. 'Gender' — Male / Female
  },

  /* ---- Gate PIN ----
     Shared secret for the coach + gatekeeper. This is a deterrent, not
     encryption — anyone who views page source can read it. Its job is
     to stop a casual visitor who finds the link from opening member
     data or the scanner, not to resist a determined attacker.
     4 digits, shown on the lock screen as ● ● ● ●. */
  PIN: '2026',

  /* ---- Public landing page copy ----
     Shown to anyone who opens the link, no PIN needed. Edit freely. */
  SITE: {
    poolName:   'Lane 1 Aquatics',
    tagline:    'Monthly swim membership — gate entry verified at scan-in.',
    location:   '',                 // e.g. 'IIT Hyderabad Swimming Pool'
    timings:    '',                 // e.g. 'Mon–Sat · 6:00–8:00 AM & 5:00–7:00 PM'
    contact:    '',                 // e.g. '+91 90000 00000 · pool@iith.ac.in'
    renewNote:  'To join or renew your subscription, contact the pool office.',
  },
};
