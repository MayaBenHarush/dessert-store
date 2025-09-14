// server.js
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const persist = require('./persist_module');
const registerWheelRoutes = require('./modules/wheel-server');

// Rate limiters (אם קיימים)
let limitLogin, limitMutations, limitAdmin;
try {
  ({ limitLogin, limitMutations, limitAdmin } = require('./modules/security'));
} catch { /* ignore if missing */ }

const app = express();

/* ===== Middleware ===== */
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

/* ===== Static files (everything under /public) ===== */
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

/* ===== Top-level pages that באמת יושבים בשורש הפרויקט ===== */
app.get('/readme.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'readme.html'));
});
app.get('/llm.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'llm.html'));
});

/* ===== דף הבית =====
   אצלך index.html נמצא תחת public/screens, לכן נפנה אליו ב-root:
*/
app.get('/', (req, res) => {
  res.redirect('/screens/index.html');
});

/* ===== קיצורים ישנים → מפנים ל-/screens/<name>.html ===== */
const screenShortcuts = [
  'index', 'store', 'cake-designer', 'recipes', 'wheel',
  'cart', 'checkout', 'myitems', 'login', 'admin',
  'dessert-finder', 'diy'
];
app.get(screenShortcuts.map(n => `/${n}.html`), (req, res) => {
  // דוגמה: /store.html → /screens/store.html
  res.redirect(`/screens${req.path}`);
});

/* ===== API modules (כמו אצלך) ===== */
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
require('./modules/cart-server')(app);
require('./modules/recipes-server')(app);

/* ===== Custom cake ===== */
try {
  const customCakeServerModule = require('./modules/custom-cake-server');
  customCakeServerModule(app);
  console.log('✔ Custom cake module loaded');
} catch (e) {
  console.error('Custom cake module failed to load:', e.message);
}

/* ===== Wheel routes ===== */
registerWheelRoutes(app);

/* ===== Errors ===== */
app.use((req, res) => res.status(404).send('Oops! Page not found'));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

/* ===== Start server ===== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎂 Dessert Store running at   http://localhost:${PORT}`);
  console.log(`🏠 Home                        http://localhost:${PORT}/`);
  console.log(`🧭 Screens root                http://localhost:${PORT}/screens/`);
  console.log(`   • Store                     http://localhost:${PORT}/screens/store.html`);
  console.log(`   • Cake Designer             http://localhost:${PORT}/screens/cake-designer.html`);
  console.log(`   • Recipes / DIY             http://localhost:${PORT}/screens/recipes.html`);
  console.log(`   • Sweet Wheel               http://localhost:${PORT}/screens/wheel.html`);
});
