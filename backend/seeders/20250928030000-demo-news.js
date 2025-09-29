'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Tạo admin user trước
    await queryInterface.bulkInsert('users', [{
      name: 'Admin ShanBus',
      email: 'admin@shanbus.com',
      passwordHash: '$2a$12$dummy_password_hash_for_demo_purposes_only',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date()
    }], {
      ignoreDuplicates: true
    });

    // Lấy admin ID
    const [adminUser] = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE email = ?',
      { 
        replacements: ['admin@shanbus.com'],
        type: Sequelize.QueryTypes.SELECT
      }
    );
    
    const adminId = adminUser ? adminUser.id : 1;

    // Tạo tin tức mẫu
    await queryInterface.bulkInsert('news', [
      {
        title: 'ShanBus ra mắt tuyến Hà Nội - Đà Nẵng mới',
        slug: 'shanbus-ra-mat-tuyen-ha-noi-da-nang-moi',
        content: 'ShanBus chính thức khai trương tuyến xe khách Hà Nội - Đà Nẵng với xe limousine cao cấp, khởi hành hàng ngày. Tuyến đường mới này sẽ phục vụ nhu cầu di chuyển ngày càng tăng giữa hai thành phố lớn.<br><br>Với đội xe hiện đại, ghế nằm cao cấp và dịch vụ chăm sóc khách hàng tận tình, ShanBus cam kết mang đến trải nghiệm tuyệt vời cho mọi hành khách.<br><br>Lịch khởi hành: 6:00, 8:00, 14:00, 20:00 hàng ngày.<br>Thời gian di chuyển: khoảng 14 tiếng.<br>Giá vé: từ 450.000 VNĐ/người.',
        summary: 'Tuyến mới với xe limousine cao cấp, khởi hành hàng ngày phục vụ nhu cầu di chuyển',
        category: 'COMPANY',
        status: 'PUBLISHED',
        featuredImage: 'https://via.placeholder.com/800x400/667eea/ffffff?text=ShanBus+New+Route',
        publishedAt: new Date(),
        authorId: adminId,
        viewCount: 125,
        tags: JSON.stringify(['tuyến mới', 'limousine', 'Hà Nội', 'Đà Nẵng']),
        isHighlighted: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Chương trình khuyến mãi mùa hè 2025',
        slug: 'chuong-trinh-khuyen-mai-mua-he-2025',
        content: 'Nhân dịp hè 2025, ShanBus triển khai chương trình khuyến mãi lớn với giảm giá lên đến 30% cho tất cả các tuyến. Chương trình áp dụng từ ngày 1/6 đến 31/8/2025.<br><br><strong>Chi tiết chương trình:</strong><br>- Giảm 30% cho vé đặt trước 7 ngày<br>- Giảm 20% cho vé đặt trước 3 ngày<br>- Giảm 15% cho vé đặt trong ngày<br><br>Áp dụng cho tất cả các tuyến dài và ngắn. Không áp dụng đồng thời với các chương trình khuyến mãi khác.',
        summary: 'Giảm giá lên đến 30% cho tất cả các tuyến trong mùa hè 2025',
        category: 'PROMOTION',
        status: 'PUBLISHED',
        featuredImage: 'https://via.placeholder.com/800x400/48bb78/ffffff?text=Summer+Promotion',
        publishedAt: new Date(Date.now() - 24*60*60*1000),
        authorId: adminId,
        viewCount: 89,
        tags: JSON.stringify(['khuyến mãi', 'hè 2025', 'giảm giá']),
        isHighlighted: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Cập nhật lịch trình do ảnh hưởng thời tiết',
        slug: 'cap-nhat-lich-trinh-do-anh-huong-thoi-tiet',
        content: 'Do ảnh hưởng của bão số 3, một số tuyến xe sẽ có sự điều chỉnh lịch trình. Quý khách vui lòng theo dõi thông tin cập nhật và liên hệ hotline để được hỗ trợ.<br><br><strong>Các tuyến bị ảnh hưởng:</strong><br>- Hà Nội - Vinh: Hoãn các chuyến từ 14:00 ngày 28/9<br>- Hà Nội - Huế: Điều chỉnh giờ khởi hành<br>- Đà Nẵng - Nha Trang: Tạm dừng từ 20:00 ngày 28/9<br><br>Hotline hỗ trợ: 1900-xxxx (24/7)',
        summary: 'Điều chỉnh lịch trình các tuyến xe do ảnh hưởng thời tiết bão số 3',
        category: 'ANNOUNCEMENT',
        status: 'PUBLISHED',
        featuredImage: 'https://via.placeholder.com/800x400/ed8936/ffffff?text=Weather+Update',
        publishedAt: new Date(Date.now() - 2*24*60*60*1000),
        authorId: adminId,
        viewCount: 67,
        tags: JSON.stringify(['thông báo', 'thời tiết', 'lịch trình']),
        isHighlighted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'ShanBus đạt chứng nhận an toàn giao thông',
        slug: 'shanbus-dat-chung-nhan-an-toan-giao-thong',
        content: 'ShanBus vinh dự nhận chứng nhận an toàn giao thông từ Bộ Giao thông Vận tải, khẳng định cam kết về chất lượng dịch vụ và an toàn cho hành khách.<br><br>Chứng nhận được cấp sau quá trình kiểm tra nghiêm ngặt về:<br>- Chất lượng đội xe và thiết bị an toàn<br>- Trình độ tài xế và quy trình vận hành<br>- Hệ thống giám sát và theo dõi hành trình<br>- Dịch vụ chăm sóc khách hàng<br><br>Đây là minh chứng cho sự nỗ lực không ngừng của ShanBus trong việc nâng cao chất lượng dịch vụ.',
        summary: 'Nhận chứng nhận an toàn giao thông từ Bộ Giao thông Vận tải',
        category: 'COMPANY',
        status: 'PUBLISHED',
        featuredImage: 'https://via.placeholder.com/800x400/4299e1/ffffff?text=Safety+Certificate',
        publishedAt: new Date(Date.now() - 3*24*60*60*1000),
        authorId: adminId,
        viewCount: 45,
        tags: JSON.stringify(['chứng nhận', 'an toàn', 'giao thông']),
        isHighlighted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Hướng dẫn đặt vé online mới nhất',
        slug: 'huong-dan-dat-ve-online-moi-nhat',
        content: 'ShanBus cập nhật hướng dẫn đặt vé online với giao diện mới, thao tác đơn giản và nhiều tính năng tiện ích. Hành khách có thể dễ dàng chọn ghế, thanh toán và nhận vé điện tử.<br><br><strong>Các bước đặt vé:</strong><br>1. Chọn điểm đi và điểm đến<br>2. Chọn ngày và giờ khởi hành<br>3. Chọn ghế yêu thích<br>4. Điền thông tin hành khách<br>5. Thanh toán online<br>6. Nhận vé điện tử qua email/SMS<br><br>Hỗ trợ thanh toán: Visa, Mastercard, ATM nội địa, ví điện tử.',
        summary: 'Hướng dẫn chi tiết cách đặt vé online với giao diện và tính năng mới',
        category: 'OTHER',
        status: 'PUBLISHED',
        featuredImage: 'https://via.placeholder.com/800x400/9f7aea/ffffff?text=Online+Booking',
        publishedAt: new Date(Date.now() - 5*24*60*60*1000),
        authorId: adminId,
        viewCount: 156,
        tags: JSON.stringify(['hướng dẫn', 'đặt vé online', 'giao diện mới']),
        isHighlighted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {
      ignoreDuplicates: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('news', {
      slug: {
        [Sequelize.Op.in]: [
          'shanbus-ra-mat-tuyen-ha-noi-da-nang-moi',
          'chuong-trinh-khuyen-mai-mua-he-2025',
          'cap-nhat-lich-trinh-do-anh-huong-thoi-tiet',
          'shanbus-dat-chung-nhan-an-toan-giao-thong',
          'huong-dan-dat-ve-online-moi-nhat'
        ]
      }
    });
    
    await queryInterface.bulkDelete('users', {
      email: 'admin@shanbus.com'
    });
  }
};