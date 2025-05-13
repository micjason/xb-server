const mongoose = require('mongoose');

const UsersSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }, // 用户名
  nickname: { type: String, required: true },               // 昵称
  password: { type: String, required: true },               // 密码（加密存储）
  avatar: { type: String },                                 // 头像
  role: { type: String, default: 'admin' },                 // 角色
  createdAt: { type: Date, default: Date.now }              // 创建时间
});

const UsersModel = mongoose.model('Users', UsersSchema);

module.exports = UsersModel;
