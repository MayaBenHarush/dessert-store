/**
 * tests/test.js
 * בדיקות אוטומטיות לראוטים דינמיים – RUNI FP25
 *
 * הרצה: node tests/test.js
 * דרישות: שרת רץ על http://localhost:3000
 */

const BASE = process.env.BASE_URL || 'http://localhost:3000';

// נסיון להשתמש ב-node-fetch (ESM), אחרת נפעיל את fetch הגלובלי של Node 18+
let fetchFn = globalThis.fetch;
const getFetch = async () => {
  if (fetchFn) return fetchFn;
  try {
    const mod = await import('node-fetch');
    fetchFn = mod.default;
    return fetchFn;
  } catch (e) {
    throw new Error('fetch not available and node-fetch not installed');
  }
};

// כלי עזר להדפסות
const log = (...args) => console.log(...args);
const pad = (s, n = 40) => (s + ' '.repeat(n)).slice(0, n);

// Cookie Jar פשוט
class CookieJar {
  constructor() { this.map = new Map(); }
  // קולט Set-Cookie[] מהשרת
  absorb(setCookieHeaders = []) {
    const arr = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders].filter(Boolean);
    arr.forEach(str => {
      const [pair, ...attrs] = str.split(';').map(s => s.trim());
      const [name, value] = pair.split('=');
      if (!name) return;
      // מחיקה במקרה Max-Age=0
      const maxAgeAttr = attrs.find(a => a.toLowerCase().startsWith('max-age='));
      if (maxAgeAttr && parseInt(maxAgeAttr.split('=')[1], 10) === 0) {
        this.map.delete(name);
      } else {
        this.map.set(name, value);
      }
    });
  }
  header() {
    if (this.map.size === 0) return '';
    return [...this.map.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  // עוזר לבדוק Max-Age ספציפית לעוגיה
  static parseMaxAge(setCookieStr) {
    if (!setCookieStr) return null;
    const attrs = setCookieStr.split(';').map(s => s.trim().toLowerCase());
    const kv = attrs.find(a => a.startsWith('max-age='));
    if (!kv) return null;
    const n = parseInt(kv.split('=')[1], 10);
    return Number.isFinite(n) ? n : null;
  }
}

const results = [];
function pass(name) { results.push({ name, ok: true }); log(`✅ ${name}`); }
function fail(name, err) { results.push({ name, ok: false, err }); log(`❌ ${name}\n   → ${err?.message || err}`); }

// בקשת HTTP עם תמיכת CookieJar
async function request({ method = 'GET', path, body, jar, headers = {} }) {
  const fetch = await getFetch();
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const init = {
    method,
    headers: {
      'Accept': 'application/json',
      ...headers,
    },
  };
  if (jar && jar.header()) init.headers['Cookie'] = jar.header();
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  // נקלוט עוגיות
  const setCookie = res.headers.get('set-cookie');
  if (jar && setCookie) jar.absorb(setCookie.split(/,(?=[^;]+;)/g) || setCookie);
  let json = null;
  const text = await res.text();
  try { json = text ? JSON.parse(text) : null; } catch { /* HTML/empty */ }
  return { status: res.status, headers: res.headers, json, text, setCookieRaw: setCookie };
}

function randomUser() {
  const n = Math.floor(Math.random() * 1e6);
  return { username: `test_user_${n}`, password: `pw_${n}` };
}

(async function run() {
  log('\n🧪 Running server tests against', BASE, '\n');

  // ---- 1) Register + Login + remember me ----
  const user = randomUser();
  const jarUser = new CookieJar();

  try {
    // Register
    {
      const { status, json } = await request({
        method: 'POST',
        path: '/api/register',
        body: { username: user.username, password: user.password },
      });
      if (status !== 200) throw new Error(`expected 200, got ${status} (${JSON.stringify(json)})`);
      pass('Register: POST /api/register');
    }

    // Login (short session ~30min)
    let shortMaxAge = null;
    {
      const { status, json, setCookieRaw } = await request({
        method: 'POST',
        path: '/api/login',
        body: { username: user.username, password: user.password, rememberMe: false },
        jar: jarUser,
      });
      if (status !== 200) throw new Error(`expected 200, got ${status} (${JSON.stringify(json)})`);
      shortMaxAge = CookieJar.parseMaxAge(setCookieRaw);
      if (shortMaxAge == null || shortMaxAge > 40 * 60) {
        throw new Error(`expected short Max-Age (~<=1800s), got ${shortMaxAge}`);
      }
      pass('Login (no rememberMe): POST /api/login sets short Max-Age');
    }

    // Logout clears cookie
    {
      const { status } = await request({
        method: 'POST',
        path: '/api/logout',
        jar: jarUser,
      });
      if (status !== 200) throw new Error(`expected 200, got ${status}`);
      pass('Logout: POST /api/logout');
    }

    // Login (rememberMe=true ~12 days)
    {
      const { status, setCookieRaw } = await request({
        method: 'POST',
        path: '/api/login',
        body: { username: user.username, password: user.password, rememberMe: true },
        jar: jarUser,
      });
      if (status !== 200) throw new Error(`expected 200, got ${status}`);
      const longMaxAge = CookieJar.parseMaxAge(setCookieRaw);
      const twelveDays = 12 * 24 * 60 * 60;
      if (longMaxAge == null || longMaxAge < twelveDays - 60) {
        throw new Error(`expected long Max-Age (~${twelveDays}), got ${longMaxAge}`);
      }
      pass('Login (rememberMe): POST /api/login sets ~12 days Max-Age');
    }

    // Session check
    {
      const { status, json } = await request({ path: '/api/session', jar: jarUser });
      if (status !== 200 || !json?.username) throw new Error(`expected logged-in session, got ${status} ${JSON.stringify(json)}`);
      pass('Session: GET /api/session returns current user');
    }
  } catch (e) { fail('Auth block', e); }

  // ---- 2) Products + Search ----
  let firstProduct = null;
  try {
    const { status, json } = await request({ path: '/api/products' });
    if (status !== 200 || !Array.isArray(json)) throw new Error(`expected product array, got ${status}`);
    if (!json.length) throw new Error('no products in catalog');
    firstProduct = json[0];
    pass('Products: GET /api/products');

    // Prefix search (by title/description)
    const prefix = (firstProduct.title || firstProduct.description || 'a').slice(0, 2) || 'a';
    const { status: s2, json: j2 } = await request({ path: `/api/products?search=${encodeURIComponent(prefix)}` });
    if (s2 !== 200 || !Array.isArray(j2)) throw new Error('search did not return array');
    pass('Products search: GET /api/products?search=...');
  } catch (e) { fail('Products block', e); }

  // ---- 3) Cart behavior ----
  try {
    // Add to cart while NOT logged-in should be 401 (server-side rule)
    {
      const { status } = await request({
        method: 'POST',
        path: '/api/cart',
        body: { productId: firstProduct?.id || 'unknown-id' },
        jar: new CookieJar(), // empty jar
      });
      if (status !== 401) throw new Error(`expected 401 when not logged-in, got ${status}`);
      pass('Cart (unauthenticated): POST /api/cart → 401');
    }

    // Add to cart while logged-in
    {
      const { status } = await request({
        method: 'POST',
        path: '/api/cart',
        jar: jarUser,
        body: { productId: firstProduct.id },
      });
      if (status !== 200) throw new Error(`expected 200, got ${status}`);
      pass('Cart add: POST /api/cart');
    }

    // Get cart
    {
      const { status, json } = await request({
        path: '/api/cart',
        jar: jarUser,
      });
      if (status !== 200 || !Array.isArray(json) || !json.length) {
        throw new Error(`expected non-empty cart array, got ${status} ${JSON.stringify(json)}`);
      }
      // נשמור ID של פריט בסל לעדכון/מחיקה
      const item = json[0];
      if (!item.id) throw new Error('cart item missing id');
      // Update quantity
      const { status: s2 } = await request({
        method: 'PUT',
        path: `/api/cart/${item.id}`,
        jar: jarUser,
        body: { quantity: 2 },
      });
      if (s2 !== 200) throw new Error(`expected 200 on quantity update, got ${s2}`);
      pass('Cart update quantity: PUT /api/cart/:id');

      // Delete item
      const { status: s3 } = await request({
        method: 'DELETE',
        path: `/api/cart/${item.id}`,
        jar: jarUser,
      });
      if (s3 !== 200) throw new Error(`expected 200 on delete, got ${s3}`);
      pass('Cart delete: DELETE /api/cart/:id');
    }
  } catch (e) { fail('Cart block', e); }

  // ---- 4) Checkout → Pending → Pay → My Items ----
  try {
    // נוסיף שוב פריט לסל כדי לבדוק תשלום
    await request({ method: 'POST', path: '/api/cart', jar: jarUser, body: { productId: firstProduct.id } });

    // Checkout (בחרי את כל הסל)
    {
      const { status } = await request({
        method: 'POST',
        path: '/api/checkout',
        jar: jarUser,
        body: { select: 'all' }, // או לפי מה שהשרת שלך מצפה
      });
      if (status !== 200) throw new Error(`expected 200 on checkout, got ${status}`);
      pass('Checkout: POST /api/checkout');
    }

    // Pending
    {
      const { status, json } = await request({ path: '/api/pending', jar: jarUser });
      if (status !== 200 || !Array.isArray(json)) throw new Error(`expected pending array, got ${status}`);
      pass('Pending: GET /api/pending');
    }

    // Pay (fake)
    {
      const payment = { number: '4111111111111111', holder: 'Test User', exp: '12/30', cvv: '123' };
      const { status } = await request({ method: 'POST', path: '/api/pay', jar: jarUser, body: payment });
      if (status !== 200) throw new Error(`expected 200 on pay, got ${status}`);
      pass('Pay: POST /api/pay (fake)');
    }

    // My Items
    {
      const { status, json } = await request({ path: '/api/my-items', jar: jarUser });
      if (status !== 200 || !Array.isArray(json)) throw new Error(`expected my-items array, got ${status}`);
      pass('My Items: GET /api/my-items');
    }
  } catch (e) { fail('Checkout/Pay block', e); }

  // ---- 5) Admin protection + manage products + activity ----
  const jarNonAdmin = jarUser;
  const jarAdmin = new CookieJar();
  try {
    // Non-admin should be blocked from /api/admin/*
    {
      const { status } = await request({ path: '/api/admin/activity', jar: jarNonAdmin });
      if (status === 200) throw new Error('non-admin accessed admin route');
      pass('Admin guard: non-admin cannot access /api/admin/*');
    }

    // Login as admin/admin
    {
      const { status } = await request({
        method: 'POST',
        path: '/api/login',
        body: { username: 'admin', password: 'admin', rememberMe: false },
        jar: jarAdmin,
      });
      if (status !== 200) throw new Error(`admin login failed with ${status}`);
      pass('Admin login: POST /api/login (admin/admin)');
    }

    // Admin activity with prefix
    {
      const { status, json } = await request({ path: '/api/admin/activity?prefix=ad', jar: jarAdmin });
      if (status !== 200 || !Array.isArray(json)) throw new Error('admin activity not accessible/array');
      pass('Admin activity: GET /api/admin/activity?prefix=ad');
    }

    // Admin add/delete product
    let newId;
    {
      const newProduct = {
        title: 'AutoTest Product',
        description: 'Created by tests',
        price: 42,
        image: 'autotest.jpg'
      };
      const { status, json } = await request({
        method: 'POST',
        path: '/api/admin/products',
        jar: jarAdmin,
        body: newProduct,
      });
      if (status !== 200 || !json?.id) throw new Error(`admin add product failed: ${status} ${JSON.stringify(json)}`);
      newId = json.id;
      pass('Admin add product: POST /api/admin/products');

      const { status: s2 } = await request({
        method: 'DELETE',
        path: `/api/admin/products/${encodeURIComponent(newId)}`,
        jar: jarAdmin,
      });
      if (s2 !== 200) throw new Error(`admin delete product failed: ${s2}`);
      pass('Admin delete product: DELETE /api/admin/products/:id');
    }
  } catch (e) { fail('Admin block', e); }

  // ---- 6) Extra pages’ APIs (server-communication) ----
  try {
    // Dessert Finder
    {
      const answers = {
        occasion: 'personal',
        taste_preference: 'chocolate',
        texture: 'soft_cake',
        dietary: 'none',
        budget: 'budget',
        presentation: 'simple'
      };
      const { status, json } = await request({
        method: 'POST',
        path: '/api/dessert-finder/recommendations',
        body: { answers },
        jar: jarUser, // כניסה נוחה לתפיסת פרסונליזציה (לרוב לא חובה)
      });
      if (status !== 200 || !Array.isArray(json?.recommendations)) {
        throw new Error(`expected recommendations array, got ${status} ${JSON.stringify(json)}`);
      }
      pass('Dessert Finder: POST /api/dessert-finder/recommendations');
    }

    // Recipes
    {
      const { status, json } = await request({ path: '/api/recipes' });
      if (status !== 200 || !Array.isArray(json)) throw new Error('expected recipes array');
      pass('Recipes: GET /api/recipes');
    }

    // Wheel (ייתכן ודורש התחברות – אם מחזיר 200/401 שניהם מתקבלים)
    {
      const { status } = await request({
        method: 'POST',
        path: '/api/wheel/spin',
        jar: jarUser, // משתמש מחובר
      });
      if (![200, 400, 401, 429].includes(status)) {
        throw new Error(`wheel spin unexpected status ${status}`);
      }
      pass('Wheel: POST /api/wheel/spin (status acceptable)');
    }
  } catch (e) { fail('Extra pages block', e); }

  // ---- סיכום ----
  const ok = results.filter(r => r.ok).length;
  const bad = results.length - ok;
  log('\n===== TEST SUMMARY =====');
  results.forEach(r => {
    const line = `${r.ok ? 'PASS' : 'FAIL'}  ${pad(r.name, 60)}`;
    log(line, r.ok ? '' : `→ ${r.err?.message || r.err}`);
  });
  log(`\nTotal: ${results.length}  ✅ Passed: ${ok}  ❌ Failed: ${bad}\n`);

  // יציאה עם קוד שגיאה אם נכשלו טסטים
  if (bad > 0) process.exit(1);
})().catch(e => {
  console.error('Fatal test runner error:', e);
  process.exit(1);
});
