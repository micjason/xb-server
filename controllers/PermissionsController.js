const Permissions = require('../models/permissions');
const { success, error, notFound, badRequest, serverError } = require('../utils/response');

// 转换MongoDB文档为前端格式
const transformPermission = (permission) => {
  if (!permission) return null;
  const permissionObj = permission.toObject ? permission.toObject() : permission;
  const { _id, __v, ...rest } = permissionObj;
  return {
    id: _id,
    ...rest
  };
};

// 创建权限
exports.createPermission = async (req, res) => {
  try {
    const { name, code, description } = req.body;
    const permission = new Permissions({ name, code, description });
    await permission.save();
    const transformedPermission = transformPermission(permission);
    return success(res, transformedPermission, '创建权限成功', 201);
  } catch (err) {
    return badRequest(res, err.message);
  }
};

// 获取所有权限
exports.getPermissions = async (req, res) => {
  try {
    const permissions = await Permissions.find();
    const transformedPermissions = permissions.map(transformPermission);
    return success(res, transformedPermissions, '获取权限列表成功');
  } catch (err) {
    return serverError(res, '获取权限列表失败');
  }
};

// 更新权限
exports.updatePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description } = req.body;
    const permission = await Permissions.findByIdAndUpdate(
      id,
      { name, code, description },
      { new: true }
    );
    if (!permission) return notFound(res, '权限不存在');
    const transformedPermission = transformPermission(permission);
    return success(res, transformedPermission, '更新权限成功');
  } catch (err) {
    return badRequest(res, err.message);
  }
};

// 删除权限
exports.deletePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const permission = await Permissions.findById(id);
    if (!permission) return notFound(res, '权限不存在');
    await permission.deleteOne();
    return success(res, null, '权限删除成功');
  } catch (err) {
    return serverError(res, '删除权限失败');
  }
}; 