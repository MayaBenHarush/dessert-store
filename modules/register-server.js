// modules/register-server.js
const persist = require('../persist_module');

module.exports = (app) => {
  app.post('/api/register', async (req, res) => {
    try {
      const { username, password } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ error: 'username and password are required' });
      }

      const exists = await persist.getUser(username);
      if (exists) return res.status(409).json({ error: 'user exists' });

      await persist.createUser({ username, password });
      await persist.logActivity({ datetime: Date.now(), username, type: 'register' });

      res.json({ ok: true });// modules/register-server.js
// הרשמת משתמש חדש

const persist = require('../persist_module');

module.exports = (app) => {
  // POST /api/register – body: { username, password }
  app.post('/api/register', async (req, res, next) => {
    try {
      const { username, password } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      const users = await persist.loadData('users');
      if (users.find(u => u.username === username)) {
        return res.status(409).json({ error: 'Username already exists' });
      }

      users.push({
        username,
        password,
        role: 'user',
        createdAt: new Date().toISOString()
      });

      await persist.saveData('users', users);
      return res.status(201).json({ ok: true });
    } catch (err) {
      next(err);
    }
  });
};

    } catch (e) {
      console.error('register error', e);
      res.status(500).json({ error: 'internal error' });
    }
  });
};
