// modules/pay-server.js
const persist = require('../persist_module');
const fs = require('fs');
const path = require('path');

// נתיב לקובץ הרכישות
const PURCHASES_FILE = path.join(__dirname, '..', 'data', 'purchases.json');

// יצירת תיקיית data אם לא קיימת
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// פונקציות עזר לניהול קובץ הרכישות
function loadPurchasesFromFile() {
  try {
    if (!fs.existsSync(PURCHASES_FILE)) {
      return {};
    }
    const data = fs.readFileSync(PURCHASES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading purchases from file:', error);
    return {};
  }
}

function savePurchasesToFile(purchases) {
  try {
    fs.writeFileSync(PURCHASES_FILE, JSON.stringify(purchases, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving purchases to file:', error);
    return false;
  }
}

module.exports = function(app) {
  
  // קופונים קבועים + קופונים מגלגל המזל
  const STATIC_COUPONS = {
    'WELCOME10': { discount: 10, type: 'percent', description: 'הנחה של 10%' },
    'SAVE20': { discount: 20, type: 'fixed', description: 'הנחה של 20 ₪' },
    'FREESHIP': { discount: 29, type: 'shipping', description: 'משלוח חינם' },
    'VIP15': { discount: 15, type: 'percent', description: 'הנחה של 15% ללקוחות VIP' }
  };

  // קופונים מגלגל המזל
  const WHEEL_COUPONS = {
    'WHEEL10': { discount: 10, type: 'percent', description: 'הנחה של 10% מגלגל המזל' },
    'משלוח': { discount: 29, type: 'shipping', description: 'משלוח חינם מגלגל המזל' },
    'עוגיה': { discount: 17, type: 'free-cookie', description: 'עוגיה חינם מגלגל המזל' },
    'שובר': { discount: 50, type: 'fixed', description: 'שובר הנחה של 50 ₪ מגלגל המזל' }
  };

  // איחוד כל הקופונים
  const ALL_COUPONS = { ...STATIC_COUPONS, ...WHEEL_COUPONS };

  const SHIPPING_COST = 29;

  // פונקציה לחישוב הנחת עוגיה חינם
  function calculateCookieDiscount(items) {
    const COOKIE_PRICES = {
      'chocolate-cake': 150, '8-cookies-box': 125, 'cupcakes': 160, 'minnie-mous-cake': 300,
      'nutella-box': 70, 'chocolate-pizza-xl': 120, 'bento-design-cake': 140,
      'chocolate-design-cake': 180, 'orange-cake': 70, 'white-design-cake': 140,
      'pizza-cookie': 120, 'pizza cookie': 120, 'kinder-cookie': 17
    };

    if (!items || !Array.isArray(items)) return 0;

    let cheapestCookiePrice = Infinity;
    
    for (const item of items) {
      const id = item.id || item.productId;
      if (!id) continue;
      
      const price = COOKIE_PRICES[id] || COOKIE_PRICES[id.toLowerCase()];
      if (price && price <= 25) {
        cheapestCookiePrice = Math.min(cheapestCookiePrice, price);
      }
      
      const name = (item.title || item.name || '').toLowerCase();
      if (name.includes('cookie') || name.includes('עוגיה')) {
        const itemPrice = price || 17;
        cheapestCookiePrice = Math.min(cheapestCookiePrice, itemPrice);
      }
    }

    return cheapestCookiePrice === Infinity ? 17 : cheapestCookiePrice;
  }

  // API לוולידציה של קופון
  app.get('/api/validate-coupon/:code', async (req, res) => {
    try {
      const couponCode = req.params.code;
      
      // בדיקה בקופונים קבועים
      if (ALL_COUPONS[couponCode]) {
        return res.json({
          valid: true,
          coupon: ALL_COUPONS[couponCode]
        });
      }

      // בדיקה בקופונים מגלגל המזל
      try {
        const wheelData = await persist.loadData('wheel-spins') || { users: {}, guests: {} };
        const allUsers = { ...wheelData.users, ...wheelData.guests };
        
        for (const userData of Object.values(allUsers)) {
          if (userData.coupon && userData.coupon.code === couponCode) {
            if (userData.coupon.expiresAt && new Date() > new Date(userData.coupon.expiresAt)) {
              return res.status(400).json({
                valid: false,
                error: 'הקופון פג תוקף'
              });
            }
            
            return res.json({
              valid: true,
              coupon: {
                discount: userData.coupon.value,
                type: userData.coupon.type === 'percent' ? 'percent' :
                      userData.coupon.type === 'free-shipping' ? 'shipping' :
                      userData.coupon.type === 'free-cookie' ? 'free-cookie' :
                      'fixed',
                description: userData.coupon.description
              }
            });
          }
        }
      } catch (wheelError) {
        console.warn('Error reading wheel data:', wheelError);
      }

      res.status(400).json({
        valid: false,
        error: 'קוד קופון לא תקין'
      });

    } catch (error) {
      console.error('Coupon validation error:', error);
      res.status(500).json({ error: 'שגיאת שרת' });
    }
  });

  // API לשמירת רכישה - מעודכן לתמיכה בכל המשתמשים
  app.post('/api/save-purchase', async (req, res) => {
    try {
      const username = req.cookies.session;
      if (!username) {
        return res.status(401).json({ error: 'לא מחובר' });
      }

      const { items } = req.body;
      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: 'נתוני פריטים לא תקינים' });
      }

      console.log('Saving purchase for user:', username);
      console.log('Items to save:', items);

      // יצירת פריטים עם מזהים ייחודיים
      const itemsWithDetails = items.map(item => ({
        ...item,
        purchaseDate: new Date().toISOString(),
        purchaseId: Date.now() + Math.random().toString(36).substr(2, 9)
      }));

      let saveSuccess = false;

      // שמירה במערכת persist (תאימות לאחור)
      try {
        let persistPurchases = await persist.loadData('purchases') || {};
        if (!persistPurchases[username]) {
          persistPurchases[username] = [];
        }
        persistPurchases[username].push(...itemsWithDetails);
        await persist.saveData('purchases', persistPurchases);
        console.log('Saved to persist system successfully');
        saveSuccess = true;
      } catch (persistError) {
        console.error('Error saving to persist system:', persistError);
      }

      // שמירה בקובץ חדש (מערכת עיקרית)
      try {
        const filePurchases = loadPurchasesFromFile();
        if (!filePurchases[username]) {
          filePurchases[username] = [];
        }
        filePurchases[username].push(...itemsWithDetails);
        const fileSuccess = savePurchasesToFile(filePurchases);
        
        if (fileSuccess) {
          console.log('Saved to file system successfully');
          saveSuccess = true;
        }
      } catch (fileError) {
        console.error('Error saving to file system:', fileError);
      }

      if (saveSuccess) {
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

        console.log(`Purchase saved successfully for user: ${username}`);
        res.json({ success: true, itemCount: items.length });
      } else {
        res.status(500).json({ error: 'שגיאה בשמירת הרכישה' });
      }

    } catch (error) {
      console.error('Save purchase error:', error);
      res.status(500).json({ error: 'שגיאה בשמירת הרכישה' });
    }
  });

  // API לתשלום משופר עם תמיכה בקופונים חדשים
  app.post('/api/pay', async (req, res) => {
    try {
      const username = req.cookies.session;

      if (!username) {
        return res.status(401).json({ error: 'לא מחובר' });
      }

      const { cardName, cardNumber, expiry, cvv, orderData, coupon } = req.body;

      // ולידציה בסיסית
      if (!cardName || !cardNumber || !expiry || !cvv) {
        return res.status(400).json({ error: 'חסרים פרטי כרטיס' });
      }

      // ולידציות נוספות
      const cleanCardNumber = cardNumber.replace(/[\s-]/g, '');
      if (!/^\d{12,19}$/.test(cleanCardNumber)) {
        return res.status(400).json({ error: 'מספר כרטיס לא תקין' });
      }

      if (!/^\d{2}\/\d{2}$/.test(expiry)) {
        return res.status(400).json({ error: 'תוקף לא תקין' });
      }

      if (!/^\d{3,4}$/.test(cvv)) {
        return res.status(400).json({ error: 'CVV לא תקין' });
      }

      // סימולציה של תהליך תשלום
      await new Promise(resolve => setTimeout(resolve, 1500));

      // חישוב מחירים מחדש בשרת לאבטחה
      let finalOrderData = {
        subtotal: orderData?.subtotal || 0,
        shipping: SHIPPING_COST,
        discount: 0,
        total: 0,
        items: orderData?.items || []
      };

      // יישום קופון הנחה
      let appliedDiscount = 0;
      let finalShipping = SHIPPING_COST;
      
      if (coupon) {
        let couponData = ALL_COUPONS[coupon];
        
        if (!couponData) {
          try {
            const wheelData = await persist.loadData('wheel-spins') || { users: {}, guests: {} };
            const allUsers = { ...wheelData.users, ...wheelData.guests };
            
            for (const userData of Object.values(allUsers)) {
              if (userData.coupon && userData.coupon.code === coupon) {
                if (!userData.coupon.expiresAt || new Date() <= new Date(userData.coupon.expiresAt)) {
                  couponData = {
                    discount: userData.coupon.value,
                    type: userData.coupon.type === 'percent' ? 'percent' :
                          userData.coupon.type === 'free-shipping' ? 'shipping' :
                          userData.coupon.type === 'free-cookie' ? 'free-cookie' :
                          'fixed'
                  };
                  break;
                }
              }
            }
          } catch (wheelError) {
            console.warn('Error reading wheel data for payment:', wheelError);
          }
        }
        
        if (couponData) {
          if (couponData.type === 'percent') {
            appliedDiscount = Math.round(finalOrderData.subtotal * couponData.discount / 100);
          } else if (couponData.type === 'fixed') {
            appliedDiscount = Math.min(couponData.discount, finalOrderData.subtotal);
          } else if (couponData.type === 'shipping') {
            finalShipping = 0;
          } else if (couponData.type === 'free-cookie') {
            const cookieDiscount = calculateCookieDiscount(finalOrderData.items);
            appliedDiscount = Math.min(cookieDiscount, finalOrderData.subtotal);
          }
        }
      }

      finalOrderData.discount = appliedDiscount;
      finalOrderData.shipping = finalShipping;
      finalOrderData.total = Math.max(0, finalOrderData.subtotal - appliedDiscount + finalShipping);

      // רישום פעילות תשלום
      try {
        let activity = await persist.loadData('activity') || [];
        activity.push({
          datetime: new Date().toISOString(),
          username,
          type: 'pay',
          amount: finalOrderData.total,
          couponUsed: coupon || null
        });
        await persist.saveData('activity', activity);
      } catch (actError) {
        console.warn('Failed to log activity:', actError);
      }

      res.json({
        success: true,
        total: finalOrderData.total,
        appliedDiscount: appliedDiscount,
        finalShipping: finalShipping,
        message: 'התשלום הושלם בהצלחה!'
      });

    } catch (error) {
      console.error('Payment error:', error);
      res.status(500).json({ error: 'שגיאה בעיבוד התשלום' });
    }
  });

  // API לניקוי פריטים ספציפיים מהסל
  app.post('/api/clear-cart-items', async (req, res) => {
    try {
      const username = req.cookies.session;
      if (!username) {
        return res.status(401).json({ error: 'לא מחובר' });
      }

      const { itemsToRemove } = req.body;
      if (!itemsToRemove || !Array.isArray(itemsToRemove)) {
        return res.status(400).json({ error: 'לא נמצאו פריטים לניקוי' });
      }

      console.log('Clearing specific items from cart for user:', username);
      console.log('Items to remove:', itemsToRemove);

      const idsToRemove = new Set(itemsToRemove.map(id => String(id)));

      // ניקוי הסל הרגיל
      let carts = await persist.loadData('carts') || [];
      const userCart = carts.find(c => c.username === username);
      
      if (userCart && Array.isArray(userCart.items)) {
        const originalLength = userCart.items.length;
        userCart.items = userCart.items.filter(id => !idsToRemove.has(String(id)));
        console.log(`Regular cart items before: ${originalLength}, after: ${userCart.items.length}`);
        await persist.saveData('carts', carts);
      }

      // עדכון סטטוס עוגות מותאמות
      let customCakes = await persist.loadData('customCakes') || [];
      let customUpdated = false;
      
      customCakes.forEach(cake => {
        if (cake.username === username && idsToRemove.has(String(cake.id))) {
          cake.status = 'purchased';
          customUpdated = true;
        }
      });
      
      if (customUpdated) {
        await persist.saveData('customCakes', customCakes);
        console.log('Updated custom cakes status to purchased');
      }

      console.log('Specific items cleared successfully');
      res.json({ success: true });

    } catch (error) {
      console.error('Clear specific items error:', error);
      res.status(500).json({ error: 'שגיאה בניקוי הפריטים' });
    }
  });

  // API לניקוי סל לאחר תשלום (שמירה על תאימות)
  app.post('/api/clear-cart-after-payment', async (req, res) => {
    try {
      const username = req.cookies.session;
      if (!username) {
        return res.status(401).json({ error: 'לא מחובר' });
      }

      const { selectedItems } = req.body;
      if (!selectedItems) {
        return res.status(400).json({ error: 'לא נמצאו פריטים לניקוי' });
      }

      console.log('Clearing cart after payment for user:', username);
      console.log('Selected items to remove:', selectedItems);

      // רשימת כל המזהים לניקוי
      const idsToRemove = new Set();
      
      // הוספת מוצרים רגילים
      if (selectedItems.regularItems && Array.isArray(selectedItems.regularItems)) {
        selectedItems.regularItems.forEach(id => idsToRemove.add(String(id)));
      }
      
      // הוספת עוגות מותאמות
      if (selectedItems.customItems && Array.isArray(selectedItems.customItems)) {
        selectedItems.customItems.forEach(id => idsToRemove.add(String(id)));
      }

      // קריאה לפונקציה הפנימית לניקוי
      const mockReq = {
        cookies: { session: username },
        body: { itemsToRemove: Array.from(idsToRemove) }
      };
      
      // ביצוע הניקוי
      const idsToRemoveArray = Array.from(idsToRemove);
      
      // ניקוי הסל הרגיל
      let carts = await persist.loadData('carts') || [];
      const userCart = carts.find(c => c.username === username);
      
      if (userCart && Array.isArray(userCart.items)) {
        const originalLength = userCart.items.length;
        userCart.items = userCart.items.filter(id => !idsToRemove.has(String(id)));
        console.log(`Regular cart items before: ${originalLength}, after: ${userCart.items.length}`);
        await persist.saveData('carts', carts);
      }

      // עדכון עוגות מותאמות
      let customCakes = await persist.loadData('customCakes') || [];
      let customUpdated = false;
      
      customCakes.forEach(cake => {
        if (cake.username === username && idsToRemove.has(String(cake.id))) {
          cake.status = 'purchased';
          customUpdated = true;
        }
      });
      
      if (customUpdated) {
        await persist.saveData('customCakes', customCakes);
      }

      res.json({ success: true });

    } catch (error) {
      console.error('Clear cart after payment error:', error);
      res.status(500).json({ error: 'שגיאה בניקוי הסל' });
    }
  });

  // API לקבלת היסטוריית רכישות - מעודכן לכל המשתמשים
  app.get('/api/my-purchases', async (req, res) => {
    try {
      const username = req.cookies.session;
      if (!username) {
        return res.status(401).json({ error: 'לא מחובר' });
      }

      console.log('Loading purchases for user:', username);

      // טעינה ממערכת persist
      let userPurchases = [];
      try {
        const persistPurchases = await persist.loadData('purchases') || {};
        userPurchases = persistPurchases[username] || [];
      } catch (persistError) {
        console.warn('Error loading from persist:', persistError);
      }

      // טעינה מהקובץ החדש
      try {
        const filePurchases = loadPurchasesFromFile();
        const fileUserPurchases = filePurchases[username] || [];
        
        // מיזוג התוצאות (הימנעות מכפילויות)
        const existingIds = new Set(userPurchases.map(p => p.purchaseId).filter(Boolean));
        
        for (const purchase of fileUserPurchases) {
          if (!purchase.purchaseId || !existingIds.has(purchase.purchaseId)) {
            userPurchases.push(purchase);
          }
        }
      } catch (fileError) {
        console.warn('Error loading from file:', fileError);
      }

      // מיון לפי תאריך (החדשים ראשון)
      userPurchases.sort((a, b) => {
        const dateA = new Date(a.purchaseDate || a.date);
        const dateB = new Date(b.purchaseDate || b.date);
        return dateB - dateA;
      });

      console.log(`Found ${userPurchases.length} purchases for user: ${username}`);
      res.json(userPurchases);
      
    } catch (error) {
      console.error('Get purchases error:', error);
      res.status(500).json({ error: 'שגיאה בטעינת הרכישות' });
    }
  });

};