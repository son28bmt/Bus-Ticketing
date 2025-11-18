const { Location } = require('../../../models');
const { Op } = require('sequelize');

// ✅ Get all locations
const getLocations = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, province } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { province: { [Op.like]: `%${search}%` } }
      ];
    }
    if (province) {
      whereClause.province = province;
    }

    const { count, rows: locations } = await Location.findAndCountAll({
      where: whereClause,
      order: [['name', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        locations,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('❌ Error getting locations:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách địa điểm',
      error: error.message
    });
  }
};

// ✅ Create location
const createLocation = async (req, res) => {
  try {
    const { name, code, province, address, coordinates } = req.body;

    // Validation
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Tên và mã địa điểm là bắt buộc'
      });
    }

    // Check if code exists
    const existingLocation = await Location.findOne({ where: { code } });
    if (existingLocation) {
      return res.status(409).json({
        success: false,
        message: 'Mã địa điểm đã tồn tại'
      });
    }

    const location = await Location.create({
      name,
      code: code.toUpperCase(),
      province,
      address,
      coordinates
    });

    res.status(201).json({
      success: true,
      message: 'Tạo địa điểm thành công',
      data: location
    });
  } catch (error) {
    console.error('❌ Error creating location:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi tạo địa điểm',
      error: error.message
    });
  }
};

// ✅ Update location
const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, province, address, coordinates, isActive } = req.body;

    const location = await Location.findByPk(id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy địa điểm'
      });
    }

    await location.update({
      name: name || location.name,
      province: province || location.province,
      address: address || location.address,
      coordinates: coordinates || location.coordinates,
      isActive: isActive !== undefined ? isActive : location.isActive
    });

    res.json({
      success: true,
      message: 'Cập nhật địa điểm thành công',
      data: location
    });
  } catch (error) {
    console.error('❌ Error updating location:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật địa điểm',
      error: error.message
    });
  }
};

// ✅ Delete location
const deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const location = await Location.findByPk(id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy địa điểm'
      });
    }

    // Check if location is being used in trips
    const { Trip } = require('../../../models');
    const tripsCount = await Trip.count({
      where: {
        [Op.or]: [
          { departureLocationId: id },
          { arrivalLocationId: id }
        ]
      }
    });

    if (tripsCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa địa điểm đang được sử dụng trong chuyến xe'
      });
    }

    await location.destroy();

    res.json({
      success: true,
      message: 'Xóa địa điểm thành công'
    });
  } catch (error) {
    console.error('❌ Error deleting location:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi xóa địa điểm',
      error: error.message
    });
  }
};

module.exports = {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation
};