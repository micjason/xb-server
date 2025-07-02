const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/CategoryController');
const auth = require('../middlewares/auth');

// 公开的查询路由（不需要认证）
router.get('/', categoryController.getCategories);                     // 获取分类列表（分页）
router.get('/tree', categoryController.getCategoryTree);               // 获取分类树
router.get('/options', categoryController.getCategoryOptions);         // 获取分类选项
router.get('/:id', categoryController.getCategoryById);                // 获取分类详情

// 管理操作路由（需要认证）
router.use(auth); // 从这里开始所有路由都需要认证

// CRUD管理路由
router.post('/', categoryController.createCategory);                    // 创建分类
router.put('/:id', categoryController.updateCategory);                 // 更新分类
router.patch('/:id/status', categoryController.updateCategoryStatus);  // 更新分类状态
router.delete('/:id', categoryController.deleteCategory);              // 删除分类

module.exports = router; 