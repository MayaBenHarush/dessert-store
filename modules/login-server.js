// modules/login-server.js
// התחברות: קובע עוגיית session עם "זכור אותי" לפי הדרישה

const persist = require('../persist_module');

module.exports = (app) => {
  // עוזר קטן ליומן פעילות
  async function logActivity(username, type) {
    const activity = await persist.loadData('activity');
    activity.push({ datetime: new Date().toISOString(), username, type });
    await persist.saveData('activity', activity);
  }

  // POST /api/login – body: { username, password, rememberMe }
  app.post('/api/login', async (req, res, next) => {
    try {
      const { username, password, rememberMe } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      const users = await persist.loadData('users');
      const user = users.find(u => u.username === username && u.password === password);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // rememberMe: עוגייה ל-12 ימים, אחרת 30 דקות
      const maxAge = rememberMe
        ? 12 * 24 * 60 * 60 * 1000
        : 30 * 60 * 1000;

      res.cookie('session', username, { maxAge, httpOnly: true });

      await logActivity(username, 'login');

      return res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });
};
