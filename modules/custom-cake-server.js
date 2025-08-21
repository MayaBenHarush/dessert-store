// modules/custom-cake-server.js
// מודול לטיפול בהזמנות עוגות מותאמות אישית

const persist = require('../persist_module');

module.exports = (app) => {
  const asArray = (x) => (Array.isArray(x) ? x : []);

  // פונקציה לטיפול בהוספת עוגה מותאמת דרך API הרגיל של העגלה
  async function handleCustomCake(req, res, next) {
    try {
      const username = req.cookies.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      const { customDesign } = req.body || {};
      if (!customDesign) {
        return res.status(400).json({ error: 'Custom design data required' });
      }

      // וולידציה של נתוני העיצוב (מעודכן עם צבע כיתוב)
      const { size, color, text, textColor, price, imageFile } = customDesign;
      
      if (!size || !color || price === undefined) {
        return res.status(400).json({ error: 'Missing required design parameters' });
      }

      if (text && text.length > 20) {
        return res.status(400).json({ error: 'Text too long (max 20 characters)' });
      }

      // יצירת ID ייחודי לעוגה המותאמת
      const customCakeId = `custom-cake-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // שמירת פרטי העוגה המותאמת (מעודכן)
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
          imageFile: imageFile || `cake-${color}.jpg`
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

      // לוג פעילות (מעודכן)
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

  // POST /api/custom-cake - הוספת עוגה מותאמת לסל
  app.post('/api/custom-cake', handleCustomCake);

  // GET /api/custom-cake/:id - קבלת פרטי עוגה מותאמת
  app.get('/api/custom-cake/:id', async (req, res, next) => {
    try {
      const username = req.cookies.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      const customCakeId = req.params.id;
      const customCakes = asArray(await persist.loadData('customCakes'));
      
      const customCake = customCakes.find(cake => 
        cake.id === customCakeId && cake.username === username
      );

      if (!customCake) {
        return res.status(404).json({ error: 'Custom cake not found' });
      }

      res.json(customCake);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/my-custom-cakes - קבלת כל העוגות המותאמות של המשתמש
  app.get('/api/my-custom-cakes', async (req, res, next) => {
    try {
      const username = req.cookies.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      const customCakes = asArray(await persist.loadData('customCakes'));
      const userCakes = customCakes
        .filter(cake => cake.username === username)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.json(userCakes);
    } catch (err) {
      next(err);
    }
  });

  // עדכון מודול העגלה לתמיכה בעוגות מותאמות
  app.get('/api/cart-with-custom', async (req, res, next) => {
    try {
      const username = req.cookies.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      let carts = asArray(await persist.loadData('carts'));
      const cart = carts.find(c => c.username === username);
      const items = cart && Array.isArray(cart.items) ? cart.items.map(String) : [];
      
      // חלוקה בין מוצרים רגילים לעוגות מותאמות
      const regularItems = items.filter(id => !id.startsWith('custom-cake-'));
      const customCakeIds = items.filter(id => id.startsWith('custom-cake-'));
      
      // חישוב כמויות מוצרים רגילים
      const quantities = {};
      regularItems.forEach(id => {
        quantities[id] = (quantities[id] || 0) + 1;
      });

      // קבלת פרטי עוגות מותאמות
      const customCakes = asArray(await persist.loadData('customCakes'));
      const customCakeDetails = customCakeIds.map(id => {
        const cake = customCakes.find(c => c.id === id && c.username === username);
        return cake ? {
          id: cake.id,
          type: 'custom-cake',
          design: cake.design,
          createdAt: cake.createdAt
        } : null;
      }).filter(Boolean);
      
      res.json({
        regularItems: quantities,
        customCakes: customCakeDetails
      });
    } catch (err) {
      next(err);
    }
  });

  // מחיקת עוגה מותאמת מהסל
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

  // חשיפת הפונקציה לשימוש חיצוני
  return { handleCustomCake };
};