// modules/products-server.js
// שליפת מוצרים עם חיפוש prefix בשם או בתיאור

const persist = require('../persist_module');

module.exports = (app) => {
  // GET /api/products?search=prefix
  app.get('/api/products', async (req, res, next) => {
    try {
      const search = (req.query.search || '').toLowerCase();
      const products = await persist.loadData('products');

      const filtered = search
        ? products.filter(p =>
            (p.title || '').toLowerCase().startsWith(search) ||
            (p.description || '').toLowerCase().startsWith(search)
          )
        : products;

      return res.json(filtered);
    } catch (err) {
      next(err);
    }
  });
};
