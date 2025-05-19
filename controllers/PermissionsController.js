const Permissions = require('../models/permissions');

// 创建权限
exports.createPermission = async (req, res) => {
  try {
    const { name, code, description } = req.body;
    const permission = new Permissions({ name, code, description });
    await permission.save();
    res.status(201).json(permission);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// 获取所有权限
exports.getPermissions = async (req, res) => {
  try {
    const permissions = await Permissions.find();
    res.json(permissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    if (!permission) return res.status(404).json({ error: '权限不存在' });
    res.json(permission);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// 删除权限
exports.deletePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const permission = await Permissions.findById(id);
    if (!permission) return res.status(404).json({ error: '权限不存在' });
    await permission.deleteOne();
    res.json({ message: '权限已删除' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 