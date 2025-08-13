// modules/cart-server.js
// ניהול סל: קריאה, הוספה והסרה

const persist = require('../persist_module');

module.exports = (app) => {
  // עוזר קטן לרישום פעילות ליומן
  async function logActivity(username, type) {
    const activity = await persist.loadData('activity');
    activity.push({ datetime: new Date().toISOString(), username, type });
    await persist.saveData('activity', activity);
  }

  // GET /api/cart – מחזיר את מזהי הפריטים בסל של המשתמש
  app.get('/api/cart', async (req, res, next) => {
    try {
      const username = req.cookies?.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      const carts = await persist.loadData('carts'); // [{username, items:[]}]
      const cart = carts.find(c => c.username === username);
      return res.json(cart ? (cart.items || []) : []);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/cart – מוסיף מוצר לסל (body: { productId })
  app.post('/api/cart', async (req, res, next) => {
    try {
      const username = req.cookies?.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      const { productId } = req.body || {};
      if (!productId) return res.status(400).json({ error: 'productId required' });

      // ודא שהמוצר קיים
      const products = await persist.loadData('products');
      if (!products.find(p => p.id === productId)) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const carts = await persist.loadData('carts');
      let cart = carts.find(c => c.username === username);
      if (!cart) {
        cart = { username, items: [] };
        carts.push(cart);
      }
      cart.items.push(productId);
      await persist.saveData('carts', carts);

      await logActivity(username, 'add-to-cart');

      return res.json({ ok: true, items: cart.items });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/cart/:id – מסיר מופע אחד של מוצר מהסל
  app.delete('/api/cart/:id', async (req, res, next) => {
    try {
      const username = req.cookies?.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      const { id } = req.params;
      const carts = await persist.loadData('carts');
      const cart = carts.find(c => c.username === username);

      if (!cart || !Array.isArray(cart.items)) {
        return res.json({ ok: true, items: [] });
      }

      const idx = cart.items.indexOf(id);
      if (idx !== -1) cart.items.splice(idx, 1);
      await persist.saveData('carts', carts);

      return res.json({ ok: true, items: cart.items });
    } catch (err) {
      next(err);
    }
  });
};
