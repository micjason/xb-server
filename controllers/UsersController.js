const UsersModel = require('../models/UsersModel');
const mongoose = require('mongoose');
const { success, error, successWithPagination, notFound, badRequest, serverError } = require('../utils/response');

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
    return successWithPagination(res, users, total, '获取管理员列表成功');
  } catch (err) {
    return serverError(res, '获取管理员列表失败');
  }
};

// 创建管理员
exports.create = async (req, res) => {
  try {
    const { username, nickname, password, avatar, role } = req.body;
    if (!username || !nickname || !password) {
      return badRequest(res, '用户名、昵称和密码不能为空');
    }
    const exist = await UsersModel.findOne({ username });
    if (exist) {
      return badRequest(res, '用户名已存在');
    }
    const user = await UsersModel.create({ username, nickname, password, avatar, role });
    return success(res, user, '创建管理员成功');
  } catch (err) {
    return serverError(res, '创建管理员失败');
  }
};

// 删除管理员
exports.remove = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return badRequest(res, '无效的ID');
    }
    const user = await UsersModel.findByIdAndDelete(id);
    if (!user) {
      return notFound(res, '管理员不存在');
    }
    return success(res, null, '删除管理员成功');
  } catch (err) {
    return serverError(res, '删除管理员失败');
  }
};

// 更新管理员
exports.update = async (req, res) => {
  try {
    const { id, ...updateData } = req.body;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return badRequest(res, '无效的ID');
    }
    const user = await UsersModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!user) {
      return notFound(res, '管理员不存在');
    }
    return success(res, user, '更新管理员成功');
  } catch (err) {
    return serverError(res, '更新管理员失败');
  }
};

// 获取单个管理员信息
exports.findOne = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return badRequest(res, '无效的ID');
    }
    const user = await UsersModel.findById(id);
    if (!user) {
      return notFound(res, '管理员不存在');
    }
    return success(res, user, '获取管理员信息成功');
  } catch (err) {
    return serverError(res, '获取管理员信息失败');
  }
};
