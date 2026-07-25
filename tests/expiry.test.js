/* Loads the real index.html script into a stub DOM and exercises the
   expiry/renewal engine. Run: node test.js */
const fs = require('fs'), vm = require('vm'), path = require('path');
const SRC = path.join(__dirname, '..');

const html = fs.readFileSync(path.join(SRC,'index.html'),'utf8');
const appJs = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const configJs = fs.readFileSync(path.join(SRC,'config.js'),'utf8');

/* --- pin "today" to 25 July 2026 so results are stable --- */
const REAL_DATE = Date;
const NOW = new REAL_DATE(2026,6,25,10,0,0);
class FakeDate extends REAL_DATE {
  constructor(...a){ if(a.length===0) super(NOW.getTime()); else super(...a); }
  static now(){ return NOW.getTime(); }
}

const el = new Proxy({}, { get:(t,p)=> {
  if(p==='classList') return {add(){},remove(){},toggle(){},contains(){return false}};
  if(p==='style') return {};
  if(p==='forEach') return ()=>{};
  if(p==='value') return '';
  return typeof p==='string' ? (t[p]!==undefined?t[p]:'') : undefined;
}, set:()=>true });

const store = {};
const ctx = {
  Date: FakeDate,
  console, setTimeout, clearTimeout, setInterval:()=>0,
  localStorage:{ getItem:k=>store[k]||null, setItem:(k,v)=>store[k]=v, removeItem:k=>delete store[k] },
  navigator:{}, location:{protocol:'file:'},
  window:{ addEventListener(){} },
  fetch:()=>Promise.reject(new Error('no network in tests')),
  document:{
    getElementById:()=>el,
    querySelectorAll:()=>[],
    addEventListener(){},
    createElement:()=>el,
  },
};
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(configJs, ctx);
vm.runInContext(appJs, ctx);

/* --- harness --- */
let pass=0, fail=0;
function check(name, got, want){
  const ok = String(got)===String(want);
  ok ? pass++ : fail++;
  console.log((ok?'  ok  ':'  FAIL') + '  ' + name + (ok?'':'   got '+got+'   want '+want));
}
function section(t){ console.log('\n'+t); }

const row = (id,date,amount,category,extra={}) =>
  Object.assign({id, NAME:'Test Person', DATE:date, AMOUNT:amount, CATEGORY:category}, extra);

/* headers/members/index/roster are `let` bindings, which live in the
   context's shared lexical scope rather than on the context object — so
   they're only reachable by running code inside the context. */
const run = code => vm.runInContext(code, ctx);
function load(rows, hdrs){
  ctx.__in = rows;
  ctx.__hdrs = hdrs || ['id','NAME','DATE','AMOUNT','CATEGORY','Status'];
  run('headers=__hdrs; members=__in; map=resolveMap(headers,members); buildIndex();');
}
const idx     = k => run('index[' + JSON.stringify(k) + ']');
const rosterN = () => run('roster.length');
const D = d => d ? ctx.fmt(d) : 'null';

/* ================= date parsing ================= */
section('Date parsing — every format seen in the real sheet');
const p = s => D(ctx.parseDate(s));
check('08/07/2026 (d/m/y)',        p('08/07/2026'),   '8 Jul 2026');
check('08-06-2026',                p('08-06-2026'),   '8 Jun 2026');
check('15.07.2026',                p('15.07.2026'),   '15 Jul 2026');
check('16:07:2026 (colons)',       p('16:07:2026'),   '16 Jul 2026');
check('21\\7\\26 (backslashes)',   p('21\\7\\26'),    '21 Jul 2026');
check('11-07-26 (2-digit year)',   p('11-07-26'),     '11 Jul 2026');
check('10 July 2026 keeps the day',p('10 July 2026'), '10 Jul 2026');
check('22-July-2026 keeps the day',p('22-July-2026'), '22 Jul 2026');
check('15 july 2026 lowercase',    p('15 july 2026'), '15 Jul 2026');
check('day/month swapped 25/12/26',p('25/12/26'),     '25 Dec 2026');
check('bare "July" -> 1st, flagged',p('July'),        '1 Jul 2026');
check('  "July" is monthOnly',     ctx.parseDateP('July').monthOnly, 'true');
check('"10 July 2026" is NOT monthOnly', ctx.parseDateP('10 July 2026').monthOnly, 'false');
check('garbage -> null',           p('not a date'),   'null');

/* ================= single plan, day precision ================= */
section('Day precision — a 1-month student plan bought 10 June');
load([row('A1','10-06-2026',500,'Student of IITH')]);
let m = idx('A1');
check('ends 9 July, not 31 July', D(ctx.computeEnd(m)), '9 Jul 2026');
check('state on 25 July',         ctx.statusOf(m).state, 'expired');
check('turned away',              ctx.statusOf(m).ok,    'false');
check('days over',                ctx.statusOf(m).days,  '-16');

section('The old bug: this used to read as "expires this month" and let them in');
load([row('A2','01-07-2026',500,'Student of IITH')]);
m = idx('A2');
check('1 July + 1 month ends 31 July', D(ctx.computeEnd(m)), '31 Jul 2026');
check('still valid on 25 July',        ctx.statusOf(m).ok,    'true');
check('flagged as expiring soon',      ctx.statusOf(m).state, 'soon');
check('6 days left',                   ctx.statusOf(m).days,  '6');

section('Guest day pass is one day only');
load([row('G1','25/07/2026',200,'Guest per slot')]);
check('today: valid',      ctx.statusOf(idx('G1')).ok, 'true');
check('today: last day',   ctx.statusOf(idx('G1')).label, 'LAST DAY');
load([row('G2','20/07/2026',200,'Guest per slot')]);
check('5 days ago: expired', ctx.statusOf(idx('G2')).state, 'expired');
check('  (not valid all month)', ctx.statusOf(idx('G2')).ok, 'false');

/* ================= renewals ================= */
section('Renewals — early renewal extends, it does not restart');
load([
  row('R1','01-06-2026',500,'Student of IITH'),   // 1 Jun – 30 Jun
  row('R1','20-06-2026',500,'Student of IITH'),   // renewed early: 1 Jul – 31 Jul
]);
check('chains to 31 July',   D(ctx.computeEnd(idx('R1'))), '31 Jul 2026');
check('still valid',         ctx.statusOf(idx('R1')).ok,   'true');
check('one member, not two', rosterN(), '1');
check('payment history kept',idx('R1').__rows.length, '2');

section('Renewal rows out of order in the sheet still chain correctly');
load([
  row('R2','20-06-2026',500,'Student of IITH'),   // newer row listed FIRST
  row('R2','01-06-2026',500,'Student of IITH'),
]);
check('same answer regardless of row order', D(ctx.computeEnd(idx('R2'))), '31 Jul 2026');

section('The old bug: last sheet row won, so this member read as expired');
load([
  row('R3','01-07-2026',3500,'Student of IITH'),  // annual, valid to 30 Jun 2027
  row('R3','01-02-2026',500,'Student of IITH'),   // an older 1-month row sitting below it
]);
check('annual wins over the stale row', D(ctx.computeEnd(idx('R3'))), '30 Jun 2027');
check('valid',                          ctx.statusOf(idx('R3')).ok, 'true');

section('Renewal after a lapse starts fresh, no back-dating');
load([
  row('R4','01-01-2026',500,'Student of IITH'),   // lapsed long ago
  row('R4','20-07-2026',500,'Student of IITH'),   // fresh start 20 Jul
]);
check('ends 19 Aug', D(ctx.computeEnd(idx('R4'))), '19 Aug 2026');
check('valid',       ctx.statusOf(idx('R4')).ok, 'true');

section('Day passes never chain');
load([
  row('R5','20-07-2026',200,'Guest per slot'),
  row('R5','25-07-2026',200,'Guest per slot'),
]);
check('latest pass only, still one day', D(ctx.computeEnd(idx('R5'))), '25 Jul 2026');

/* ================= plan tiers ================= */
section('Fee table lookups');
const tier = (amt,cat,date) => { load([row('T1',date||'01-07-2026',amt,cat)]); return D(ctx.computeEnd(idx('T1'))); };
check('student 1200 = 3 months',  tier(1200,'Student of IITH'), '30 Sep 2026');
check('student 2000 = 6 months',  tier(2000,'Student of IITH'), '31 Dec 2026');
check('student 3500 = 12 months', tier(3500,'Student of IITH'), '30 Jun 2027');
check('"1200/-" parses as 1200',  tier('1200/-','Student of IITH'), '30 Sep 2026');
check('faculty 2000 = 3 months',  tier(2000,'Faculty/Guest faculty/Staff/Project staff of IITH'), '30 Sep 2026');
check('category case-insensitive',tier(500,'student of iith'), '31 Jul 2026');
check('unknown tier -> null, never a guess', tier(777,'Student of IITH'), 'null');
load([row('T2','01-07-2026',777,'Student of IITH')]);
check('unknown tier -> NO END DATE', ctx.statusOf(idx('T2')).label, 'NO END DATE');
check('unknown tier -> not admitted', ctx.statusOf(idx('T2')).ok, 'false');

section('Month-end arithmetic does not overflow');
check('31 Jan + 1 month = 27 Feb (2026 non-leap)', tier(500,'Student of IITH','31-01-2026'), '27 Feb 2026');

/* ================= overrides & status ================= */
section('Explicit expiry column overrides the fee table');
load([Object.assign(row('O1','01-01-2026',500,'Student of IITH'),{'Valid till':'31-12-2026'})],
     ['id','NAME','DATE','AMOUNT','CATEGORY','Valid till']);
check('hand-written date wins', D(ctx.computeEnd(idx('O1'))), '31 Dec 2026');
load([Object.assign(row('O2','01-01-2026',500,'Student of IITH'),{'Valid till':'August 2026'})],
     ['id','NAME','DATE','AMOUNT','CATEGORY','Valid till']);
check('month-only override = END of that month', D(ctx.computeEnd(idx('O2'))), '31 Aug 2026');

section('Status column blocks entry');
load([row('S1','01-07-2026',3500,'Student of IITH',{Status:'Cancelled'})]);
check('cancelled beats a valid date', ctx.statusOf(idx('S1')).ok, 'false');
check('label', ctx.statusOf(idx('S1')).label, 'NOT ACTIVE');

section('Grace period');
run('CONFIG.GRACE_DAYS=3');
load([row('GR','20-06-2026',500,'Student of IITH')]);   // ended 19 Jul, 6 days ago
check('6 days over, 3-day grace -> still expired', ctx.statusOf(idx('GR')).state, 'expired');
load([row('GR2','24-06-2026',500,'Student of IITH')]);  // ended 23 Jul, 2 days ago
check('2 days over, 3-day grace -> in grace', ctx.statusOf(idx('GR2')).state, 'grace');
check('  and admitted',                      ctx.statusOf(idx('GR2')).ok, 'true');
run('CONFIG.GRACE_DAYS=0');
check('grace 0 -> 2 days over is expired', (load([row('GR3','24-06-2026',500,'Student of IITH')]), ctx.statusOf(idx('GR3')).state), 'expired');

section('Column mapping is case-insensitive');
load([{ID:'C1',NAME:'X',DATE:'01-07-2026',AMOUNT:500,CATEGORY:'Student of IITH'}],
     ['ID','NAME','DATE','AMOUNT','CATEGORY']);
check("config 'id' matches header 'ID'", run('map.roll'), 'ID');

section('Attribute escaping');
check('quote is \\x-escaped, not &#39;', ctx.jsArg("a'b"), 'a\\x27b');
check('angle brackets still HTML-escaped', ctx.jsArg('<x>'), '&lt;x&gt;');

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail?1:0);
