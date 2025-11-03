const { Bus, BusCompany, User, Seat, sequelize } = require('../../../models');
const { Op } = require('sequelize');
const { ensureSeatsForBus } = require('../../utils/seat-helper');
const { ROLES } = require('../../constants/roles');

// ✅ Get buses (filtered by company for company admin)
const getBuses = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, busType } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    
    if (req.user && req.user.role === ROLES.COMPANY) {
      let tokenCompanyId = req.user.companyId;
      if (tokenCompanyId === undefined || tokenCompanyId === null) {
        const dbUser = await User.findByPk(req.user.id, { attributes: ['companyId'] });
        if (dbUser?.companyId != null) {
          tokenCompanyId = dbUser.companyId;
          req.user.companyId = tokenCompanyId;
        }
      }
      if (tokenCompanyId === undefined || tokenCompanyId === null) {
        return res.status(403).json({ success: false, message: 'Tai khoan nha xe khong co companyId' });
      }
      whereClause.companyId = tokenCompanyId;
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
      
      await sequelize.transaction(async (transaction) => {
        const defaultBus = await Bus.create(
          {
            companyId: defaultCompany.id,
            busNumber: 'BUS001',
            busType: 'STANDARD',
            totalSeats: 45,
            capacity: 45,
            facilities: ['WiFi', 'AC'],
            isActive: true
          },
          { transaction }
        );

        await ensureSeatsForBus(Seat, defaultBus, { transaction, resetExisting: true });
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

// Create bus
const createBus = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { busNumber, busType, totalSeats, capacity, facilities, isActive } = req.body;

    if (!busNumber || !busType || !totalSeats) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Thong tin xe khong du'
      });
    }

    // Determine companyId (Company admins must use their companyId; global admins may supply or get default)
    let companyId;
    if (req.user && req.user.role === ROLES.COMPANY) {
      let tokenCompanyId = req.user.companyId;
      if (tokenCompanyId === undefined || tokenCompanyId === null) {
        const dbUser = await User.findByPk(req.user.id, { attributes: ['companyId'] });
        if (dbUser?.companyId != null) {
          tokenCompanyId = dbUser.companyId;
          req.user.companyId = tokenCompanyId;
        }
      }
      if (tokenCompanyId === undefined || tokenCompanyId === null) {
        await transaction.rollback();
        return res.status(403).json({ success: false, message: 'Tai khoan khong co companyId' });
      }
      companyId = tokenCompanyId;
    } else {
      companyId = req.body.companyId;
    }

    companyId = companyId != null ? Number(companyId) : null;
    if (Number.isNaN(companyId)) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'CompanyId khong hop le' });
    }

    let resolvedCompany = null;
    if (!companyId) {
      if (req.user && req.user.role === ROLES.COMPANY) {
        await transaction.rollback();
        return res.status(403).json({ success: false, message: 'Khong the xac dinh companyId' });
      }
      const [defaultCompany] = await BusCompany.findOrCreate({
        where: { code: 'DEFAULT' },
        defaults: {
          name: 'Default Company',
          code: 'DEFAULT',
          phone: '0123456789',
          email: 'admin@default.com',
          address: 'Default address',
          isActive: true
        },
        transaction
      });
      resolvedCompany = defaultCompany;
      companyId = defaultCompany.id;
    } else {
      resolvedCompany = await BusCompany.findByPk(companyId, { transaction });
      if (!resolvedCompany) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Nha xe khong ton tai' });
      }
    }

    if (req.user && req.user.role === ROLES.COMPANY) {
      const tokenCompanyId = Number(req.user.companyId);
      if (Number.isNaN(tokenCompanyId) || resolvedCompany.id !== tokenCompanyId) {
        await transaction.rollback();
        return res.status(403).json({ success: false, message: 'Khong the tao xe cho nha xe khac' });
      }
    }

    const existingBus = await Bus.findOne({
      where: {
        busNumber,
        companyId
      },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (existingBus) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: 'So xe da ton tai'
      });
    }

    const bus = await Bus.create(
      {
        companyId,
        busNumber,
        busType,
        totalSeats: parseInt(totalSeats, 10),
        capacity: capacity ? parseInt(capacity, 10) : parseInt(totalSeats, 10),
        facilities: Array.isArray(facilities) ? facilities : [],
        isActive: typeof isActive === 'boolean' ? isActive : true
      },
      { transaction }
    );

    await ensureSeatsForBus(Seat, bus, { transaction, resetExisting: true });

    console.log('Bus created:', bus.busNumber);

    await transaction.commit();

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
      message: 'Them xe thanh cong',
      data: busWithCompany
    });

    console.log('Bus created for company ' + companyId);
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating bus:', error);
    res.status(500).json({
      success: false,
      message: 'Loi them xe',
      error: error.message
    });
  }
};

module.exports = {
  getBuses,
  createBus,
  // ✅ Update bus details
  updateBus: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { busNumber, busType, totalSeats, capacity, facilities, isActive } = req.body;

      const where = { id };
      if (
        req.user &&
        req.user.role === ROLES.COMPANY &&
        req.user.companyId !== undefined &&
        req.user.companyId !== null
      ) {
        where.companyId = req.user.companyId;
      }

      const bus = await Bus.findOne({ where, transaction, lock: transaction.LOCK.UPDATE });
      if (!bus) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'Khong tim thay xe' });
      }

      if (busNumber && busNumber !== bus.busNumber) {
        const exists = await Bus.findOne({
          where: { busNumber, companyId: bus.companyId, id: { [Op.ne]: bus.id } }
        });
        if (exists) {
          await transaction.rollback();
          return res.status(409).json({ success: false, message: 'So xe da ton tai trong nha xe' });
        }
      }

      const updates = {};

      if (busNumber) {
        updates.busNumber = busNumber;
      }

      if (busType) {
        updates.busType = busType;
      }

      let seatsChanged = false;
      if (totalSeats !== undefined && totalSeats !== null) {
        const numericSeats = Number.parseInt(totalSeats, 10);
        if (Number.isNaN(numericSeats) || numericSeats <= 0) {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: 'Tong so ghe khong hop le' });
        }
        updates.totalSeats = numericSeats;
        seatsChanged = true;
      }

      if (capacity !== undefined && capacity !== null) {
        const numericCapacity = Number.parseInt(capacity, 10);
        if (Number.isNaN(numericCapacity) || numericCapacity <= 0) {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: 'Suc chua khong hop le' });
        }
        updates.capacity = numericCapacity;
      } else if (seatsChanged) {
        updates.capacity = Number.parseInt(totalSeats, 10);
      }

      if (facilities !== undefined) {
        if (Array.isArray(facilities)) {
          updates.facilities = facilities;
        } else if (typeof facilities === 'string') {
          updates.facilities = facilities
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        }
      }

      if (typeof isActive === 'boolean') {
        updates.isActive = isActive;
      }

      await bus.update(updates, { transaction });
      await bus.reload({ transaction });

      await ensureSeatsForBus(Seat, bus, { transaction });

      await transaction.commit();

      const busWithCompany = await Bus.findByPk(bus.id, {
        include: [{ model: BusCompany, as: 'company', attributes: ['id', 'name', 'code'] }]
      });

      return res.json({ success: true, message: 'Cap nhat xe thanh cong', data: busWithCompany });
    } catch (error) {
      await transaction.rollback();
      console.error('Error updating bus:', error);
      return res.status(500).json({ success: false, message: 'Loi cap nhat xe', error: error.message });
    }
  },

  // ✅ Delete bus
  deleteBus: async (req, res) => {
    try {
      const { id } = req.params;
      const where = { id };
      if (req.user && req.user.role === ROLES.COMPANY && req.user.companyId !== undefined && req.user.companyId !== null) {
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




