const express = require('express');
const router = express.Router();
const UsersOptLogsController = require('../controllers/UsersOptLogsController');

// 创建日志
router.post('/', UsersOptLogsController.createLog);
// 获取所有日志
router.get('/', UsersOptLogsController.getLogs);
// 删除日志
router.delete('/:id', UsersOptLogsController.deleteLog);

module.exports = router; 