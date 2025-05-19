const express = require('express');
const router = express.Router();
const PermissionsController = require('../controllers/PermissionsController');

// 创建权限
router.post('/', PermissionsController.createPermission);
// 获取所有权限
router.get('/', PermissionsController.getPermissions);
// 更新权限
router.put('/:id', PermissionsController.updatePermission);
// 删除权限
router.delete('/:id', PermissionsController.deletePermission);

module.exports = router; 