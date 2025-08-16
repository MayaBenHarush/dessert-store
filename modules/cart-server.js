// modules/cart-server.js
const persist = require('../persist_module');

module.exports = (app) => {
  // עזר קטן: דואג שתמיד נקבל מערך
  const asArray = (x) => (Array.isArray(x) ? x : []);

  // GET /api/cart – החזרת מזהי המוצרים בסל למשתמש המחובר
  app.get('/api/cart', async (req, res, next) => {
    try {
      const username = req.cookies.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      const carts = asArray(await persist.loadData('carts'));
      const cart = carts.find(c => c.username === username);
      res.json(cart && Array.isArray(cart.items) ? cart.items : []);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/cart – הוספת מוצר לסל
  // body: { productId }
  app.post('/api/cart', async (req, res, next) => {
    try {
      const username = req.cookies.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      const { productId } = req.body || {};
      if (!productId) return res.status(400).json({ error: 'productId required' });

      // ודאי שהמוצר קיים
      const products = asArray(await persist.loadData('products'));
      if (!products.some(p => p.id === productId)) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const carts = asArray(await persist.loadData('carts'));
      let cart = carts.find(c => c.username === username);
      if (!cart) {
        cart = { username, items: [] };
        carts.push(cart);
      }
      if (!Array.isArray(cart.items)) cart.items = [];

      cart.items.push(productId);
      await persist.saveData('carts', carts);

      // לוג פעילות (לא חובה)
      const activity = asArray(await persist.loadData('activity'));
      activity.push({ datetime: new Date().toISOString(), username, type: 'add-to-cart' });
      await persist.saveData('activity', activity);

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/cart/:id – הסרת מוצר מהסל לפי מזהה בנתיב
  app.delete('/api/cart/:id', async (req, res, next) => {
    try {
      const username = req.cookies.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      const id = String(req.params.id || '');
      const carts = asArray(await persist.loadData('carts'));
      const cart = carts.find(c => c.username === username);
      if (!cart || !Array.isArray(cart.items)) {
        return res.status(404).json({ error: 'Cart not found' });
      }

      cart.items = cart.items.filter(pid => String(pid) !== id);
      await persist.saveData('carts', carts);

      res.json({ ok: true, items: cart.items });
    } catch (err) {
      next(err);
    }
  });

  // אופציונלי: תמיכה גם ב-DELETE /api/cart עם body { productId } או query ?productId=
  app.delete('/api/cart', async (req, res, next) => {
    try {
      const username = req.cookies.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      let id =
        (req.body && (req.body.productId ?? req.body.id)) ||
        req.query.productId ||
        req.query.id;
      if (!id) return res.status(400).json({ error: 'productId required' });
      id = String(id);

      const carts = asArray(await persist.loadData('carts'));
      const cart = carts.find(c => c.username === username);
      if (!cart || !Array.isArray(cart.items)) {
        return res.status(404).json({ error: 'Cart not found' });
      }

      cart.items = cart.items.filter(pid => String(pid) !== id);
      await persist.saveData('carts', carts);

      res.json({ ok: true, items: cart.items });
    } catch (err) {
      next(err);
    }
  });
};
