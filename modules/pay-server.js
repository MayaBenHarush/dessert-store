// modules/pay-server.js
// תשלום דמו: ולידציה בסיסית ומחזירים ok.
// חשוב: לא נוגעים בסל/רכישות כאן – זה כבר בוצע ב-Checkout.

const persist = require('../persist_module');

module.exports = (app) => {
  app.post('/api/pay', async (req, res, next) => {
    try {
      const username = req.cookies?.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      const { cardName, cardNumber, expiry, cvv } = req.body || {};

      // ולידציה בסיסית של פרטי הכרטיס (דמו בלבד)
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

      // לא מחפשים ולא דורשים pending — אם הוולידציה עברה, מחזירים הצלחה.
      return res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });
};
