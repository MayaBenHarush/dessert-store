// modules/pay-server.js
const persist = require('../persist_module');

module.exports = function(app) {
  
  // קופונים זמינים
  const COUPONS = {
    'WELCOME10': { discount: 10, type: 'percent', description: 'הנחה של 10%' },
    'SAVE20': { discount: 20, type: 'fixed', description: 'הנחה של 20 ₪' },
    'FREESHIP': { discount: 29, type: 'shipping', description: 'משלוח חינם' },
    'VIP15': { discount: 15, type: 'percent', description: 'הנחה של 15% ללקוחות VIP' }
  };

  const SHIPPING_COST = 29;

  // API לוולידציה של קופון
  app.get('/api/validate-coupon/:code', async (req, res) => {
    try {
      const couponCode = req.params.code.toUpperCase();
      
      if (COUPONS[couponCode]) {
        res.json({
          valid: true,
          coupon: COUPONS[couponCode]
        });
      } else {
        res.status(400).json({
          valid: false,
          error: 'קוד קופון לא תקין'
        });
      }
    } catch (error) {
      console.error('Coupon validation error:', error);
      res.status(500).json({ error: 'שגיאת שרת' });
    }
  });

  // API לתשלום משופר
  app.post('/api/pay', async (req, res) => {
    try {
      const username = req.cookies.username;
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

      // סימולציה של תהליך תשלום (במציאות זה יהיה קריאה לספק תשלומים)
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
      
      if (coupon && COUPONS[coupon]) {
        const couponData = COUPONS[coupon];
        
        if (couponData.type === 'percent') {
          appliedDiscount = Math.round(finalOrderData.subtotal * couponData.discount / 100);
        } else if (couponData.type === 'fixed') {
          appliedDiscount = Math.min(couponData.discount, finalOrderData.subtotal);
        } else if (couponData.type === 'shipping') {
          finalShipping = 0;
        }
      }

      finalOrderData.discount = appliedDiscount;
      finalOrderData.shipping = finalShipping;
      finalOrderData.total = finalOrderData.subtotal - appliedDiscount + finalShipping;

      // יצירת רשומת רכישה תואמת למבנה הקיים
      const purchaseItem = {
        items: [],
        date: new Date().toISOString()
      };

      // הוספת פריטים לרכישה בפורמט הקיים
      if (orderData?.items) {
        for (const item of orderData.items) {
          for (let i = 0; i < item.qty; i++) {
            if (item.type === 'custom') {
              // עוגות מותאמות - נשאיר את ה-ID המלא
              purchaseItem.items.push(item.id);
            } else {
              // מוצרים רגילים
              purchaseItem.items.push(item.id);
            }
          }
        }
      }

      // שמירת הרכישה במבנה הקיים
      let purchases = await persist.loadData('purchases') || {};
      if (!purchases[username]) {
        purchases[username] = [];
      }
      purchases[username].push(purchaseItem);
      await persist.saveData('purchases', purchases);

      // הוספת רשומה לאקטיביטי
      try {
        let activity = await persist.loadData('activity') || [];
        activity.push({
          datetime: new Date().toISOString(),
          username,
          type: 'pay'
        });
        await persist.saveData('activity', activity);
      } catch (actError) {
        console.warn('Failed to log activity:', actError);
      }

      // ניקוי העגלה לאחר תשלום מוצלח
      try {
        // ניקוי עגלה רגילה
        let db = await persist.loadData('db') || {};
        if (db.carts && Array.isArray(db.carts)) {
          db.carts = db.carts.filter(cart => cart.username !== username);
          await persist.saveData('db', db);
        }

        // ניקוי עוגות מותאמות
        if (db.customCakes && Array.isArray(db.customCakes)) {
          // סימון עוגות מותאמות כנרכשות
          for (let cake of db.customCakes) {
            if (cake.username === username && cake.status === 'in-cart') {
              cake.status = 'purchased';
            }
          }
          await persist.saveData('db', db);
        }

        // גם ניקוי מהקבצים הנפרדים אם קיימים
        try {
          let carts = await persist.loadData('carts') || [];
          if (Array.isArray(carts)) {
            carts = carts.filter(cart => cart.username !== username);
            await persist.saveData('carts', carts);
          }
        } catch {}

      } catch (clearError) {
        console.warn('Failed to clear cart after payment:', clearError);
        // לא נכשיל את התשלום בגלל שגיאה בניקוי העגלה
      }

      res.json({
        success: true,
        total: finalOrderData.total,
        message: 'התשלום הושלם בהצלחה!'
      });

    } catch (error) {
      console.error('Payment error:', error);
      res.status(500).json({ error: 'שגיאה בעיבוד התשלום' });
    }
  });

  // API לקבלת היסטוריית רכישות (שיפור לדף "הרכישות שלי")
  app.get('/api/my-purchases', async (req, res) => {
    try {
      const username = req.cookies.username;
      if (!username) {
        return res.status(401).json({ error: 'לא מחובר' });
      }

      const purchases = await persist.loadData('purchases') || {};
      const userPurchases = purchases[username] || [];

      // מיון לפי תאריך (החדשים ראשון)
      userPurchases.sort((a, b) => new Date(b.date) - new Date(a.date));

      res.json(userPurchases);
    } catch (error) {
      console.error('Get purchases error:', error);
      res.status(500).json({ error: 'שגיאה בטעינת הרכישות' });
    }
  });

};