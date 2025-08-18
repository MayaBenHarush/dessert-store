// modules/pending-server.js
const persist = require('../persist_module');

module.exports = (app) => {
  // GET /api/pending – מחזיר מזהי פריטים שממתינים לתשלום למשתמש
  app.get('/api/pending', async (req, res, next) => {
    try {
      const username = req.cookies?.session;
      if (!username) return res.status(401).json({ error: 'Not logged in' });

      let pending = await persist.loadData('pending');
      if (!Array.isArray(pending)) pending = [];
      const row = pending.find(r => r.username === username);
      res.json(row && Array.isArray(row.items) ? row.items : []);
    } catch (err) {
      next(err);
    }
  });
};
