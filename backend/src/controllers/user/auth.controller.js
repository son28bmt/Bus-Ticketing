'use strict';

const { ROLES } = require('../../constants/roles');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Driver, BusCompany } = require('../../../models');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const normalizeRole = (role) => (role ? String(role).toLowerCase() : ROLES.PASSENGER);

const buildTokenPayload = (user, driverProfile) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  companyId: driverProfile?.companyId ?? user.companyId ?? null,
  driverId: driverProfile ? driverProfile.id : null
});

const sanitizeUser = (user, driverProfile) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  status: user.status,
  lastLoginAt: user.lastLoginAt,
  companyId: driverProfile?.companyId ?? user.companyId ?? null,
  driverId: driverProfile ? driverProfile.id : null,
  driverProfile: driverProfile
    ? {
        id: driverProfile.id,
        companyId: driverProfile.companyId,
        licenseNumber: driverProfile.licenseNumber,
        phone: driverProfile.phone,
        status: driverProfile.status
      }
    : undefined
});

const register = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      role = ROLES.PASSENGER,
      companyId,
      licenseNumber
    } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin',
        required: ['name', 'email', 'phone', 'password']
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có ít nhất 6 ký tự'
      });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email đã được sử dụng'
      });
    }

    const normalizedRole = normalizeRole(role);
    const allowedRoles = [ROLES.ADMIN, ROLES.COMPANY, ROLES.DRIVER, ROLES.PASSENGER];
    if (!allowedRoles.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: 'Role không hợp lệ'
      });
    }

    let resolvedCompanyId = null;
    if (normalizedRole === ROLES.COMPANY || normalizedRole === ROLES.DRIVER) {
      if (companyId == null || companyId === '') {
        return res.status(400).json({
          success: false,
          message: 'Cần cung cấp companyId cho tài khoản công ty/tài xế'
        });
      }

      const numericCompanyId = Number(companyId);
      if (!Number.isFinite(numericCompanyId)) {
        return res.status(400).json({
          success: false,
          message: 'companyId không hợp lệ'
        });
      }

      const companyExists = await BusCompany.findByPk(numericCompanyId);
      if (!companyExists) {
        return res.status(400).json({
          success: false,
          message: 'Nhà xe không tồn tại'
        });
      }
      resolvedCompanyId = numericCompanyId;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      phone,
      passwordHash,
      role: normalizedRole,
      companyId: normalizedRole === ROLES.DRIVER ? resolvedCompanyId : resolvedCompanyId ?? null,
      status: 'ACTIVE'
    });

    let driverProfile = null;
    if (normalizedRole === ROLES.DRIVER) {
      driverProfile = await Driver.create({
        userId: user.id,
        companyId: resolvedCompanyId,
        licenseNumber: licenseNumber || null,
        phone
      });
    }

    const token = jwt.sign(
      buildTokenPayload(user, driverProfile),
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      user: sanitizeUser(user, driverProfile),
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi đăng ký',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email và mật khẩu'
      });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng'
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đã bị khóa'
      });
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng'
      });
    }

    let driverProfile = null;
    if (user.role === ROLES.DRIVER) {
      driverProfile = await Driver.findOne({
        where: { userId: user.id },
        attributes: ['id', 'companyId', 'status', 'licenseNumber', 'phone']
      });

      if (!driverProfile) {
        return res.status(403).json({
          success: false,
          message: 'Tài xế chưa được cấu hình. Vui lòng liên hệ quản trị.'
        });
      }

      if (driverProfile.status !== 'ACTIVE') {
        return res.status(403).json({
          success: false,
          message: 'Tài xế đã bị tạm ngưng.'
        });
      }
    }

    await user.update({ lastLoginAt: new Date() });

    const token = jwt.sign(
      buildTokenPayload(user, driverProfile),
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      message: 'Đăng nhập thành công',
      user: sanitizeUser(user, driverProfile),
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi đăng nhập',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const include = [];
    if (req.user.role === ROLES.DRIVER) {
      include.push({
        model: Driver,
        as: 'driverProfile',
        attributes: ['id', 'companyId', 'licenseNumber', 'phone', 'status']
      });
    }

    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['passwordHash'] },
      include
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    return res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thông tin người dùng',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không có thông tin cập nhật'
      });
    }

    const [affected] = await User.update(updates, { where: { id: req.user.id } });
    if (affected === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    if (req.user.role === ROLES.DRIVER && phone) {
      await Driver.update(
        { phone },
        { where: { userId: req.user.id } }
      );
    }

    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['passwordHash'] },
      include: req.user.role === ROLES.DRIVER
        ? [{ model: Driver, as: 'driverProfile', attributes: ['id', 'companyId', 'licenseNumber', 'phone', 'status'] }]
        : []
    });

    return res.json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật thông tin',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
      });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu hiện tại không đúng'
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await user.update({ passwordHash });

    return res.json({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi đổi mật khẩu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
};
