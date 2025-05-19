const mongoose = require('mongoose');

const ResourcesSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // 资源名称
  type: { type: String, required: true },               // 资源类型
  url: { type: String, required: true },                // 资源路径/链接
  description: { type: String },                        // 资源描述
  createdAt: { type: Date, default: Date.now }          // 创建时间
});

const ResourcesModel = mongoose.model('Resources', ResourcesSchema);

module.exports = ResourcesModel; 