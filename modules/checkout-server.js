// modules/checkout-server.js
// בוחר פריטים מהסל לתשלום: מעביר אותם ל-"pending" (ממתינים לתשלום) ומסיר מהסל.

const persist = require('../persist_module');

module.exports = (app) => {
  app.post('/api/checkout', async (req, res, next) => {
    try {
      const username = req.cookies?.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
      const wantedIds = Array.from(new Set(rawItems.map(String)));
      if (!wantedIds.length) return res.status(400).json({ error: 'No items to checkout' });

      // אימות שהם מוצרים קיימים
      const products = await persist.loadData('products');
      const set = new Set((Array.isArray(products) ? products : []).map(p => String(p.id)));
      const validIds = wantedIds.filter(id => set.has(id));
      if (!validIds.length) return res.status(400).json({ error: 'No valid items to checkout' });

      // הסרה מהסל
      const currentCart = await persist.getCart(username);
      const newCart = (Array.isArray(currentCart) ? currentCart : [])
        .map(String)
        .filter(id => !validIds.includes(id));
      await persist.setCart(username, newCart);

      // שמירה ל-"pending"
      let pending = await persist.loadData('pending');
      if (!Array.isArray(pending)) pending = [];
      const row = pending.find(r => r.username === username);
      if (row) {
        const merged = Array.from(new Set([...(row.items || []).map(String), ...validIds]));
        row.items = merged;
        row.ts = Date.now();
      } else {
        pending.push({ username, items: validIds.slice(), ts: Date.now() });
      }
      await persist.saveData('pending', pending);

      // (לא רושמים purchase כאן; התשלום יתבצע ב-/api/pay)
      res.json({ ok: true, items: validIds });
    } catch (err) {
      next(err);
    }
  });
};
