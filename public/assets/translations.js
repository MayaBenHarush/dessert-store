(function () {
  const DEFAULT_LANG = localStorage.getItem('language') || 'he';

  const STRINGS = {
    he: {
      nav:{
        store:'חנות',
        cart:'סל הקניות',
        checkout:'תשלום',
        myPurchases:'הרכישות שלי',
        login:'התחברות',
        logout:'התנתקות',
        admin:'ניהול',
        dessertFinder:'🔍 מציאת קינוח מושלם',
        cakeDesigner:'עיצוב עוגה',
        wheel:'גלגל מזל',
        // ✅ נוסף
        recipes:'🍪 מתכונים'
      },
      pages:{
        storeTitle:'חנות קינוחים 🍰',
        cartTitle:'סל הקניות',
        checkoutTitle:'בחירת פריטים לתשלום',
        payTitle:'תשלום (דמו)',
        myItemsTitle:'הרכישות שלי'
      },
      cakeDesigner: {
        title: 'עיצוב עוגה מותאמת אישית',
        subtitle: 'עצב את העוגה המושלמת עבורך',
        sizeSelection: '🔍 בחירת גודל העוגה',
        bento: 'בנטו',
        bentoSize: 'קוטר 10 ס"מ',
        large: 'גדולה',
        largeSize: 'קוטר 22 ס"מ',
        colorSelection: '🎨 בחירת צבע העוגה',
        textSection: '✏️ כיתוב על העוגה',
        textPlaceholder: 'הכנס כיתוב (עד 20 תווים)',
        charLimit: '/20 תווים',
        textColorSelection: '🌈 צבע הכיתוב',
        customCake: 'עוגה מותאמת אישית',
        addToCart: '🛒 הוסף לסל הקניות',
        colors: {
          pink: 'ורוד',
          white: 'לבן',
          green: 'ירוק',
          red: 'אדום',
          purple: 'סגול',
          lightBlue: 'כחול בהיר',
          orange: 'כתום'
        },
        textColors: {
          black: 'שחור',
          white: 'לבן',
          red: 'אדום',
          pink: 'ורוד',
          purple: 'סגול',
          blue: 'כחול',
          turquoise: 'טורקיז',
          green: 'ירוק',
          orange: 'כתום',
          yellow: 'צהוב',
          brown: 'חום',
          gray: 'אפור'
        }
      },
      searchPlaceholder:'חפש קינוח...',
      themeToggleDark:'🌙 מצב כהה', 
      themeToggleLight:'☀️ מצב בהיר',
      quantity:'כמות', 
      cartEmpty:'הסל ריק.', 
      removeAll:'הסר הכל', 
      errorRemoving:'שגיאה בהסרה',
      noItemsPending:'אין פריטים ממתינים לתשלום', 
      processing:'מעבד תשלום...', 
      totalLabel:'סה"כ מחיר:',
      addedToCart:'נוסף לסל',

      // מחרוזות עזר לדף Finder (לא פוגעות בעיצוב)
      finder: {
        pageTitle: '🔍 מציאת הקינוח המושלם',
        prevQuestion: 'שאלה קודמת',
        nextQuestion: 'שאלה הבאה',
        lastQuestion: 'צפה בתוצאות',
        questionCounter: 'שאלה {current} מתוך {total}',
        loading: 'טוען התאמות לקינוחים…',
        noResultsTitle: 'אופס! לא מצאנו התאמה מושלמת',
        noResultsDesc: 'נסי לשנות חלק מהתשובות או פני אלינו לייעוץ אישי',
        resultsTitle: 'מצאנו בשבילך!',
        resultsSubtitle: 'הקינוחים המושלמים בהתאם להעדפות שלך',
        reasonsTitle: 'למה זה מתאים לך:',
        addToCart: 'הוסף לסל הקניות',
        added: '✓ נוסף לסל!',
        mustLogin: 'יש להתחבר כדי להוסיף מוצרים לסל',
        addError: 'שגיאה בהוספה לסל. נסי שוב.',
        restart: 'התחל שוב'
      }
    },
    en: {
      nav:{
        store:'Store',
        cart:'Shopping Cart',
        checkout:'Checkout',
        myPurchases:'My Purchases',
        login:'Login',
        logout:'Logout',
        admin:'Admin',
        dessertFinder:'🔍 Find Perfect Dessert',
        cakeDesigner:'Cake Designer',
        wheel:'Lucky Wheel',
        // ✅ added
        recipes:'🍪 Recipes'
      },
      wheel: {
        title: 'Sweet Lucky Wheel 🭐',
        spinButton: 'Spin the Wheel',
        oncePerDay: 'One chance per day for each user.',
        noWin: "Didn't Win",
        discount: 'Discount',
        dessert: 'Dessert',
        delivery: 'Delivery',
        voucher: 'Voucher'
      },
      pages:{
        storeTitle:'Desserts Store 🍰',
        cartTitle:'Shopping Cart',
        checkoutTitle:'Select Items for Payment',
        payTitle:'Payment (Demo)',
        myItemsTitle:'My Purchases'
      },
      cakeDesigner: {
        title: 'Custom Cake Designer',
        subtitle: 'Design the perfect cake for you',
        sizeSelection: '🔍 Cake Size Selection',
        bento: 'Bento',
        bentoSize: 'Diameter 10cm',
        large: 'Large',
        largeSize: 'Diameter 22cm',
        colorSelection: '🎨 Cake Color Selection',
        textSection: '✏️ Text on Cake',
        textPlaceholder: 'Enter text (up to 20 characters)',
        charLimit: '/20 characters',
        textColorSelection: '🌈 Text Color',
        customCake: 'Custom Cake',
        addToCart: '🛒 Add to Cart',
        colors: {
          pink: 'Pink',
          white: 'White',
          green: 'Green',
          red: 'Red',
          purple: 'Purple',
          lightBlue: 'Light Blue',
          orange: 'Orange'
        },
        textColors: {
          black: 'Black',
          white: 'White',
          red: 'Red',
          pink: 'Pink',
          purple: 'Purple',
          blue: 'Blue',
          turquoise: 'Turquoise',
          green: 'Green',
          orange: 'Orange',
          yellow: 'Yellow',
          brown: 'Brown',
          gray: 'Gray'
        }
      },
      searchPlaceholder:'Search dessert...',
      themeToggleDark:'🌙 Dark Mode', 
      themeToggleLight:'☀️ Light Mode',
      quantity:'Quantity', 
      cartEmpty:'Your cart is empty.', 
      removeAll:'Remove All', 
      errorRemoving:'Error removing item(s)',
      noItemsPending:'No items pending payment', 
      processing:'Processing...', 
      totalLabel:'Total:',
      addedToCart:'added to cart',

      finder: {
        pageTitle: '🔍 Find the Perfect Dessert',
        prevQuestion: 'Previous Question',
        nextQuestion: 'Next Question',
        lastQuestion: 'View Results',
        questionCounter: 'Question {current} of {total}',
        loading: 'Loading dessert matches…',
        noResultsTitle: 'Oops! No perfect match found',
        noResultsDesc: 'Try changing some answers or contact us for personal advice',
        resultsTitle: 'We found for you!',
        resultsSubtitle: 'The perfect desserts based on your preferences',
        reasonsTitle: 'Why it suits you:',
        addToCart: 'Add to Cart',
        added: '✓ Added!',
        mustLogin: 'Please log in to add items to the cart',
        addError: 'Error adding to cart. Please try again.',
        restart: 'Start Again'
      }
    }
  };

  const PRODUCTS = {
  he: {
    // 🎂 עוגות / מוצרים קיימים אצלך
    'chocolate-cake': 'עוגת שוקולד מעוצבת',
    '8-cookies-box': 'מארז 8 עוגיות',
    'cupcakes': 'קאפקייקס',
    'minnie-mous-cake': 'עוגת מיני מאוס',
    'nutella-box': 'מארז מגולגלות נוטלה',
    'chocolate-pizza-xl': 'פיצת שוקולד גדולה',
    'bento-design-cake': 'עוגת בנטו מעוצבת',
    'chocolate-design-cake': 'עוגת שוקולד מעוצבת',
    'orange-cake': 'עוגת תפוזים',
    // כינויים קיימים
    'white-design-cake': 'עוגת בנטו מעוצבת',
    'pizza-cookie': 'פיצת שוקולד גדולה',
    'pizza cookie': 'פיצת שוקולד גדולה',

    // 🍪 עוגיות – הוספתי מיפויים חסרים
    'kinder-cookie': 'עוגיית קינדר',
    'kinder cookie': 'עוגיית קינדר',
    'kinder': 'עוגיית קינדר',

    'caramel-cookie': 'עוגיית קרמל',
    'caramel cookie': 'עוגיית קרמל',
    'caramel': 'עוגיית קרמל',

    'bagel-cookie': 'עוגיית בייגלה מלוח',
    'bagle-cookie': 'עוגיית בייגלה מלוח',
    'bagle-forHome': 'עוגיית בייגלה מלוח',
    'bagel': 'עוגיית בייגלה מלוח',
    'bagle': 'עוגיית בייגלה מלוח'
  },
  en: {
    'chocolate-cake': 'Chocolate Design Cake',
    '8-cookies-box': '8 Cookies Box',
    'cupcakes': 'Cupcakes',
    'minnie-mous-cake': 'Minnie Mouse Cake',
    'nutella-box': 'Nutella Box',
    'chocolate-pizza-xl': 'Chocolate Pizza XL',
    'bento-design-cake': 'Bento Design Cake',
    'chocolate-design-cake': 'Chocolate Design Cake',
    'orange-cake': 'Orange Cake',
    'white-design-cake': 'Bento Design Cake',
    'pizza-cookie': 'Chocolate Pizza XL',
    'pizza cookie': 'Chocolate Pizza XL',

    'kinder-cookie': 'Kinder Cookie',
    'kinder cookie': 'Kinder Cookie',
    'kinder': 'Kinder Cookie',

    'caramel-cookie': 'Caramel Cookie',
    'caramel cookie': 'Caramel Cookie',
    'caramel': 'Caramel Cookie',

    'bagel-cookie': 'Salty Pretzel Cookie',
    'bagle-cookie': 'Salty Pretzel Cookie',
    'bagle-forHome': 'Salty Pretzel Cookie',
    'bagel': 'Salty Pretzel Cookie',
    'bagle': 'Salty Pretzel Cookie'
  }
};


  function cur(){ return localStorage.getItem('language') || DEFAULT_LANG || 'he'; }

  // ✅ שינוי שורה יחיד: לא להפוך את הכיוון (נשאר RTL)
  function setLanguage(lang){
    const L = (lang==='en'?'en':'he');
    localStorage.setItem('language', L);
    document.documentElement.lang = L;
    document.documentElement.dir = 'rtl'; // ← לא הופכים ל-LTR
    updateDomTexts();
    return L;
  }

  function toggleLanguage(){ return setLanguage(cur()==='he'?'en':'he'); }

  function get(key, fallback=''){
    const L=cur();
    const parts=String(key).split('.');
    let o=STRINGS[L];
    for(const p of parts){
      if(o && Object.prototype.hasOwnProperty.call(o,p)) o=o[p];
      else {o=null;break;}
    }
    if(o==null){
      const other=L==='he'?'en':'he';
      let alt=STRINGS[other];
      for(const p of parts){
        if(alt && Object.prototype.hasOwnProperty.call(alt,p)) alt=alt[p];
        else {alt=null;break;}
      }
      return (alt!=null)?alt:(fallback||key);
    }
    return o;
  }

  function getProduct(id,fallback=''){
    const L=cur();
    const v = PRODUCTS[L][id] || PRODUCTS[L][id?.toLowerCase?.()] || PRODUCTS[L][String(id).toLowerCase()] ;
    if(v) return v;
    const other=L==='he'?'en':'he';
    return PRODUCTS[other][id] || fallback || id;
  }

  function updateDomTexts(){
    const L=cur();
    document.querySelectorAll('[data-key]').forEach(el=>{
      const k=el.getAttribute('data-key');
      if(!k) return;
      const val=get(k,null);
      if(val!=null) {
        if(el.tagName === 'INPUT' && el.type === 'text') {
          el.placeholder = val;
        } else {
          el.textContent = val;
        }
      }
    });
    const themeBtn=document.getElementById('theme-toggle');
    if(themeBtn){
      const isDark=document.body.classList.contains('dark-theme');
      themeBtn.textContent = isDark ? get('themeToggleLight') : get('themeToggleDark');
    }
    const langBtn=document.getElementById('language-toggle');
    if(langBtn){
      langBtn.textContent = (L==='en')?'🌐 עברית':'🌐 English';
    }
  }

  window.Translations = { get, getProduct, setLanguage, toggleLanguage, updateDomTexts, currentLanguage: cur };
  window.toggleLanguage = () => { const L = toggleLanguage(); window.dispatchEvent(new CustomEvent('language-changed',{detail:{lang:L}})); };
  window.updateLanguage = () => updateDomTexts();

  setLanguage(cur());
})();
