// modules/wheel-server.js
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'wheel-spins.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ users: {}, guests: {} }, null, 2));
}
function loadData() { ensureDataFile(); return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); }
function saveData(d) { fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }

function daysBetween(a, b) { return Math.abs((+a - +b) / (1000*60*60*24)); }
function rand(min, max) { return Math.random() * (max - min) + min; }

// 9 פלחים – NONE בכל אינדקס זוגי (מפוזר), פרסים באינדקסים אי-זוגיים
// [0]NONE, [1]10%, [2]NONE, [3]DESSERT, [4]NONE, [5]SHIP, [6]NONE, [7]NIS50, [8]NONE
const ORDER = ['NONE','PCT10','NONE','DESSERT','NONE','SHIP','NONE','NIS50','NONE'];

// מטא-נתונים עם קודי קופון חדשים
const PRIZE_META = {
  PCT10:  { 
    message: '🎉 זכית ב‑10% הנחה!', 
    coupon: { 
      code: 'WHEEL10', 
      type: 'percent', 
      value: 10,
      description: 'הנחה של 10% על כל הקנייה'
    } 
  },
  DESSERT:{ 
    message: '🍪 קינוח במתנה!',     
    coupon: { 
      code: 'עוגיה', 
      type: 'free-cookie', 
      value: 17,
      description: 'עוגיה אחת חינם'
    } 
  },
  SHIP:   { 
    message: '🚚 משלוח חינם!',      
    coupon: { 
      code: 'משלוח', 
      type: 'free-shipping', 
      value: 29,
      description: 'משלוח חינם'
    } 
  },
  NIS50:  { 
    message: '💸 שובר ₪50 לקנייה!',  
    coupon: { 
      code: 'שובר', 
      type: 'fixed-discount', 
      value: 50,
      description: 'שובר הנחה של 50 ₪'
    } 
  },
  NONE:   { 
    message: '😅 לא זכית הפעם... נסו שוב מחר', 
    coupon: null 
  }
};

// הסתברויות – יותר סיכוי ל-NONE
const WEIGHTS = { PCT10:0.14, DESSERT:0.12, SHIP:0.12, NIS50:0.07, NONE:0.55 };

function weightedPick() {
  const entries = Object.entries(WEIGHTS);
  const total = entries.reduce((s,[,w])=>s+w,0);
  let r = Math.random() * total;
  for (const [k,w] of entries){ r -= w; if (r <= 0) return k; }
  return 'NONE';
}

// 9 פלחים => כל פלח 40°
function prizeToAngle(prizeId) {
  const indices = ORDER.map((p,i)=>[p,i]).filter(([p])=>p===prizeId).map(([,i])=>i);
  const idx = indices[Math.floor(Math.random()*indices.length)];
  const base = idx * 40;
  return base + rand(6, 34); // אקראי בתוך הפלח
}

module.exports = function registerWheelRoutes(app) {
  ensureDataFile();

  function getIdentity(req, res) {
    const user = req.session?.username || req.user?.username || req.cookies?.session;
    if (user) return { type: 'user', id: user };
    let gid = req.cookies?.guestId;
    if (!gid) {
      gid = Math.random().toString(36).slice(2, 10);
      res.cookie('guestId', gid, { httpOnly: true, sameSite: 'Lax', maxAge: 1000*60*60*24*365 });
    }
    return { type: 'guest', id: gid };
  }

  app.get('/api/wheel/status', (req, res) => {
    const id = getIdentity(req, res);
    const db = loadData();
    const store = id.type === 'user' ? db.users : db.guests;
    const rec = store[id.id];
    res.json({ last: rec?.last || null, prizeId: rec?.prizeId || null, coupon: rec?.coupon || null });
  });

  app.post('/api/wheel/spin', (req, res) => {
    const id = getIdentity(req, res);
    const db = loadData();
    const store = id.type === 'user' ? db.users : db.guests;
    const now = new Date();

    if (store[id.id]?.last && daysBetween(now, new Date(store[id.id].last)) < 1) {
      return res.status(429).json({ message: 'אפשר להגריל רק פעם ביום. נסו שוב מחר 😊' });
    }

    const prizeId = weightedPick();
    const meta = PRIZE_META[prizeId] || PRIZE_META.NONE;

    let coupon = null;
    if (meta.coupon) {
      coupon = { 
        ...meta.coupon, 
        issuedAt: now.toISOString(), 
        expiresAt: new Date(now.getTime() + 1000*60*60*24*7).toISOString() // תוקף שבוע
      };
    }

    store[id.id] = { last: now.toISOString(), prizeId, coupon };
    if (id.type === 'user') db.users = store; else db.guests = store;
    saveData(db);

    const angle = prizeToAngle(prizeId);
    res.json({ prizeId, message: meta.message, coupon, angle });
  });
};