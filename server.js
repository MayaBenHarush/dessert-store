// server.js
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const persist = require('./persist_module');

// (לא חובה) rate limiters – ייטענו רק אם הקובץ קיים
let limitLogin, limitMutations, limitAdmin;
try {
  ({ limitLogin, limitMutations, limitAdmin } = require('./modules/security'));
} catch { /* no security module – ignore */ }

const app = express();

/* ===== Middleware כלליים ===== */
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

/* ===== קבצים סטטיים: public/images, public/screens, וכו׳ ===== */
app.use(express.static(path.join(__dirname, 'public')));

// הוספת קובץ התרגומים כקובץ סטטי
app.get('/assets/translations.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'assets', 'translations.js'));
});

/* ===== Routes מיוחדים - לפי דרישות המטלה ===== */
// README דף - חובה לפי המטלה
app.get('/readme.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'readme.html'));
});

// LLM דף - חובה לפי המטלה  
app.get('/llm.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'llm.html'));
});

// הפניה של root לחנות
app.get('/', (req, res) => {
  res.redirect('/store.html');
});

/* ===== Seed: נרמול users + הבטחת admin/admin =====
   אם users.json הוא מערך – נהפוך למילון לפי username.
   אם חסר admin – נוסיף admin/admin עם role: 'admin'.
*/
(async function seedAdminIfMissing() {
  try {
    let users = await persist.loadData('users');

    if (Array.isArray(users)) {
      // המרה למילון: { "maya": {username:"maya", password:"...", role:"user"}, ... }
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

/* ===== Rate limits (אם קיימים) ===== */
if (limitLogin)     app.use('/api/login', limitLogin);
if (limitMutations) app.use(['/api/cart', '/api/checkout', '/api/pay'], limitMutations);
if (limitAdmin)     app.use('/api/admin', limitAdmin);

/* ===== ייבוא מודולי ה-API ===== */
require('./modules/session-server')(app);   
require('./modules/register-server')(app);
require('./modules/login-server')(app);
require('./modules/logout-server')(app);
require('./modules/products-server')(app);
require('./modules/cart-server')(app);
require('./modules/checkout-server')(app);  
require('./modules/pay-server')(app);       
require('./modules/myitems-server')(app);
require('./modules/admin-server')(app);
require('./modules/pending-server')(app);

/* ===== 404 + error handlers ===== */
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
});