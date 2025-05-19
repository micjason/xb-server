const Resources = require('../models/resources');

// 创建资源
exports.createResource = async (req, res) => {
  try {
    const { name, type, url, description } = req.body;
    const resource = new Resources({ name, type, url, description });
    await resource.save();
    res.status(201).json(resource);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// 获取所有资源
exports.getResources = async (req, res) => {
  try {
    const resources = await Resources.find();
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    if (!resource) return res.status(404).json({ error: '资源不存在' });
    res.json(resource);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// 删除资源
exports.deleteResource = async (req, res) => {
  try {
    const { id } = req.params;
    const resource = await Resources.findById(id);
    if (!resource) return res.status(404).json({ error: '资源不存在' });
    await resource.deleteOne();
    res.json({ message: '资源已删除' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 