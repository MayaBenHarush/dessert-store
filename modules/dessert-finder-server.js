// modules/dessert-finder-server.js
// API להפקת המלצות "מציאת קינוח" בהתאם לתשובות המשתמש.
// מחזיר בפורמט שה-Frontend מצפה לו:
// { recommendations: [{ id, title, price, image, description, reasons[], matchLevel }] }

const persist = require('../persist_module');

module.exports = (app) => {
  const asArray = (x) => (Array.isArray(x) ? x : []);
  const nonEmpty = (s, def = '') => (s == null ? def : String(s).trim());
  const clampPrice = (v, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
  };

  // רמזים/ברירות-מחדל למוצרים מוכרים (אם חסרים שדות בקבצי הנתונים)
  const PRODUCT_HINTS = {
    'nutella-cookie': {
      heTitle: 'עוגיית נוטלה',
      enTitle: 'Nutella Cookie',
      basePrice: 17,
      image: 'nutella-cookie.jpg',
      categories: ['personal', 'family'],
      tastes: ['sweet_treats', 'chocolate', 'mixed'],
      textures: ['soft_cake', 'mixed_texture'],
      dietary: ['none', 'light'],
      budget: ['budget'],
      presentation: ['simple', 'nice'],
      score_bonus: { sweet_treats: 15, soft_cake: 10 }
    },
    'chocolate-cookie': {
      heTitle: 'עוגיית שוקולד',
      enTitle: 'Chocolate Cookie',
      basePrice: 17,
      image: 'chocolate-cookie.jpg',
      categories: ['personal', 'family'],
      tastes: ['chocolate', 'mixed'],
      textures: ['crunchy', 'mixed_texture'],
      dietary: ['none', 'light'],
      budget: ['budget'],
      presentation: ['simple', 'nice'],
      score_bonus: { chocolate: 15, crunchy: 10 }
    },
    'orange-cake': {
      heTitle: 'עוגת תפוזים',
      enTitle: 'Orange Cake',
      basePrice: 70,
      image: 'orange-cake.jpg',
      categories: ['family', 'gift'],
      tastes: ['fruity', 'mixed'],
      textures: ['soft_cake'],
      dietary: ['none', 'light'],
      budget: ['budget'],
      presentation: ['simple', 'nice'],
      score_bonus: { fruity: 20, soft_cake: 15 }
    },
    'chocolate-cake': {
      heTitle: 'עוגת שוקולד מעוצבת',
      enTitle: 'Chocolate Design Cake',
      basePrice: 150,
      image: 'chocolate-cake.jpg',
      categories: ['family', 'party', 'gift'],
      tastes: ['chocolate', 'mixed'],
      textures: ['soft_cake', 'creamy'],
      dietary: ['none'],
      budget: ['medium'],
      presentation: ['wow', 'custom'],
      score_bonus: { chocolate: 25, wow: 20, party: 15 }
    }
  };

  // בניית אובייקט מוצר אחיד
  function buildProductRow(raw, lang = 'he') {
    const id = nonEmpty(raw.id || raw.slug || raw._id);
    if (!id) return null;

    const hint = PRODUCT_HINTS[id] || {};
    const title = nonEmpty(raw.title) || (lang === 'en' ? hint.enTitle : hint.heTitle) || id;
    const description = nonEmpty(raw.description) || (lang === 'en' ? 'Delicious dessert' : 'קינוח טעים ומפנק');
    const price = clampPrice(raw.price, clampPrice(hint.basePrice, 99));
    const image = nonEmpty(raw.image, hint.image || 'cookies-box.jpg');

    const categories = asArray(raw.categories?.length ? raw.categories : hint.categories || []);
    const tastes = asArray(raw.tastes?.length ? raw.tastes : hint.tastes || []);
    const textures = asArray(raw.textures?.length ? raw.textures : hint.textures || []);
    const dietary = asArray(raw.dietary?.length ? raw.dietary : hint.dietary || []);
    const budget = asArray(raw.budget?.length ? raw.budget : hint.budget || []);
    const presentation = asArray(raw.presentation?.length ? raw.presentation : hint.presentation || []);
    const score_bonus = hint.score_bonus || {};

    return {
      id, title, description, price, image,
      categories, tastes, textures, dietary, budget, presentation, score_bonus
    };
  }

  function scoreProduct(prod, answers) {
    let score = 0;
    if (answers.occasion && prod.categories.includes(answers.occasion)) score += 25;
    if (answers.taste_preference && prod.tastes.includes(answers.taste_preference)) score += 30;
    if (answers.texture && prod.textures.includes(answers.texture)) score += 25;
    if (answers.dietary && prod.dietary.includes(answers.dietary)) score += 15;
    if (answers.budget && prod.budget.includes(answers.budget)) score += 20;
    if (answers.presentation && prod.presentation.includes(answers.presentation)) score += 20;

    if (prod.score_bonus && prod.score_bonus[answers.taste_preference]) score += Number(prod.score_bonus[answers.taste_preference]) || 0;
    if (prod.score_bonus && prod.score_bonus[answers.texture]) score += Number(prod.score_bonus[answers.texture]) || 0;
    if (prod.score_bonus && prod.score_bonus[answers.occasion]) score += Number(prod.score_bonus[answers.occasion]) || 0;

    return score;
  }

  function buildReasons(prod, answers, lang = 'he', score) {
    const T = {
      he: {
        personal: 'מתאים לפינוק אישי',
        family: 'נהדר לערב משפחתי',
        party: 'מושלם למסיבות',
        gift: 'מתנה מרשימה',
        chocolate: 'עשיר בשוקולד איכותי',
        fruity: 'טעם פירותי מרענן',
        sweet_treats: 'מתקתק בדיוק הנכון',
        mixed: 'מגוון טעמים מפתיע',
        soft_cake: 'מרקם רך ונמס בפה',
        crunchy: 'פריכות מושלמת',
        creamy: 'קרמי ומפנק',
        mixed_texture: 'שילוב מרקמים מעניין',
        budget_match: 'במחיר נוח וידידותי',
        high_score: 'התאמה מצוינת להעדפות שלך'
      },
      en: {
        personal: 'Perfect for personal indulgence',
        family: 'Great for family evening',
        party: 'Perfect for parties',
        gift: 'Impressive gift',
        chocolate: 'Rich in quality chocolate',
        fruity: 'Refreshing fruity taste',
        sweet_treats: 'Just the right sweetness',
        mixed: 'Surprising variety of flavors',
        soft_cake: 'Soft texture that melts in mouth',
        crunchy: 'Perfect crunchiness',
        creamy: 'Creamy and indulgent',
        mixed_texture: 'Interesting texture combination',
        budget_match: 'At a comfortable, friendly price',
        high_score: 'Excellent match for your preferences'
      }
    }[lang || 'he'];

    const reasons = [];
    if (answers.occasion && prod.categories.includes(answers.occasion)) reasons.push(T[answers.occasion]);
    if (answers.taste_preference && prod.tastes.includes(answers.taste_preference)) reasons.push(T[answers.taste_preference]);
    if (answers.texture && prod.textures.includes(answers.texture)) reasons.push(T[answers.texture]);
    if (prod.price <= 100 && answers.budget === 'budget') reasons.push(T['budget_match']);
    if (score >= 120) reasons.push(T['high_score']);
    return reasons.slice(0, 3);
  }

  app.post('/api/dessert-finder/recommendations', async (req, res, next) => {
    try {
      const answers = req.body?.answers || {};
      const lang = (req.body?.lang === 'en' ? 'en' : 'he');

      let rawProducts = await persist.loadData('products');
      if (!Array.isArray(rawProducts)) rawProducts = [];

      const catalogue = rawProducts.map((p) => buildProductRow(p, lang)).filter(Boolean);

      // fallback אם אין מוצרים
      if (!catalogue.length) {
        for (const [id, hint] of Object.entries(PRODUCT_HINTS)) {
          catalogue.push(
            buildProductRow(
              { id, title: lang === 'en' ? hint.enTitle : hint.heTitle, description: lang === 'en' ? 'Delicious dessert' : 'קינוח טעים ומפנק', image: hint.image, price: hint.basePrice },
              lang
            )
          );
        }
      }

      const scored = catalogue.map((prod) => ({ prod, score: scoreProduct(prod, answers) }));
      const viable = scored.filter(({ score }) => score > 0);
      const ranked = (viable.length ? viable : scored).sort((a, b) => b.score - a.score).slice(0, 4);

      const recommendations = ranked.map(({ prod, score }, idx) => ({
        id: prod.id,
        title: prod.title,
        price: prod.price,
        image: prod.image,
        description: prod.description,
        reasons: buildReasons(prod, answers, lang, score),
        matchLevel: idx === 0 && score >= 100 ? 'perfect' : 'good'
      }));

      res.json({ recommendations });
    } catch (err) {
      next(err);
    }
  });
};
