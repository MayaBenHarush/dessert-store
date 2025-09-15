// modules/pay-server.js
const persist = require('../persist_module');

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
    // מחירי עוגיות (כמו בקוד המקורי)
    const COOKIE_PRICES = {
      'chocolate-cake': 150, '8-cookies-box': 125, 'cupcakes': 160, 'minnie-mous-cake': 300,
      'nutella-box': 70, 'chocolate-pizza-xl': 120, 'bento-design-cake': 140,
      'chocolate-design-cake': 180, 'orange-cake': 70, 'white-design-cake': 140,
      'pizza-cookie': 120, 'pizza cookie': 120, 'kinder-cookie': 17
    };

    if (!items || !Array.isArray(items)) return 0;

    // חיפוש העוגיה הזולה ביותר
    let cheapestCookiePrice = Infinity;
    
    for (const item of items) {
      const id = item.id || item.productId;
      if (!id) continue;
      
      // בדיקה אם זה עוגיה (על פי המחיר או השם)
      const price = COOKIE_PRICES[id] || COOKIE_PRICES[id.toLowerCase()];
      if (price && price <= 25) { // עוגיות בדרך כלל עד 25 שח
        cheapestCookiePrice = Math.min(cheapestCookiePrice, price);
      }
      
      // בדיקה נוספת על פי השם
      const name = (item.title || item.name || '').toLowerCase();
      if (name.includes('cookie') || name.includes('עוגיה')) {
        const itemPrice = price || 17; // ברירת מחדל לעוגיה
        cheapestCookiePrice = Math.min(cheapestCookiePrice, itemPrice);
      }
    }

    return cheapestCookiePrice === Infinity ? 17 : cheapestCookiePrice; // ברירת מחדל
  }

  // API לוולידציה של קופון מחודש
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

      // בדיקה בקופונים מגלגל המזל - קרא מהקובץ
      try {
        const wheelData = await persist.loadData('wheel-spins') || { users: {}, guests: {} };
        
        // חיפוש הקופון בכל המשתמשים
        const allUsers = { ...wheelData.users, ...wheelData.guests };
        
        for (const userData of Object.values(allUsers)) {
          if (userData.coupon && userData.coupon.code === couponCode) {
            // בדיקת תוקף
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

      // קופון לא נמצא
      res.status(400).json({
        valid: false,
        error: 'קוד קופון לא תקין'
      });

    } catch (error) {
      console.error('Coupon validation error:', error);
      res.status(500).json({ error: 'שגיאת שרת' });
    }
  });

  // API חדש לשמירת רכישה (נקרא מ-pay.html)
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

      // שמירת הרכישה
      let purchases = await persist.loadData('purchases') || {};
      if (!purchases[username]) {
        purchases[username] = [];
      }

      // הוספת כל פריט בנפרד עם התאריך
      items.forEach(item => {
        purchases[username].push({
          ...item,
          purchaseDate: new Date().toISOString()
        });
      });

      await persist.saveData('purchases', purchases);

      // רישום פעילות
      let activity = await persist.loadData('activity') || [];
      activity.push({
        datetime: new Date().toISOString(),
        username,
        type: 'purchase',
        itemCount: items.length
      });
      await persist.saveData('activity', activity);

      console.log('Purchase saved successfully');
      res.json({ success: true, itemCount: items.length });

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
        // בדיקה בקופונים קבועים
        let couponData = ALL_COUPONS[coupon];
        
        // אם לא נמצא, חפש בקופונים מגלגל המזל
        if (!couponData) {
          try {
            const wheelData = await persist.loadData('wheel-spins') || { users: {}, guests: {} };
            const allUsers = { ...wheelData.users, ...wheelData.guests };
            
            for (const userData of Object.values(allUsers)) {
              if (userData.coupon && userData.coupon.code === coupon) {
                // בדיקת תוקף
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
            // חישוב הנחה על העוגיה הזולה ביותר
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

  // API לניקוי פריטים ספציפיים מהסל (משופר)
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
        return res.status(400).json({ error: 'לא נמצרו פריטים לניקוי' });
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

      // השתמש ב-API הפנימי לניקוי
      return app.locals.clearCartItems({ 
        cookies: { session: username },
        body: { itemsToRemove: Array.from(idsToRemove) }
      }, res);

    } catch (error) {
      console.error('Clear cart after payment error:', error);
      res.status(500).json({ error: 'שגיאה בניקוי הסל' });
    }
  });

  // API לקבלת היסטוריית רכישות
  app.get('/api/my-purchases', async (req, res) => {
    try {
      const username = req.cookies.session;
      if (!username) {
        return res.status(401).json({ error: 'לא מחובר' });
      }

      const purchases = await persist.loadData('purchases') || {};
      const userPurchases = purchases[username] || [];

      // מיון לפי תאריך (החדשים ראשון)
      userPurchases.sort((a, b) => new Date(b.date || b.purchaseDate) - new Date(a.date || a.purchaseDate));

      res.json(userPurchases);
    } catch (error) {
      console.error('Get purchases error:', error);
      res.status(500).json({ error: 'שגיאה בטעינת הרכישות' });
    }
  });

};