// modules/register-server.js
const persist = require('../persist_module');

module.exports = (app) => {
  // POST /api/register
  app.post('/api/register', async (req, res, next) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      // האם קיים כבר?
      const exists = await persist.getUser(username);
      if (exists) {
        return res.status(409).json({ error: 'Username already exists' });
      }

      // צור משתמש חדש בעזרת ה-API החדש של persist
      await persist.createUser({ username, password });

      await persist.logActivity({
        datetime: new Date().toISOString(),
        username,
        type: 'register'
      });

      return res.status(201).json({ message: 'User registered' });
    } catch (err) {
      console.error('register error', err);
      next(err);
    }
  });
};
