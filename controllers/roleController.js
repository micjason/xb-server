const Role = require('../models/role');

// 创建角色
exports.createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    const role = new Role({ name, description, permissions });
    await role.save();
    res.status(201).json(role);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// 获取所有角色
exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.find();
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    if (!role) return res.status(404).json({ error: '角色不存在' });
    res.json(role);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// 删除角色，禁止删除系统内置角色
exports.deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await Role.findById(id);
    if (!role) return res.status(404).json({ error: '角色不存在' });
    if (role.isSystem) return res.status(403).json({ error: '系统内置角色不可删除' });
    await role.deleteOne();
    res.json({ message: '角色已删除' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 