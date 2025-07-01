const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, '商品名称不能为空'], 
    trim: true,
    maxlength: [100, '商品名称不能超过100个字符']
  },
  categoryId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ProductCategory',
    required: [true, '商品分类不能为空'],
    index: true
  },
  sku: { 
    type: String, 
    unique: true,
    sparse: true, // 允许null值，但如果有值必须唯一
    trim: true,
    maxlength: [50, '商品编码不能超过50个字符']
  },
  price: { 
    type: Number,
    required: [true, '销售价格不能为空'],
    min: [0, '销售价格不能小于0'],
    set: v => Math.round(v * 100) / 100 // 保留两位小数
  },
  originalPrice: { 
    type: Number,
    min: [0, '原价不能小于0'],
    set: v => v ? Math.round(v * 100) / 100 : v
  },
  cost: { 
    type: Number,
    min: [0, '成本价不能小于0'],
    set: v => v ? Math.round(v * 100) / 100 : v
  },
  stock: { 
    type: Number, 
    default: 0,
    min: [0, '库存数量不能小于0']
  },
  sales: { 
    type: Number, 
    default: 0,
    min: [0, '销售数量不能小于0']
  },
  description: { 
    type: String,
    maxlength: [2000, '商品描述不能超过2000个字符']
  },
  images: [{
    type: String,
    maxlength: [200, '图片URL不能超过200个字符']
  }],
  status: { 
    type: Number, 
    enum: [0, 1], 
    default: 1,
    required: true
  }, // 1上架, 0下架
  sort: { 
    type: Number, 
    default: 0,
    min: [0, '排序值不能小于0']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [20, '标签长度不能超过20个字符']
  }],
  specifications: {
    type: mongoose.Schema.Types.Mixed, // JSON格式存储商品规格
    default: {}
  },
  seoTitle: { 
    type: String,
    maxlength: [100, 'SEO标题不能超过100个字符']
  },
  seoKeywords: { 
    type: String,
    maxlength: [200, 'SEO关键词不能超过200个字符']
  },
  seoDescription: { 
    type: String,
    maxlength: [300, 'SEO描述不能超过300个字符']
  },
  // 扩展字段预留
  weight: { 
    type: Number,
    min: [0, '重量不能小于0']
  }, // 商品重量(克)
  dimensions: {
    length: { type: Number, min: [0, '长度不能小于0'] },
    width: { type: Number, min: [0, '宽度不能小于0'] },
    height: { type: Number, min: [0, '高度不能小于0'] }
  }, // 商品尺寸(厘米)
  brand: { 
    type: String,
    maxlength: [50, '品牌名称不能超过50个字符']
  },
  model: { 
    type: String,
    maxlength: [50, '型号不能超过50个字符']
  },
  // 推荐相关字段
  isRecommended: {
    type: Boolean,
    default: false
  }, // 是否推荐
  isHot: {
    type: Boolean,
    default: false
  }, // 是否热销
  isFeatured: {
    type: Boolean,
    default: false
  }, // 是否精选
  isNew: {
    type: Boolean,
    default: true
  }, // 是否新品
  createdBy: { 
    type: String,
    maxlength: [50, '创建者名称不能超过50个字符']
  },
  updatedBy: { 
    type: String,
    maxlength: [50, '修改者名称不能超过50个字符']
  }
}, {
  timestamps: true, // 自动添加createdAt和updatedAt
  versionKey: false // 不需要__v字段
});

// 复合索引 - 提高查询性能
productSchema.index({ categoryId: 1, status: 1, sort: 1 }); // 按分类、状态、排序查询
productSchema.index({ status: 1, createdAt: -1 }); // 按状态和创建时间查询
productSchema.index({ price: 1 }); // 按价格查询
productSchema.index({ sales: -1 }); // 按销量排序
productSchema.index({ name: 'text', description: 'text' }); // 文本搜索索引

// 稀疏唯一索引 - SKU
productSchema.index({ sku: 1 }, { unique: true, sparse: true });

// 虚拟字段 - 获取分类信息
productSchema.virtual('category', {
  ref: 'ProductCategory',
  localField: 'categoryId',
  foreignField: '_id',
  justOne: true
});

// 虚拟字段 - 计算利润率
productSchema.virtual('profitMargin').get(function() {
  if (this.cost && this.price) {
    return Math.round(((this.price - this.cost) / this.price) * 100 * 100) / 100; // 百分比，保留两位小数
  }
  return 0;
});

// 虚拟字段 - 主图片
productSchema.virtual('primaryImage').get(function() {
  return this.images && this.images.length > 0 ? this.images[0] : null;
});

// 中间件 - 保存前自动生成SKU(如果没有提供)
productSchema.pre('save', async function(next) {
  if (!this.sku && this.isNew) {
    // 生成SKU格式: P + 年月日 + 4位随机数
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    let newSku = `P${date}${randomNum}`;
    
    // 检查SKU是否已存在，如果存在则重新生成
    let skuExists = await this.constructor.findOne({ sku: newSku });
    let attempts = 0;
    while (skuExists && attempts < 10) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      newSku = `P${date}${randomNum}`;
      skuExists = await this.constructor.findOne({ sku: newSku });
      attempts++;
    }
    
    this.sku = newSku;
  }
  next();
});

// 中间件 - 保存前验证价格逻辑
productSchema.pre('save', function(next) {
  // 原价不能低于销售价
  if (this.originalPrice && this.originalPrice < this.price) {
    const error = new Error('原价不能低于销售价格');
    error.name = 'ValidationError';
    return next(error);
  }
  
  // 成本价不能高于销售价(警告但不阻止)
  if (this.cost && this.cost > this.price) {
    console.warn(`商品 ${this.name} 的成本价高于销售价，请检查价格设置`);
  }
  
  next();
});

// 中间件 - 删除前检查业务约束
productSchema.pre('deleteOne', { document: true }, async function(next) {
  // 这里可以添加删除前的业务检查，比如检查是否有订单关联
  // 暂时允许删除，后续根据业务需求添加约束
  next();
});

// 静态方法 - 获取热销商品
productSchema.statics.getTopSelling = async function(limit = 10, categoryId = null) {
  const query = { status: 1 }; // 只查询上架商品
  if (categoryId) {
    query.categoryId = categoryId;
  }
  
  return this.find(query)
    .sort({ sales: -1, createdAt: -1 })
    .limit(limit)
    .populate('category', 'name');
};

// 静态方法 - 获取新品推荐
productSchema.statics.getNewProducts = async function(limit = 10, categoryId = null) {
  const query = { status: 1 };
  if (categoryId) {
    query.categoryId = categoryId;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('category', 'name');
};

// 静态方法 - 价格区间查询
productSchema.statics.getByPriceRange = async function(minPrice = 0, maxPrice = null, options = {}) {
  const query = { 
    status: 1,
    price: { $gte: minPrice }
  };
  
  if (maxPrice !== null) {
    query.price.$lte = maxPrice;
  }
  
  if (options.categoryId) {
    query.categoryId = options.categoryId;
  }
  
  return this.find(query)
    .sort(options.sort || { price: 1 })
    .limit(options.limit || 50);
};

// 实例方法 - 更新库存
productSchema.methods.updateStock = function(quantity, operation = 'reduce') {
  if (operation === 'reduce') {
    this.stock = Math.max(0, this.stock - quantity);
  } else if (operation === 'add') {
    this.stock += quantity;
  }
  return this.save();
};

// 实例方法 - 更新销量
productSchema.methods.updateSales = function(quantity) {
  this.sales += quantity;
  return this.save();
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product; 