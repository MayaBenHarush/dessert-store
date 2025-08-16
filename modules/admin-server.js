// modules/admin-server.js
// דרישת מטלה: יש משתמש קיים admin/admin. גישה לראוטים האלה רק אם session === 'admin'.
const persist = require('../persist_module');

module.exports = (app) => {
  // פונקציית בדיקה פשוטה: רק 'admin' מורשה
  function requireAdmin(req, res) {
    const username = req.cookies?.session;
    if (!username) {
      res.status(401).json({ error: 'Not logged in' });
      return { error: true };
    }
    if (username !== 'admin') {
      res.status(403).json({ error: 'Admin only' });
      return { error: true };
    }
    return { ok: true };
  }

  // לוג פעילות — לא חובה במטלה לשמור הכל, אבל כן נדרש להציג login/logout/add-to-cart
  async function logAdminActivity(type) {
    const activity = await persist.loadData('activity'); // [{datetime,username,type}]
    activity.push({ datetime: new Date().toISOString(), username: 'admin', type });
    await persist.saveData('activity', activity);
  }

  // עזר ל־id מוצרים
  function slugify(str) {
    const base = String(str || 'product')
      .trim().toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9\-]/g, '')
      .replace(/\-+/g, '-')
      .replace(/^\-+|\-+$/g, '') || 'product';
    return base;
  }

  // === Activity ===
  // GET /api/admin/activity?prefix=abc
  app.get('/api/admin/activity', async (req, res, next) => {
    try {
      if (requireAdmin(req, res).error) return;
      const prefix = (req.query.prefix || '').toLowerCase();
      const activity = await persist.loadData('activity');
      let rows = activity;
      if (prefix) {
        rows = rows.filter(r => (r.username || '').toLowerCase().startsWith(prefix));
      }
      rows.sort((a, b) => String(b.datetime).localeCompare(String(a.datetime)));
      res.json(rows);
    } catch (err) { next(err); }
  });

  // === Products ===
  // GET /api/admin/products
  app.get('/api/admin/products', async (req, res, next) => {
    try {
      if (requireAdmin(req, res).error) return;
      const products = await persist.loadData('products');
      res.json(products);
    } catch (err) { next(err); }
  });

  // POST /api/admin/products  body: { title, description?, image, id? }
  app.post('/api/admin/products', async (req, res, next) => {
    try {
      if (requireAdmin(req, res).error) return;

      const { id, title, description, image } = req.body || {};
      if (!title || !image) {
        return res.status(400).json({ error: 'title and image are required' });
      }

      const products = await persist.loadData('products');
      const ids = new Set(products.map(p => p.id));
      let newId = (id && String(id).trim()) || slugify(title);
      if (ids.has(newId)) {
        const base = newId; let i = 2;
        while (ids.has(newId)) newId = `${base}-${i++}`;
      }

      const product = {
        id: newId,
        title: String(title),
        description: String(description || ''),
        image: String(image)
      };

      products.push(product);
      await persist.saveData('products', products);
      await logAdminActivity('admin-add-product');
      res.status(201).json({ ok: true, product });
    } catch (err) { next(err); }
  });

  // DELETE /api/admin/products/:id
  app.delete('/api/admin/products/:id', async (req, res, next) => {
    try {
      if (requireAdmin(req, res).error) return;

      const id = req.params.id;
      const products = await persist.loadData('products');
      const idx = products.findIndex(p => p.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Product not found' });

      products.splice(idx, 1);
      await persist.saveData('products', products);

      // הסרת המוצר מכל הסלים
      const carts = await persist.loadData('carts'); // [{username, items:[]}]
      let changed = false;
      for (const c of carts) {
        if (Array.isArray(c.items)) {
          const before = c.items.length;
          c.items = c.items.filter(pid => pid !== id);
          if (c.items.length !== before) changed = true;
        }
      }
      if (changed) await persist.saveData('carts', carts);

      await logAdminActivity('admin-remove-product');
      res.json({ ok: true });
    } catch (err) { next(err); }
  });
};
