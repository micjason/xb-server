const UsersOptLogs = require('../models/usersOptLogs');
const { success, error, notFound, badRequest, serverError } = require('../utils/response');

// 创建日志
exports.createLog = async (req, res) => {
  try {
    const { userId, operation, target, detail, ip } = req.body;
    const log = new UsersOptLogs({ userId, operation, target, detail, ip });
    await log.save();
    return success(res, log, '创建日志成功', 201);
  } catch (err) {
    return badRequest(res, err.message);
  }
};

// 获取所有日志
exports.getLogs = async (req, res) => {
  try {
    const logs = await UsersOptLogs.find().populate('userId', 'username nickname');
    return success(res, logs, '获取日志列表成功');
  } catch (err) {
    return serverError(res, '获取日志列表失败');
  }
};

// 删除日志
exports.deleteLog = async (req, res) => {
  try {
    const { id } = req.params;
    const log = await UsersOptLogs.findById(id);
    if (!log) return notFound(res, '日志不存在');
    await log.deleteOne();
    return success(res, null, '日志删除成功');
  } catch (err) {
    return serverError(res, '删除日志失败');
  }
}; 