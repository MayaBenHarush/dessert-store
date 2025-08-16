// modules/register-server.js
const persist = require('../persist_module');

module.exports = (app) => {
  // POST /api/register
  app.post('/api/register', async (req, res, next) => {
    try {
      // נרמול קלט
      const usernameNorm = String(req.body?.username || '').trim().toLowerCase();
      const passwordNorm = String(req.body?.password || '').trim();

      if (!usernameNorm || !passwordNorm) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      // 'admin' שמור למנהל המובנה
      if (usernameNorm === 'admin') {
        return res.status(403).json({ error: 'Username reserved' });
      }

      // נטען את users.json — אם זה מערך, נמיר למילון; אם זה כבר אובייקט, נשאיר.
      const raw = await persist.loadData('users');
      let usersMap;

      if (Array.isArray(raw)) {
        // המרה ממערך לאובייקט לפי username (בנרמול)
        usersMap = {};
        for (const u of raw) {
          const key = String(u?.username || '').trim().toLowerCase();
          if (!key) continue;
          usersMap[key] = { username: key, password: String(u.password || ''), role: u.role || 'user' };
        }
      } else if (raw && typeof raw === 'object') {
        usersMap = { ...raw };
      } else {
        usersMap = {};
      }

      // בדיקת כפילות
      if (usersMap[usernameNorm]) {
        return res.status(409).json({ error: 'Username already exists' });
      }

      // יצירת המשתמש החדש בפורמט האובייקט
      usersMap[usernameNorm] = { username: usernameNorm, password: passwordNorm, role: 'user' };

      // שמירה
      await persist.saveData('users', usersMap);

      // לוג פעילות (לבחירתך)
      await persist.logActivity?.({
        datetime: new Date().toISOString(),
        username: usernameNorm,
        type: 'register'
      });

      return res.status(201).json({ message: 'User registered' });
    } catch (err) {
      next(err);
    }
  });
};
