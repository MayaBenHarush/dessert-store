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

  // API לתשלום משופר
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

      // רישום פעילות תשלום
      try {
        let activity = await persist.loadData('activity') || [];
        activity.push({
          datetime: new Date().toISOString(),
          username,
          type: 'pay',
          amount: finalOrderData.total
        });
        await persist.saveData('activity', activity);
      } catch (actError) {
        console.warn('Failed to log activity:', actError);
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

  // API לניקוי סל לאחר תשלום
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

      console.log('Clearing cart for user:', username);
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

      console.log('IDs to remove from cart:', Array.from(idsToRemove));

      // ניקוי הסל
      let carts = await persist.loadData('carts') || [];
      const userCart = carts.find(c => c.username === username);
      
      if (userCart && Array.isArray(userCart.items)) {
        const originalLength = userCart.items.length;
        userCart.items = userCart.items.filter(id => !idsToRemove.has(String(id)));
        console.log(`Cart items before: ${originalLength}, after: ${userCart.items.length}`);
        await persist.saveData('carts', carts);
      }

      // עדכון סטטוס עוגות מותאמות
      if (selectedItems.customItems && selectedItems.customItems.length > 0) {
        let customCakes = await persist.loadData('customCakes') || [];
        let updated = false;
        
        customCakes.forEach(cake => {
          if (cake.username === username && selectedItems.customItems.includes(cake.id)) {
            cake.status = 'purchased';
            updated = true;
          }
        });
        
        if (updated) {
          await persist.saveData('customCakes', customCakes);
          console.log('Updated custom cakes status to purchased');
        }
      }

      // ניקוי pending
      let pending = await persist.loadData('pending') || [];
      pending = pending.filter(row => row.username !== username);
      await persist.saveData('pending', pending);

      console.log('Cart cleared successfully');
      res.json({ success: true });

    } catch (error) {
      console.error('Clear cart error:', error);
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