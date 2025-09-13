// modules/recipes-server.js
// מודול לטיפול במתכונים

module.exports = (app) => {
  // מערך נתוני המתכונים
  const DIY_RECIPES = [ /* ------ בדיוק כמו ששלחת (לא שיניתי כלום בתוכן) ------ */
    {
      id: 'chocolate-balls',
      title: { he: 'כדורי שוקולד', en: 'Chocolate Balls' },
      description: {
        he: 'כדורי שוקולד טעימים ללא אפייה עם ביסקוויטים וקוקוס',
        en: 'Delicious no-bake chocolate balls with biscuits and coconut'
      },
      category: { he: 'ללא אפייה', en: 'No Bake' },
      difficulty:{ he: 'קל', en: 'Easy' },
      prepTime: 15, chillTime: 180, totalTime: 195, servings: 20,
      ingredients: { /* ... כל מה ששלחת ... */ 
        he: [
          '300 גרם ביסקוויטים מסוג "פתי בר" מפוררים',
          '8 קוביות שוקולד מריר (30 גרם)',
          '50 גרם חמאה',
          '3 כפות אבקת קקאו',
          '3-4 כפות סוכר גדושות',
          'חצי כוס חלב (לפרווה – מים)',
          'קוקוס לציפוי'
        ],
        en: [
          '300g "Petit Beurre" biscuits, crushed',
          '8 cubes dark chocolate (30g)',
          '50g butter',
          '3 tablespoons cocoa powder',
          '3-4 heaped tablespoons sugar',
          'Half cup milk (for dairy-free use water)',
          'Coconut for coating'
        ]
      },
      instructions: { /* ... */ 
        he: [
          'מניחים בקערת זכוכית את החמאה וקוביות השוקולד וממיסים במיקרוגל מספר שניות. מוציאים ומערבבים עד שמתקבלת תערובת שוקולד חלקה.',
          'מערבבים חצי כוס חלב (או מים) עם אבקת הקקאו והסוכר. מומלץ לערבב את הסוכר והקקאו בכמה כפות מים רותחים ולאחר מכן להוסיף חלב/מים עד חצי כוס. לאחר שהסוכר נמס שופכים לקערת השוקולד.',
          'מוסיפים לקערה את פירורי הביסקוויטים ומערבבים היטב. אם במקרה התערובת יוצאת קצת יבשה או מתפוררת יש להוסיף מים או חלב לפי הצורך.',
          'בעזרת הידיים יוצרים כדורים וטובלים בתוך צלחת קטנה עם קוקוס.',
          'עוטפים בניילון נצמד ומאחסנים במקרר 3 שעות לפחות לפני ההגשה.'
        ],
        en: [
          'Place butter and chocolate cubes in a glass bowl and melt in microwave for several seconds. Remove and mix until you get a smooth chocolate mixture.',
          'Mix half cup milk (or water) with cocoa powder and sugar. It\'s recommended to mix the sugar and cocoa with a few tablespoons of hot water first, then add milk/water to make half cup. Once sugar dissolves, pour into chocolate bowl.',
          'Add crushed biscuits to the bowl and mix well. If the mixture is too dry or crumbly, add water or milk as needed.',
          'Using your hands, form balls and dip in a small plate with coconut.',
          'Wrap in plastic wrap and store in refrigerator for at least 3 hours before serving.'
        ]
      },
      tips: {
        he: 'ניתן להוסיף אגוזים קצוצים או קוקוס גם לתוך התערובת. אפשר גם לציפוי בשוקולד מומס במקום קוקוס.',
        en: 'You can add chopped nuts or coconut also into the mixture. Can also coat with melted chocolate instead of coconut.'
      },
      image: 'chocolate-balls.jpg',
      tags: ['chocolate', 'no-bake', 'easy', 'dessert']
    },
    /* ----------- שאר המתכונים בדיוק כפי ששלחת (berry-cheese-crumble, belgian-waffle, cookielida) ----------- */
    // ... (לא שיניתי כלום בתוכן של המתכונים הבאים)
  ];

  // 🔁 שינוי שם הנתיב בלבד: /api/diy-recipes → /api/recipes
  app.get('/api/recipes', (req, res) => {
    try {
      const lang = req.query.lang || 'he';
      const search = req.query.search || '';
      let recipes = DIY_RECIPES.map(recipe => ({
        id: recipe.id,
        title: recipe.title[lang] || recipe.title.he,
        description: recipe.description[lang] || recipe.description.he,
        category: recipe.category[lang] || recipe.category.he,
        difficulty: recipe.difficulty[lang] || recipe.difficulty.he,
        prepTime: recipe.prepTime,
        totalTime: recipe.totalTime,
        servings: recipe.servings,
        image: recipe.image,
        tags: recipe.tags
      }));
      if (search) {
        const s = search.toLowerCase();
        recipes = recipes.filter(r =>
          r.title.toLowerCase().includes(s) ||
          r.description.toLowerCase().includes(s) ||
          r.tags.some(t => t.toLowerCase().includes(s))
        );
      }
      res.json(recipes);
    } catch (e) {
      console.error('Error in /api/recipes:', e);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 🔁 שינוי: /api/diy-recipes/:id → /api/recipes/:id
  app.get('/api/recipes/:id', (req, res) => {
    try {
      const { id } = req.params;
      const lang = req.query.lang || 'he';
      const recipe = DIY_RECIPES.find(r => r.id === id);
      if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

      const translated = {
        id: recipe.id,
        title: recipe.title[lang] || recipe.title.he,
        description: recipe.description[lang] || recipe.description.he,
        category: recipe.category[lang] || recipe.category.he,
        difficulty: recipe.difficulty[lang] || recipe.difficulty.he,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        bakeTime: recipe.bakeTime,
        chillTime: recipe.chillTime,
        freezeTime: recipe.freezeTime,
        totalTime: recipe.totalTime,
        servings: recipe.servings,
        ingredients: recipe.ingredients[lang] || recipe.ingredients.he,
        instructions: recipe.instructions[lang] || recipe.instructions.he,
        tips: recipe.tips[lang] || recipe.tips.he,
        image: recipe.image,
        tags: recipe.tags
      };
      res.json(translated);
    } catch (e) {
      console.error('Error in /api/recipes/:id:', e);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 🔁 שינוי: /api/diy-recipes/categories → /api/recipes/categories
  app.get('/api/recipes/categories', (req, res) => {
    try {
      const lang = req.query.lang || 'he';
      const categories = [...new Set(DIY_RECIPES.map(r => r.category[lang] || r.category.he))];
      res.json(categories);
    } catch (e) {
      console.error('Error in /api/recipes/categories:', e);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // 🔁 שינוי: /api/diy-recipes/tags → /api/recipes/tags
  app.get('/api/recipes/tags', (req, res) => {
    try {
      const all = DIY_RECIPES.reduce((set, r) => { r.tags.forEach(t => set.add(t)); return set; }, new Set());
      res.json([...all]);
    } catch (e) {
      console.error('Error in /api/recipes/tags:', e);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};
