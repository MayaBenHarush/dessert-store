// modules/register-server.js
const persist = require('../persist_module');

module.exports = (app) => {
  // POST /api/register
  app.post('/api/register', async (req, res, next) => {
    try {
      const { username, password } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      // חסימת שם המשתמש 'admin' כדי לשמור אותו למנהל המובנה (דרישת מטלה)
      if (String(username).toLowerCase() === 'admin') {
        return res.status(403).json({ error: 'Username reserved' });
      }

      const users = await persist.loadData('users');
      if (users.find(u => u.username === username)) {
        return res.status(409).json({ error: 'Username already exists' });
      }

      users.push({ username, password });
      await persist.saveData('users', users);

      return res.status(201).json({ message: 'User registered' });
    } catch (err) {
      next(err);
    }
  });
};
