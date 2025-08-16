// server.js
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

// מודול אחסון נתונים (טוען ושומר JSON)
const persist = require('./persist_module');

// הגנות DoS (Rate Limiting) — אם יש לכם את הקובץ modules/security.js
const { limitLogin, limitMutations, limitAdmin } = require('./modules/security');

const app = express();

/* ===== Middleware כלליים ===== */
app.use(cookieParser());
// מגביל גודל גוף כדי למנוע הצפות payload
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

/* ===== קבצים סטטיים: public/images, public/screens, וכו׳ ===== */
app.use(express.static(path.join(__dirname, 'public')));

/* ===== Seed: יצירת/נרמול משתמשים, והבטחת admin/admin =====
   אנו מנרמלים את users.json למבנה של מילון:
   {
     "maya": { "username":"maya", "password":"1234", "role":"user" },
     "admin": { "username":"admin", "password":"admin", "role":"admin" }
   }
   כך persist.getUser(username) יעבוד תקין. */
(async function seedAdminIfMissing() {
  try {
    let users = await persist.loadData('users'); // יכול להיות מערך/אובייקט/undefined

    // אם זה מערך — נמיר למילון לפי username; אם לא קיים — נתחיל מאובייקט ריק
    if (Array.isArray(users)) {
      const map = {};
      for (const u of users) {
        const key = String(u?.username || '').trim().toLowerCase();
        if (!key) continue;
        map[key] = {
          username: key,
          password: String(u.password || ''),
          role: u.role || 'user'
        };
      }
      users = map;
    } else if (!users || typeof users !== 'object') {
      users = {};
    }

    // הוספת admin אם חסר / הוספת role אם חסר
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

/* ===== Rate-Limit למסלולים רגישים (אם קיים security.js) ===== */
app.use('/api/login', limitLogin);
app.use(['/api/cart', '/api/checkout', '/api/pay'], limitMutations);
app.use('/api/admin', limitAdmin);

/* ===== ייבוא מודולי ה-API ===== */
require('./modules/register-server')(app);
require('./modules/login-server')(app);
require('./modules/logout-server')(app);
require('./modules/products-server')(app);
require('./modules/cart-server')(app);
require('./modules/checkout-server')(app);
require('./modules/pay-server')(app);
require('./modules/myitems-server')(app);
require('./modules/admin-server')(app);

/* ===== טיפול ב-404 ===== */
app.use((req, res) => {
  res.status(404).send('Oops! Page not found');
});

/* ===== טיפול בשגיאות פנימיות ===== */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

/* ===== הפעלת השרת ===== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎂 Dessert Store running at http://localhost:${PORT}`);
});
