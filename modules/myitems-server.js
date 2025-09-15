// modules/myitems-server.js
// "הרכישות שלי": מאחד רכישות עם פרטי מוצרים ומחזיר רשימה מפורטת
// מעודכן לתמיכה בעוגות מותאמות ורכישות חדשות מדף התשלום

const persist = require('../persist_module');
const fs = require('fs');
const path = require('path');

const PURCHASES_FILE = path.join(__dirname, '..', 'data', 'purchases.json');

// יצירת תיקיית data אם לא קיימת
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// פונקציה לקריאת רכישות מהקובץ החדש
function loadNewPurchases() {
  try {
    if (!fs.existsSync(PURCHASES_FILE)) {
      return {};
    }
    const data = fs.readFileSync(PURCHASES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading new purchases:', error);
    return {};
  }
}

// פונקציה לשמירת רכישות לקובץ החדש
function saveNewPurchases(purchases) {
  try {
    fs.writeFileSync(PURCHASES_FILE, JSON.stringify(purchases, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving new purchases:', error);
    return false;
  }
}

module.exports = (app) => {
  // API לשמירת רכישה חדשה מדף התשלום
  app.post('/api/save-purchase', (req, res) => {
    const { items } = req.body;
    const username = req.cookies?.session;
    
    if (!username) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }
    
    try {
      // קריאה לרכישות קיימות
      const purchases = loadNewPurchases();
      
      // יצירת רשימה למשתמש אם לא קיימת
      if (!purchases[username]) {
        purchases[username] = [];
      }
      
      // הוספת תאריך רכישה לכל פריט
      const itemsWithTimestamp = items.map(item => ({
        ...item,
        purchaseDate: new Date().toISOString(),
        purchaseId: Date.now() + Math.random().toString(36).substr(2, 9)
      }));
      
      // הוספת הרכישות החדשות
      purchases[username].push(...itemsWithTimestamp);
      
      // שמירה לקובץ
      const success = saveNewPurchases(purchases);
      
      if (success) {
        console.log(`Saved ${items.length} purchase items for user: ${username}`);
        res.json({ 
          success: true, 
          message: 'Purchase saved successfully',
          itemCount: items.length
        });
      } else {
        res.status(500).json({ error: 'Failed to save purchase to file' });
      }
      
    } catch (error) {
      console.error('Error in save-purchase API:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/my-items - מעודכן לתמיכה ברכישות חדשות וישנות
  app.get('/api/my-items', async (req, res, next) => {
    try {
      const username = req.cookies?.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      const result = [];

      // ===== חלק 1: רכישות ישנות ממערכת persist =====
      try {
        const purchases = await persist.getPurchases(username);
        const products = await persist.getProducts();
        
        // קבלת עוגות מותאמות ישנות
        const customCakes = await persist.loadData('customCakes');
        const userCustomCakes = Array.isArray(customCakes) 
          ? customCakes.filter(cake => cake.username === username && cake.status === 'purchased')
          : [];

        const byId = new Map(products.map(p => [p.id, p]));
        const customCakeById = new Map(userCustomCakes.map(cake => [cake.id, cake]));

        for (const pur of purchases) {
          const date = pur.date;
          for (const id of (pur.items || [])) {
            if (id.startsWith('custom-cake-')) {
              // עוגה מותאמת ישנה
              const customCake = customCakeById.get(id);
              if (customCake) {
                const design = customCake.design;
                result.push({
                  id: customCake.id,
                  title: `עוגה מותאמת ${design.size === 'bento' ? 'בנטו' : 'גדולה'} - ${design.color}`,
                  description: design.text ? `עם הכיתוב: "${design.text}"` : 'ללא כיתוב',
                  image: design.imageFile || `cake-${design.color}.jpg`,
                  price: design.price,
                  date,
                  type: 'custom-cake',
                  customDesign: design,
                  source: 'legacy'
                });
              }
            } else {
              // מוצר רגיל ישן
              const prod = byId.get(id);
              if (prod) {
                result.push({
                  id: prod.id,
                  title: prod.title,
                  description: prod.description,
                  image: prod.image,
                  date,
                  type: 'regular',
                  source: 'legacy'
                });
              }
            }
          }
        }
      } catch (error) {
        console.log('No legacy purchases found or error loading them:', error.message);
      }

      // ===== חלק 2: רכישות חדשות מדף התשלום =====
      try {
        const newPurchases = loadNewPurchases();
        const userNewPurchases = newPurchases[username] || [];
        
        for (const item of userNewPurchases) {
          result.push({
            id: item.id,
            title: item.title,
            description: item.customDesign ? 
              `${item.customDesign.colorName || item.customDesign.color}${item.customDesign.text ? ` - "${item.customDesign.text}"` : ''}` :
              item.description || '',
            image: item.image,
            price: item.price,
            date: item.purchaseDate || item.date,
            type: item.type || 'regular',
            customDesign: item.customDesign,
            purchaseId: item.purchaseId,
            source: 'new'
          });
        }
      } catch (error) {
        console.log('No new purchases found or error loading them:', error.message);
      }

      // מיון לפי תאריך ירד (אחרון ראשון)
      result.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      });

      console.log(`Loaded ${result.length} total purchase items for user: ${username}`);
      return res.json(result);
    } catch (err) {
      console.error('Error in my-items API:', err);
      res.status(500).json({ error: 'Failed to load purchases' });
    }
  });

  // API למחיקת רכישה מהמערכת החדשה (אופציונלי)
  app.delete('/api/delete-purchase/:purchaseId', (req, res) => {
    const { purchaseId } = req.params;
    const username = req.cookies?.session;
    
    if (!username) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    try {
      const purchases = loadNewPurchases();
      
      if (!purchases[username]) {
        return res.status(404).json({ error: 'No purchases found' });
      }
      
      const initialLength = purchases[username].length;
      purchases[username] = purchases[username].filter(item => item.purchaseId !== purchaseId);
      
      if (purchases[username].length === initialLength) {
        return res.status(404).json({ error: 'Purchase not found' });
      }
      
      const success = saveNewPurchases(purchases);
      
      if (success) {
        res.json({ success: true, message: 'Purchase deleted successfully' });
      } else {
        res.status(500).json({ error: 'Failed to save changes' });
      }
      
    } catch (error) {
      console.error('Error in delete-purchase API:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};