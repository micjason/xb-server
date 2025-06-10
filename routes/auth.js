const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');

// 登录
router.post('/login', AuthController.login);

// 退出登录
router.post('/logout', AuthController.verifyToken, AuthController.logout);

// 获取当前用户信息
router.get('/userinfo', AuthController.verifyToken, AuthController.getUserInfo);

// 获取用户权限
router.get('/permissions', AuthController.verifyToken, AuthController.getUserPermissions);

// 获取用户角色
router.get('/roles', AuthController.verifyToken, AuthController.getUserRoles);

// 修改密码
router.post('/change-password', AuthController.verifyToken, AuthController.changePassword);

// 刷新token
router.post('/refresh', AuthController.verifyToken, AuthController.refreshToken);

// token校验示例
router.get('/verify', AuthController.verifyToken, (req, res) => {
  res.json({ user: req.user, message: 'token有效' });
});

module.exports = router; 