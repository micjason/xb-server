const Role = require('../models/role');
const { success, error, notFound, badRequest, serverError, forbidden } = require('../utils/response');

// 转换MongoDB文档为前端格式
const transformRole = (role) => {
  if (!role) return null;
  const roleObj = role.toObject ? role.toObject() : role;
  const { _id, __v, ...rest } = roleObj;
  
  // 适配前端期望的字段格式
  return {
    id: _id,
    name: rest.name || '',
    code: rest.code || `ROLE_${rest.name?.replace(/\s+/g, '_').toUpperCase()}` || '',
    description: rest.description || '',
    status: rest.status !== undefined ? rest.status : 1, // 默认启用
    sort: rest.sort || 0,
    createTime: rest.createdAt || rest.createTime || new Date().toISOString(),
    updateTime: rest.updatedAt || rest.updateTime || new Date().toISOString(),
    createdBy: rest.createdBy || '',
    updatedBy: rest.updatedBy || '',
    permissions: rest.permissions || [],
    isSystem: rest.isSystem || false
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

// 获取角色列表 - 支持分页和搜索
exports.getRoles = async (req, res) => {
  try {
    const {
      page = 1,
      size = 20,
      keyword = '',
      status,
      orderBy = 'createTime',
      order = 'desc'
    } = req.query;

    // 构建查询条件
    const query = {};
    
    // 关键词搜索（支持名称和描述）
    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ];
    }
    
    // 状态筛选
    if (status !== undefined && status !== '') {
      query.status = parseInt(status);
    }

    // 分页计算
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, Math.min(100, parseInt(size)));
    const skip = (pageNum - 1) * pageSize;

    // 排序设置
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortField = orderBy === 'createTime' ? 'createdAt' : orderBy;
    const sortObj = { [sortField]: sortOrder };

    // 执行查询
    const [roles, total] = await Promise.all([
      Role.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Role.countDocuments(query)
    ]);

    // 转换数据格式
    const transformedRoles = roles.map(transformRole);

    // 返回分页格式的数据
    const responseData = {
      list: transformedRoles,
      total: total,
      page: pageNum,
      size: pageSize
    };

    return success(res, responseData, '获取角色列表成功');
  } catch (err) {
    console.error('获取角色列表失败:', err);
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