const express = require('express');
const router = express.Router();
const UsersController = require('../controllers/UsersController');

// 获取管理员列表
router.get('/list', UsersController.list);

// 创建管理员
router.post('/create', UsersController.create);

// 删除管理员
router.post('/delete', UsersController.remove);

// 更新管理员
router.post('/update', UsersController.update);

// 获取单个管理员信息
router.get('/findOne', UsersController.findOne);

module.exports = router;
