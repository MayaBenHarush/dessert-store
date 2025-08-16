// "קופה": בחירת פריטים מהסל לרכישה (דוחף ל-purchases ומסיר מהסל)
const persist = require('../persist_module');

module.exports = (app) => {
  // POST /api/checkout – body: { items: [productId,…] }
  app.post('/api/checkout', async (req, res, next) => {
    try {
      const username = req.cookies?.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      // 1) קלט מהלקוח + נירמול למחרוזות + הורדת כפילויות
      const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
      const wantedIds = Array.from(new Set(rawItems.map(String))); // ["1","8",...]

      if (wantedIds.length === 0) {
        return res.status(400).json({ error: 'No items to checkout' });
      }

      // 2) אימות מול רשימת המוצרים
      const products = await persist.loadData('products'); // מערך מוצרים
      const productIdSet = new Set(
        (Array.isArray(products) ? products : []).map(p => String(p.id))
      );
      const validIds = wantedIds.filter(id => productIdSet.has(id));

      if (validIds.length === 0) {
        return res.status(400).json({ error: 'No valid items to checkout' });
      }

      // 3) רישום הרכישה
      await persist.appendPurchase(username, {
        items: validIds.slice(),
        date: new Date().toISOString()
      });

      // 4) הסרה מהסל – נשמור רק פריטים שלא שולמו
      const currentCart = await persist.getCart(username);          // למשל ["1","8","8"]
      const newCart = (Array.isArray(currentCart) ? currentCart : [])
        .map(String)
        .filter(id => !validIds.includes(id));                      // מסיר את כל ההופעות

      await persist.setCart(username, newCart);

      // 5) תשובה ללקוח
      return res.json({ ok: true, items: validIds });
    } catch (err) {
      next(err);
    }
  });
};
