const express = require('express');
const router = express.Router();
const productController = require('../controllers/ProductController');
const auth = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');

// 配置multer用于Excel文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/temp'))
  },
  filename: function (req, file, cb) {
    const uniqueName = `import_${Date.now()}_${Math.round(Math.random() * 1E9)}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
      file.mimetype === 'application/vnd.ms-excel') {
    cb(null, true);
  } else {
    cb(new Error('只支持Excel文件(.xlsx, .xls)'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// 所有路由都需要认证
router.use(auth);

// Excel导入导出路由（必须放在/:id路由之前）
router.get('/import-template', productController.downloadImportTemplate);      // 下载Excel导入模板
router.post('/import', upload.single('file'), productController.importProducts); // 批量导入商品

// 基础CRUD路由
router.post('/', productController.createProduct);                        // 创建商品
router.get('/', productController.getProducts);                          // 获取商品列表（分页、搜索、筛选）
router.get('/top-selling', productController.getTopSellingProducts);     // 获取热销商品
router.get('/new-products', productController.getNewProducts);           // 获取新品推荐
router.get('/:id', productController.getProductById);                    // 获取商品详情
router.get('/:id/related', productController.getRelatedProducts);        // 获取相关商品推荐
router.put('/:id', productController.updateProduct);                     // 更新商品
router.patch('/:id/status', productController.updateProductStatus);      // 更新商品状态
router.patch('/:id/stock', productController.updateProductStock);        // 更新商品库存
router.patch('/:id/recommend', productController.updateProductRecommend); // 设置推荐状态
router.delete('/:id', productController.deleteProduct);                  // 删除商品

// 批量操作路由
router.post('/batch-status', productController.batchUpdateProductStatus);     // 批量更新商品状态
router.post('/batch-category', productController.batchUpdateProductCategory); // 批量更新商品分类
router.post('/batch-price', productController.batchAdjustProductPrice);       // 批量调整商品价格
router.post('/batch-recommend', productController.batchUpdateProductRecommend); // 批量设置推荐
router.post('/batch-delete', productController.batchDeleteProducts);          // 批量删除商品

module.exports = router; 