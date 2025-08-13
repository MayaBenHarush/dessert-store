// modules/myitems-server.js
// מחזיר לרשימת "הרכישות שלי" את המוצרים שנקנו, מועשרים בשם/תמונה/תיאור + תאריך קנייה

const persist = require('../persist_module');

module.exports = (app) => {
  // GET /api/my-items
  app.get('/api/my-items', async (req, res, next) => {
    try {
      const username = req.cookies?.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      const [purchases, products] = await Promise.all([
        persist.loadData('purchases'), // [{username, items:[ids], date}]
        persist.loadData('products')   // [{id,title,description,image}]
      ]);

      const map = new Map(products.map(p => [p.id, p]));
      const mine = [];

      for (const pur of purchases) {
        if (pur.username !== username) continue;
        for (const id of pur.items || []) {
          const prod = map.get(id);
          if (!prod) continue;
          mine.push({
            id: prod.id,
            title: prod.title,
            description: prod.description,
            image: prod.image,
            date: pur.date
          });
        }
      }

      return res.json(mine);
    } catch (err) {
      next(err);
    }
  });
};
