// modules/logout-server.js
// התנתקות: ניקוי עוגיית session ורישום פעילות

const persist = require('../persist_module');

module.exports = (app) => {
  async function logActivity(username, type) {
    const activity = await persist.loadData('activity');
    activity.push({ datetime: new Date().toISOString(), username, type });
    await persist.saveData('activity', activity);
  }

  // POST /api/logout
  app.post('/api/logout', async (req, res, next) => {
    try {
      const username = req.cookies?.session;
      res.clearCookie('session');
      if (username) {
        await logActivity(username, 'logout');
      }
      return res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // (אופציונלי) GET /logout – למקרה שתרצי לינק ישיר בלי JS
  app.get('/logout', async (req, res) => {
    const username = req.cookies?.session;
    res.clearCookie('session');
    if (username) {
      try {
        const activity = await persist.loadData('activity');
        activity.push({ datetime: new Date().toISOString(), username, type: 'logout' });
        await persist.saveData('activity', activity);
      } catch {}
    }
    res.redirect('/screens/login.html');
  });
};
