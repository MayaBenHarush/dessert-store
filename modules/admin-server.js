// modules/admin-server.js
//admin/admin. גישה לראוטים האלה רק אם session === 'admin'.
const persist = require('../persist_module');
const path = require('path');
const fs = require('fs').promises;

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

  // פונקציה לטיפול במחירים - וודא שהמחיר תמיד מספר תקין
  function validatePrice(price) {
    if (price === undefined || price === null || price === '') {
      return 0; // ברירת מחדל
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      throw new Error('מחיר חייב להיות מספר חיובי');
    }
    return numPrice;
  }

  // פונקציה לטיפול בmultipart/form-data בלי חבילות חיצוניות
  function parseMultipartData(req) {
    return new Promise((resolve, reject) => {
      if (!req.headers['content-type']?.includes('multipart/form-data')) {
        return resolve({ fields: {}, files: {} });
      }

      const boundary = req.headers['content-type'].split('boundary=')[1];
      if (!boundary) {
        return reject(new Error('No boundary found'));
      }

      let data = Buffer.alloc(0);
      
      req.on('data', chunk => {
        data = Buffer.concat([data, chunk]);
      });

      req.on('end', () => {
        try {
          const parts = data.toString('binary').split('--' + boundary);
          const fields = {};
          const files = {};

          for (const part of parts) {
            if (!part.includes('Content-Disposition')) continue;

            const lines = part.split('\r\n');
            const dispositionLine = lines.find(line => line.includes('Content-Disposition'));
            
            if (!dispositionLine) continue;

            const nameMatch = dispositionLine.match(/name="([^"]+)"/);
            const filenameMatch = dispositionLine.match(/filename="([^"]+)"/);

            if (!nameMatch) continue;

            const fieldName = nameMatch[1];
            const isFile = !!filenameMatch;

            // מצא את האינדקס שבו מתחיל התוכן הממשי
            const headerEndIndex = part.indexOf('\r\n\r\n');
            if (headerEndIndex === -1) continue;

            const content = part.substring(headerEndIndex + 4);
            const cleanContent = content.substring(0, content.lastIndexOf('\r\n'));

            if (isFile) {
              const filename = filenameMatch[1];
              const contentType = lines.find(line => line.includes('Content-Type'))?.split(': ')[1] || '';
              
              // בדיקה שזה קובץ תמונה
              if (!contentType.startsWith('image/')) {
                return reject(new Error('רק קבצי תמונה מותרים'));
              }

              files[fieldName] = {
                filename,
                contentType,
                data: Buffer.from(cleanContent, 'binary')
              };
            } else {
              fields[fieldName] = cleanContent;
            }
          }

          resolve({ fields, files });
        } catch (error) {
          reject(error);
        }
      });

      req.on('error', reject);
    });
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
      
      // וודא שלכל מוצר יש מחיר תקין
      const productsWithPrices = products.map(p => ({
        ...p,
        price: validatePrice(p.price)
      }));
      
      res.json(productsWithPrices);
    } catch (err) { next(err); }
  });

  // POST /api/admin/products - עם תמיכה בהעלאת קבצים בלי חבילות חיצוניות
  app.post('/api/admin/products', async (req, res, next) => {
    try {
      if (requireAdmin(req, res).error) return;

      let body, imageFile;

      // בדיקה אם זה multipart (העלאת קובץ) או JSON רגיל
      if (req.headers['content-type']?.includes('multipart/form-data')) {
        const { fields, files } = await parseMultipartData(req);
        body = fields;
        imageFile = files.image;
      } else {
        body = req.body || {};
      }

      let { id, title, description, image, price } = body;

      // אם הועלה קובץ, שמור אותו ושתמש בשם החדש
      if (imageFile && imageFile.data) {
        // וודא שתיקיית התמונות קיימת
        const uploadsDir = './public/images/';
        try {
          await fs.access(uploadsDir);
        } catch {
          await fs.mkdir(uploadsDir, { recursive: true });
        }

        // צור שם ייחודי לקובץ
        const timestamp = Date.now();
        const randomNum = Math.round(Math.random() * 1E9);
        const ext = path.extname(imageFile.filename) || '.jpg';
        const uniqueFilename = `${timestamp}-${randomNum}${ext}`;
        const filePath = path.join(uploadsDir, uniqueFilename);

        // שמור את הקובץ
        await fs.writeFile(filePath, imageFile.data);
        image = uniqueFilename;
      }

      if (!title || !image) {
        return res.status(400).json({ error: 'title and image are required' });
      }

      // וולידציה של מחיר
      let productPrice;
      try {
        productPrice = validatePrice(price);
      } catch (error) {
        return res.status(400).json({ error: error.message });
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
        image: String(image),
        price: productPrice
      };

      products.push(product);
      await persist.saveData('products', products);
      await logAdminActivity('admin-add-product');
      res.status(201).json({ ok: true, product });
    } catch (err) { 
      console.error('Error in POST /api/admin/products:', err);
      res.status(500).json({ error: err.message || 'שגיאה בהוספת המוצר' });
    }
  });

  // PUT /api/admin/products/:id - עדכון מוצר קיים
  app.put('/api/admin/products/:id', async (req, res, next) => {
    try {
      if (requireAdmin(req, res).error) return;

      const productId = req.params.id;
      const { title, description, image, price } = req.body;

      const products = await persist.loadData('products');
      const productIndex = products.findIndex(p => p.id === productId);
      
      if (productIndex === -1) {
        return res.status(404).json({ error: 'מוצר לא נמצא' });
      }

      const existingProduct = products[productIndex];

      // עדכן רק את השדות שנשלחו
      if (title !== undefined) {
        existingProduct.title = String(title);
      }
      if (description !== undefined) {
        existingProduct.description = String(description);
      }
      if (image !== undefined) {
        existingProduct.image = String(image);
      }
      if (price !== undefined) {
        try {
          existingProduct.price = validatePrice(price);
        } catch (error) {
          return res.status(400).json({ error: error.message });
        }
      }

      products[productIndex] = existingProduct;
      await persist.saveData('products', products);
      await logAdminActivity('admin-update-product');
      
      res.json({ ok: true, product: existingProduct });
    } catch (err) {
      console.error('Error in PUT /api/admin/products/:id:', err);
      res.status(500).json({ error: err.message || 'שגיאה בעדכון המוצר' });
    }
  });

  // DELETE /api/admin/products/:id
  app.delete('/api/admin/products/:id', async (req, res, next) => {
    try {
      if (requireAdmin(req, res).error) return;

      const id = req.params.id;
      const products = await persist.loadData('products');
      const idx = products.findIndex(p => p.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Product not found' });

      const product = products[idx];
      products.splice(idx, 1);
      await persist.saveData('products', products);

      // ניסיון למחוק את קובץ התמונה (אם זה לא URL חיצוני)
      if (product.image && !product.image.startsWith('http')) {
        try {
          const imagePath = path.join('./public/images/', product.image);
          await fs.unlink(imagePath);
        } catch (e) {
          // זה בסדר אם הקובץ לא קיים או לא ניתן למחיקה
          console.log('Could not delete image file:', product.image);
        }
      }

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

  // תיקון מחירים קיימים - endpoint חדש לתיקון מוצרים ללא מחיר
  app.post('/api/admin/fix-prices', async (req, res, next) => {
    try {
      if (requireAdmin(req, res).error) return;

      const products = await persist.loadData('products');
      let fixedCount = 0;

      for (const product of products) {
        if (product.price === undefined || product.price === null || isNaN(Number(product.price))) {
          product.price = 0; // ברירת מחדל
          fixedCount++;
        } else {
          product.price = Number(product.price); // וודא שזה מספר
        }
      }

      if (fixedCount > 0) {
        await persist.saveData('products', products);
        await logAdminActivity('admin-fix-prices');
      }

      res.json({ 
        ok: true, 
        message: `תוקנו ${fixedCount} מוצרים`,
        fixedCount 
      });
    } catch (err) { 
      next(err); 
    }
  });
};