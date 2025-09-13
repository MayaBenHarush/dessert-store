// server.js
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const persist = require('./persist_module');

// ✅ מודול גלגל המזל מתוך תיקיית modules
const registerWheelRoutes = require('./modules/wheel-server');

// Rate limiters (אם קיימים)
let limitLogin, limitMutations, limitAdmin;
try {
  ({ limitLogin, limitMutations, limitAdmin } = require('./modules/security'));
} catch { /* no security module – ignore */ }

const app = express();

/* ===== Middleware כלליים ===== */
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

/* ===== קבצים סטטיים ===== */
app.use(express.static(path.join(__dirname, 'public')));

// תרגומים
app.get('/assets/translations.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'assets', 'translations.js'));
});

/* ===== Routes מיוחדים ===== */
// README דף
app.get('/readme.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'readme.html'));
});

// LLM דף  
app.get('/llm.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'llm.html'));
});

// דף עיצוב עוגות - חדש!
app.get('/cake-designer.html', (req, res) => {
  // נשאר בדיוק כפי ששלחת (לא נגעתי)
  res.sendFile(path.join(__dirname, 'cake-designer.html'));
});

// ✅ דף מתכונים (היה diy.html) — רק שינוי שם ל-recipes.html
app.get('/recipes.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'recipes.html'));
});

// הפניה של root לחנות
app.get('/', (req, res) => {
  res.redirect('/store.html');
});

/* ===== Seed Admin ===== */
(async function seedAdminIfMissing() {
  try {
    let users = await persist.loadData('users');

    if (Array.isArray(users)) {
      const map = {};
      for (const u of users) {
        const key = String(u?.username || '').trim();
        if (!key) continue;
        map[key] = {
          username: key,
          password: String(u.password || ''),
          role: u.role || 'user'
        };
      }
      users = map;
      await persist.saveData('users', users);
    } else if (!users || typeof users !== 'object') {
      users = {};
      await persist.saveData('users', users);
    }

    if (!users.admin) {
      users.admin = { username: 'admin', password: 'admin', role: 'admin' };
      await persist.saveData('users', users);
      console.log('✔ Seeded default admin (admin/admin, role=admin)');
    } else if (!users.admin.role) {
      users.admin.role = 'admin';
      await persist.saveData('users', users);
      console.log('✔ Updated existing admin to include role=admin');
    }
  } catch (e) {
    console.error('Seed admin failed:', e);
  }
})();

/* ===== Rate limits ===== */
if (limitLogin) app.use('/api/login', limitLogin);
if (limitMutations) app.use(['/api/cart', '/api/checkout', '/api/pay', '/api/custom-cake'], limitMutations);
if (limitAdmin) app.use('/api/admin', limitAdmin);

/* ===== ייבוא מודולי API ===== */
require('./modules/session-server')(app);   
require('./modules/register-server')(app);
require('./modules/login-server')(app);
require('./modules/logout-server')(app);
require('./modules/products-server')(app);
require('./modules/checkout-server')(app);  
require('./modules/pay-server')(app);       
require('./modules/myitems-server')(app);
require('./modules/admin-server')(app);
require('./modules/pending-server')(app);

// מודול עגלה רגיל - טוען ראשון
require('./modules/cart-server')(app);

/* ===== ✅ מודול מתכונים ===== */
// היה: ./modules/diy-recipes-server
require('./modules/recipes-server')(app);

/* ===== מודול עוגות מותאמות - ללא הגדרת routes נוספים ===== */
let customCakeModule;
try {
  const customCakeServerModule = require('./modules/custom-cake-server');
  customCakeModule = customCakeServerModule(app);
  console.log('✔ Custom cake module loaded');
} catch (e) {
  console.error('Custom cake module failed to load:', e.message);
  customCakeModule = null;
}

/* ===== ✅ חיבור ראוטים של גלגל המזל ===== */
registerWheelRoutes(app);

/* ===== Error handlers ===== */
app.use((req, res) => res.status(404).send('Oops! Page not found'));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

/* ===== הפעלת השרת ===== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎂 Dessert Store running at http://localhost:${PORT}`);
  console.log(`📖 README available at http://localhost:${PORT}/readme.html`);
  console.log(`🤖 LLM info at http://localhost:${PORT}/llm.html`);
  console.log(`🎨 Cake Designer at http://localhost:${PORT}/cake-designer.html`);
  console.log(`🍪 Recipes at http://localhost:${PORT}/recipes.html`);
  console.log(`🎡 Sweet Wheel at http://localhost:${PORT}/wheel.html`);
});
