const Product = require('../models/product');
const ProductCategory = require('../models/productCategory');
const { success, error, notFound, badRequest, serverError, forbidden } = require('../utils/response');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// 转换MongoDB文档为前端格式
const transformProduct = (product) => {
  if (!product) return null;
  const productObj = product.toObject ? product.toObject() : product;
  const { _id, __v, ...rest } = productObj;
  
  // 适配前端期望的字段格式
  return {
    id: _id,
    name: rest.name || '',
    categoryId: rest.categoryId || null,
    categoryName: rest.category?.name || rest.categoryName || '',
    sku: rest.sku || '',
    price: rest.price || 0,
    originalPrice: rest.originalPrice || null,
    cost: rest.cost || null,
    stock: rest.stock || 0,
    sales: rest.sales || 0,
    description: rest.description || '',
    images: rest.images || [],
    status: rest.status !== undefined ? rest.status : 1,
    sort: rest.sort || 0,
    tags: rest.tags || [],
    specifications: rest.specifications || {},
    seoTitle: rest.seoTitle || '',
    seoKeywords: rest.seoKeywords || '',
    seoDescription: rest.seoDescription || '',
    weight: rest.weight || null,
    dimensions: rest.dimensions || {},
    brand: rest.brand || '',
    model: rest.model || '',
    createTime: rest.createdAt || rest.createTime || new Date().toISOString(),
    updateTime: rest.updatedAt || rest.updateTime || new Date().toISOString(),
    createdBy: rest.createdBy || '',
    updatedBy: rest.updatedBy || '',
    // 推荐相关字段
    isRecommended: rest.isRecommended || false,
    isHot: rest.isHot || false,
    isFeatured: rest.isFeatured || false,
    isNew: rest.isNew !== undefined ? rest.isNew : false,
    // 虚拟字段
    profitMargin: rest.profitMargin || 0,
    primaryImage: rest.primaryImage || (rest.images && rest.images.length > 0 ? rest.images[0] : null)
  };
};// 创建商品
exports.createProduct = async (req, res) => {
  try {
    const { 
      name, categoryId, sku, price, originalPrice, cost, stock, 
      description, images, tags, specifications, seoTitle, 
      seoKeywords, seoDescription, weight, dimensions, brand, model, sort 
    } = req.body;
    
    // 验证必填字段
    if (!name || name.trim() === '') {
      return badRequest(res, '商品名称不能为空');
    }
    
    if (!categoryId) {
      return badRequest(res, '商品分类不能为空');
    }
    
    if (!price || price <= 0) {
      return badRequest(res, '销售价格必须大于0');
    }
    
    // 验证分类是否存在且启用
    const category = await ProductCategory.findOne({ _id: categoryId, status: 1 });
    if (!category) {
      return badRequest(res, '商品分类不存在或已禁用');
    }
    
    // 验证SKU唯一性（如果提供）
    if (sku && sku.trim()) {
      const existingProduct = await Product.findOne({ sku: sku.trim() });
      if (existingProduct) {
        return badRequest(res, 'SKU编码已存在');
      }
    }
    
    // 获取当前用户信息
    const createdBy = req.user?.username || '系统管理员';
    
    const product = new Product({
      name: name.trim(),
      categoryId,
      sku: sku ? sku.trim() : undefined,
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
      cost: cost ? parseFloat(cost) : undefined,
      stock: stock ? parseInt(stock) : 0,
      description: description ? description.trim() : '',
      images: Array.isArray(images) ? images.filter(img => img && img.trim()) : [],
      tags: Array.isArray(tags) ? tags.filter(tag => tag && tag.trim()).map(tag => tag.trim()) : [],
      specifications: specifications || {},
      seoTitle: seoTitle ? seoTitle.trim() : '',
      seoKeywords: seoKeywords ? seoKeywords.trim() : '',
      seoDescription: seoDescription ? seoDescription.trim() : '',
      weight: weight ? parseFloat(weight) : undefined,
      dimensions: dimensions || {},
      brand: brand ? brand.trim() : '',
      model: model ? model.trim() : '',
      sort: sort ? parseInt(sort) : 0,
      createdBy,
      updatedBy: createdBy
    });
    
    await product.save();
    
    // 返回时包含分类信息
    await product.populate('category', 'name');
    const transformedProduct = transformProduct(product);
    
    return success(res, transformedProduct, '创建商品成功');
  } catch (err) {
    console.error('创建商品失败:', err);
    if (err.name === 'ValidationError') {
      return badRequest(res, err.message);
    }
    return serverError(res, '创建商品失败');
  }
};// 获取商品列表 - 支持分页、搜索和筛选
exports.getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      size = 20,
      keyword = '',
      categoryId,
      status,
      minPrice,
      maxPrice,
      brand,
      inStock,
      orderBy = 'createTime',
      order = 'desc'
    } = req.query;

    // 构建查询条件
    const query = {};
    
    // 关键词搜索（支持名称、SKU、描述、标签）
    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { sku: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { tags: { $in: [new RegExp(keyword, 'i')] } },
        { brand: { $regex: keyword, $options: 'i' } },
        { model: { $regex: keyword, $options: 'i' } }
      ];
    }
    
    // 分类筛选
    if (categoryId) {
      query.categoryId = categoryId;
    }
    
    // 状态筛选
    if (status !== undefined && status !== '') {
      query.status = parseInt(status);
    }
    
    // 价格区间筛选
    if (minPrice !== undefined && minPrice !== '') {
      query.price = { ...query.price, $gte: parseFloat(minPrice) };
    }
    if (maxPrice !== undefined && maxPrice !== '') {
      query.price = { ...query.price, $lte: parseFloat(maxPrice) };
    }    
    // 品牌筛选
    if (brand) {
      query.brand = { $regex: brand, $options: 'i' };
    }
    
    // 库存筛选
    if (inStock !== undefined && inStock !== '') {
      if (parseInt(inStock) === 1) {
        query.stock = { $gt: 0 };
      } else {
        query.stock = { $lte: 0 };
      }
    }

    // 分页计算
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, Math.min(100, parseInt(size)));
    const skip = (pageNum - 1) * pageSize;

    // 排序设置
    const sortOrder = order === 'asc' ? 1 : -1;
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
      case 'price':
        sortField = 'price';
        break;
      case 'sales':
        sortField = 'sales';
        break;
      case 'stock':
        sortField = 'stock';
        break;
      default:
        sortField = 'sort';
    }
    const sortObj = { [sortField]: sortOrder, createdAt: -1 };    // 执行查询
    const [products, total] = await Promise.all([
      Product.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(pageSize)
        .populate('category', 'name')
        .lean(),
      Product.countDocuments(query)
    ]);

    // 转换数据格式
    const transformedProducts = products.map(transformProduct);

    // 返回分页格式的数据
    const responseData = {
      list: transformedProducts,
      total: total,
      page: pageNum,
      size: pageSize
    };

    return success(res, responseData, '获取商品列表成功');
  } catch (err) {
    console.error('获取商品列表失败:', err);
    return serverError(res, '获取商品列表失败');
  }
};// 获取商品详情
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findById(id)
      .populate('category', 'name level parentId')
      .lean();
      
    if (!product) {
      return notFound(res, '商品不存在');
    }
    
    const transformedProduct = transformProduct(product);
    
    // 获取分类路径信息
    if (product.category) {
      const pathNames = await ProductCategory.getCategoryPathNames(product.categoryId);
      transformedProduct.categoryPath = pathNames;
    }
    
    return success(res, transformedProduct, '获取商品详情成功');
  } catch (err) {
    console.error('获取商品详情失败:', err);
    if (err.name === 'CastError') {
      return badRequest(res, '商品ID格式错误');
    }
    return serverError(res, '获取商品详情失败');
  }
};// 更新商品
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, categoryId, sku, price, originalPrice, cost, stock,
      description, images, tags, specifications, seoTitle,
      seoKeywords, seoDescription, weight, dimensions, brand, model, sort, status
    } = req.body;
    
    const product = await Product.findById(id);
    if (!product) {
      return notFound(res, '商品不存在');
    }
    
    // 验证必填字段
    if (!name || name.trim() === '') {
      return badRequest(res, '商品名称不能为空');
    }
    
    if (!categoryId) {
      return badRequest(res, '商品分类不能为空');
    }
    
    if (!price || price <= 0) {
      return badRequest(res, '销售价格必须大于0');
    }
    
    // 验证分类是否存在且启用
    if (categoryId !== product.categoryId?.toString()) {
      const category = await ProductCategory.findOne({ _id: categoryId, status: 1 });
      if (!category) {
        return badRequest(res, '商品分类不存在或已禁用');
      }
    }
    
    // 验证SKU唯一性（如果修改了SKU）
    if (sku && sku.trim() && sku.trim() !== product.sku) {
      const existingProduct = await Product.findOne({ 
        sku: sku.trim(),
        _id: { $ne: id }
      });
      if (existingProduct) {
        return badRequest(res, 'SKU编码已存在');
      }
    }    
    // 获取当前用户信息
    const updatedBy = req.user?.username || '系统管理员';
    
    // 更新商品信息
    product.name = name.trim();
    product.categoryId = categoryId;
    product.sku = sku ? sku.trim() : product.sku;
    product.price = parseFloat(price);
    product.originalPrice = originalPrice ? parseFloat(originalPrice) : undefined;
    product.cost = cost ? parseFloat(cost) : undefined;
    product.stock = stock !== undefined ? parseInt(stock) : product.stock;
    product.description = description !== undefined ? (description ? description.trim() : '') : product.description;
    product.images = Array.isArray(images) ? images.filter(img => img && img.trim()) : product.images;
    product.tags = Array.isArray(tags) ? tags.filter(tag => tag && tag.trim()).map(tag => tag.trim()) : product.tags;
    product.specifications = specifications !== undefined ? specifications : product.specifications;
    product.seoTitle = seoTitle !== undefined ? (seoTitle ? seoTitle.trim() : '') : product.seoTitle;
    product.seoKeywords = seoKeywords !== undefined ? (seoKeywords ? seoKeywords.trim() : '') : product.seoKeywords;
    product.seoDescription = seoDescription !== undefined ? (seoDescription ? seoDescription.trim() : '') : product.seoDescription;
    product.weight = weight !== undefined ? (weight ? parseFloat(weight) : undefined) : product.weight;
    product.dimensions = dimensions !== undefined ? dimensions : product.dimensions;
    product.brand = brand !== undefined ? (brand ? brand.trim() : '') : product.brand;
    product.model = model !== undefined ? (model ? model.trim() : '') : product.model;
    product.sort = sort !== undefined ? parseInt(sort) : product.sort;
    product.status = status !== undefined ? status : product.status;
    product.updatedBy = updatedBy;
    
    await product.save();
    
    // 返回时包含分类信息
    await product.populate('category', 'name');
    const transformedProduct = transformProduct(product);
    
    return success(res, transformedProduct, '更新商品成功');
  } catch (err) {
    console.error('更新商品失败:', err);
    if (err.name === 'ValidationError') {
      return badRequest(res, err.message);
    }
    if (err.name === 'CastError') {
      return badRequest(res, '商品ID格式错误');
    }
    return serverError(res, '更新商品失败');
  }
};// 更新商品状态
exports.updateProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (status === undefined || ![0, 1].includes(status)) {
      return badRequest(res, '状态值无效');
    }
    
    const product = await Product.findById(id);
    if (!product) {
      return notFound(res, '商品不存在');
    }
    
    // 获取当前用户信息
    const updatedBy = req.user?.username || '系统管理员';
    
    product.status = status;
    product.updatedBy = updatedBy;
    await product.save();
    
    const transformedProduct = transformProduct(product);
    const statusText = status === 1 ? '上架' : '下架';
    return success(res, transformedProduct, `${statusText}商品成功`);
  } catch (err) {
    console.error('更新商品状态失败:', err);
    if (err.name === 'CastError') {
      return badRequest(res, '商品ID格式错误');
    }
    return serverError(res, '更新商品状态失败');
  }
};// 批量更新商品状态
exports.batchUpdateProductStatus = async (req, res) => {
  try {
    const { ids, status } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return badRequest(res, '商品ID列表不能为空');
    }
    
    if (status === undefined || ![0, 1].includes(status)) {
      return badRequest(res, '状态值无效');
    }
    
    // 获取当前用户信息
    const updatedBy = req.user?.username || '系统管理员';
    
    const updateResult = await Product.updateMany(
      { _id: { $in: ids } },
      { 
        status,
        updatedBy,
        updatedAt: new Date()
      }
    );
    
    const statusText = status === 1 ? '上架' : '下架';
    return success(res, {
      modifiedCount: updateResult.modifiedCount,
      totalCount: ids.length
    }, `批量${statusText}商品成功，共处理${updateResult.modifiedCount}个商品`);
  } catch (err) {
    console.error('批量更新商品状态失败:', err);
    return serverError(res, '批量更新商品状态失败');
  }
};

// 删除商品
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findById(id);
    if (!product) {
      return notFound(res, '商品不存在');
    }
    
    await product.deleteOne();
    return success(res, null, '删除商品成功');
  } catch (err) {
    console.error('删除商品失败:', err);
    if (err.name === 'CastError') {
      return badRequest(res, '商品ID格式错误');
    }
    return serverError(res, '删除商品失败');
  }
};// 更新商品库存
exports.updateProductStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, operation = 'set' } = req.body;
    
    if (quantity === undefined || quantity < 0) {
      return badRequest(res, '库存数量无效');
    }
    
    if (!['set', 'add', 'reduce'].includes(operation)) {
      return badRequest(res, '操作类型无效');
    }
    
    const product = await Product.findById(id);
    if (!product) {
      return notFound(res, '商品不存在');
    }
    
    const updatedBy = req.user?.username || '系统管理员';
    
    switch (operation) {
      case 'set':
        product.stock = parseInt(quantity);
        break;
      case 'add':
        product.stock += parseInt(quantity);
        break;
      case 'reduce':
        product.stock = Math.max(0, product.stock - parseInt(quantity));
        break;
    }
    
    product.updatedBy = updatedBy;
    await product.save();
    
    const transformedProduct = transformProduct(product);
    return success(res, transformedProduct, '更新商品库存成功');
  } catch (err) {
    console.error('更新商品库存失败:', err);
    return serverError(res, '更新商品库存失败');
  }
};

// 获取热销商品
exports.getTopSellingProducts = async (req, res) => {
  try {
    const { limit = 10, categoryId } = req.query;
    
    const products = await Product.getTopSelling(parseInt(limit), categoryId);
    const transformedProducts = products.map(transformProduct);
    
    return success(res, transformedProducts, '获取热销商品成功');
  } catch (err) {
    console.error('获取热销商品失败:', err);
    return serverError(res, '获取热销商品失败');
  }
};

// 获取新品推荐
exports.getNewProducts = async (req, res) => {
  try {
    const { limit = 10, categoryId } = req.query;
    
    const products = await Product.getNewProducts(parseInt(limit), categoryId);
    const transformedProducts = products.map(transformProduct);
    
    return success(res, transformedProducts, '获取新品推荐成功');
  } catch (err) {
    console.error('获取新品推荐失败:', err);
    return serverError(res, '获取新品推荐失败');
  }
};

// 获取相关商品推荐
exports.getRelatedProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10 } = req.query;
    
    const product = await Product.findById(id);
    if (!product) {
      return notFound(res, '商品不存在');
    }
    
    // 基于同分类的商品推荐
    const relatedProducts = await Product.find({
      _id: { $ne: id },
      categoryId: product.categoryId,
      status: 1
    })
    .sort({ sales: -1, createdAt: -1 })
    .limit(parseInt(limit))
    .populate('category', 'name');
    
    const transformedProducts = relatedProducts.map(transformProduct);
    return success(res, transformedProducts, '获取相关商品成功');
  } catch (err) {
    console.error('获取相关商品失败:', err);
    return serverError(res, '获取相关商品失败');
  }
};

// 更新商品推荐状态
exports.updateProductRecommend = async (req, res) => {
  try {
    const { id } = req.params;
    const { isRecommended, isHot, isFeatured, isNew } = req.body;
    
    const product = await Product.findById(id);
    if (!product) {
      return notFound(res, '商品不存在');
    }
    
    const updatedBy = req.user?.username || '系统管理员';
    
    // 更新推荐相关字段
    if (isRecommended !== undefined) product.isRecommended = isRecommended;
    if (isHot !== undefined) product.isHot = isHot;
    if (isFeatured !== undefined) product.isFeatured = isFeatured;
    if (isNew !== undefined) product.isNew = isNew;
    
    product.updatedBy = updatedBy;
    await product.save();
    
    const transformedProduct = transformProduct(product);
    return success(res, transformedProduct, '更新推荐状态成功');
  } catch (err) {
    console.error('更新推荐状态失败:', err);
    return serverError(res, '更新推荐状态失败');
  }
};

// 批量更新商品分类
exports.batchUpdateProductCategory = async (req, res) => {
  try {
    const { ids, categoryId } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return badRequest(res, '商品ID列表不能为空');
    }
    
    if (!categoryId) {
      return badRequest(res, '分类ID不能为空');
    }
    
    // 验证分类是否存在且启用
    const category = await ProductCategory.findOne({ _id: categoryId, status: 1 });
    if (!category) {
      return badRequest(res, '分类不存在或已禁用');
    }
    
    const updatedBy = req.user?.username || '系统管理员';
    
    const updateResult = await Product.updateMany(
      { _id: { $in: ids } },
      { 
        categoryId,
        updatedBy,
        updatedAt: new Date()
      }
    );
    
    return success(res, {
      modifiedCount: updateResult.modifiedCount,
      totalCount: ids.length,
      categoryName: category.name
    }, `批量更新商品分类成功，共处理${updateResult.modifiedCount}个商品`);
  } catch (err) {
    console.error('批量更新商品分类失败:', err);
    return serverError(res, '批量更新商品分类失败');
  }
};

// 批量调整商品价格
exports.batchAdjustProductPrice = async (req, res) => {
  try {
    const { ids, adjustType, adjustValue } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return badRequest(res, '商品ID列表不能为空');
    }
    
    if (!['fixed', 'percentage'].includes(adjustType)) {
      return badRequest(res, '调整类型无效');
    }
    
    if (adjustValue === undefined || adjustValue < 0) {
      return badRequest(res, '调整值无效');
    }
    
    const updatedBy = req.user?.username || '系统管理员';
    const products = await Product.find({ _id: { $in: ids } });
    
    let modifiedCount = 0;
    for (const product of products) {
      let newPrice;
      if (adjustType === 'fixed') {
        // 固定金额调整
        newPrice = parseFloat(adjustValue);
      } else {
        // 百分比调整
        newPrice = product.price * (1 + parseFloat(adjustValue) / 100);
      }
      
      if (newPrice > 0) {
        product.price = Math.round(newPrice * 100) / 100; // 保留两位小数
        product.updatedBy = updatedBy;
        await product.save();
        modifiedCount++;
      }
    }
    
    return success(res, {
      modifiedCount,
      totalCount: ids.length,
      adjustType,
      adjustValue
    }, `批量调整商品价格成功，共处理${modifiedCount}个商品`);
  } catch (err) {
    console.error('批量调整商品价格失败:', err);
    return serverError(res, '批量调整商品价格失败');
  }
};

// 批量设置推荐
exports.batchUpdateProductRecommend = async (req, res) => {
  try {
    const { ids, isRecommended, isHot, isFeatured, isNew } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return badRequest(res, '商品ID列表不能为空');
    }
    
    const updatedBy = req.user?.username || '系统管理员';
    const updateData = { updatedBy, updatedAt: new Date() };
    
    // 只更新提供的字段
    if (isRecommended !== undefined) updateData.isRecommended = isRecommended;
    if (isHot !== undefined) updateData.isHot = isHot;
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
    if (isNew !== undefined) updateData.isNew = isNew;
    
    const updateResult = await Product.updateMany(
      { _id: { $in: ids } },
      updateData
    );
    
    const labels = [];
    if (isRecommended !== undefined) labels.push(isRecommended ? '推荐' : '取消推荐');
    if (isHot !== undefined) labels.push(isHot ? '热销' : '取消热销');
    if (isFeatured !== undefined) labels.push(isFeatured ? '精选' : '取消精选');
    if (isNew !== undefined) labels.push(isNew ? '新品' : '取消新品');
    
    return success(res, {
      modifiedCount: updateResult.modifiedCount,
      totalCount: ids.length,
      operations: labels
    }, `批量设置推荐成功(${labels.join('、')})，共处理${updateResult.modifiedCount}个商品`);
  } catch (err) {
    console.error('批量设置推荐失败:', err);
    return serverError(res, '批量设置推荐失败');
  }
};

// 批量删除商品
exports.batchDeleteProducts = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return badRequest(res, '商品ID列表不能为空');
    }
    
    const deleteResult = await Product.deleteMany({ _id: { $in: ids } });
    
    return success(res, {
      deletedCount: deleteResult.deletedCount,
      totalCount: ids.length
    }, `批量删除商品成功，共删除${deleteResult.deletedCount}个商品`);
  } catch (err) {
    console.error('批量删除商品失败:', err);
    return serverError(res, '批量删除商品失败');
  }
};

// 下载Excel导入模板
exports.downloadImportTemplate = async (req, res) => {
  try {
    console.log('开始生成Excel模板...');
    
    // 创建工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('商品导入模板');
    
    console.log('工作簿和工作表创建成功');
    
    // 定义列头 - 简化版本
    worksheet.addRow([
      '商品名称*',
      '分类名称*',
      'SKU',
      '销售价格*',
      '原价',
      '成本价',
      '库存数量',
      '商品描述',
      '品牌',
      '型号',
      '标签',
      '图片地址'
    ]);
    
    console.log('表头添加成功');
    
    // 添加示例行
    worksheet.addRow([
      '示例商品名称',
      '电子产品',
      'P20250123001',
      '99.99',
      '199.99',
      '50.00',
      '100',
      '这是一个示例商品的描述信息',
      '示例品牌',
      'ABC-123',
      '热销,推荐',
      'https://example.com/image.jpg'
    ]);
    
    console.log('示例行添加成功');
    
    // 设置列宽
    worksheet.columns = [
      { width: 20 },
      { width: 15 },
      { width: 15 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 10 },
      { width: 30 },
      { width: 15 },
      { width: 15 },
      { width: 20 },
      { width: 40 }
    ];
    
    console.log('列宽设置成功');
    
    // 设置响应头
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    
    // 使用英文文件名避免编码问题
    const fileName = `product_import_template_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`
    );
    
    console.log('响应头设置成功，开始写入文件...');
    
    // 将工作簿写入响应
    await workbook.xlsx.write(res);
    console.log('Excel文件写入成功');
    
    res.end();
    
  } catch (err) {
    console.error('生成Excel模板失败:', err);
    console.error('错误堆栈:', err.stack);
    return serverError(res, '生成Excel模板失败');
  }
};

// 批量导入商品
exports.importProducts = async (req, res) => {
  try {
    if (!req.file) {
      return badRequest(res, '请上传Excel文件');
    }
    
    const filePath = req.file.path;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      return badRequest(res, 'Excel文件格式错误');
    }
    
    // 获取所有分类数据，用于名称到ID的映射
    const categories = await ProductCategory.find({ status: 1 });
    const categoryMap = new Map();
    categories.forEach(cat => {
      categoryMap.set(cat.name, cat._id);
    });
    
    // 获取所有图片文件列表，用于图片匹配
    const imageList = await getImageFiles();
    
    const results = {
      total: 0,
      success: 0,
      failed: 0,
      errors: [],
      warnings: []
    };
    
    const products = [];
    const createdBy = req.user?.username || '系统管理员';
    
    // 跳过表头和说明行，从有效数据行开始处理
    let dataStartRow = 2;
    const rows = worksheet.getSheetValues();
    
    // 找到数据开始行（跳过说明文字）
    for (let i = 2; i <= rows.length; i++) {
      const row = rows[i];
      if (row && Array.isArray(row) && row[1] && !row[1].toString().includes('说明') && !row[1].toString().includes('标记的字段')) {
        dataStartRow = i;
        break;
      }
    }
    
    for (let rowIndex = dataStartRow; rowIndex <= rows.length; rowIndex++) {
      const row = rows[rowIndex];
      if (!row || !Array.isArray(row) || !row[1]) continue; // 跳过空行
      
      results.total++;
      
      try {
        // 解析Excel行数据
        const rowData = {
          name: row[1] ? row[1].toString().trim() : '',
          categoryName: row[2] ? row[2].toString().trim() : '',
          sku: row[3] ? row[3].toString().trim() : '',
          price: row[4] ? parseFloat(row[4]) : null,
          originalPrice: row[5] ? parseFloat(row[5]) : null,
          cost: row[6] ? parseFloat(row[6]) : null,
          stock: row[7] ? parseInt(row[7]) : 0,
          description: row[8] ? row[8].toString().trim() : '',
          brand: row[9] ? row[9].toString().trim() : '',
          model: row[10] ? row[10].toString().trim() : '',
          tags: row[11] ? row[11].toString().trim() : '',
          imageUrl: row[12] ? row[12].toString().trim() : ''
        };
        
        // 数据验证
        const validationResult = validateProductData(rowData, rowIndex, categoryMap);
        if (validationResult.errors.length > 0) {
          results.errors.push(...validationResult.errors);
          results.failed++;
          continue;
        }
        
        // 处理图片
        let images = [];
        if (rowData.imageUrl) {
          // 使用提供的图片地址
          images = [rowData.imageUrl];
        } else {
          // 根据商品名称匹配图片
          const matchedImage = matchImageByProductName(rowData.name, imageList);
          if (matchedImage) {
            images = [matchedImage];
          }
        }
        
        // 处理标签
        const tags = rowData.tags ? rowData.tags.split(/[,，]/).map(tag => tag.trim()).filter(tag => tag) : [];
        
        // 构建商品数据
        const productData = {
          name: rowData.name,
          categoryId: categoryMap.get(rowData.categoryName),
          sku: rowData.sku || undefined,
          price: rowData.price,
          originalPrice: rowData.originalPrice || undefined,
          cost: rowData.cost || undefined,
          stock: rowData.stock,
          description: rowData.description,
          brand: rowData.brand,
          model: rowData.model,
          tags: tags,
          images: images,
          createdBy,
          updatedBy: createdBy
        };
        
        // 添加警告（成本价高于销售价）
        if (rowData.cost && rowData.price && rowData.cost > rowData.price) {
          results.warnings.push({
            row: rowIndex,
            field: 'cost',
            message: '成本价高于销售价，请检查'
          });
        }
        
        products.push(productData);
        
      } catch (error) {
        results.errors.push({
          row: rowIndex,
          field: 'general',
          message: `数据处理错误: ${error.message}`
        });
        results.failed++;
      }
    }
    
    // 批量创建商品
    if (products.length > 0) {
      try {
        const insertedProducts = await Product.insertMany(products);
        results.success = insertedProducts.length;
      } catch (error) {
        console.error('批量插入商品失败:', error);
        results.errors.push({
          row: 0,
          field: 'database',
          message: `数据库操作失败: ${error.message}`
        });
        results.failed = products.length;
        results.success = 0;
      }
    }
    
    // 清理临时文件
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    return success(res, results, `导入完成，成功${results.success}条，失败${results.failed}条`);
    
  } catch (err) {
    console.error('导入商品失败:', err);
    
    // 清理临时文件
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    return serverError(res, '导入商品失败');
  }
};

// 验证商品数据
function validateProductData(rowData, rowIndex, categoryMap) {
  const errors = [];
  
  // 必填字段验证
  if (!rowData.name) {
    errors.push({ row: rowIndex, field: 'name', message: '商品名称不能为空' });
  }
  
  if (!rowData.categoryName) {
    errors.push({ row: rowIndex, field: 'categoryName', message: '分类名称不能为空' });
  } else if (!categoryMap.has(rowData.categoryName)) {
    errors.push({ row: rowIndex, field: 'categoryName', message: `分类"${rowData.categoryName}"不存在` });
  }
  
  if (!rowData.price || rowData.price <= 0) {
    errors.push({ row: rowIndex, field: 'price', message: '销售价格必须大于0' });
  }
  
  // 格式验证
  if (rowData.originalPrice && rowData.originalPrice < rowData.price) {
    errors.push({ row: rowIndex, field: 'originalPrice', message: '原价不能低于销售价格' });
  }
  
  if (rowData.stock < 0) {
    errors.push({ row: rowIndex, field: 'stock', message: '库存数量不能为负数' });
  }
  
  return { errors };
}

// 根据商品名称匹配图片
function matchImageByProductName(productName, imageList) {
  if (!productName || !Array.isArray(imageList) || imageList.length === 0) {
    return null;
  }
  
  // 1. 精确匹配（文件名包含完整商品名称）
  let matched = imageList.find(img => 
    img.originalName && img.originalName.includes(productName)
  );
  
  if (matched) {
    return matched.url;
  }
  
  // 2. 分词匹配
  if (productName.length > 2) {
    const keywords = productName.split(/[\s，,、]/).filter(w => w.length > 1);
    matched = imageList.find(img => 
      img.originalName && keywords.some(keyword => 
        img.originalName.includes(keyword)
      )
    );
    
    if (matched) {
      return matched.url;
    }
  }
  
  return null;
}

// 获取图片文件列表
async function getImageFiles() {
  try {
    const uploadDir = path.join(__dirname, '../uploads/images');
    if (!fs.existsSync(uploadDir)) {
      return [];
    }
    
    const files = fs.readdirSync(uploadDir);
    const imageFiles = files
      .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
      .map(file => ({
        filename: file,
        originalName: file,
        url: `/uploads/images/${file}`
      }));
    
    return imageFiles;
  } catch (error) {
    console.error('获取图片列表失败:', error);
    return [];
  }
}