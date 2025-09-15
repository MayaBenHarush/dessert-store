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
  app.post('/api/save-purchase', async (req, res) => {
    const { items } = req.body;
    const username = req.cookies?.session;
    
    console.log('Save purchase called for user:', username);
    console.log('Items to save:', items);
    
    if (!username) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }
    
    try {
      // שמירה גם במערכת persist (ישנה) וגם בקובץ החדש
      
      // 1. שמירה במערכת persist הישנה
      try {
        let persistPurchases = await persist.loadData('purchases') || {};
        if (!persistPurchases[username]) {
          persistPurchases[username] = [];
        }
        
        // הוספת כל פריט בנפרד עם התאריך
        items.forEach(item => {
          persistPurchases[username].push({
            ...item,
            purchaseDate: new Date().toISOString(),
            purchaseId: Date.now() + Math.random().toString(36).substr(2, 9)
          });
        });
        
        await persist.saveData('purchases', persistPurchases);
        console.log('Saved to persist system successfully');
      } catch (persistError) {
        console.error('Error saving to persist system:', persistError);
      }
      
      // 2. שמירה בקובץ החדש
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
        
        // רישום פעילות
        try {
          let activity = await persist.loadData('activity') || [];
          activity.push({
            datetime: new Date().toISOString(),
            username,
            type: 'purchase',
            itemCount: items.length
          });
          await persist.saveData('activity', activity);
        } catch (actError) {
          console.warn('Failed to log activity:', actError);
        }
        
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

  // GET /api/my-items - מעודכן לתמיכה ברכישות חדשות וישנות לכל המשתמשים
  app.get('/api/my-items', async (req, res, next) => {
    try {
      const username = req.cookies?.session;
      if (!username) {
        console.log('No session found, user not logged in');
        return res.status(401).json({ error: 'Not logged in' });
      }

      console.log('Loading purchases for user:', username);
      const result = [];

      // ===== חלק 1: רכישות ישנות ממערכת persist =====
      try {
        // טעינת רכישות ישנות - לא משתמש ב-getPurchases אלא קורא ישירות
        const allPurchases = await persist.loadData('purchases') || {};
        const userPurchases = allPurchases[username] || [];
        
        console.log('Found', userPurchases.length, 'legacy purchases for user:', username);
        
        const products = await persist.getProducts();
        
        // קבלת עוגות מותאמות ישנות
        const customCakes = await persist.loadData('customCakes') || [];
        const userCustomCakes = Array.isArray(customCakes) 
          ? customCakes.filter(cake => cake.username === username && cake.status === 'purchased')
          : [];

        const byId = new Map(products.map(p => [p.id, p]));
        const customCakeById = new Map(userCustomCakes.map(cake => [cake.id, cake]));

        // עיבוד רכישות ישנות
        for (const item of userPurchases) {
          if (item.type === 'custom') {
            // עוגה מותאמת חדשה
            result.push({
              id: item.id,
              title: item.title,
              description: item.customDesign ? 
                `${item.customDesign.colorName || item.customDesign.color}${item.customDesign.text ? ` - "${item.customDesign.text}"` : ''}` :
                item.description || '',
              image: item.image,
              price: item.price,
              date: item.purchaseDate || item.date,
              type: 'custom',
              customDesign: item.customDesign,
              purchaseId: item.purchaseId,
              source: 'legacy-new'
            });
          } else {
            // מוצר רגיל
            const prod = byId.get(item.id);
            if (prod || item.title) {
              result.push({
                id: item.id,
                title: item.title || (prod ? prod.title : item.id),
                description: item.description || (prod ? prod.description : ''),
                image: item.image || (prod ? prod.image : 'placeholder.png'),
                price: item.price || (prod ? prod.price : 0),
                date: item.purchaseDate || item.date,
                type: 'regular',
                purchaseId: item.purchaseId,
                source: 'legacy'
              });
            }
          }
        }

        // עיבוד עוגות מותאמות ישנות נפרדות
        for (const customCake of userCustomCakes) {
          const design = customCake.design;
          // בדוק שלא כבר נוספה כחלק מהרכישות
          if (!result.find(item => item.id === customCake.id)) {
            result.push({
              id: customCake.id,
              title: `עוגה מותאמת ${design.size === 'bento' ? 'בנטו' : 'גדולה'} - ${design.color}`,
              description: design.text ? `עם הכיתוב: "${design.text}"` : 'ללא כיתוב',
              image: design.imageFile || `cake-${design.color}.jpg`,
              price: design.price,
              date: customCake.createdAt || new Date().toISOString(),
              type: 'custom-cake',
              customDesign: design,
              source: 'legacy-custom'
            });
          }
        }
      } catch (error) {
        console.log('Error loading legacy purchases:', error.message);
      }

      // ===== חלק 2: רכישות חדשות מדף התשלום =====
      try {
        const newPurchases = loadNewPurchases();
        const userNewPurchases = newPurchases[username] || [];
        
        console.log('Found', userNewPurchases.length, 'new purchases for user:', username);
        
        for (const item of userNewPurchases) {
          // וודא שלא כבר קיים (למניעת כפילויות)
          if (!result.find(existing => existing.purchaseId === item.purchaseId)) {
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
        }
      } catch (error) {
        console.log('Error loading new purchases:', error.message);
      }

      // מיון לפי תאריך ירד (אחרון ראשון)
      result.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      });

      console.log(`Total ${result.length} purchase items loaded for user: ${username}`);
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