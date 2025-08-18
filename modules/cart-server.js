// modules/cart-server.js
const persist = require('../persist_module');

module.exports = (app) => {
  const asArray = (x) => (Array.isArray(x) ? x : []);

  // GET /api/cart – החזרת מוצרים בסל עם כמויות
  app.get('/api/cart', async (req, res, next) => {
    try {
      const username = req.cookies.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      let carts = asArray(await persist.loadData('carts'));
      const cart = carts.find(c => c.username === username);
      const items = cart && Array.isArray(cart.items) ? cart.items.map(String) : [];
      
      // חישוב כמויות
      const quantities = {};
      items.forEach(id => {
        quantities[id] = (quantities[id] || 0) + 1;
      });
      
      res.json(quantities);
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
      const product = products.find(p => String(p.id) === id);
      if (!product) {
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

      // לוג פעילות
      let activity = asArray(await persist.loadData('activity'));
      activity.push({ datetime: new Date().toISOString(), username, type: 'add-to-cart' });
      await persist.saveData('activity', activity);

      res.json({ ok: true, productTitle: product.title });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/cart/:id – הסרת יחידה אחת של מוצר מהסל
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

      // הסרת יחידה אחת בלבד
      const index = cart.items.findIndex(pid => String(pid) === id);
      if (index !== -1) {
        cart.items.splice(index, 1);
        await persist.saveData('carts', carts);
      }

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // PUT /api/cart/:id – עדכון כמות מוצר בסל
  app.put('/api/cart/:id', async (req, res, next) => {
    try {
      const username = req.cookies.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      const id = String(req.params.id || '');
      const { quantity } = req.body || {};
      const newQuantity = parseInt(quantity, 10);
      
      if (isNaN(newQuantity) || newQuantity < 0) {
        return res.status(400).json({ error: 'Invalid quantity' });
      }

      let carts = asArray(await persist.loadData('carts'));
      const cart = carts.find(c => c.username === username);
      if (!cart) {
        return res.status(404).json({ error: 'Cart not found' });
      }
      if (!Array.isArray(cart.items)) cart.items = [];

      // הסרת כל המופעים של המוצר
      cart.items = cart.items.filter(pid => String(pid) !== id);
      
      // הוספת הכמות החדשה
      for (let i = 0; i < newQuantity; i++) {
        cart.items.push(id);
      }

      await persist.saveData('carts', carts);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });
};