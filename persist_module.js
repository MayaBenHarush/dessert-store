// persist_module.js
const fs = require('fs/promises');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'db.json');
const IMAGES_DIR = path.join(__dirname, 'public', 'images');

let db = {
  users: {},        // username -> { username, password, preferences? }
  carts: {},        // username -> [productId, ...]
  purchases: {},    // username -> [{ id, title, image, description, date }, ...]
  activity: [],     // [{ datetime, username, type }]
  products: []      // [{ id, title, description, image }]
};

async function ensureDir() {
  const dir = path.dirname(DB_PATH);
  try { await fs.mkdir(dir, { recursive: true }); } catch {}
}

async function load() {
  await ensureDir();
  try {
    const raw = await fs.readFile(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    // מיזוג מבנה קיים עם ברירות מחדל כדי לא לשבור קבצים ישנים
    db = { ...db, ...parsed };
    if (!Array.isArray(db.products)) db.products = [];
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  }
}

async function save() {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

// --- Users ---
async function getUser(username) {
  return db.users[username] || null;
}
async function createUser({ username, password }) {
  if (db.users[username]) throw new Error('user exists');
  db.users[username] = { username, password };
  await save();
  return db.users[username];
}
async function ensureAdminSeed() {
  if (!db.users['admin']) {
    db.users['admin'] = { username: 'admin', password: 'admin' };
    await save();
    await logActivity({ datetime: Date.now(), username: 'admin', type: 'seed-admin' });
  }
}

// --- Products ---
function toTitleFromFile(filename) {
  const base = filename.replace(/\.[^.]+$/, ''); // בלי הסיומת
  return base.replace(/[-_]+/g, ' ');            // מינוס/קו תחתון -> רווח
}
function idFromFile(filename) {
  return filename.replace(/\.[^.]+$/, '');       // אותו id כמו שם הקובץ בלי סיומת
}

async function ensureProductsSeed() {
  // אם כבר יש מוצרים – לא חייבים לזרוע מחדש
  if (Array.isArray(db.products) && db.products.length > 0) return;

  try {
    const files = await fs.readdir(IMAGES_DIR);
    const jpgs = files.filter(f => /\.(jpe?g|png|webp|gif)$/i.test(f));
    const seeded = jpgs.map(f => ({
      id: idFromFile(f),
      title: toTitleFromFile(f),
      description: '',
      image: f
    }));
    // הימנעות מכפולים (אם נפעיל שוב)
    const known = new Set(db.products.map(p => p.id));
    for (const p of seeded) {
      if (!known.has(p.id)) db.products.push(p);
    }
    await save();
  } catch (e) {
    // אם אין תיקיית images או קרה משהו – פשוט להשאיר products ריק
  }
}

async function getProducts() { return db.products || []; }
async function setProducts(list) {
  db.products = Array.isArray(list) ? list : [];
  await save();
  return db.products;
}
async function addProduct(product) {
  const ids = new Set((db.products || []).map(p => p.id));
  let id = (product.id || '').trim() || idFromFile(product.image || 'product');
  if (ids.has(id)) {
    const base = id; let i = 2;
    while (ids.has(id)) id = `${base}-${i++}`;
  }
  const item = {
    id,
    title: String(product.title || id),
    description: String(product.description || ''),
    image: String(product.image || '')
  };
  db.products = db.products || [];
  db.products.push(item);
  await save();
  return item;
}
async function removeProduct(id) {
  const before = db.products.length;
  db.products = db.products.filter(p => p.id !== id);
  await save();
  return db.products.length !== before;
}

// --- Carts ---
async function getCart(username) {
  return db.carts[username] || [];
}
async function setCart(username, itemsArray) {
  db.carts[username] = Array.isArray(itemsArray) ? itemsArray.slice() : [];
  await save();
  return db.carts[username];
}
async function addToCart(username, productId) {
  db.carts[username] = db.carts[username] || [];
  db.carts[username].push(productId);
  await save();
  return db.carts[username];
}
async function removeFromCart(username, productId) {
  db.carts[username] = (db.carts[username] || []).filter(id => id !== productId);
  await save();
  return db.carts[username];
}

// --- Purchases ---
async function getPurchases(username) {
  return db.purchases[username] || [];
}
async function appendPurchase(username, purchaseObj) {
  db.purchases[username] = db.purchases[username] || [];
  db.purchases[username].push(purchaseObj);
  await save();
  return db.purchases[username];
}

// --- Activity ---
async function logActivity(rec) {
  db.activity.push(rec);
  await save();
  return rec;
}

// --- Preferences (optional) ---
async function setPreferences(username, prefs) {
  db.users[username] = db.users[username] || { username, password: '' };
  db.users[username].preferences = { ...(db.users[username].preferences||{}), ...prefs };
  await save();
  return db.users[username].preferences;
}
async function getPreferences(username) {
  return db.users[username]?.preferences || {};
}

// --- תאימות לאחור: loadData/saveData עם מפתח ---
async function loadData(key) {
  await load();
  if (!key) return db;
  return db[key] ?? (Array.isArray(db[key]) ? [] : []);
}
async function saveData(key, value) {
  if (!key) { await save(); return db; }
  db[key] = value;
  await save();
  return db[key];
}

module.exports = {
  // core
  load, save, ensureAdminSeed, ensureProductsSeed,
  // compatibility
  loadData, saveData,
  // api
  getUser, createUser,
  getProducts, setProducts, addProduct, removeProduct,
  getCart, setCart, addToCart, removeFromCart,
  getPurchases, appendPurchase,
  logActivity,
  setPreferences, getPreferences,
};
