require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务 - 用于访问上传的图片
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 挂载登录认证路由
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

// 挂载用户路由
const usersRouter = require('./routes/users');
app.use('/api/users', usersRouter);

// 挂载角色路由
const rolesRouter = require('./routes/roles');
app.use('/api/roles', rolesRouter);

// 挂载权限路由
const permissionsRouter = require('./routes/permissions');
app.use('/api/permissions', permissionsRouter);

// 挂载资源路由
const resourcesRouter = require('./routes/resources');
app.use('/api/resources', resourcesRouter);

// 挂载用户操作日志路由
const usersOptLogsRouter = require('./routes/users_opt_logs');
app.use('/api/users-opt-logs', usersOptLogsRouter);

// 挂载商品分类路由
const categoriesRouter = require('./routes/categories');
app.use('/api/categories', categoriesRouter);

// 挂载商品管理路由
const productsRouter = require('./routes/products');
app.use('/api/products', productsRouter);

// 挂载上传路由
const uploadRouter = require('./routes/upload');
app.use('/api/upload', uploadRouter);

// 数据库连接
const Role = require('./models/role');
async function ensureSuperAdminRole() {
  const superAdmin = await Role.findOne({ name: 'superadmin' });
  if (!superAdmin) {
    await Role.create({
      name: 'superadmin',
      description: '系统默认超级管理员',
      permissions: ['*'],
      isSystem: true
    });
    console.log('已自动创建超级管理员角色');
  }
}

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('MongoDB 连接成功');
    await ensureSuperAdminRole();
  }).catch((err) => {
    console.error('MongoDB 连接失败:', err);
  });

// 路由占位
app.get('/', (req, res) => {
  res.send('Mall Server API 正常运行');
});

app.post('/test-json', (req, res) => {
  console.log('收到的请求体:', req.body);
  res.json({
    received: req.body
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
});

// 启动服务
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
