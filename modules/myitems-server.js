// modules/myitems-server.js
// "הרכישות שלי": מאחד רכישות עם פרטי מוצרים ומחזיר רשימה מפורטת
// מעודכן לתמיכה בעוגות מותאמות

const persist = require('../persist_module');

module.exports = (app) => {
  // GET /api/my-items
  app.get('/api/my-items', async (req, res, next) => {
    try {
      const username = req.cookies?.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      // קבלת רכישות המשתמש
      const purchases = await persist.getPurchases(username);
      const products = await persist.getProducts();
      
      // קבלת עוגות מותאמות
      const customCakes = await persist.loadData('customCakes');
      const userCustomCakes = Array.isArray(customCakes) 
        ? customCakes.filter(cake => cake.username === username && cake.status === 'purchased')
        : [];

      const byId = new Map(products.map(p => [p.id, p]));
      const customCakeById = new Map(userCustomCakes.map(cake => [cake.id, cake]));
      const result = [];

      for (const pur of purchases) {
        const date = pur.date;
        for (const id of (pur.items || [])) {
          if (id.startsWith('custom-cake-')) {
            // עוגה מותאמת
            const customCake = customCakeById.get(id);
            if (customCake) {
              const design = customCake.design;
              result.push({
                id: customCake.id,
                title: `עוגה מותאמת ${design.size === 'bento' ? 'בנטו' : 'גדולה'} - ${design.color}`,
                description: design.text ? `עם הכיתוב: "${design.text}"` : 'ללא כיתוב',
                image: design.imageFile || `cake-${design.color}.jpg`,
                price: design.price,
                date,
                type: 'custom-cake',
                customDesign: design
              });
            }
          } else {
            // מוצר רגיל
            const prod = byId.get(id);
            if (prod) {
              result.push({
                id: prod.id,
                title: prod.title,
                description: prod.description,
                image: prod.image,
                date,
                type: 'regular'
              });
            }
          }
        }
      }

      // מיון לפי תאריך ירד (אחרון ראשון)
      result.sort((a, b) => String(b.date).localeCompare(String(a.date)));

      return res.json(result);
    } catch (err) {
      next(err);
    }
  });
};