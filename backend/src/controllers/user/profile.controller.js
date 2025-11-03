const { Booking, Trip, Location, User, Bus } = require('../../../models');

exports.getMyProfile = async (req, res) => {
  try {
    // Optionally fetch from DB to get latest
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'phone', 'role', 'status', 'companyId', 'createdAt']
    });
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('getMyProfile error:', error);
    res.status(500).json({ success: false, message: 'Không thể tải thông tin người dùng', error: error.message });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Trip,
          as: 'trip',
          include: [
            { model: Location, as: 'departureLocation', attributes: ['id','name','province'] },
            { model: Location, as: 'arrivalLocation', attributes: ['id','name','province'] },
            { model: Bus, as: 'bus', attributes: ['id','busNumber','busType'] }
          ]
        }
      ],
      order: [['createdAt','DESC']]
    });

    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error('getMyBookings error:', error);
    res.status(500).json({ success: false, message: 'Không thể tải danh sách vé của bạn', error: error.message });
  }
};
