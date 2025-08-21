// modules/checkout-server.js
// בוחר פריטים מהסל לתשלום: מעביר אותם ל-"pending" (ממתינים לתשלום) ומסיר מהסל רק את הפריטים שנבחרו.
// מעודכן לתמיכה בעוגות מותאמות

const persist = require('../persist_module');

module.exports = (app) => {
  app.post('/api/checkout', async (req, res, next) => {
    try {
      const username = req.cookies?.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
      const wantedIds = Array.from(new Set(rawItems.map(String)));
      if (!wantedIds.length) return res.status(400).json({ error: 'No items to checkout' });

      // קבלת הסל הנוכחי
      let carts = await persist.loadData('carts');
      if (!Array.isArray(carts)) carts = [];
      const cart = carts.find(c => c.username === username);
      const currentCartItems = cart && Array.isArray(cart.items) ? cart.items.map(String) : [];
      
      // הפרדה בין מוצרים רגילים לעוגות מותאמות
      const regularItems = currentCartItems.filter(id => !id.startsWith('custom-cake-'));
      const customCakeItems = currentCartItems.filter(id => id.startsWith('custom-cake-'));
      
      // אימות מוצרים רגילים
      const products = await persist.loadData('products');
      const productIds = new Set((Array.isArray(products) ? products : []).map(p => String(p.id)));
      
      // אימות עוגות מותאמות
      const customCakes = await persist.loadData('customCakes');
      const customCakeIds = new Set((Array.isArray(customCakes) ? customCakes : [])
        .filter(cake => cake.username === username && cake.status === 'in-cart')
        .map(cake => cake.id));

      // סינון פריטים תקינים לחנקאוט
      const validRegularItems = wantedIds.filter(id => 
        !id.startsWith('custom-cake-') && productIds.has(id) && regularItems.includes(id)
      );
      const validCustomCakes = wantedIds.filter(id => 
        id.startsWith('custom-cake-') && customCakeIds.has(id) && customCakeItems.includes(id)
      );

      const allValidItems = [...validRegularItems, ...validCustomCakes];
      if (!allValidItems.length) return res.status(400).json({ error: 'No valid items to checkout' });

      // חישוב כמויות מוצרים רגילים
      const regularQuantities = {};
      regularItems.forEach(id => {
        if (validRegularItems.includes(id)) {
          regularQuantities[id] = (regularQuantities[id] || 0) + 1;
        }
      });

      // יצירת רשימת פריטים לתשלום
      const itemsForPayment = [];
      
      // הוספת מוצרים רגילים עם כמויות
      Object.entries(regularQuantities).forEach(([id, quantity]) => {
        for (let i = 0; i < quantity; i++) {
          itemsForPayment.push(id);
        }
      });
      
      // הוספת עוגות מותאמות
      validCustomCakes.forEach(id => {
        itemsForPayment.push(id);
      });

      if (!itemsForPayment.length) return res.status(400).json({ error: 'No items available for checkout' });

      // הסרה מהסל של הפריטים שנבחרו
      const newCartItems = currentCartItems.filter(id => !allValidItems.includes(id));
      
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

      res.json({ ok: true, items: allValidItems });
    } catch (err) {
      next(err);
    }
  });
};