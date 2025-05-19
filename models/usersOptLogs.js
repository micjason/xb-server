const mongoose = require('mongoose');

const UsersOptLogsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true }, // 操作用户ID
  operation: { type: String, required: true },      // 操作类型（如：登录、增、删、改等）
  target: { type: String },                         // 操作对象（如：表名、资源名等）
  detail: { type: String },                         // 详细描述
  ip: { type: String },                             // 操作IP
  createdAt: { type: Date, default: Date.now }      // 操作时间
});

const UsersOptLogsModel = mongoose.model('UsersOptLogs', UsersOptLogsSchema);

module.exports = UsersOptLogsModel; 