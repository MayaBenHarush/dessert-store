// server.js
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const persist = require('./persist_module');

(async () => {
  // טעינת הנתונים מהדיסק ויצירת משתמש admin/admin אם חסר
  await persist.load();
  await persist.ensureAdminSeed();
  
  await persist.ensureProductsSeed();


  const app = express();

  // Middleware
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // קבצים סטטיים
  app.use(express.static(path.join(__dirname, 'public')));

  // דף פתיחה → מסך הרשמה
  app.get('/', (req, res) => {
    res.redirect('/screens/register.html');
  });

  // מודולי API
  require('./modules/register-server')(app);
  require('./modules/login-server')(app);
  require('./modules/products-server')(app);
  require('./modules/cart-server')(app);
  require('./modules/logout-server')(app);
  require('./modules/checkout-server')(app);
  require('./modules/pay-server')(app);
  require('./modules/myitems-server')(app);
  require('./modules/admin-server')(app);

  // 404
  app.use((req, res) => {
    res.status(404).send('Oops! Page not found');
  });

  // 500
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
  });

  // הפעלת השרת
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🎂 Dessert Store running at http://localhost:${PORT}`);
  });
})();
