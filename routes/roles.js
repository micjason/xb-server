const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');

router.post('/', roleController.createRole);         // 新增角色
router.get('/', roleController.getRoles);            // 获取角色列表
router.put('/:id', roleController.updateRole);       // 更新角色
router.delete('/:id', roleController.deleteRole);    // 删除角色

module.exports = router; 