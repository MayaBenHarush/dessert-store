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

  // GET /api/cart-with-custom – החזרת מוצרים רגילים ועוגות מותאמות
  app.get('/api/cart-with-custom', async (req, res, next) => {
    try {
      const username = req.cookies.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      // קבלת עגלה רגילה
      let carts = asArray(await persist.loadData('carts'));
      const cart = carts.find(c => c.username === username);
      const items = cart && Array.isArray(cart.items) ? cart.items.map(String) : [];
      
      // הפרדה בין מוצרים רגילים לעוגות מותאמות
      const regularItems = items.filter(id => !id.startsWith('custom-cake-'));
      const customCakeIds = items.filter(id => id.startsWith('custom-cake-'));
      
      // חישוב כמויות מוצרים רגילים
      const quantities = {};
      regularItems.forEach(id => {
        quantities[id] = (quantities[id] || 0) + 1;
      });

      // קבלת עוגות מותאמות
      const customCakes = asArray(await persist.loadData('customCakes'));
      const userCustomCakes = customCakes.filter(cake => 
        cake.username === username && 
        cake.status === 'in-cart' &&
        customCakeIds.includes(cake.id)
      );
      
      res.json({
        regularItems: quantities,
        customCakes: userCustomCakes
      });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/cart – הוספה לסל (כולל עוגות מותאמות)
  app.post('/api/cart', async (req, res, next) => {
    try {
      const username = req.cookies.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      const { productId, customDesign } = req.body || {};
      
      // טיפול בעוגות מותאמות
      if (productId === 'custom-cake' && customDesign) {
        return await handleCustomCakeAddition(req, res, next);
      }

      // טיפול במוצרים רגילים
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

      cart.items.push(id);
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

  // פונקציה פנימית לטיפול בהוספת עוגות מותאמות
  async function handleCustomCakeAddition(req, res, next) {
    try {
      const username = req.cookies.session;
      const { customDesign } = req.body;

      // וולידציה של נתוני העיצוב
      const { size, color, text, textColor, price, imageFile } = customDesign;
      
      if (!size || !color || price === undefined) {
        return res.status(400).json({ error: 'Missing required design parameters' });
      }

      if (text && text.length > 20) {
        return res.status(400).json({ error: 'Text too long (max 20 characters)' });
      }

      // יצירת ID ייחודי לעוגה המותאמת
      const customCakeId = `custom-cake-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // שמירת פרטי העוגה המותאמת
      let customCakes = asArray(await persist.loadData('customCakes'));
      const customCakeData = {
        id: customCakeId,
        username,
        design: {
          size,
          color,
          text: text || '',
          textColor: textColor || '#333333',
          price,
          imageFile: imageFile || `cake-${color}.png`
        },
        createdAt: new Date().toISOString(),
        status: 'in-cart'
      };

      customCakes.push(customCakeData);
      await persist.saveData('customCakes', customCakes);

      // הוספה לסל
      let carts = asArray(await persist.loadData('carts'));
      let cart = carts.find(c => c.username === username);
      if (!cart) {
        cart = { username, items: [] };
        carts.push(cart);
      }
      if (!Array.isArray(cart.items)) cart.items = [];

      cart.items.push(customCakeId);
      await persist.saveData('carts', carts);

      // לוג פעילות
      let activity = asArray(await persist.loadData('activity'));
      activity.push({ 
        datetime: new Date().toISOString(), 
        username, 
        type: 'add-custom-cake-to-cart',
        details: `${size} ${color} cake with "${text || 'no text'}" in ${textColor}`
      });
      await persist.saveData('activity', activity);

      res.json({ 
        ok: true, 
        customCakeId,
        productTitle: `עוגה מותאמת ${size === 'bento' ? 'בנטו' : 'גדולה'} - ${color}`,
        design: customDesign
      });
    } catch (err) {
      next(err);
    }
  }

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

  // POST /api/cart/decrease/:id – הפחתת יחידה אחת מהסל
  app.post('/api/cart/decrease/:id', async (req, res, next) => {
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

  // DELETE /api/cart/removeAll/:id – הסרת כל היחידות של מוצר מהסל
  app.delete('/api/cart/removeAll/:id', async (req, res, next) => {
    try {
      const username = req.cookies.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      const id = String(req.params.id || '');
      let carts = asArray(await persist.loadData('carts'));
      const cart = carts.find(c => c.username === username);
      
      if (!cart || !Array.isArray(cart.items)) {
        return res.status(404).json({ error: 'Cart not found' });
      }

      // הסרת כל המופעים של המוצר
      const originalLength = cart.items.length;
      cart.items = cart.items.filter(pid => String(pid) !== id);
      
      if (cart.items.length !== originalLength) {
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

  // DELETE /api/custom-cake/:id – הסרת עוגה מותאמת מהסל
  app.delete('/api/custom-cake/:id', async (req, res, next) => {
    try {
      const username = req.cookies.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      const customCakeId = req.params.id;

      // הסרה מהסל
      let carts = asArray(await persist.loadData('carts'));
      const cart = carts.find(c => c.username === username);
      if (cart && Array.isArray(cart.items)) {
        const index = cart.items.findIndex(id => String(id) === customCakeId);
        if (index !== -1) {
          cart.items.splice(index, 1);
          await persist.saveData('carts', carts);
        }
      }

      // עדכון סטטוס העוגה
      let customCakes = asArray(await persist.loadData('customCakes'));
      const cakeIndex = customCakes.findIndex(cake => 
        cake.id === customCakeId && cake.username === username
      );
      
      if (cakeIndex !== -1) {
        customCakes[cakeIndex].status = 'removed-from-cart';
        await persist.saveData('customCakes', customCakes);
      }

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // PATCH /api/custom-cake/:id – עדכון סטטוס עוגה מותאמת
  app.patch('/api/custom-cake/:id', async (req, res, next) => {
    try {
      const username = req.cookies.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      const customCakeId = req.params.id;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      // עדכון סטטוס העוגה
      let customCakes = asArray(await persist.loadData('customCakes'));
      const cakeIndex = customCakes.findIndex(cake => 
        cake.id === customCakeId && cake.username === username
      );
      
      if (cakeIndex !== -1) {
        customCakes[cakeIndex].status = status;
        await persist.saveData('customCakes', customCakes);
        res.json({ ok: true, status });
      } else {
        res.status(404).json({ error: 'Custom cake not found' });
      }
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/cart – ניקוי הסל במלואו
  app.delete('/api/cart', async (req, res, next) => {
    try {
      const username = req.cookies.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      let carts = asArray(await persist.loadData('carts'));
      const cartIndex = carts.findIndex(c => c.username === username);
      
      if (cartIndex !== -1) {
        carts[cartIndex].items = [];
        await persist.saveData('carts', carts);
      }

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/clear-cart-items – ניקוי פריטים ספציפיים מהסל (לאחר תשלום)
  app.post('/api/clear-cart-items', async (req, res, next) => {
    try {
      const username = req.cookies.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      const { itemsToRemove } = req.body;
      if (!itemsToRemove || !Array.isArray(itemsToRemove)) {
        return res.status(400).json({ error: 'itemsToRemove array is required' });
      }

      console.log('Clearing cart items for user:', username);
      console.log('Items to remove:', itemsToRemove);

      // רשימת המזהים לניקוי
      const idsToRemove = new Set(itemsToRemove.map(String));

      // הסרה מהסל
      let carts = asArray(await persist.loadData('carts'));
      const cart = carts.find(c => c.username === username);
      
      if (cart && Array.isArray(cart.items)) {
        const originalLength = cart.items.length;
        cart.items = cart.items.filter(id => !idsToRemove.has(String(id)));
        console.log(`Cart items before: ${originalLength}, after: ${cart.items.length}`);
        await persist.saveData('carts', carts);
      }

      // עדכון סטטוס עוגות מותאמות
      const customCakeIds = itemsToRemove.filter(id => String(id).startsWith('custom-cake-'));
      if (customCakeIds.length > 0) {
        let customCakes = asArray(await persist.loadData('customCakes'));
        let updated = false;
        
        customCakes.forEach(cake => {
          if (cake.username === username && customCakeIds.includes(cake.id)) {
            cake.status = 'purchased';
            updated = true;
          }
        });
        
        if (updated) {
          await persist.saveData('customCakes', customCakes);
          console.log('Updated custom cakes status to purchased');
        }
      }

      res.json({ ok: true, removedCount: itemsToRemove.length });
    } catch (err) {
      next(err);
    }
  });
};