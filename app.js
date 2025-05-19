require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// 中间件
app.use(cors());
app.use(express.json());

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

// 启动服务
app.listen(PORT, () => {
  console.log(`服务已启动，端口：${PORT}`);
});
