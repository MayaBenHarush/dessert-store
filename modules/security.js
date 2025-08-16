// modules/security.js
// Rate limiter מינימלי מבוסס זיכרון – לכל IP, חלון זמן, ומקסימום בקשות.

const CLEAN_INTERVAL_MS = 60 * 1000;

/**
 * יוצר Middleware של rate limit.
 * @param {object} opts
 * @param {number} opts.windowMs - חלון זמן במילישניות
 * @param {number} opts.max - מקס׳ בקשות בחלון
 * @param {function} opts.keyGenerator - מפתח לזיהוי ה”לקוח” (ברירת מחדל: req.ip)
 * @param {string} opts.message - הודעת שגיאה ידידותית
 * @param {number} opts.statusCode - קוד החזרה (ברירת מחדל: 429)
 */
function createRateLimiter({
  windowMs = 60_000,
  max = 60,
  keyGenerator = (req) => req.ip,
  message = 'Too many requests, please slow down',
  statusCode = 429,
} = {}) {
  const hits = new Map();

  // ניקוי תקופתי כדי לא לנפח זיכרון
  setInterval(() => {
    const now = Date.now();
    for (const [key, arr] of hits) {
      const fresh = arr.filter(ts => now - ts <= windowMs);
      if (fresh.length) hits.set(key, fresh);
      else hits.delete(key);
    }
  }, CLEAN_INTERVAL_MS).unref();

  return (req, res, next) => {
    try {
      const key = keyGenerator(req);
      const now = Date.now();
      const prev = hits.get(key) || [];
      const fresh = prev.filter(ts => now - ts <= windowMs);

      fresh.push(now);
      hits.set(key, fresh);

      if (fresh.length > max) {
        res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
        return res.status(statusCode).json({ error: message });
      }
      next();
    } catch {
      // אם משהו קרה, לא נפליל משתמשים — פשוט נעבור הלאה
      next();
    }
  };
}

// מגבלות ייעודיות למסלולים שונים
const limitLogin = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 דקות
  max: 20,                   // עד 20 ניסיונות
  message: 'יותר מדי ניסיונות התחברות. נסי שוב בעוד כמה דקות.',
});

const limitMutations = createRateLimiter({
  windowMs: 60 * 1000, // דקה
  max: 60,             // עד 60 פעולות/דקה
  message: 'יותר מדי פעולות בזמן קצר. בבקשה האטי מעט.',
});

const limitAdmin = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'יותר מדי בקשות למסכי ניהול כרגע.',
});

module.exports = {
  createRateLimiter,
  limitLogin,
  limitMutations,
  limitAdmin,
};
