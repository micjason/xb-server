const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'mall-secret';

module.exports = function (req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: '未提供token' });
  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'token无效或已过期' });
    req.user = user;
    next();
  });
}; 