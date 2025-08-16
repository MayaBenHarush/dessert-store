// modules/login-server.js
const persist = require('../persist_module');

module.exports = (app) => {
  // POST /api/login
  app.post('/api/login', async (req, res, next) => {
    try {
      let { username, password, rememberMe } = req.body || {};
      const usernameNorm = String(username || '').trim().toLowerCase();
      const passwordNorm = String(password || '').trim();

      if (!usernameNorm || !passwordNorm) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      // קריאה ל-API של ה-persist (מניח משתמשים כאובייקט לפי שם-משתמש)
      const user = await persist.getUser(usernameNorm);
      if (!user || String(user.password) !== passwordNorm) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // קביעת העוגייה – שומרת את שם המשתמש בנורמליזציה (אותיות קטנות)
      const maxAge = rememberMe ? 12 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000;
      res.cookie('session', usernameNorm, { maxAge, httpOnly: true });

      // לוג פעילות (לבחירתך)
      await persist.logActivity?.({
        datetime: new Date().toISOString(),
        username: usernameNorm,
        type: 'login'
      });

      return res.json({ message: 'Logged in' });
    } catch (err) {
      next(err);
    }
  });
};
