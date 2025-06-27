const jwt = require('jsonwebtoken');
const Users = require('../models/UsersModel');
const { success, error: responseError, badRequest, serverError, forbidden } = require('../utils/response');

const SECRET = process.env.JWT_SECRET || 'mall-secret';

// 定义系统权限常量
const ADMIN_PERMISSIONS = [
  '*', // 超级权限标识
  // 系统管理权限
  'system:role:view', 'system:role:create', 'system:role:edit', 'system:role:delete', 'system:role:export', 'system:role:permission', 'system:role:status',
  'system:admin:view', 'system:admin:create', 'system:admin:edit', 'system:admin:delete', 'system:admin:export', 'system:admin:password', 'system:admin:role',
  'system:permission:view', 'system:permission:create', 'system:permission:edit', 'system:permission:delete', 'system:permission:export',
  'system:resource:view', 'system:resource:create', 'system:resource:edit', 'system:resource:delete', 'system:resource:upload',
  'system:log:view', 'system:log:export', 'system:log:delete',
  // 商品管理权限
  'product:category:view', 'product:category:create', 'product:category:edit', 'product:category:delete',
  'product:goods:view', 'product:goods:create', 'product:goods:edit', 'product:goods:delete'
];

const USER_PERMISSIONS = [
  'dashboard:view',
  'profile:view', 'profile:edit'
];

// 登录，生成token
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await Users.findOne({ username });
    if (!user) return responseError(res, '用户不存在', 401);
    // 这里只做明文比对，实际项目应加密比对
    if (user.password !== password) return responseError(res, '密码错误', 401);
    const token = jwt.sign({ userId: user._id, username: user.username, role: user.role }, SECRET, { expiresIn: '2h' });
    
    // 根据角色设置权限
    const permissions = user.role === 'admin' ? ADMIN_PERMISSIONS : USER_PERMISSIONS;
    const roles = [user.role]; // 转换为数组格式
    
    // 返回符合前端期望的数据格式
    return success(res, {
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
        updateTime: user.updatedAt || new Date().toISOString(),
        role: user.role
      },
      permissions,
      roles
    }, '登录成功');
  } catch (err) {
    return serverError(res, '登录失败');
  }
};

// 获取当前用户信息
exports.getUserInfo = async (req, res) => {
  try {
    const user = await Users.findById(req.user.userId);
    if (!user) {
      return responseError(res, '用户不存在', 404);
    }
    
    return success(res, {
      id: user._id,
      username: user.username, 
      nickname: user.nickname, 
      email: user.email || '',
      phone: user.phone || '',
      avatar: user.avatar || '',
      status: user.status || 1,
      createTime: user.createdAt || new Date().toISOString(),
      updateTime: user.updatedAt || new Date().toISOString(),
      role: user.role
    }, '获取用户信息成功');
  } catch (err) {
    return serverError(res, '获取用户信息失败');
  }
};

// 获取用户权限
exports.getUserPermissions = async (req, res) => {
  try {
    const user = await Users.findById(req.user.userId);
    if (!user) {
      return responseError(res, '用户不存在', 404);
    }
    
    // 根据角色返回权限
    const permissions = user.role === 'admin' ? ADMIN_PERMISSIONS : USER_PERMISSIONS;
    
    return success(res, permissions, '获取用户权限成功');
  } catch (err) {
    return serverError(res, '获取用户权限失败');
  }
};

// 获取用户角色
exports.getUserRoles = async (req, res) => {
  try {
    const user = await Users.findById(req.user.userId);
    if (!user) {
      return responseError(res, '用户不存在', 404);
    }
    
    const roles = [user.role];
    
    return success(res, roles, '获取用户角色成功');
  } catch (err) {
    return serverError(res, '获取用户角色失败');
  }
};

// 用户退出登录
exports.logout = async (req, res) => {
  try {
    // 实际项目中可以在这里将token加入黑名单
    return success(res, null, '退出登录成功');
  } catch (err) {
    return serverError(res, '退出登录失败');
  }
};

// 修改密码
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    
    // 参数验证
    if (!oldPassword || !newPassword || !confirmPassword) {
      return badRequest(res, '请填写完整的密码信息');
    }
    
    if (newPassword !== confirmPassword) {
      return badRequest(res, '新密码与确认密码不一致');
    }
    
    if (newPassword.length < 6) {
      return badRequest(res, '新密码长度不能少于6位');
    }
    
    if (oldPassword === newPassword) {
      return badRequest(res, '新密码不能与旧密码相同');
    }
    
    // 获取当前用户
    const user = await Users.findById(req.user.userId);
    if (!user) {
      return responseError(res, '用户不存在', 404);
    }
    
    // 验证旧密码
    if (user.password !== oldPassword) {
      return responseError(res, '旧密码错误', 400);
    }
    
    // 更新密码
    await Users.findByIdAndUpdate(req.user.userId, { 
      password: newPassword,
      updatedAt: new Date()
    });
    
    return success(res, null, '密码修改成功');
  } catch (err) {
    return serverError(res, '密码修改失败');
  }
};

// 刷新token
exports.refreshToken = async (req, res) => {
  try {
    // 获取当前用户信息
    const user = await Users.findById(req.user.userId);
    if (!user) {
      return responseError(res, '用户不存在', 404);
    }
    
    // 检查用户状态（1为启用状态）
    if (user.status !== 1 && user.status !== undefined) {
      return responseError(res, '用户已被禁用', 403);
    }
    
    // 生成新的token
    const newToken = jwt.sign(
      { 
        userId: user._id, 
        username: user.username, 
        role: user.role 
      }, 
      SECRET, 
      { expiresIn: '2h' }
    );
    
    return success(res, { token: newToken }, 'Token刷新成功');
  } catch (err) {
    return serverError(res, 'Token刷新失败');
  }
};

// token校验中间件
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return responseError(res, '未提供token', 401);
  jwt.verify(token, SECRET, (err, user) => {
    if (err) return responseError(res, 'token无效或已过期', 403);
    req.user = user;
    next();
  });
}; 