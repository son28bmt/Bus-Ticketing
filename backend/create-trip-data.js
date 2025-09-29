require('dotenv').config();
const { User, Trip, Bus, Seat } = require('./models');
const bcrypt = require('bcrypt');

const createTripData = async () => {
  try {
    console.log('🔄 Creating trip test data...');
    
    // Tạo demo accounts trước (nếu chưa có)
    let admin = await User.findOne({ where: { email: 'admin@shanbus.com' } });
    if (!admin) {
      const adminPassword = await bcrypt.hash('admin123', 10);
      admin = await User.create({
        name: 'Demo Admin',
        email: 'admin@shanbus.com',
        phone: '0901234567',
        passwordHash: adminPassword,
        role: 'ADMIN',
        status: 'ACTIVE'
      });
    }

    // Xóa dữ liệu cũ
    await Seat.destroy({ where: {} });
    await Trip.destroy({ where: {} });
    await Bus.destroy({ where: {} });
    console.log('🗑️ Cleared old trip data');

    // Tạo xe buýt mẫu
    const buses = await Bus.bulkCreate([
      {
        busNumber: 'SB-001',
        busType: 'STANDARD',
        capacity: 45,
        facilities: JSON.stringify(['WiFi', 'AC', 'TV'])
      },
      {
        busNumber: 'SB-002', 
        busType: 'DELUXE',
        capacity: 35,
        facilities: JSON.stringify(['WiFi', 'AC', 'TV', 'Blanket'])
      },
      {
        busNumber: 'SB-003',
        busType: 'LIMOUSINE',
        capacity: 22,
        facilities: JSON.stringify(['WiFi', 'AC', 'TV', 'Blanket', 'Meal'])
      },
      {
        busNumber: 'SB-004',
        busType: 'SLEEPER',
        capacity: 30,
        facilities: JSON.stringify(['WiFi', 'AC', 'Bed', 'Blanket'])
      }
    ]);
    console.log('✅ Created buses');

    // Tạo chuyến xe mẫu
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(today.getDate() + 2);

    const trips = await Trip.bulkCreate([
      // Hà Nội -> TP.HCM
      {
        route: 'Hà Nội - TP.HCM',
        departureLocation: 'Hà Nội',
        arrivalLocation: 'TP.HCM',
        departureTime: new Date(tomorrow.setHours(6, 0, 0)),
        arrivalTime: new Date(tomorrow.setHours(22, 0, 0)),
        basePrice: 450000,
        totalSeats: 45,
        availableSeats: 38,
        status: 'SCHEDULED',
        duration: 960, // 16 giờ
        distance: 1710,
        busId: buses[0].id
      },
      {
        route: 'Hà Nội - TP.HCM',
        departureLocation: 'Hà Nội',
        arrivalLocation: 'TP.HCM',
        departureTime: new Date(tomorrow.setHours(14, 30, 0)),
        arrivalTime: new Date(dayAfter.setHours(6, 30, 0)),
        basePrice: 520000,
        totalSeats: 35,
        availableSeats: 28,
        status: 'SCHEDULED',
        duration: 960,
        distance: 1710,
        busId: buses[1].id
      },
      {
        route: 'Hà Nội - TP.HCM',
        departureLocation: 'Hà Nội',
        arrivalLocation: 'TP.HCM',
        departureTime: new Date(tomorrow.setHours(20, 0, 0)),
        arrivalTime: new Date(dayAfter.setHours(12, 0, 0)),
        basePrice: 750000,
        totalSeats: 22,
        availableSeats: 15,
        status: 'SCHEDULED',
        duration: 960,
        distance: 1710,
        busId: buses[2].id
      },
      
      // TP.HCM -> Đà Nẵng
      {
        route: 'TP.HCM - Đà Nẵng',
        departureLocation: 'TP.HCM',
        arrivalLocation: 'Đà Nẵng',
        departureTime: new Date(tomorrow.setHours(7, 0, 0)),
        arrivalTime: new Date(tomorrow.setHours(19, 0, 0)),
        basePrice: 280000,
        totalSeats: 45,
        availableSeats: 42,
        status: 'SCHEDULED',
        duration: 720, // 12 giờ
        distance: 950,
        busId: buses[0].id
      },
      {
        route: 'TP.HCM - Đà Nẵng',
        departureLocation: 'TP.HCM',
        arrivalLocation: 'Đà Nẵng',
        departureTime: new Date(tomorrow.setHours(22, 0, 0)),
        arrivalTime: new Date(dayAfter.setHours(10, 0, 0)),
        basePrice: 350000,
        totalSeats: 30,
        availableSeats: 25,
        status: 'SCHEDULED',
        duration: 720,
        distance: 950,
        busId: buses[3].id
      },

      // Hà Nội -> Đà Nẵng
      {
        route: 'Hà Nội - Đà Nẵng',
        departureLocation: 'Hà Nội',
        arrivalLocation: 'Đà Nẵng',
        departureTime: new Date(tomorrow.setHours(8, 0, 0)),
        arrivalTime: new Date(tomorrow.setHours(20, 0, 0)),
        basePrice: 320000,
        totalSeats: 45,
        availableSeats: 40,
        status: 'SCHEDULED',
        duration: 720,
        distance: 760,
        busId: buses[0].id
      },
      {
        route: 'Hà Nội - Đà Nẵng', 
        departureLocation: 'Hà Nội',
        arrivalLocation: 'Đà Nẵng',
        departureTime: new Date(tomorrow.setHours(21, 30, 0)),
        arrivalTime: new Date(dayAfter.setHours(9, 30, 0)),
        basePrice: 420000,
        totalSeats: 35,
        availableSeats: 30,
        status: 'SCHEDULED',
        duration: 720,
        distance: 760,
        busId: buses[1].id
      },

      // Đà Nẵng -> Hội An
      {
        route: 'Đà Nẵng - Hội An',
        departureLocation: 'Đà Nẵng',
        arrivalLocation: 'Hội An',
        departureTime: new Date(tomorrow.setHours(9, 0, 0)),
        arrivalTime: new Date(tomorrow.setHours(10, 0, 0)),
        basePrice: 50000,
        totalSeats: 45,
        availableSeats: 44,
        status: 'SCHEDULED',
        duration: 60,
        distance: 30,
        busId: buses[0].id
      }
    ]);
    console.log('✅ Created trips');

    // Tạo ghế cho mỗi xe
    for (const bus of buses) {
      const seats = [];
      for (let i = 1; i <= bus.capacity; i++) {
        let seatType = 'STANDARD';
        if (bus.busType === 'DELUXE' && i <= 10) seatType = 'VIP';
        if (bus.busType === 'LIMOUSINE') seatType = 'VIP';
        if (bus.busType === 'SLEEPER') seatType = 'SLEEPER';

        seats.push({
          seatNumber: `${String.fromCharCode(65 + Math.floor((i-1)/4))}${((i-1)%4)+1}`,
          seatType,
          busId: bus.id
        });
      }
      await Seat.bulkCreate(seats);
    }
    console.log('✅ Created seats');

    console.log('\n🎉 Trip test data created successfully!');
    console.log('📍 Available routes:');
    console.log('- Hà Nội → TP.HCM (3 trips)');
    console.log('- TP.HCM → Đà Nẵng (2 trips)');
    console.log('- Hà Nội → Đà Nẵng (2 trips)');
    console.log('- Đà Nẵng → Hội An (1 trip)');
    console.log('\n🚌 Bus types: STANDARD, DELUXE, LIMOUSINE, SLEEPER');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating trip data:', error);
    process.exit(1);
  }
};

createTripData();