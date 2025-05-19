const mongoose = require('mongoose');

const PermissionsSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // 权限名称
  code: { type: String, required: true, unique: true }, // 权限标识/编码
  description: { type: String },                        // 权限描述
  createdAt: { type: Date, default: Date.now }          // 创建时间
});

const PermissionsModel = mongoose.model('Permissions', PermissionsSchema);

module.exports = PermissionsModel; 