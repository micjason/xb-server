/**
 * 导入必要的模块
 * express: Web 应用框架
 * mongoose: MongoDB 数据库操作
 * dotenv: 环境变量管理
 */
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/user');

// 创建 Express 应用实例
const app = express();

/**
 * 配置中间件
 * express.json(): 解析 JSON 格式的请求体
 * 这样我们就可以在 req.body 中获取到 POST 请求的数据
 */
app.use(express.json());

/**
 * 连接 MongoDB 数据库
 * process.env.MONGODB_URI: 从环境变量中获取数据库连接字符串
 * 使用 Promise 处理连接的成功与失败
 */
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB 连接成功'))
  .catch(err => console.log('MongoDB 连接失败:', err));

/**
 * 基础路由 - 欢迎页面
 * @route GET /
 * @returns {object} 200 - 欢迎信息
 */
app.get('/', (req, res) => {
  res.json({ message: '欢迎访问博客 API' });
});

/**
 * 用户注册接口
 * @route POST /api/register
 * @param {string} username.required - 用户名
 * @param {string} email.required - 电子邮箱
 * @param {string} password.required - 密码
 * @returns {object} 201 - 注册成功
 * @returns {object} 400 - 用户名或邮箱已存在
 * @returns {object} 500 - 服务器错误
 */
app.post('/api/register', async (req, res) => {
  try {
    // 从请求体中解构需要的数据
    const { username, email, password } = req.body;
    console.log('username:', username, 'email:', email, 'password:', password);
    // 检查用户名或邮箱是否已存在
    // $or 操作符允许我们同时检查多个条件
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });

    if (existingUser) {
      return res.status(400).json({
        code: 400,
        message: '用户名或邮箱已被使用'
      });
    }

    // 创建新用户实例
    const user = new User({
      username,
      email,
      password // 密码会在保存时自动加密（通过 mongoose 中间件）
    });

    // 保存用户到数据库
    await user.save();

    // 返回成功响应（不包含密码字段）
    res.status(201).json({
      code: 201,
      message: '注册成功',
      data: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    // 错误处理
    res.status(500).json({
      code: 500,
      message: '注册失败: ' + error.message
    });
  }
});

/**
 * 用户登录接口
 * @route POST /api/login
 * @param {string} username.required - 用户名或邮箱
 * @param {string} password.required - 密码
 * @returns {object} 200 - 登录成功
 * @returns {object} 401 - 用户名或密码错误
 * @returns {object} 500 - 服务器错误
 */
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 查找用户
    // select('+password') 特别包含了默认不返回的密码字段
    const user = await User.findOne({ 
      $or: [
        { username },  // 支持使用用户名登录
        { email: username }  // 支持使用邮箱登录
      ]
    }).select('+password');

    // 用户不存在
    if (!user) {
      return res.status(401).json({
        code: 401,
        message: '用户名或密码错误'
      });
    }

    // 验证密码
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        code: 401,
        message: '用户名或密码错误'
      });
    }

    // 登录成功
    res.json({
      code: 200,
      message: '登录成功',
      data: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    // 错误处理
    res.status(500).json({
      code: 500,
      message: '登录失败: ' + error.message
    });
  }
});

/**
 * 启动服务器
 * process.env.PORT: 从环境变量获取端口号，默认为 3000
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
