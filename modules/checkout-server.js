// modules/checkout-server.js
// בוחר פריטים מהסל לתשלום: מעביר אותם ל-"pending" (ממתינים לתשלום) ומסיר מהסל רק את הפריטים שנבחרו.

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

      // קבלת הסל הנוכחי עם כמויות
      let carts = await persist.loadData('carts');
      if (!Array.isArray(carts)) carts = [];
      const cart = carts.find(c => c.username === username);
      const currentCartItems = cart && Array.isArray(cart.items) ? cart.items.map(String) : [];
      
      // חישוב כמויות בסל
      const cartQuantities = {};
      currentCartItems.forEach(id => {
        cartQuantities[id] = (cartQuantities[id] || 0) + 1;
      });

      // יצירת רשימת פריטים לתשלום עם כמויות (רק הפריטים שנבחרו)
      const itemsForPayment = [];
      validIds.forEach(id => {
        const quantity = cartQuantities[id] || 0;
        for (let i = 0; i < quantity; i++) {
          itemsForPayment.push(id);
        }
      });

      if (!itemsForPayment.length) return res.status(400).json({ error: 'No items available for checkout' });

      // הסרה מהסל רק של הפריטים שנבחרו לתשלום
      const newCartItems = [];
      currentCartItems.forEach(id => {
        if (!validIds.includes(id)) {
          newCartItems.push(id);
        }
      });
      
      if (cart) {
        cart.items = newCartItems;
      }
      await persist.saveData('carts', carts);

      // שמירה ל-"pending"
      let pending = await persist.loadData('pending');
      if (!Array.isArray(pending)) pending = [];
      const row = pending.find(r => r.username === username);
      if (row) {
        const merged = [...(row.items || []), ...itemsForPayment];
        row.items = merged;
        row.ts = Date.now();
      } else {
        pending.push({ username, items: itemsForPayment.slice(), ts: Date.now() });
      }
      await persist.saveData('pending', pending);

      res.json({ ok: true, items: validIds });
    } catch (err) {
      next(err);
    }
  });
};