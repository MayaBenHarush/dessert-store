// modules/session-server.js
const persist = require('../persist_module');

module.exports = (app) => {
  app.get('/api/session', async (req, res) => {
    const username = req.cookies?.session;
    if (!username) return res.status(401).json({ ok: false });
    
    // בדיקה שהמשתמש עדיין קיים במערכת
    try {
      const users = await persist.loadData('users');
      let userExists = false;
      
      if (typeof users === 'object' && !Array.isArray(users)) {
        userExists = !!(users[username.toLowerCase()] || users[username]);
      } else if (Array.isArray(users)) {
        userExists = users.some(u => u.username === username || u.username === username.toLowerCase());
      }
      
      if (!userExists) {
        return res.status(401).json({ ok: false });
      }
      
      res.json({ ok: true, username });
    } catch {
      res.json({ ok: true, username });
    }
  });
};