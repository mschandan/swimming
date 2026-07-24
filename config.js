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
     if that column doesn't exist — the app falls back to guessing by
     data shape/common header names, but exact names are safer.

     IITH's actual sheet has no expiry column at all — just who paid,
     when, how much, and their category. The app COMPUTES the expiry
     date itself: paymentDate + (plan length looked up from PLANS below,
     keyed by category + exact amount paid). If a column mapped to
     'end' exists and has a value for a given row, that value always
     wins — lets you override any individual member by hand without
     touching the fee-table logic. */
  COLUMNS: {
    roll:        'id',
    name:        'NAME',
    paymentDate: 'DATE',
    amount:      'AMOUNT',
    category:    'CATEGORY',
    end:         '',   // optional — an explicit expiry column, if you ever add one, overrides the computed value
    start:       '',   // optional, unused by default
    phone:       '',   // optional — only used for the WhatsApp renewal button
    status:      '',   // optional — e.g. 'Status'; values like inactive/cancelled block entry
    gender:      '',   // optional — e.g. 'Gender'
  },

  /* ---- Fee table (IITH Dept. of Sports, effective 1 Sep 2025) ----
     category (lowercase, must match the sheet's CATEGORY column
     case-insensitively) -> { amount paid : months of access }.
     0 months = single-day guest pass, valid only on the day paid.
     An amount not listed here for that category means the app can't
     determine the plan — it'll show "NO END DATE — check manually"
     rather than guess. Add missing tiers here as they come up. */
  PLANS: {
    'student of iith':                                    {500:1, 1200:3, 2000:6, 3500:12},
    'faculty/guest faculty/staff/project staff of iith':  {800:1, 2000:3, 3500:6, 6000:12},
    'retired iith employee':                              {1000:1, 2500:3, 4000:6},
    'alumni of iith':                                     {2000:1},
    'interns':                                             {2500:1},
    // real sheets don't record the below-5/above-5 age split — both price
    // points fall under one category text, and the amount alone tells you
    // which bracket (2500 = below 5yrs, 5000 = above 5yrs), both 1 month
    'relatives/guest of iith employee':                    {2500:1, 5000:1},
    'dav/bank/post office staff':                          {5000:1},
    'guest per slot':                                      {200:0},
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
