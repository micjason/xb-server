const Role = require('../models/role');
const { success, error, notFound, badRequest, serverError, forbidden } = require('../utils/response');

// 转换MongoDB文档为前端格式
const transformRole = (role) => {
  if (!role) return null;
  const roleObj = role.toObject ? role.toObject() : role;
  const { _id, __v, ...rest } = roleObj;
  return {
    id: _id,
    ...rest
  };
};

// 创建角色
exports.createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    const role = new Role({ name, description, permissions });
    await role.save();
    const transformedRole = transformRole(role);
    return success(res, transformedRole, '创建角色成功', 201);
  } catch (err) {
    return badRequest(res, err.message);
  }
};

// 获取所有角色
exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.find();
    const transformedRoles = roles.map(transformRole);
    return success(res, transformedRoles, '获取角色列表成功');
  } catch (err) {
    return serverError(res, '获取角色列表失败');
  }
};

// 更新角色
exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;
    const role = await Role.findByIdAndUpdate(
      id,
      { name, description, permissions },
      { new: true }
    );
    if (!role) return notFound(res, '角色不存在');
    const transformedRole = transformRole(role);
    return success(res, transformedRole, '更新角色成功');
  } catch (err) {
    return badRequest(res, err.message);
  }
};

// 删除角色，禁止删除系统内置角色
exports.deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await Role.findById(id);
    if (!role) return notFound(res, '角色不存在');
    if (role.isSystem) return forbidden(res, '系统内置角色不可删除');
    await role.deleteOne();
    return success(res, null, '角色删除成功');
  } catch (err) {
    return serverError(res, '删除角色失败');
  }
}; 