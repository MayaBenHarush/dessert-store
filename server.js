// server.js
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

// מודול אחסון נתונים (טוען ושומר JSON)
const persist = require('./persist_module');
// הגנות DoS (Rate Limiting)
const { limitLogin, limitMutations, limitAdmin } = require('./modules/security');

const app = express();

// ===== Middleware כלליים =====
app.use(cookieParser());
// מגביל גודל גוף כדי למנוע הצפות payload
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// ===== קבצים סטטיים: public/images, public/screens, וכו׳ =====
app.use(express.static(path.join(__dirname, 'public')));

// ===== Seed: יצירת משתמש admin/admin אם חסר (כולל role: 'admin') =====
(async function seedAdminIfMissing() {
  try {
    let users = await persist.loadData('users');
    if (!Array.isArray(users)) {
      users = [];
    }

    const hasAdmin = users.some(u => u && u.username === 'admin');
    if (!hasAdmin) {
      users.push({ username: 'admin', password: 'admin', role: 'admin' }); // דרישת המטלה
      await persist.saveData('users', users);
      console.log('✔ Seeded default admin user (admin/admin, role=admin)');
    } else {
      const admin = users.find(u => u.username === 'admin');
      if (admin && !admin.role) {
        admin.role = 'admin';
        await persist.saveData('users', users);
        console.log('✔ Updated existing admin to include role=admin');
      }
    }
  } catch (e) {
    console.error('Seed admin failed:', e);
  }
})();

// ===== Rate-Limit למסלולים רגישים =====
app.use('/api/login', limitLogin);
app.use(['/api/cart', '/api/checkout', '/api/pay'], limitMutations);
app.use('/api/admin', limitAdmin);

// ===== ייבוא מודולי ה-API =====
require('./modules/register-server')(app);
require('./modules/login-server')(app);
require('./modules/logout-server')(app);
require('./modules/products-server')(app);
require('./modules/cart-server')(app);
require('./modules/checkout-server')(app);
require('./modules/pay-server')(app);
require('./modules/myitems-server')(app);
require('./modules/admin-server')(app);

// ===== טיפול ב-404 =====
app.use((req, res) => {
  res.status(404).send('Oops! Page not found');
});

// ===== טיפול בשגיאות פנימיות =====
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// ===== הפעלת השרת =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎂 Dessert Store running at http://localhost:${PORT}`);
});
