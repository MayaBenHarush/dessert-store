// modules/cart-server.js
const persist = require('../persist_module');

module.exports = (app) => {
  const asArray = (x) => (Array.isArray(x) ? x : []);

  // GET /api/cart – החזרת מזהי המוצרים בסל (מחרוזות)
  app.get('/api/cart', async (req, res, next) => {
    try {
      const username = req.cookies.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      let carts = asArray(await persist.loadData('carts'));
      const cart = carts.find(c => c.username === username);
      const ids = cart && Array.isArray(cart.items) ? cart.items.map(String) : [];
      res.json(ids);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/cart – הוספה לסל
  // body: { productId }
  app.post('/api/cart', async (req, res, next) => {
    try {
      const username = req.cookies.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      const { productId } = req.body || {};
      const id = String(productId || '');
      if (!id) return res.status(400).json({ error: 'productId required' });

      const products = asArray(await persist.loadData('products'));
      if (!products.some(p => String(p.id) === id)) {
        return res.status(404).json({ error: 'Product not found' });
      }

      let carts = asArray(await persist.loadData('carts'));
      let cart = carts.find(c => c.username === username);
      if (!cart) {
        cart = { username, items: [] };
        carts.push(cart);
      }
      if (!Array.isArray(cart.items)) cart.items = [];

      cart.items.push(id); // שומר תמיד כמחרוזת
      await persist.saveData('carts', carts);

      // (לא חובה) לוג פעילות
      let activity = asArray(await persist.loadData('activity'));
      activity.push({ datetime: new Date().toISOString(), username, type: 'add-to-cart' });
      await persist.saveData('activity', activity);

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/cart/:id – הסרה מהסל
  app.delete('/api/cart/:id', async (req, res, next) => {
    try {
      const username = req.cookies.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      const id = String(req.params.id || '');
      let carts = asArray(await persist.loadData('carts'));
      const cart = carts.find(c => c.username === username);
      if (!cart || !Array.isArray(cart.items)) {
        return res.status(404).json({ error: 'Cart not found' });
      }

      cart.items = cart.items.map(String).filter(pid => pid !== id);
      await persist.saveData('carts', carts);

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });
};
