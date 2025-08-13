// modules/login-server.js
const persist = require('../persist_module');

module.exports = (app) => {
  // POST /api/login
  app.post('/api/login', async (req, res, next) => {
    try {
      const { username, password, rememberMe } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      // משתמשים כעת נשמרים כאובייקט, לכן נשתמש ב-API החדש:
      const user = await persist.getUser(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // קביעת העוגייה
      const maxAge = rememberMe ? 12 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000;
      res.cookie('session', username, { maxAge, httpOnly: true });

      // לוג פעילות (לא חובה אך נחמד לאדמין)
      await persist.logActivity({
        datetime: new Date().toISOString(),
        username,
        type: 'login'
      });

      return res.json({ message: 'Logged in' });
    } catch (err) {
      next(err);
    }
  });
};
