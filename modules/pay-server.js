// modules/pay-server.js
// בתשלום: מאמת פרטי כרטיס (דמו), מעביר את הפריטים הנבחרים מ-pending ל-purchases,
// ומוחק רק את הפריטים שעליהם שולם מה-pending.
const persist = require('../persist_module');

module.exports = (app) => {
  app.post('/api/pay', async (req, res, next) => {
    try {
      const username = req.cookies?.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      const { cardName, cardNumber, expiry, cvv, items } = req.body || {};

      // ולידציה בסיסית (דמו בלבד)
      if (!cardName || typeof cardName !== 'string') {
        return res.status(400).json({ error: 'Invalid cardName' });
      }
      const digits = String(cardNumber || '').replace(/[\s-]/g, '');
      if (!/^\d{12,19}$/.test(digits)) {
        return res.status(400).json({ error: 'Invalid cardNumber' });
      }
      if (!/^\d{2}\/\d{2}$/.test(String(expiry || ''))) {
        return res.status(400).json({ error: 'Invalid expiry' });
      }
      if (!/^\d{3,4}$/.test(String(cvv || ''))) {
        return res.status(400).json({ error: 'Invalid cvv' });
      }

      // רשימת הפריטים הנבחרים לתשלום
      const selectedItems = Array.isArray(items) ? items.map(String) : [];
      if (!selectedItems.length) {
        return res.status(400).json({ error: 'No items selected for payment' });
      }

      // קבלת פריטים מ-pending
      let pending = await persist.loadData('pending');
      if (!Array.isArray(pending)) pending = [];
      const row = pending.find(r => r.username === username);
      const allPendingItems = row && Array.isArray(row.items) ? row.items.map(String) : [];
      
      if (allPendingItems.length === 0) {
        return res.status(400).json({ error: 'No items pending payment' });
      }

      // חישוב כמויות בpending
      const pendingQuantities = {};
      allPendingItems.forEach(id => {
        pendingQuantities[id] = (pendingQuantities[id] || 0) + 1;
      });

      // יצירת רשימת פריטים לרכישה על בסיס הפריטים הנבחרים
      const itemsToPurchase = [];
      selectedItems.forEach(selectedId => {
        const quantity = pendingQuantities[selectedId] || 0;
        for (let i = 0; i < quantity; i++) {
          itemsToPurchase.push(selectedId);
        }
      });

      if (itemsToPurchase.length === 0) {
        return res.status(400).json({ error: 'Selected items not available for payment' });
      }

      // הוספה ל-purchases
      await persist.appendPurchase(username, {
        items: itemsToPurchase.slice(),
        date: new Date().toISOString()
      });

      // הסרת הפריטים ששולמו מ-pending
      const remainingPendingItems = allPendingItems.filter(id => !selectedItems.includes(id));
      
      if (remainingPendingItems.length === 0) {
        // אם לא נשארו פריטים, נסיר את הרשומה כולה
        const restPending = pending.filter(r => r.username !== username);
        await persist.saveData('pending', restPending);
      } else {
        // אם נשארו פריטים, נעדכן את הרשימה
        row.items = remainingPendingItems;
        await persist.saveData('pending', pending);
      }

      // לוג פעילות
      let activity = await persist.loadData('activity');
      if (!Array.isArray(activity)) activity = [];
      activity.push({ datetime: new Date().toISOString(), username, type: 'pay' });
      await persist.saveData('activity', activity);

      return res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });
};