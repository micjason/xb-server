const mongoose = require('mongoose');

const productCategorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, '分类名称不能为空'], 
    trim: true,
    maxlength: [50, '分类名称不能超过50个字符']
  },
  parentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ProductCategory',
    default: null // null表示顶级分类
  },
  sort: { 
    type: Number, 
    default: 0,
    min: [0, '排序值不能小于0']
  },
  status: { 
    type: Number, 
    enum: [0, 1], 
    default: 1,
    required: true
  }, // 1启用, 0禁用
  description: { 
    type: String, 
    maxlength: [200, '分类描述不能超过200个字符']
  },
  icon: { 
    type: String,
    maxlength: [100, '图标路径不能超过100个字符']
  },
  level: { 
    type: Number, 
    default: 0,
    min: [0, '分类层级不能小于0'],
    max: [5, '分类层级不能超过5级']
  }, // 分类层级，自动计算
  path: { 
    type: String,
    default: ''
  }, // 分类路径，如: "/1/2/3"
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
productCategorySchema.index({ parentId: 1, sort: 1 }); // 按父分类和排序查询
productCategorySchema.index({ status: 1, sort: 1 }); // 按状态和排序查询
productCategorySchema.index({ name: 'text' }); // 文本搜索索引

// 虚拟字段 - 获取子分类
productCategorySchema.virtual('children', {
  ref: 'ProductCategory',
  localField: '_id',
  foreignField: 'parentId'
});

// 虚拟字段 - 获取父分类
productCategorySchema.virtual('parent', {
  ref: 'ProductCategory',
  localField: 'parentId',
  foreignField: '_id',
  justOne: true
});

// 中间件 - 保存前自动计算level和path
productCategorySchema.pre('save', async function(next) {
  if (this.parentId) {
    try {
      const parent = await this.constructor.findById(this.parentId);
      if (parent) {
        this.level = parent.level + 1;
        this.path = parent.path ? `${parent.path}/${parent._id}` : `/${parent._id}`;
      } else {
        // 父分类不存在，设为顶级分类
        this.parentId = null;
        this.level = 0;
        this.path = '';
      }
    } catch (error) {
      return next(error);
    }
  } else {
    this.level = 0;
    this.path = '';
  }
  next();
});

// 中间件 - 删除前检查是否有子分类
productCategorySchema.pre('deleteOne', { document: true }, async function(next) {
  const childCount = await this.constructor.countDocuments({ parentId: this._id });
  if (childCount > 0) {
    const error = new Error('该分类下还有子分类，无法删除');
    error.name = 'ValidationError';
    return next(error);
  }
  next();
});

// 静态方法 - 获取分类树
productCategorySchema.statics.getCategoryTree = async function(parentId = null, status = null) {
  const query = { parentId };
  if (status !== null) {
    query.status = status;
  }
  
  const categories = await this.find(query).sort({ sort: 1, createdAt: 1 });
  
  // 递归获取子分类
  for (let category of categories) {
    category._doc.children = await this.getCategoryTree(category._id, status);
  }
  
  return categories;
};

// 静态方法 - 获取分类路径名称
productCategorySchema.statics.getCategoryPathNames = async function(categoryId) {
  const category = await this.findById(categoryId);
  if (!category || !category.path) {
    return category ? [category.name] : [];
  }
  
  const pathIds = category.path.split('/').filter(id => id);
  const pathCategories = await this.find({ _id: { $in: pathIds } }).sort({ level: 1 });
  
  return [...pathCategories.map(cat => cat.name), category.name];
};

const ProductCategory = mongoose.model('ProductCategory', productCategorySchema);

module.exports = ProductCategory; 