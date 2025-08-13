// modules/pay-server.js
// תשלום דמו: מבצע ולידציה בסיסית ומחזיר ok. אין חיוב אמיתי ואין שמירת פרטי כרטיס.

module.exports = (app) => {
  // POST /api/pay – body: { cardName, cardNumber, expiry, cvv }
  app.post('/api/pay', async (req, res, next) => {
    try {
      const username = req.cookies?.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      const { cardName, cardNumber, expiry, cvv } = req.body || {};

      // ולידציה קלה (בדיקת פורמטים בלבד)
      if (!cardName || typeof cardName !== 'string') {
        return res.status(400).json({ error: 'Invalid cardName' });
      }
      const digits = String(cardNumber || '').replace(/[\s-]/g, '');
      if (!/^\d{12,19}$/.test(digits)) {
        return res.status(400).json({ error: 'Invalid cardNumber' });
      }
      if (!/^\d{2}\/\d{2}$/.test(String(expiry || ''))) {
        return res.status(400).json({ error: 'Invalid expiry' });
      }
      if (!/^\d{3,4}$/.test(String(cvv || ''))) {
        return res.status(400).json({ error: 'Invalid cvv' });
      }

      // אין שמירת נתונים ואין חיוב אמיתי – רק תשובת הצלחה
      return res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });
};
