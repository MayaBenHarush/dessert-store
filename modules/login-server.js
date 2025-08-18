// modules/login-server.js
const persist = require('../persist_module');

module.exports = (app) => {
  // POST /api/login
  app.post('/api/login', async (req, res, next) => {
    try {
      const { username, password, rememberMe } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      // טען משתמש
      const users = await persist.loadData('users');
      let user = null;
      
      // תמיכה במבנה מילון וגם מערך (תאימות לאחור)
      if (typeof users === 'object' && !Array.isArray(users)) {
        // מבנה מילון: { "username": {username, password, role}, ... }
        user = users[username.toLowerCase()] || users[username];
      } else if (Array.isArray(users)) {
        // מבנה מערך: [{username, password, role}, ...]
        user = users.find(u => u.username === username || u.username === username.toLowerCase());
      }

      if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // בדיקת זכור אותי - תמיכה בכל הפורמטים הנפוצים
      const remember = !!(rememberMe === true || 
                          rememberMe === 'true' || 
                          rememberMe === 'on' || 
                          rememberMe === 1 || 
                          rememberMe === '1' ||
                          rememberMe === 'checked');

      // לפי הוראות המטלה: זכור אותי = 12 ימים, אחרת = 30 דקות
      const maxAge = remember
        ? 12 * 24 * 60 * 60 * 1000  // 12 ימים במילישניות
        : 30 * 60 * 1000;           // 30 דקות במילישניות

      // הגדרת cookie עם MaxAge מתאים
      res.cookie('session', user.username, { 
        maxAge, 
        httpOnly: true,
        secure: false, // עבור development - בproduction כדאי true
        sameSite: 'lax'
      });

      // לוג פעילות
      try {
        let activity = await persist.loadData('activity');
        if (!Array.isArray(activity)) activity = [];
        activity.push({
          datetime: new Date().toISOString(),
          username: user.username,
          type: 'login'
        });
        await persist.saveData('activity', activity);
      } catch (e) {
        console.error('Failed to log activity:', e);
      }

      return res.json({ 
        message: 'Logged in successfully',
        username: user.username,
        remembered: remember
      });
    } catch (err) {
      next(err);
    }
  });
};