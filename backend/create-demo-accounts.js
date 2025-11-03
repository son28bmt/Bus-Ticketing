require('dotenv').config();
const { User } = require('./models');
const bcrypt = require('bcrypt');

const createDemoAccounts = async () => {
  try {
    console.log('🔄 Creating demo accounts...');
    
    // Xóa tài khoản demo cũ nếu có
    await User.destroy({ 
      where: { 
        email: ['admin@shanbus.com', 'user@example.com'] 
      } 
    });
    console.log('🗑️ Removed old demo accounts');
    
    // Tạo admin demo
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await User.create({
      name: 'Demo Admin',
      email: 'admin@shanbus.com',
      phone: '0901234567',
      passwordHash: adminPassword,
      role: 'admin',
      status: 'ACTIVE'
    });
    console.log('✅ Created admin demo account');
    
    // Tạo user demo
    const userPassword = await bcrypt.hash('user123', 10);
    const user = await User.create({
      name: 'Demo User',
      email: 'user@example.com',
      phone: '0987654321',
      passwordHash: userPassword,
      role: 'passenger',
      status: 'ACTIVE'
    });
    console.log('✅ Created user demo account');
    
    console.log('\n🎉 Demo accounts created successfully!');
    console.log('👨‍💼 Admin: admin@shanbus.com / admin123');
    console.log('👤 User: user@example.com / user123');
    
    // Test passwords
    console.log('\n🔍 Verifying passwords...');
    const adminCheck = await bcrypt.compare('admin123', admin.passwordHash);
    const userCheck = await bcrypt.compare('user123', user.passwordHash);
    console.log('Admin password valid:', adminCheck);
    console.log('User password valid:', userCheck);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating demo accounts:', error);
    process.exit(1);
  }
};

createDemoAccounts();
