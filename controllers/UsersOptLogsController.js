const UsersOptLogs = require('../models/usersOptLogs');

// 创建日志
exports.createLog = async (req, res) => {
  try {
    const { userId, operation, target, detail, ip } = req.body;
    const log = new UsersOptLogs({ userId, operation, target, detail, ip });
    await log.save();
    res.status(201).json(log);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// 获取所有日志
exports.getLogs = async (req, res) => {
  try {
    const logs = await UsersOptLogs.find().populate('userId', 'username nickname');
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 删除日志
exports.deleteLog = async (req, res) => {
  try {
    const { id } = req.params;
    const log = await UsersOptLogs.findById(id);
    if (!log) return res.status(404).json({ error: '日志不存在' });
    await log.deleteOne();
    res.json({ message: '日志已删除' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 