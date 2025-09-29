const { BusCompany, Bus, Trip, User } = require('../../../models');
const { Op } = require('sequelize');

// ✅ Get companies (Super admin only)
const getCompanies = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: companies } = await BusCompany.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Bus,
          as: 'buses',
          attributes: ['id']
        },
        {
          model: Trip,
          as: 'trips',
          attributes: ['id']
        }
      ],
      order: [['name', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Add counts
    const companiesWithCounts = companies.map(company => ({
      ...company.toJSON(),
      busCount: company.buses?.length || 0,
      tripCount: company.trips?.length || 0
    }));

    res.json({
      success: true,
      data: {
        companies: companiesWithCounts,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('❌ Error getting companies:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách nhà xe',
      error: error.message
    });
  }
};

// ✅ Create company (Super admin only)
const createCompany = async (req, res) => {
  try {
    const { name, code, phone, email, address, description } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Tên và mã nhà xe là bắt buộc'
      });
    }

    const existingCompany = await BusCompany.findOne({ where: { code } });
    if (existingCompany) {
      return res.status(409).json({
        success: false,
        message: 'Mã nhà xe đã tồn tại'
      });
    }

    const company = await BusCompany.create({
      name,
      code: code.toUpperCase(),
      phone,
      email,
      address,
      description
    });

    res.status(201).json({
      success: true,
      message: 'Tạo nhà xe thành công',
      data: company
    });
  } catch (error) {
    console.error('❌ Error creating company:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi tạo nhà xe',
      error: error.message
    });
  }
};

module.exports = {
  getCompanies,
  createCompany
};