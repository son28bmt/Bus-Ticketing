const { BusCompany } = require('../../../models');
const { Op } = require('sequelize');

// List companies with optional pagination and filters
const getCompanies = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      isActive,
    } = req.query;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.max(parseInt(limit, 10) || 10, 1);
    const offset = (pageNumber - 1) * pageSize;

    const where = {};

    if (typeof isActive !== 'undefined') {
      if (isActive === 'true' || isActive === true) {
        where.isActive = true;
      } else if (isActive === 'false' || isActive === false) {
        where.isActive = false;
      }
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await BusCompany.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset,
    });

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: pageNumber,
        pages: Math.ceil(count / pageSize),
        limit: pageSize,
      },
    });
  } catch (error) {
    console.error('admin.getCompanies error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách nhà xe',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Create new bus company
const createCompany = async (req, res) => {
  try {
    const {
      name,
      code,
      email,
      phone,
      address,
      description,
      isActive = true,
    } = req.body || {};

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Tên và mã nhà xe là bắt buộc',
      });
    }

    const normalizedCode = String(code).trim().toUpperCase();

    const existing = await BusCompany.findOne({ where: { code: normalizedCode } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Mã nhà xe đã tồn tại',
      });
    }

    const company = await BusCompany.create({
      name: String(name).trim(),
      code: normalizedCode,
      email: email ? String(email).trim() : null,
      phone: phone ? String(phone).trim() : null,
      address: address ? String(address).trim() : null,
      description: description ? String(description).trim() : null,
      isActive: Boolean(isActive),
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo nhà xe thành công',
      data: company,
    });
  } catch (error) {
    console.error('admin.createCompany error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể tạo nhà xe',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  getCompanies,
  createCompany,
};
