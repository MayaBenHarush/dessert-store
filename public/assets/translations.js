// public/assets/translations.js - מערכת תרגומים גלובלית

window.Translations = {
  // טקסטים כלליים
  general: {
    he: {
      // ניווט
      store: 'חנות',
      cart: 'סל הקניות',
      checkout: 'תשלום',
      myPurchases: 'הרכישות שלי',
      readme: '📖 README',
      login: 'התחברות',
      register: 'הרשמה',
      logout: 'התנתקות',
      admin: 'ניהול',
      
      // כפתורים ופעולות
      addToCart: 'הוסף לסל',
      removeAll: 'הסר הכל',
      pay: 'שלם',
      proceedToPay: 'המשך לתשלום',
      
      // הודעות
      addedToCart: 'התווסף לסל הקניות',
      errorAddingToCart: 'שגיאה בהוספה לסל',
      errorRemoving: 'שגיאה בהסרה',
      errorAdding: 'שגיאה בהוספה',
      cartEmpty: 'הסל ריק.',
      noItemsPending: 'אין פריטים ממתינים לתשלום.',
      noPurchasesYet: 'אין רכישות עדיין.',
      
      // טפסים
      username: 'שם משתמש',
      password: 'סיסמה',
      rememberMe: 'זכור אותי',
      searchPlaceholder: 'חפש קינוח...',
      
      // נושא ושפה
      themeToggleDark: '🌙 מצב כהה',
      themeToggleLight: '☀️ מצב בהיר',
      languageToggle: '🌐 English',
      
      // דף תשלום
      cardNumber: 'מספר הכרטיס',
      cardName: 'שם בעל/ת הכרטיס',
      expiry: 'תוקף (MM/YY)',
      cvv: 'CVV',
      paymentDemo: 'זהו תשלום דמו – אין שמירה של פרטי כרטיס.',
      processing: 'מעבד תשלום...',
      
      // כמויות
      quantity: 'כמות',
      
      // דף admin
      addProduct: 'הוסף מוצר',
      removeProduct: 'מחק',
      productTitle: 'כותרת המוצר',
      description: 'תיאור',
      image: 'תמונה',
      
      // כותרות דפים
      pageTitle: {
        store: 'חנות קינוחים 🍰',
        cart: 'סל הקניות',
        checkout: 'בחירת פריטים לתשלום',
        pay: 'תשלום (דמו)',
        myitems: 'הרכישות שלי',
        login: 'התחברות',
        register: 'הרשמה',
        admin: 'מסך ניהול',
        thankyou: 'תודה! התשלום התקבל ✅'
      },

      // דף תודה
      viewMyPurchases: 'צפייה ברכישות שלי',
      continueShopping: 'להמשיך לקנות'
    },
    
    en: {
      // Navigation
      store: 'Store',
      cart: 'Shopping Cart',
      checkout: 'Checkout',
      myPurchases: 'My Purchases',
      readme: '📖 README',
      login: 'Login',
      register: 'Register',
      logout: 'Logout',
      admin: 'Admin',
      
      // Buttons and actions
      addToCart: 'Add to Cart',
      removeAll: 'Remove All',
      pay: 'Pay',
      proceedToPay: 'Proceed to Pay',
      
      // Messages
      addedToCart: 'added to cart',
      errorAddingToCart: 'Error adding to cart',
      errorRemoving: 'Error removing',
      errorAdding: 'Error adding',
      cartEmpty: 'Cart is empty.',
      noItemsPending: 'No items pending payment.',
      noPurchasesYet: 'No purchases yet.',
      
      // Forms
      username: 'Username',
      password: 'Password',
      rememberMe: 'Remember me',
      searchPlaceholder: 'Search dessert...',
      
      // Theme and language
      themeToggleDark: '🌙 Dark Mode',
      themeToggleLight: '☀️ Light Mode',
      languageToggle: '🌐 עברית',
      
      // Payment page
      cardNumber: 'Card Number',
      cardName: 'Cardholder Name',
      expiry: 'Expiry (MM/YY)',
      cvv: 'CVV',
      paymentDemo: 'This is a demo payment - no card details are saved.',
      processing: 'Processing payment...',
      
      // Quantities
      quantity: 'Quantity',
      
      // Admin page
      addProduct: 'Add Product',
      removeProduct: 'Delete',
      productTitle: 'Product Title',
      description: 'Description',
      image: 'Image',
      
      // Page titles
      pageTitle: {
        store: 'Desserts Store 🍰',
        cart: 'Shopping Cart',
        checkout: 'Select Items for Payment',
        pay: 'Payment (Demo)',
        myitems: 'My Purchases',
        login: 'Login',
        register: 'Register',
        admin: 'Admin Panel',
        thankyou: 'Thank You! Payment Received ✅'
      },

      // Thank you page
      viewMyPurchases: 'View My Purchases',
      continueShopping: 'Continue Shopping'
    }
  },

  // תרגומי מוצרים
  products: {
    'bagle-cookie': { he: 'עוגיית בייגל', en: 'Bagel Cookie' },
    'caramel-cookie': { he: 'עוגיית קרמל', en: 'Caramel Cookie' },
    'chocolate-cake': { he: 'עוגת שוקולד', en: 'Chocolate Cake' },
    'cookies-box': { he: 'קופסת עוגיות', en: 'Cookies Box' },
    'cupcakes': { he: 'קאפקייקס', en: 'Cupcakes' },
    'kinder-cookie': { he: 'עוגיית קינדר', en: 'Kinder Cookie' },
    'lotus-cookie': { he: 'עוגיית לוטוס', en: 'Lotus Cookie' },
    'minnie-mous-cake': { he: 'עוגת מיני מאוס', en: 'Minnie Mouse Cake' },
    'nutella-box': { he: 'קופסת נוטלה', en: 'Nutella Box' },
    'nutella-cookie': { he: 'עוגיית נוטלה', en: 'Nutella Cookie' },
    'orange-cake': { he: 'עוגת תפוז', en: 'Orange Cake' },
    'pizza-cookie': { he: 'עוגיית פיצה', en: 'Pizza Cookie' },
    'white-chocolate-cookie': { he: 'עוגיית שוקולד לבן', en: 'White Chocolate Cookie' },
    'white-design-cake': { he: 'עוגה לבנה מעוצבת', en: 'White Design Cake' }
  },

  // פונקציות עזר לתרגום
  get: function(key, lang = null) {
    const currentLang = lang || localStorage.getItem('language') || 'he';
    const keys = key.split('.');
    let value = this.general[currentLang];
    
    for (const k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        return key; // אם לא נמצא תרגום, מחזיר את המפתח
      }
    }
    
    return value;
  },

  getProduct: function(productId, lang = null) {
    const currentLang = lang || localStorage.getItem('language') || 'he';
    return this.products[productId] ? this.products[productId][currentLang] : productId;
  }
};

// פונקציה גלובלית לעדכון שפה
window.updateLanguage = function() {
  const currentLanguage = localStorage.getItem('language') || 'he';
  const html = document.documentElement;
  
  // עדכון כיוון ושפה
  if (currentLanguage === 'en') {
    html.setAttribute('lang', 'en');
    html.setAttribute('dir', 'ltr');
  } else {
    html.setAttribute('lang', 'he');
    html.setAttribute('dir', 'rtl');
  }

  // עדכון כל האלמנטים עם data-key
  document.querySelectorAll('[data-key]').forEach(element => {
    const key = element.getAttribute('data-key');
    element.textContent = window.Translations.get(key);
  });

  // עדכון placeholders
  document.querySelectorAll('[data-placeholder-key]').forEach(element => {
    const key = element.getAttribute('data-placeholder-key');
    element.placeholder = window.Translations.get(key);
  });

  // עדכון title
  const titleElement = document.querySelector('title[data-page]');
  if (titleElement) {
    const page = titleElement.getAttribute('data-page');
    titleElement.textContent = window.Translations.get(`pageTitle.${page}`);
    document.title = window.Translations.get(`pageTitle.${page}`);
  }

  // עדכון כפתור שפה
  const languageToggle = document.getElementById('language-toggle');
  if (languageToggle) {
    languageToggle.textContent = window.Translations.get('languageToggle');
  }

  // עדכון כפתור נושא
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    const theme = localStorage.getItem('theme') || 'light';
    themeToggle.textContent = theme === 'dark' ? 
      window.Translations.get('themeToggleLight') : 
      window.Translations.get('themeToggleDark');
  }
};

// פונקציה להחלפת שפה
window.toggleLanguage = function() {
  const currentLanguage = localStorage.getItem('language') || 'he';
  const newLanguage = currentLanguage === 'he' ? 'en' : 'he';
  localStorage.setItem('language', newLanguage);
  window.updateLanguage();
  
  // אירוע מותאם להתרענות על החלפת שפה
  window.dispatchEvent(new CustomEvent('languageChanged', { 
    detail: { language: newLanguage } 
  }));
};