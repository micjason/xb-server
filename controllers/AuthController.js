const jwt = require('jsonwebtoken');
const Users = require('../models/UsersModel');

const SECRET = process.env.JWT_SECRET || 'mall-secret';

// 登录，生成token
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await Users.findOne({ username });
    if (!user) return res.status(401).json({ error: '用户不存在' });
    // 这里只做明文比对，实际项目应加密比对
    if (user.password !== password) return res.status(401).json({ error: '密码错误' });
    const token = jwt.sign({ userId: user._id, username: user.username, role: user.role }, SECRET, { expiresIn: '2h' });
    
    // 根据角色设置权限
    const permissions = user.role === 'admin' ? ['*'] : ['read'];
    const roles = [user.role]; // 转换为数组格式
    
    // 返回符合前端期望的数据格式
    res.json({ 
      code: 200,
      message: '登录成功',
      success: true,
      data: {
        token, 
        user: { 
          id: user._id,
          username: user.username, 
          nickname: user.nickname, 
          email: user.email || '',
          phone: user.phone || '',
          avatar: user.avatar || '',
          status: user.status || 1,
          createTime: user.createdAt || new Date().toISOString(),
          updateTime: user.updatedAt || new Date().toISOString()
        },
        permissions,
        roles
      }
    });
  } catch (err) {
    res.status(500).json({ 
      code: 500,
      message: err.message,
      success: false 
    });
  }
};

// token校验中间件
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: '未提供token' });
  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'token无效或已过期' });
    req.user = user;
    next();
  });
}; 