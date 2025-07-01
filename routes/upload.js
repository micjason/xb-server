const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middlewares/auth');
const { success, error, badRequest, serverError } = require('../utils/response');

// 确保上传目录存在
const uploadsDir = path.join(__dirname, '../uploads');
const imagesDir = path.join(uploadsDir, 'images');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// 配置multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, imagesDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名：时间戳_随机数_原文件名
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 10000);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    const filename = `${timestamp}_${randomNum}_${basename}${ext}`;
    cb(null, filename);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 检查文件类型
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('只支持上传 JPEG, JPG, PNG, GIF, WebP 格式的图片'));
  }
};

// 配置multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB限制
    files: 10 // 最多10个文件
  },
  fileFilter: fileFilter
});

// 所有上传路由都需要认证
router.use(auth);

// 单文件上传
router.post('/image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return badRequest(res, '没有上传文件');
    }

    const fileUrl = `/uploads/images/${req.file.filename}`;
    
    return success(res, {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: fileUrl,
      fullUrl: `${req.protocol}://${req.get('host')}${fileUrl}`
    }, '图片上传成功');
  } catch (err) {
    console.error('图片上传失败:', err);
    return serverError(res, '图片上传失败');
  }
});

// 多文件上传
router.post('/images', upload.array('images', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return badRequest(res, '没有上传文件');
    }

    const uploadedFiles = req.files.map(file => {
      const fileUrl = `/uploads/images/${file.filename}`;
      return {
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        url: fileUrl,
        fullUrl: `${req.protocol}://${req.get('host')}${fileUrl}`
      };
    });

    return success(res, uploadedFiles, `成功上传${uploadedFiles.length}个图片`);
  } catch (err) {
    console.error('批量图片上传失败:', err);
    return serverError(res, '批量图片上传失败');
  }
});

// 删除图片
router.delete('/image/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return badRequest(res, '文件名不能为空');
    }

    const filePath = path.join(imagesDir, filename);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return badRequest(res, '文件不存在');
    }

    // 删除文件
    fs.unlinkSync(filePath);
    
    return success(res, null, '图片删除成功');
  } catch (err) {
    console.error('删除图片失败:', err);
    return serverError(res, '删除图片失败');
  }
});

// 获取图片列表
router.get('/images', (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const files = fs.readdirSync(imagesDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });

    // 获取文件详细信息
    const imageList = imageFiles.map(filename => {
      const filePath = path.join(imagesDir, filename);
      const stats = fs.statSync(filePath);
      const fileUrl = `/uploads/images/${filename}`;
      
      return {
        filename,
        size: stats.size,
        createTime: stats.birthtime,
        updateTime: stats.mtime,
        url: fileUrl,
        fullUrl: `${req.protocol}://${req.get('host')}${fileUrl}`
      };
    });

    // 按创建时间倒序排列
    imageList.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));

    // 分页
    const pageNum = parseInt(page);
    const pageSize = parseInt(limit);
    const startIndex = (pageNum - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedList = imageList.slice(startIndex, endIndex);

    return success(res, {
      list: paginatedList,
      total: imageList.length,
      page: pageNum,
      limit: pageSize
    }, '获取图片列表成功');
  } catch (err) {
    console.error('获取图片列表失败:', err);
    return serverError(res, '获取图片列表失败');
  }
});

// 错误处理中间件
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return badRequest(res, '文件大小超过限制（最大5MB）');
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return badRequest(res, '文件数量超过限制（最多10个）');
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return badRequest(res, '上传字段名错误');
    }
  }
  
  if (error.message) {
    return badRequest(res, error.message);
  }
  
  return serverError(res, '文件上传错误');
});

module.exports = router; 