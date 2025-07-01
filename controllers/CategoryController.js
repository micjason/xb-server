const ProductCategory = require('../models/productCategory');
const { success, error, notFound, badRequest, serverError, forbidden } = require('../utils/response');

// 转换MongoDB文档为前端格式
const transformCategory = (category) => {
  if (!category) return null;
  const categoryObj = category.toObject ? category.toObject() : category;
  const { _id, __v, ...rest } = categoryObj;
  
  // 适配前端期望的字段格式
  return {
    id: _id,
    name: rest.name || '',
    parentId: rest.parentId || null,
    sort: rest.sort || 0,
    status: rest.status !== undefined ? rest.status : 1,
    description: rest.description || '',
    icon: rest.icon || '',
    level: rest.level || 0,
    path: rest.path || '',
    createTime: rest.createdAt || rest.createTime || new Date().toISOString(),
    updateTime: rest.updatedAt || rest.updateTime || new Date().toISOString(),
    createdBy: rest.createdBy || '',
    updatedBy: rest.updatedBy || '',
    // 如果有children字段，也要转换
    children: rest.children ? rest.children.map(transformCategory) : undefined
  };
};

// 创建商品分类
exports.createCategory = async (req, res) => {
  try {
    const { name, parentId, description, icon, sort } = req.body;
    
    // 验证必填字段
    if (!name || name.trim() === '') {
      return badRequest(res, '分类名称不能为空');
    }
    
    // 验证父分类是否存在
    if (parentId) {
      const parentCategory = await ProductCategory.findById(parentId);
      if (!parentCategory) {
        return badRequest(res, '父分类不存在');
      }
      
      // 检查分类层级限制（最多5级）
      if (parentCategory.level >= 4) {
        return badRequest(res, '分类层级不能超过5级');
      }
    }
    
    // 检查同级分类名称是否重复
    const existingCategory = await ProductCategory.findOne({ 
      name: name.trim(), 
      parentId: parentId || null 
    });
    if (existingCategory) {
      return badRequest(res, '同级分类名称不能重复');
    }
    
    // 获取当前用户信息（从JWT中获取）
    const createdBy = req.user?.username || '系统管理员';
    
    const category = new ProductCategory({ 
      name: name.trim(), 
      parentId: parentId || null,
      description: description ? description.trim() : '',
      icon: icon ? icon.trim() : '',
      sort: sort || 0,
      createdBy,
      updatedBy: createdBy
    });
    
    await category.save();
    const transformedCategory = transformCategory(category);
    return success(res, transformedCategory, '创建分类成功');
  } catch (err) {
    console.error('创建分类失败:', err);
    if (err.name === 'ValidationError') {
      return badRequest(res, err.message);
    }
    return serverError(res, '创建分类失败');
  }
};

// 获取分类列表 - 支持分页、搜索和筛选
exports.getCategories = async (req, res) => {
  try {
    const {
      page = 1,
      size = 20,
      keyword = '',
      status,
      parentId,
      level,
      orderBy = 'sort',
      order = 'asc'
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
    
    // 父分类筛选
    if (parentId !== undefined) {
      query.parentId = parentId === 'null' || parentId === '' ? null : parentId;
    }
    
    // 层级筛选
    if (level !== undefined && level !== '') {
      query.level = parseInt(level);
    }

    // 分页计算
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, Math.min(100, parseInt(size)));
    const skip = (pageNum - 1) * pageSize;

    // 排序设置
    const sortOrder = order === 'desc' ? -1 : 1;
    let sortField;
    switch (orderBy) {
      case 'createTime':
        sortField = 'createdAt';
        break;
      case 'updateTime':
        sortField = 'updatedAt';
        break;
      case 'name':
        sortField = 'name';
        break;
      case 'level':
        sortField = 'level';
        break;
      default:
        sortField = 'sort';
    }
    const sortObj = { [sortField]: sortOrder, createdAt: -1 }; // 二级排序按创建时间

    // 执行查询
    const [categories, total] = await Promise.all([
      ProductCategory.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(pageSize)
        .populate('parent', 'name')
        .lean(),
      ProductCategory.countDocuments(query)
    ]);

    // 转换数据格式并添加父分类名称
    const transformedCategories = categories.map(category => {
      const transformed = transformCategory(category);
      if (category.parent) {
        transformed.parentName = category.parent.name;
      }
      return transformed;
    });

    // 返回分页格式的数据
    const responseData = {
      list: transformedCategories,
      total: total,
      page: pageNum,
      size: pageSize
    };

    return success(res, responseData, '获取分类列表成功');
  } catch (err) {
    console.error('获取分类列表失败:', err);
    return serverError(res, '获取分类列表失败');
  }
};

// 获取分类树形结构
exports.getCategoryTree = async (req, res) => {
  try {
    const { status } = req.query;
    const statusFilter = status !== undefined && status !== '' ? parseInt(status) : null;
    
    const categoryTree = await ProductCategory.getCategoryTree(null, statusFilter);
    const transformedTree = categoryTree.map(transformCategory);
    
    return success(res, transformedTree, '获取分类树成功');
  } catch (err) {
    console.error('获取分类树失败:', err);
    return serverError(res, '获取分类树失败');
  }
};

// 获取分类详情
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await ProductCategory.findById(id)
      .populate('parent', 'name')
      .lean();
      
    if (!category) {
      return notFound(res, '分类不存在');
    }
    
    const transformedCategory = transformCategory(category);
    if (category.parent) {
      transformedCategory.parentName = category.parent.name;
    }
    
    // 获取分类路径名称
    const pathNames = await ProductCategory.getCategoryPathNames(id);
    transformedCategory.pathNames = pathNames;
    
    return success(res, transformedCategory, '获取分类详情成功');
  } catch (err) {
    console.error('获取分类详情失败:', err);
    if (err.name === 'CastError') {
      return badRequest(res, '分类ID格式错误');
    }
    return serverError(res, '获取分类详情失败');
  }
};

// 更新分类
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parentId, description, icon, sort, status } = req.body;
    
    const category = await ProductCategory.findById(id);
    if (!category) {
      return notFound(res, '分类不存在');
    }
    
    // 验证名称
    if (!name || name.trim() === '') {
      return badRequest(res, '分类名称不能为空');
    }
    
    // 验证父分类
    if (parentId && parentId !== category.parentId?.toString()) {
      // 不能将分类设置为自己的子分类
      if (parentId === id) {
        return badRequest(res, '不能将分类设置为自己的父分类');
      }
      
      const parentCategory = await ProductCategory.findById(parentId);
      if (!parentCategory) {
        return badRequest(res, '父分类不存在');
      }
      
      // 检查是否会造成循环引用
      const checkParentPath = parentCategory.path || '';
      if (checkParentPath.includes(`/${id}/`) || checkParentPath.endsWith(`/${id}`)) {
        return badRequest(res, '不能将分类设置为其子分类的父分类');
      }
      
      // 检查层级限制
      if (parentCategory.level >= 4) {
        return badRequest(res, '分类层级不能超过5级');
      }
    }
    
    // 检查同级分类名称是否重复
    const finalParentId = parentId || null;
    if (name.trim() !== category.name) {
      const existingCategory = await ProductCategory.findOne({ 
        name: name.trim(), 
        parentId: finalParentId,
        _id: { $ne: id }
      });
      if (existingCategory) {
        return badRequest(res, '同级分类名称不能重复');
      }
    }
    
    // 获取当前用户信息
    const updatedBy = req.user?.username || '系统管理员';
    
    // 更新分类信息
    category.name = name.trim();
    category.parentId = finalParentId;
    category.description = description ? description.trim() : '';
    category.icon = icon ? icon.trim() : '';
    category.sort = sort !== undefined ? sort : category.sort;
    category.status = status !== undefined ? status : category.status;
    category.updatedBy = updatedBy;
    
    await category.save();
    
    const transformedCategory = transformCategory(category);
    return success(res, transformedCategory, '更新分类成功');
  } catch (err) {
    console.error('更新分类失败:', err);
    if (err.name === 'ValidationError') {
      return badRequest(res, err.message);
    }
    if (err.name === 'CastError') {
      return badRequest(res, '分类ID格式错误');
    }
    return serverError(res, '更新分类失败');
  }
};

// 更新分类状态
exports.updateCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (status === undefined || ![0, 1].includes(status)) {
      return badRequest(res, '状态值无效');
    }
    
    const category = await ProductCategory.findById(id);
    if (!category) {
      return notFound(res, '分类不存在');
    }
    
    // 获取当前用户信息
    const updatedBy = req.user?.username || '系统管理员';
    
    category.status = status;
    category.updatedBy = updatedBy;
    await category.save();
    
    const transformedCategory = transformCategory(category);
    const statusText = status === 1 ? '启用' : '禁用';
    return success(res, transformedCategory, `${statusText}分类成功`);
  } catch (err) {
    console.error('更新分类状态失败:', err);
    if (err.name === 'CastError') {
      return badRequest(res, '分类ID格式错误');
    }
    return serverError(res, '更新分类状态失败');
  }
};

// 删除分类
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await ProductCategory.findById(id);
    if (!category) {
      return notFound(res, '分类不存在');
    }
    
    // 检查是否有子分类
    const childCount = await ProductCategory.countDocuments({ parentId: id });
    if (childCount > 0) {
      return badRequest(res, '该分类下还有子分类，无法删除');
    }
    
    // 检查是否有商品使用此分类（需要引入Product模型时启用）
    // const Product = require('../models/product');
    // const productCount = await Product.countDocuments({ categoryId: id });
    // if (productCount > 0) {
    //   return badRequest(res, '该分类下还有商品，无法删除');
    // }
    
    await category.deleteOne();
    return success(res, null, '删除分类成功');
  } catch (err) {
    console.error('删除分类失败:', err);
    if (err.name === 'CastError') {
      return badRequest(res, '分类ID格式错误');
    }
    return serverError(res, '删除分类失败');
  }
};

// 获取分类选项列表（用于其他模块的分类选择）
exports.getCategoryOptions = async (req, res) => {
  try {
    const { status = 1, level } = req.query;
    
    const query = { status: parseInt(status) };
    if (level !== undefined && level !== '') {
      query.level = { $lte: parseInt(level) };
    }
    
    const categories = await ProductCategory.find(query)
      .select('name level parentId')
      .sort({ level: 1, sort: 1, createdAt: 1 })
      .lean();
    
    // 构建树形选项结构
    const buildOptions = (parentId = null, depth = 0) => {
      const prefix = '　'.repeat(depth); // 使用全角空格作为缩进
      return categories
        .filter(cat => String(cat.parentId || null) === String(parentId || null))
        .map(cat => ({
          value: cat._id,
          label: `${prefix}${cat.name}`,
          level: cat.level,
          children: buildOptions(cat._id, depth + 1)
        }));
    };
    
    const options = buildOptions();
    
    // 扁平化选项（保持层级缩进）
    const flattenOptions = (opts) => {
      let result = [];
      opts.forEach(opt => {
        result.push({
          value: opt.value,
          label: opt.label,
          level: opt.level
        });
        if (opt.children && opt.children.length > 0) {
          result = result.concat(flattenOptions(opt.children));
        }
      });
      return result;
    };
    
    const flatOptions = flattenOptions(options);
    
    return success(res, flatOptions, '获取分类选项成功');
  } catch (err) {
    console.error('获取分类选项失败:', err);
    return serverError(res, '获取分类选项失败');
  }
}; 