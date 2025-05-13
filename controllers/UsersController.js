const UsersModel = require('../models/UsersModel');
const mongoose = require('mongoose');

// 获取管理员列表
exports.list = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, keyword = '' } = req.query;
    const query = keyword
      ? { $or: [ { username: new RegExp(keyword, 'i') }, { nickname: new RegExp(keyword, 'i') } ] }
      : {};
    const total = await UsersModel.countDocuments(query);
    const users = await UsersModel.find(query)
      .skip((page - 1) * pageSize)
      .limit(Number(pageSize))
      .sort({ createdAt: -1 });
    res.json({ code: 0, data: { list: users, total } });
  } catch (err) {
    res.status(500).json({ code: 1, msg: '获取管理员列表失败', error: err.message });
  }
};

// 创建管理员
exports.create = async (req, res) => {
  try {
    const { username, nickname, password, avatar, role } = req.body;
    if (!username || !nickname || !password) {
      return res.status(400).json({ code: 1, msg: '用户名、昵称和密码不能为空' });
    }
    const exist = await UsersModel.findOne({ username });
    if (exist) {
      return res.status(400).json({ code: 1, msg: '用户名已存在' });
    }
    const user = await UsersModel.create({ username, nickname, password, avatar, role });
    res.json({ code: 0, msg: '创建成功', data: user });
  } catch (err) {
    res.status(500).json({ code: 1, msg: '创建管理员失败', error: err.message });
  }
};

// 删除管理员
exports.remove = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ code: 1, msg: '无效的ID' });
    }
    const user = await UsersModel.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ code: 1, msg: '管理员不存在' });
    }
    res.json({ code: 0, msg: '删除成功' });
  } catch (err) {
    res.status(500).json({ code: 1, msg: '删除管理员失败', error: err.message });
  }
};

// 更新管理员
exports.update = async (req, res) => {
  try {
    const { id, ...updateData } = req.body;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ code: 1, msg: '无效的ID' });
    }
    const user = await UsersModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!user) {
      return res.status(404).json({ code: 1, msg: '管理员不存在' });
    }
    res.json({ code: 0, msg: '更新成功', data: user });
  } catch (err) {
    res.status(500).json({ code: 1, msg: '更新管理员失败', error: err.message });
  }
};

// 获取单个管理员信息
exports.findOne = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ code: 1, msg: '无效的ID' });
    }
    const user = await UsersModel.findById(id);
    if (!user) {
      return res.status(404).json({ code: 1, msg: '管理员不存在' });
    }
    res.json({ code: 0, data: user });
  } catch (err) {
    res.status(500).json({ code: 1, msg: '获取管理员信息失败', error: err.message });
  }
};
