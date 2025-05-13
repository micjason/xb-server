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

// 数据库连接
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB 连接成功');
}).catch((err) => {
  console.error('MongoDB 连接失败:', err);
});

// 路由占位
app.get('/', (req, res) => {
  res.send('Mall Server API 正常运行');
});

// 启动服务
app.listen(PORT, () => {
  console.log(`服务已启动，端口：${PORT}`);
});
