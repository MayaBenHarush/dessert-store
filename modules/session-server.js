// modules/session-server.js
module.exports = (app) => {
  app.get('/api/session', (req, res) => {
    const username = req.cookies?.session;
    if (!username) return res.status(401).json({ ok: false });
    res.json({ ok: true, username });
  });
};
