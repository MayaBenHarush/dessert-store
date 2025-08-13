// modules/checkout-server.js
// "קופה": בחירת פריטים מהסל לרכישה (דוחף ל-purchases ומסיר מהסל)

const persist = require('../persist_module');

module.exports = (app) => {
  // POST /api/checkout – body: { items: [productId,…] }
  app.post('/api/checkout', async (req, res, next) => {
    try {
      const username = req.cookies?.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      const { items } = req.body || {};
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'No items to checkout' });
      }

      // הוסף רכישה (בשכבה שלנו נשמור רק ids + תאריך)
      await persist.appendPurchase(username, {
        items: items.slice(),
        date: new Date().toISOString()
      });

      // הסר אותם מהסל
      const cartNow = await persist.getCart(username);
      const filtered = cartNow.filter(id => !items.includes(id));
      await persist.setCart(username, filtered);

      return res.json({ ok: true, items });
    } catch (err) {
      next(err);
    }
  });
};
