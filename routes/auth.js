const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');

// 登录
router.post('/login', AuthController.login);

// token校验示例
router.get('/verify', AuthController.verifyToken, (req, res) => {
  res.json({ user: req.user, message: 'token有效' });
});

module.exports = router; 