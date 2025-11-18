const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User, Driver } = require('../../../models');
const { ROLES } = require('../../constants/roles');

const STAFF_ROLES = [ROLES.COMPANY, ROLES.DRIVER];

const sanitizeStaff = (user) => {
  const plain = user.toJSON ? user.toJSON() : user;
  return {
    id: plain.id,
    name: plain.name,
    email: plain.email,
    phone: plain.phone,
    role: plain.role,
    status: plain.status,
    companyId: plain.companyId,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    driverProfile: plain.driverProfile
      ? {
          id: plain.driverProfile.id,
          licenseNumber: plain.driverProfile.licenseNumber,
          phone: plain.driverProfile.phone,
          status: plain.driverProfile.status
        }
      : null
  };
};

const normalizeRole = (role) => (role ? String(role).toLowerCase() : ROLES.DRIVER);

const ensureRoleAllowed = (role) => {
  if (!STAFF_ROLES.includes(role)) {
    const err = new Error('Role không hợp lệ. Chỉ hỗ trợ quản trị viên và tài xế.');
    err.status = 400;
    throw err;
  }
};

const fetchStaffById = async (companyId, userId) => {
  const staff = await User.findOne({
    where: { id: userId, companyId, role: { [Op.in]: STAFF_ROLES } },
    attributes: { exclude: ['passwordHash'] },
    include: [{ model: Driver, as: 'driverProfile', attributes: ['id', 'licenseNumber', 'phone', 'status'] }]
  });
  if (!staff) {
    const err = new Error('Không tìm thấy nhân viên.');
    err.status = 404;
    throw err;
  }
  return staff;
};

exports.listStaff = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const staff = await User.findAll({
      where: { companyId, role: { [Op.in]: STAFF_ROLES } },
      attributes: { exclude: ['passwordHash'] },
      include: [{ model: Driver, as: 'driverProfile', attributes: ['id', 'licenseNumber', 'phone', 'status'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: staff.map(sanitizeStaff) });
  } catch (error) {
    console.error('listStaff error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message || 'Không thể tải danh sách nhân viên' });
  }
};

exports.createStaff = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { name, email, phone, password, role, licenseNumber } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đủ thông tin bắt buộc.' });
    }

    const normalizedRole = normalizeRole(role);
    ensureRoleAllowed(normalizedRole);

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email đã tồn tại.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      phone,
      passwordHash,
      role: normalizedRole,
      status: 'ACTIVE',
      companyId
    });

    let driverProfile = null;
    if (normalizedRole === ROLES.DRIVER) {
      driverProfile = await Driver.create({
        userId: user.id,
        companyId,
        licenseNumber: licenseNumber || null,
        phone,
        status: 'ACTIVE'
      });
    }

    const fresh = await fetchStaffById(companyId, user.id);
    res.status(201).json({ success: true, data: sanitizeStaff(fresh) });
  } catch (error) {
    console.error('createStaff error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message || 'Không thể tạo nhân viê  n' });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const staffId = Number(req.params.id);
    const { name, phone, role, status, licenseNumber, password } = req.body;

    const staff = await fetchStaffById(companyId, staffId);

    const updates = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (status) updates.status = status;
    if (password) {
      updates.passwordHash = await bcrypt.hash(password, 10);
    }

    let targetRole = staff.role;
    if (role) {
      const normalizedRole = normalizeRole(role);
      ensureRoleAllowed(normalizedRole);
      targetRole = normalizedRole;
      updates.role = normalizedRole;
    }

    if (Object.keys(updates).length) {
      await staff.update(updates);
    }

    if (targetRole === ROLES.DRIVER) {
      const driver = await Driver.findOne({ where: { userId: staff.id } });
      if (driver) {
        await driver.update({
          licenseNumber: licenseNumber ?? driver.licenseNumber,
          phone: phone ?? driver.phone,
          status: status ?? driver.status
        });
      } else {
        await Driver.create({
          userId: staff.id,
          companyId,
          licenseNumber: licenseNumber || null,
          phone: phone || staff.phone,
          status: status || 'ACTIVE'
        });
      }
    } else {
      await Driver.destroy({ where: { userId: staff.id } });
    }

    const fresh = await fetchStaffById(companyId, staff.id);
    res.json({ success: true, data: sanitizeStaff(fresh) });
  } catch (error) {
    console.error('updateStaff error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message || 'Không thể cập nhật nhân viên' });
  }
};

exports.updateStaffStatus = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const staffId = Number(req.params.id);
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Thiếu trường trạng thái mới.' });
    }
    const staff = await fetchStaffById(companyId, staffId);
    await staff.update({ status });
    if (staff.role === ROLES.DRIVER && staff.driverProfile) {
      await Driver.update({ status }, { where: { userId: staff.id } });
    }
    const fresh = await fetchStaffById(companyId, staffId);
    res.json({ success: true, data: sanitizeStaff(fresh) });
  } catch (error) {
    console.error('updateStaffStatus error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message || 'Không thể cập nhật trạng thái' });
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const staffId = Number(req.params.id);
    if (staffId === req.user.id) {
      return res.status(400).json({ success: false, message: 'Không thể tự xóa tài khoản của bạn.' });
    }
    const staff = await fetchStaffById(companyId, staffId);
    await Driver.destroy({ where: { userId: staff.id } });
    await staff.destroy();
    res.json({ success: true, message: 'Đã xóa nhân viên.' });
  } catch (error) {
    console.error('deleteStaff error:', error);
    res.status(error.status || 500).json({ success: false, message: error.message || 'Không thể xóa nhân viên' });
  }
};
