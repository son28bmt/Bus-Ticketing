const { Bus, BusCompany } = require('../../../models');
const { Op } = require('sequelize');

// ✅ Get buses (filtered by company for company admin)
const getBuses = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, busType } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    
    // Company admin can only see their buses
    if (req.user.role === 'COMPANY_ADMIN') {
      whereClause.companyId = req.user.companyId;
    }

    if (search) {
      whereClause[Op.or] = [
        { busNumber: { [Op.like]: `%${search}%` } }
      ];
    }
    if (busType) {
      whereClause.busType = busType;
    }

    let { count, rows: buses } = await Bus.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: BusCompany,
          as: 'company',
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [['busNumber', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Auto-seed a default bus if none exist
    if (count === 0 && !search && !busType) {
      console.log('🔄 No buses found, creating default bus...');
      const [defaultCompany] = await BusCompany.findOrCreate({
        where: { code: 'DEFAULT' },
        defaults: {
          name: 'Nhà xe mặc định',
          code: 'DEFAULT',
          phone: '0123456789',
          email: 'admin@default.com',
          address: 'Địa chỉ mặc định',
          isActive: true
        }
      });
      
      await Bus.create({
        companyId: defaultCompany.id,
        busNumber: 'BUS001',
        busType: 'SEAT',
        totalSeats: 45,
        facilities: ['WiFi', 'AC'],
        isActive: true
      });
      
      // Re-query after seeding
      const result = await Bus.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: BusCompany,
            as: 'company',
            attributes: ['id', 'name', 'code']
          }
        ],
        order: [['busNumber', 'ASC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      count = result.count;
      buses = result.rows;
      console.log('✅ Default bus created successfully');
    }

    res.json({
      success: true,
      data: {
        buses,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('❌ Error getting buses:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách xe',
      error: error.message
    });
  }
};

// ✅ Create bus
const createBus = async (req, res) => {
  try {
  const { busNumber, busType, totalSeats, capacity, facilities, isActive } = req.body;

    if (!busNumber || !busType || !totalSeats) {
      return res.status(400).json({
        success: false,
        message: 'Số xe, loại xe và số ghế là bắt buộc'
      });
    }

    // Get company ID or create default company
    let companyId = req.user.role === 'COMPANY_ADMIN' 
      ? req.user.companyId 
      : req.body.companyId;

    if (!companyId) {
      // Create or find default company for global admins
      const [defaultCompany] = await BusCompany.findOrCreate({
        where: { code: 'DEFAULT' },
        defaults: {
          name: 'Nhà xe mặc định',
          code: 'DEFAULT',
          phone: '0123456789',
          email: 'admin@default.com',
          address: 'Địa chỉ mặc định',
          isActive: true
        }
      });
      companyId = defaultCompany.id;
    }

    // Check if bus number exists in this company
    const existingBus = await Bus.findOne({ 
      where: { 
        busNumber,
        companyId
      } 
    });
    
    if (existingBus) {
      return res.status(409).json({
        success: false,
        message: 'Số xe đã tồn tại trong nhà xe này'
      });
    }

    const bus = await Bus.create({
      companyId,
      busNumber,
      busType,
      totalSeats: parseInt(totalSeats),
      capacity: capacity ? parseInt(capacity) : parseInt(totalSeats), // Use capacity or fallback to totalSeats
      facilities: Array.isArray(facilities) ? facilities : [],
      isActive: typeof isActive === 'boolean' ? isActive : true
    });
    
    console.log('✅ Bus created successfully:', bus.busNumber);
    console.log('🔄 Restarting server to test capacity field fix...');

    // Include company info in response
    const busWithCompany = await Bus.findByPk(bus.id, {
      include: [
        {
          model: BusCompany,
          as: 'company',
          attributes: ['id', 'name', 'code']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Thêm xe thành công',
      data: busWithCompany
    });
    
    console.log(`✅ Bus created: ${bus.busNumber} for company ${companyId}`);
  } catch (error) {
    console.error('❌ Error creating bus:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi thêm xe',
      error: error.message
    });
  }
};

module.exports = {
  getBuses,
  createBus,
  // ✅ Update bus details
  updateBus: async (req, res) => {
    try {
  const { id } = req.params;
  const { busNumber, busType, totalSeats, facilities, isActive } = req.body;

      const where = { id };
      if (req.user.role === 'COMPANY_ADMIN') {
        where.companyId = req.user.companyId;
      }

      const bus = await Bus.findOne({ where });
      if (!bus) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy xe' });
      }

      // Ensure unique busNumber within company if changed
      if (busNumber && busNumber !== bus.busNumber) {
        const exists = await Bus.findOne({ where: { busNumber, companyId: bus.companyId, id: { [Op.ne]: bus.id } } });
        if (exists) {
          return res.status(409).json({ success: false, message: 'Số xe đã tồn tại trong nhà xe này' });
        }
      }

      await bus.update({
        busNumber: busNumber ?? bus.busNumber,
        busType: busType ?? bus.busType,
        totalSeats: typeof totalSeats === 'number' ? totalSeats : bus.totalSeats,
        facilities: Array.isArray(facilities) ? facilities : (facilities ? bus.facilities : bus.facilities),
        isActive: typeof isActive === 'boolean' ? isActive : bus.isActive
      });

      const busWithCompany = await Bus.findByPk(bus.id, {
        include: [{ model: BusCompany, as: 'company', attributes: ['id', 'name', 'code'] }]
      });

      return res.json({ success: true, message: 'Cập nhật xe thành công', data: busWithCompany });
    } catch (error) {
      console.error('❌ Error updating bus:', error);
      return res.status(500).json({ success: false, message: 'Lỗi cập nhật xe', error: error.message });
    }
  },

  // ✅ Delete bus
  deleteBus: async (req, res) => {
    try {
      const { id } = req.params;
      const where = { id };
      if (req.user.role === 'COMPANY_ADMIN') {
        where.companyId = req.user.companyId;
      }

      const bus = await Bus.findOne({ where });
      if (!bus) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy xe' });
      }

      await bus.destroy();
      return res.json({ success: true, message: 'Đã xóa xe' });
    } catch (error) {
      console.error('❌ Error deleting bus:', error);
      return res.status(500).json({ success: false, message: 'Lỗi xóa xe', error: error.message });
    }
  }
};