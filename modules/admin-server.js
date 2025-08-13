// modules/admin-server.js
// ⚙️ Admin API: פעילות משתמשים + ניהול מוצרים (הוספה/מחיקה).
// גישה רק למשתמש 'admin' לפי העוגייה session.

const persist = require('../persist_module');

// בדיקת הרשאת מנהל
function requireAdmin(req, res) {
  const username = req.cookies?.session;
  if (!username) return { error: res.status(401).json({ error: 'Not logged in' }) };
  if (username !== 'admin') return { error: res.status(403).json({ error: 'Admin only' }) };
  return { username };
}

module.exports = (app) => {
  // GET /api/admin/activity?prefix=abc
  // מחזיר לוג פעילות; סינון לפי תחילת שם משתמש (prefix)
  app.get('/api/admin/activity', async (req, res, next) => {
    try {
      if (requireAdmin(req, res).error) return;

      const prefix = (req.query.prefix || '').toLowerCase();
      const activity = await persist.loadData('activity'); // Array of {datetime, username, type}

      let rows = activity;
      if (prefix) {
        rows = rows.filter(r => (r.username || '').toLowerCase().startsWith(prefix));
      }
      rows.sort((a, b) => String(b.datetime).localeCompare(String(a.datetime))); // חדש->ישן

      res.json(rows);
    } catch (err) { next(err); }
  });

  // GET /api/admin/products – רשימת מוצרים מלאה
  app.get('/api/admin/products', async (req, res, next) => {
    try {
      if (requireAdmin(req, res).error) return;

      const products = await persist.getProducts();
      res.json(products);
    } catch (err) { next(err); }
  });

  // POST /api/admin/products – הוספת מוצר חדש
  // body: { id?(אופציונלי), title, description?, image }
  // image יכול להיות שם קובץ מתיקיית public/images או URL מלא.
  app.post('/api/admin/products', async (req, res, next) => {
    try {
      if (requireAdmin(req, res).error) return;

      const { id, title, description, image } = req.body || {};
      if (!title || !image) {
        return res.status(400).json({ error: 'title and image are required' });
      }

      // יצירה דרך שכבת persist (מטפלת ב-id ייחודי וכו׳)
      const product = await persist.addProduct({ id, title, description, image });

      // לוג פעילות
      await persist.logActivity({
        datetime: new Date().toISOString(),
        username: 'admin',
        type: 'admin-add-product'
      });

      res.status(201).json({ ok: true, product });
    } catch (err) { next(err); }
  });

  // DELETE /api/admin/products/:id – מחיקת מוצר, וגם ניקוי מכל הסלים
  app.delete('/api/admin/products/:id', async (req, res, next) => {
    try {
      if (requireAdmin(req, res).error) return;

      const id = req.params.id;

      // הסר את המוצר ממאגר המוצרים
      const removed = await persist.removeProduct(id);
      if (!removed) return res.status(404).json({ error: 'Product not found' });

      // ניקוי המוצר מכל הסלים (carts הוא אובייקט: { username: [ids] })
      const cartsObj = await persist.loadData('carts');
      let changed = false;
      for (const user of Object.keys(cartsObj || {})) {
        const before = Array.isArray(cartsObj[user]) ? cartsObj[user] : [];
        const after = before.filter(pid => pid !== id);
        if (after.length !== before.length) {
          cartsObj[user] = after;
          changed = true;
        }
      }
      if (changed) await persist.saveData('carts', cartsObj);

      // לוג פעילות
      await persist.logActivity({
        datetime: new Date().toISOString(),
        username: 'admin',
        type: 'admin-remove-product'
      });

      res.json({ ok: true });
    } catch (err) { next(err); }
  });
};
