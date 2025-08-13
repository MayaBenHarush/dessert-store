// modules/myitems-server.js
// "הרכישות שלי": מאחד רכישות עם פרטי מוצרים ומחזיר רשימה מפורטת

const persist = require('../persist_module');

module.exports = (app) => {
  // GET /api/my-items
  app.get('/api/my-items', async (req, res, next) => {
    try {
      const username = req.cookies?.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      // כעת persist מחזיר רכישות למשתמש בלבד כמערך
      // כל רכישה היא: { items:[ids], date: ISO }
      const purchases = await persist.getPurchases(username);
      const products = await persist.getProducts();

      const byId = new Map(products.map(p => [p.id, p]));
      const result = [];

      for (const pur of purchases) {
        const date = pur.date;
        for (const id of (pur.items || [])) {
          const prod = byId.get(id);
          if (!prod) continue;
          result.push({
            id: prod.id,
            title: prod.title,
            description: prod.description,
            image: prod.image,
            date
          });
        }
      }

      // אפשר למיין לפי תאריך ירד (אחרון ראשון)
      result.sort((a, b) => String(b.date).localeCompare(String(a.date)));

      return res.json(result);
    } catch (err) {
      next(err);
    }
  });
};
