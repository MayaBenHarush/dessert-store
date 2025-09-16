// fix-prices.js - סקריפט לתיקון מחירי מוצרים קיימים
const persist = require('./persist_module');

async function fixProductPrices() {
  try {
    console.log('🔧 מתחיל תיקון מחירי מוצרים...');
    
    // טען את המוצרים הקיימים
    const products = await persist.loadData('products');
    console.log(`📦 נמצאו ${products.length} מוצרים`);
    
    let fixedCount = 0;
    
    // מחירים אמיתיים לפי המוצרים הספציפיים שלך
    const CORRECT_PRICES = {
      'chocolate-cake': 150,
      'cookies box': 120,
      'cupcakes': 160,
      'minnie-mous-cake': 300,
      'nutella-box': 70,
      'chocolate-pizza-xl': 120,
      'bento-design-cake': 140,
      'chocolate-design-cake': 180,
      'orange-cake': 70,
      'white-design-cake': 140,
      'pizza-cookie': 120,
      'pizza cookie': 120,
      'bagle-cookie': 17,
      'caramel-cookie': 17,
      'kinder-cookie': 17,
      'lotus-cookie': 17,
      'nutella-cookie': 17,
      'white-chocolate-cookie': 17
    };
    
    for (const product of products) {
      // בדוק אם המוצר צריך תיקון מחיר
      const currentPrice = Number(product.price);
      const shouldFix = isNaN(currentPrice) || currentPrice <= 0;
      
      if (shouldFix) {
        // חפש מחיר מתאים לפי ID או כותרת
        const productId = (product.id || '').toLowerCase();
        const productTitle = (product.title || '').toLowerCase();
        
        let newPrice = null;
        
        // חפש התאמה ישירה במיפוי המחירים
        for (const [key, price] of Object.entries(CORRECT_PRICES)) {
          if (productId.includes(key.toLowerCase()) || productTitle.includes(key.toLowerCase())) {
            newPrice = price;
            break;
          }
        }
        
        // אם לא נמצא מחיר ספציפי, בדוק אם זה עוגייה (מחיר ₪17)
        if (newPrice === null) {
          const isCookie = /(cookie|עוגי)/i.test(productId + ' ' + productTitle);
          if (isCookie) {
            newPrice = 17;
          } else {
            newPrice = 50; // ברירת מחדל למוצרים אחרים
          }
        }
        
        product.price = newPrice;
        fixedCount++;
        console.log(`✅ תוקן מוצר: "${product.title}" (${product.id}) - מחיר חדש: ₪${newPrice}`);
      } else {
        console.log(`✓ מוצר תקין: "${product.title}" (${product.id}) - מחיר: ₪${currentPrice}`);
      }
    }
    
    // שמור את השינויים
    if (fixedCount > 0) {
      await persist.saveData('products', products);
      console.log(`🎉 תיקון הושלם! תוקנו ${fixedCount} מוצרים`);
      
      // הוסף רשומה לפעילות
      const activity = await persist.loadData('activity');
      activity.push({
        datetime: new Date().toISOString(),
        username: 'system',
        type: `fix-prices: ${fixedCount} products fixed with correct prices`
      });
      await persist.saveData('activity', activity);
    } else {
      console.log('✨ כל המוצרים כבר עם מחירים תקינים!');
    }
    
    // הצג סיכום מחירים
    console.log('\n📊 סיכום מחירים לאחר התיקון:');
    for (const product of products) {
      console.log(`   ${product.title || product.id}: ₪${product.price}`);
    }
    
  } catch (error) {
    console.error('❌ שגיאה בתיקון המחירים:', error);
  }
}

// הפעל את הסקריפט אם הוא נקרא ישירות
if (require.main === module) {
  fixProductPrices();
}

module.exports = fixProductPrices;