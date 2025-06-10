const Resources = require('../models/resources');
const { success, error, notFound, badRequest, serverError } = require('../utils/response');

// 转换MongoDB文档为前端格式
const transformResource = (resource) => {
  if (!resource) return null;
  const resourceObj = resource.toObject ? resource.toObject() : resource;
  const { _id, __v, ...rest } = resourceObj;
  return {
    id: _id,
    ...rest
  };
};

// 创建资源
exports.createResource = async (req, res) => {
  try {
    const { name, type, url, description } = req.body;
    const resource = new Resources({ name, type, url, description });
    await resource.save();
    const transformedResource = transformResource(resource);
    return success(res, transformedResource, '创建资源成功', 201);
  } catch (err) {
    return badRequest(res, err.message);
  }
};

// 获取所有资源
exports.getResources = async (req, res) => {
  try {
    const resources = await Resources.find();
    const transformedResources = resources.map(transformResource);
    return success(res, transformedResources, '获取资源列表成功');
  } catch (err) {
    return serverError(res, '获取资源列表失败');
  }
};

// 更新资源
exports.updateResource = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, url, description } = req.body;
    const resource = await Resources.findByIdAndUpdate(
      id,
      { name, type, url, description },
      { new: true }
    );
    if (!resource) return notFound(res, '资源不存在');
    const transformedResource = transformResource(resource);
    return success(res, transformedResource, '更新资源成功');
  } catch (err) {
    return badRequest(res, err.message);
  }
};

// 删除资源
exports.deleteResource = async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await Resources.findById(id);
    if (!resource) return notFound(res, '资源不存在');
    await resource.deleteOne();
    return success(res, null, '资源删除成功');
  } catch (err) {
    return serverError(res, '删除资源失败');
  }
}; 