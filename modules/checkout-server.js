// modules/checkout-server.js
// קופה: בחירת פריטים מהסל לרכישה (דוחף ל-purchases ומסיר מהסל)

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

      const [carts, purchases] = await Promise.all([
        persist.loadData('carts'),
        persist.loadData('purchases'),
      ]);

      // הוסף רכישה חדשה
      purchases.push({
        username,
        items: items.slice(), // שמירת האיידיז שנבחרו
        date: new Date().toISOString(),
      });
      await persist.saveData('purchases', purchases);

      // הסר את הפריטים מהסל
      const cart = carts.find(c => c.username === username);
      if (cart && Array.isArray(cart.items)) {
        cart.items = cart.items.filter(id => !items.includes(id));
        await persist.saveData('carts', carts);
      }

      return res.json({ ok: true, items });
    } catch (err) {
      next(err);
    }
  });
};
