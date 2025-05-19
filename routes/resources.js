const express = require('express');
const router = express.Router();
const ResourcesController = require('../controllers/ResourcesController');

// 创建资源
router.post('/', ResourcesController.createResource);
// 获取所有资源
router.get('/', ResourcesController.getResources);
// 更新资源
router.put('/:id', ResourcesController.updateResource);
// 删除资源
router.delete('/:id', ResourcesController.deleteResource);

module.exports = router; 