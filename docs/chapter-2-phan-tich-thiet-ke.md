# Chương 2: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG

## 2.1. Phát biểu bài toán

Hệ thống bán vé xe khách trực tuyến cần hỗ trợ nhiều vai trò cùng lúc: hành khách tra cứu chuyến đi và thanh toán trực tuyến, nhà xe quản lý đội xe – lịch trình – doanh thu, tài xế cập nhật trạng thái chuyến, còn quản trị viên thì kiểm soát toàn bộ dữ liệu, xác thực các nhà cung cấp dịch vụ và xử lý rủi ro. Mục tiêu của dự án Bus Ticketing là số hóa toàn bộ quy trình kể trên, giảm thao tác thủ công, theo dõi thời gian thực được lượng ghế trống và tránh hiện tượng giữ ghế trùng. Ngoài đặt vé, hệ thống còn tích hợp ví voucher, cổng thanh toán VNPay, mã QR chuyển khoản và chatbot hỗ trợ người dùng bằng AI.

Các chức năng cốt lõi phải đáp ứng:

- Tìm kiếm, so khớp hành trình theo cặp điểm đi/điểm đến, ngày khởi hành, số ghế và bộ lọc (loại xe, giá, hãng xe, khung giờ).
- Giữ ghế tạm thời trong lúc khách thanh toán, xác thực lượt sử dụng voucher và kết nối VNPAY Return URL để cập nhật trạng thái giao dịch.
- Trang quản trị tập trung cho admin để theo dõi KPI, xử lý tin tức, người dùng, nhà xe, chuyến, vé và phản hồi.
- Cổng dành riêng cho nhà xe/doanh nghiệp: cấu hình tuyến, đội xe, lịch chuyến, nhân sự, tin tức, voucher, báo cáo doanh thu.
- Ứng dụng web cho tài xế cập nhật trạng thái (SCHEDULED/IN_PROGRESS/COMPLETED/CANCELLED), gửi báo cáo sự cố và theo dõi hành trình được phân công.

### Các công cụ dùng để xây dựng web

- **Frontend:** React 18 + TypeScript chạy trên Vite 7, Zustand quản lý state, axios gọi API, React Router 7 điều hướng, Bootstrap 5 + SCSS cho UI, Chart.js và react-chartjs-2 để hiển thị số liệu, React Quill & quill-image-resize-module cho tin tức.
- **Backend:** Node.js 18, Express, Sequelize ORM với MySQL 8 (InnoDB), Multer xử lý upload, JSON Web Token cho xác thực, dịch vụ VNPay & VietQR cho thanh toán, tích hợp Gemini API (docs/ai-chat-setup.md) để triển khai chatbot.
- **Cơ sở dữ liệu:** MySQL 8.0, cấu hình qua `mysql2`, migrates bằng `sequelize-cli`, dữ liệu mẫu thông qua các seeder trong `backend/seeders`.
- **Quy mô triển khai:** Kiến trúc client/server, RESTful API (`/api/auth`, `/api/trips`, `/api/bookings`, `/api/admin`, `/api/chat`). Ứng dụng chạy tốt trên Windows 10/11 và Linux (Docker hóa sau).

## 2.2. Phân tích chức năng

Các luồng chức năng được chia cho bốn nhóm người dùng chính. Bảng dưới đây tổng hợp những nghiệp vụ nổi bật nhất, tương ứng với các module React/Vite ở `frontend/src/pages` và API Express trong `backend/src/controllers`.

| Người dùng | Chức năng | Mô tả |
| --- | --- | --- |
| Hành khách | Đăng ký / đăng nhập | Đăng ký bằng email, xác thực OTP (nếu cấu hình), đăng nhập để lưu thông tin hành khách, lịch sử vé, ví voucher. |
| Hành khách | Tìm kiếm & lọc chuyến | Chọn điểm đi, điểm đến, ngày đi, số ghế; áp dụng bộ lọc loại xe, dải giá, hãng xe, khung giờ, hiển thị phân trang (Search.tsx). |
| Hành khách | Xem chi tiết chuyến | Trang TripDetail cung cấp thông tin lộ trình, hãng xe, tiện ích, sơ đồ ghế, đánh giá và chính sách hoàn/hủy. |
| Hành khách | Đặt vé & chọn ghế | Seat map tương tác, giữ ghế tạm (SeatLock), nhập thông tin hành khách, ghi chú, chọn phương thức thanh toán. |
| Hành khách | Thanh toán & hoàn tất | Áp dụng voucher, thanh toán bằng chuyển khoản, tiền mặt, VNPay; theo dõi màn hình VNPayReturn và PaymentSuccess. |
| Hành khách | Quản lý vé & voucher | Trang MyTickets xem mã QR, trạng thái thanh toán, tải hóa đơn; MyVouchers lưu / áp dụng / gắn cờ đã dùng. |
| Hành khách | Tin tức & hỗ trợ | Đọc tin tức (News.tsx, NewsDetail.tsx), liên hệ, sử dụng ChatWidget để hỏi AI (tổng đài ảo) về chính sách. |
| Nhà xe (Company) | Dashboard KPI | CompanyDashboard/Revenue/Reports hiển thị doanh số, tỷ lệ lấp đầy ghế, biểu đồ tuyến. |
| Nhà xe | Quản lý chuyến | CRUD chuyến (ManageTrips.tsx), cấu hình điểm đón/trả, giá, bus, tài xế, kiểm tra ghế còn trống, xuất file. |
| Nhà xe | Quản lý đội xe & nhân sự | ManageBuses, ManageStaff (CompanySidebar) cho phép cập nhật bus, phân công tài xế/nhân viên vào hãng. |
| Nhà xe | Quản lý vé & voucher | ManageBookings xem trạng thái thanh toán, khóa/giải phóng ghế; ManageVouchers phát hành / giới hạn mã ưu đãi. |
| Nhà xe | Truyền thông | ManageNews soạn thảo tin khuyến mãi, upload ảnh qua API `/api/upload`, sử dụng RichTextEditor. |
| Tài xế | Xem lịch chuyến | DriverTrips hiển thị danh sách chuyến, bộ lọc trạng thái, chi tiết lộ trình, số ghế đã đặt. |
| Tài xế | Cập nhật trạng thái | Driver cập nhật sang `IN_PROGRESS`, `COMPLETED`, hoặc `CANCELLED`, thêm ghi chú; hệ thống ghi log TripStatusLog. |
| Tài xế | Báo cáo sự cố | Gửi báo cáo (TripReport) với mô tả sự kiện, gửi về nhà xe để xử lý hậu kiểm. |
| Quản trị viên | Quản trị hệ thống | AdminDashboard, ManageUsers, ManageCompanies, ManageLocations, ManageBuses, ManageTrips, ManageBookings. |
| Quản trị viên | Tin tức & quảng bá | Duyệt/đăng tin toàn hệ thống, gắn tag, kiểm soát trạng thái PUBLISHED/ARCHIVED. |
| Quản trị viên | Quản lý ưu đãi | Root admin có thể tạo voucher đa hãng, gán usage limit toàn hệ thống, theo dõi voucher_usages. |
| Quản trị viên | Báo cáo & xử lý vi phạm | Xem AdminReports, xử lý user_reports, khóa tài khoản hoặc liên hệ nhà xe. |

## 2.3. Mô hình Use Case

Hệ thống có hai nhóm tác nhân tuyến đầu (hành khách, tài xế) và hai nhóm điều hành (nhà xe, quản trị viên). Biểu đồ Use Case tổng quát (Hình 2.1) mô tả mối quan hệ giữa các actor với hệ thống Bus Ticketing qua cổng web. Các biểu đồ chi tiết được xây dựng trên draw.io và lưu trong tài liệu nội bộ, ở đây trình bày phần mô tả nghiệp vụ:

### 2.3.1. Use Case tổng quát (Hình 2.1)

- Người dùng chưa đăng nhập có thể tìm kiếm chuyến, xem tin tức; để đặt vé cần đăng ký/đăng nhập.
- Sau khi xác thực, hành khách đặt vé, thanh toán, quản lý vé, khi cần hỗ trợ có thể chat AI hoặc gửi yêu cầu cho nhà xe.
- Nhà xe đăng nhập để cấu hình tuyến, quản lý chuyến, xem báo cáo và điều phối tài xế.
- Tài xế đăng nhập bằng tài khoản được nhà xe cấp, nhận danh sách chuyến và cập nhật tiến độ.
- Admin có toàn quyền duyệt/khóa dữ liệu, xem báo cáo thống kê toàn hệ thống.

### 2.3.2. Use Case hành khách (Hình 2.2)

- Đăng ký tài khoản bằng email/điện thoại, nhận mật khẩu hoặc OTP.
- Nhập thông tin tìm kiếm (điểm đi, điểm đến, ngày, số ghế) để lấy danh sách chuyến. Tại trang kết quả, áp dụng bộ lọc busType, priceRange, company, departureTime.
- Vào trang chi tiết để chọn ghế, giữ ghế (seat_locks) và tạo booking.
- Áp dụng voucher từ ví hoặc nhập code, chọn phương thức thanh toán (VNPay, chuyển khoản, tiền mặt).
- Theo dõi kết quả giao dịch: PaymentSuccess/Pending/Failed, nhận email, tải vé, xem QR và lịch sử vé tại MyTickets.

### 2.3.3. Use Case nhà xe và tài xế (Hình 2.3 & 2.4)

- Nhà xe tạo tuyến (route), lịch (schedule), nhập đội xe (bus), tạo tài khoản nhân sự (company_users, drivers).
- Khi có chuyến mới, gán bus + driver + giá, kiểm tra ghế qua seat map, mở bán và giám sát booking.
- Nhận báo cáo doanh thu, tỷ lệ lấp đầy, voucher đã dùng, tình trạng thanh toán (ManageBookings, Reports, Revenue).
- Tài xế xem danh sách chuyến theo trạng thái, mở chi tiết để xem hành khách, gọi hotline, cập nhật trạng thái hoặc gửi TripReport kèm ghi chú.

### 2.3.4. Use Case quản trị hệ thống (Hình 2.5)

- Quản trị viên tạo/khóa tài khoản người dùng, nhà xe; duyệt tuyến, điểm đón; quản lý tin tức toàn cục.
- Theo dõi log đăng nhập, hoạt động cập nhật chuyến, booking, thanh toán; xử lý khiếu nại (user_reports).
- Quản lý hạ tầng kỹ thuật: cấu hình front-end URL, cổng VNPay, Gemini API, backup cơ sở dữ liệu.

## 2.4. Sơ đồ tuần tự chức năng

### 2.4.1. Mô tả đăng nhập

**Tên Use Case:** Đăng nhập  
**Actor:** Hành khách, nhà xe, tài xế, quản trị viên  
**Mô tả:** Cho phép người dùng truy cập các chức năng phù hợp với vai trò.  
**Tiền điều kiện:** Tài khoản tồn tại, chưa đăng nhập trong phiên hiện tại.  
**Hậu điều kiện:** JWT hoặc session hợp lệ được cấp; phân quyền được áp dụng trên frontend/backend.

**Luồng sự kiện chính**
1. Người dùng chọn chức năng đăng nhập từ Navbar.
2. Form hiển thị, người dùng nhập email/mật khẩu (hoặc dùng token khôi phục).
3. Frontend gọi `/api/auth/login`, backend kiểm tra email, mật khẩu (bcrypt) và trạng thái `ACTIVE`.
4. Nếu hợp lệ, backend trả JWT + thông tin user (role, companyId, driverProfile).
5. Trình duyệt lưu token (localStorage) và cập nhật store, điều hướng tới trang phù hợp (Home, AdminDashboard, CompanyDashboard…).

**Luồng rẽ nhánh**
- **A1 – Sai thông tin hoặc tài khoản bị khóa:** Backend trả lỗi, frontend hiển thị thông báo và cho nhập lại.
- **A2 – Mật khẩu tạm / lần đầu đăng nhập:** Hệ thống chuyển người dùng tới trang đổi mật khẩu trước khi tiếp tục.

### 2.4.2. Mô tả tìm kiếm – đặt vé – thanh toán

**Tên Use Case:** Đặt vé trực tuyến  
**Actor:** Hành khách (đã đăng nhập hoặc khách vãng lai)  
**Mô tả:** Cho phép tìm kiếm chuyến, giữ ghế, thanh toán và nhận vé điện tử.  
**Tiền điều kiện:** Dữ liệu tuyến, chuyến đã được xuất bản; ghế còn trống.  
**Hậu điều kiện:** Bản ghi Booking được tạo, thanh toán cập nhật trạng thái, vé hiển thị trong MyTickets.

**Luồng sự kiện chính**
1. Người dùng nhập điểm đi, điểm đến, ngày, số ghế và bấm tìm kiếm.
2. `/api/trips/search` trả về danh sách chuyến tương ứng; frontend hiển thị + bộ lọc bổ sung.
3. Người dùng chọn chuyến, xem chi tiết và chọn ghế. Hệ thống gửi yêu cầu giữ ghế (`SeatLock`) trong thời gian cấu hình.
4. Người dùng điền thông tin hành khách, áp dụng voucher (validate qua `/api/vouchers/validate`).
5. Frontend gửi request tạo booking tới `/api/bookings`, backend xác nhận ghế còn trống, tính tổng tiền và tạo bản ghi.
6. Người dùng chọn phương thức thanh toán:
   - **VNPay:** backend tạo bản ghi Payment + VNPayTransaction, trả URL/QR; người dùng được chuyển tới cổng VNPay, sau đó VNPayReturn xử lý callback.
   - **Chuyển khoản/VietQR:** backend trả thông tin ngân hàng, hiển thị mã QR.
   - **Tiền mặt:** booking giữ trạng thái `PENDING` để nhà xe xác nhận offline.
7. Khi thanh toán thành công, paymentStatus → `SUCCESS`, bookingStatus → `CONFIRMED`, vé được gửi qua email và hiển thị trong MyTickets.

**Luồng rẽ nhánh**
- **B1 – Không tìm thấy chuyến phù hợp:** Hệ thống gợi ý “all trips” hoặc vị trí gần nhất; người dùng có thể đổi ngày.
- **B2 – Ghế đã được giữ/đặt trước:** Backend trả lỗi “Seat locked”, frontend yêu cầu chọn ghế khác.
- **B3 – Thanh toán thất bại/timeout:** Payment chuyển sang `FAILED`, Booking giữ trạng thái `PENDING` và giải phóng SeatLock; người dùng có thể thanh toán lại.

### 2.4.3. Mô tả quản lý chuyến xe (nhà xe + tài xế)

**Tên Use Case:** Quản lý chuyến và cập nhật trạng thái  
**Actor:** Quản trị nhà xe, tài xế  
**Mô tả:** Nhà xe tạo/chỉnh sửa chuyến, phân công tài xế; tài xế cập nhật trạng thái trong ngày chạy.  
**Tiền điều kiện:** Người dùng thuộc công ty tương ứng, có quyền `company_admin` hoặc `driver`.  
**Hậu điều kiện:** Chuyến xe, trạng thái, log được cập nhật; báo cáo và thông báo đến hành khách.

**Luồng sự kiện chính (nhà xe)**
1. Nhà xe mở trang ManageTrips, chọn “Tạo chuyến”.
2. Nhập thông tin: tuyến, ngày giờ, bus, driver, giá vé, số ghế, mô tả.
3. Backend kiểm tra ràng buộc (bus không trùng giờ, driver rảnh, ghế >= 1), lưu record và trả kết quả.
4. Chuyến hiển thị trong Search/DriverTrips; nhà xe theo dõi doanh số và tỷ lệ ghế trong CompanyDashboard.

**Luồng sự kiện chính (tài xế)**
1. Tài xế đăng nhập, vào DriverTrips để xem các chuyến được gán.
2. Mở chi tiết để xem danh sách hành khách, ghi chú, hotline.
3. Khi khởi hành, chọn hành động “Bắt đầu chuyến” → backend cập nhật trip status `IN_PROGRESS`, thêm log TripStatusLog.
4. Khi hoàn tất, cập nhật `COMPLETED` và gửi báo cáo (TripReport) nếu cần.

**Luồng rẽ nhánh**
- **C1 – Thiếu thông tin chuyến:** Backend trả lỗi, yêu cầu nhập lại.
- **C2 – Tài xế/xe bị khóa:** Hệ thống không cho phép, yêu cầu chọn tài nguyên khác.
- **C3 – Hủy chuyến:** Nhà xe hoặc tài xế chọn “Hủy”, booking liên quan được thông báo, voucher hoàn lại, thanh toán chuyển `REFUNDED` nếu áp dụng.

## 2.5. Thiết kế cơ sở dữ liệu

Hệ thống sử dụng MySQL 8 với chuẩn hóa 3NF, Sequelize quản lý migration. Lược đồ dữ liệu (Hình 2.9) được tổ chức quanh các nhóm chính: (1) người dùng/nhà xe/tài xế, (2) tài nguyên tuyến – chuyến – ghế, (3) đặt vé – thanh toán – voucher, (4) truyền thông – báo cáo.

### Bảng 2.1. Bảng `users`

| Tên cột | Kiểu dữ liệu | Khóa | Mô tả |
| --- | --- | --- | --- |
| id | INTEGER | PK | Mã người dùng tự tăng. |
| name | STRING |  | Họ tên hiển thị. |
| email | STRING | UNIQUE | Email đăng nhập. |
| phone | STRING |  | Số điện thoại. |
| passwordHash | STRING |  | Mật khẩu đã băm (bcrypt). |
| role | ENUM(`admin`,`company`,`driver`,`passenger`) |  | Phân quyền chính. |
| companyId | INTEGER | FK | Tham chiếu `bus_companies.id` (khi là nhân sự nhà xe). |
| status | ENUM(`ACTIVE`,`INACTIVE`,`SUSPENDED`) |  | Trạng thái tài khoản. |
| lastLoginAt | DATETIME |  | Lần đăng nhập gần nhất. |
| createdAt / updatedAt | DATETIME |  | Mốc thời gian hệ thống. |

### Bảng 2.2. Bảng `bus_companies`

| Tên cột | Kiểu dữ liệu | Khóa | Mô tả |
| --- | --- | --- | --- |
| id | INTEGER | PK | Mã nhà xe. |
| name | STRING |  | Tên thương hiệu. |
| code | STRING | UNIQUE | Mã định danh nội bộ. |
| phone / email | STRING |  | Liên hệ chính. |
| address | TEXT |  | Địa chỉ trụ sở. |
| description | TEXT |  | Giới thiệu. |
| logo | STRING |  | Đường dẫn ảnh logo. |
| isActive | BOOLEAN |  | Cho phép bán vé hay không. |
| createdAt / updatedAt | DATETIME |  | Thời gian tạo/cập nhật. |

### Bảng 2.3. Bảng `company_users`

| Tên cột | Kiểu dữ liệu | Khóa | Mô tả |
| --- | --- | --- | --- |
| id | INTEGER | PK | Bản ghi gán user vào nhà xe. |
| companyId | INTEGER | FK | Tham chiếu `bus_companies`. |
| userId | INTEGER | FK | Tham chiếu `users`. |
| roleInCompany | STRING |  | Vai trò nội bộ (ADMIN, STAFF, SUPPORT…). |
| createdAt / updatedAt | DATETIME |  | Thời gian tạo/cập nhật. |

### Bảng 2.4. Bảng `drivers`

| Tên cột | Kiểu dữ liệu | Khóa | Mô tả |
| --- | --- | --- | --- |
| id | INTEGER | PK | Mã hồ sơ tài xế. |
| userId | INTEGER | FK | Tham chiếu `users`. |
| companyId | INTEGER | FK | Thuộc nhà xe. |
| licenseNumber | STRING |  | Số bằng lái. |
| phone | STRING |  | Liên hệ trực tiếp. |
| status | ENUM(`ACTIVE`,`INACTIVE`,`SUSPENDED`) |  | Trạng thái làm việc. |
| createdAt / updatedAt | DATETIME |  | Thời gian tạo/cập nhật. |

### Bảng 2.5. Bảng `buses`

| Tên cột | Kiểu dữ liệu | Khóa | Mô tả |
| --- | --- | --- | --- |
| id | INTEGER | PK | Mã xe. |
| companyId | INTEGER | FK | Nhà xe sở hữu. |
| busNumber | STRING |  | Biển số / mã xe. |
| busType | STRING |  | Loại xe (ghế ngồi, giường nằm…). |
| totalSeats / capacity | INTEGER |  | Tổng số ghế và sức chứa. |
| facilities | JSON |  | Danh sách tiện ích (wifi, nước…). |
| isActive | BOOLEAN |  | Được phép khai thác hay không. |
| createdAt / updatedAt | DATETIME |  | Thời gian tạo/cập nhật. |

### Bảng 2.6. Bảng `locations`

| Tên cột | Kiểu dữ liệu | Khóa | Mô tả |
| --- | --- | --- | --- |
| id | INTEGER | PK | Mã địa điểm. |
| name | STRING |  | Tên bến/điểm đón. |
| code | STRING | UNIQUE | Mã viết tắt. |
| province | STRING |  | Tỉnh/thành. |
| address | TEXT |  | Địa chỉ chi tiết. |
| coordinates | JSON |  | Vĩ độ/kinh độ. |
| isActive | BOOLEAN |  | Còn sử dụng hay không. |
| createdAt / updatedAt | DATETIME |  | Thời gian tạo/cập nhật. |

### Bảng 2.7. Bảng `routes`

| Tên cột | Kiểu dữ liệu | Khóa | Mô tả |
| --- | --- | --- | --- |
| id | INTEGER | PK | Mã tuyến. |
| fromLocationId | INTEGER | FK | Điểm đi. |
| toLocationId | INTEGER | FK | Điểm đến. |
| distanceKm | DECIMAL |  | Quãng đường (km). |
| basePrice | DECIMAL |  | Giá gốc tham chiếu. |
| durationMin | INTEGER |  | Thời gian dự kiến (phút). |
| createdAt / updatedAt | DATETIME |  | Thời gian tạo/cập nhật. |

### Bảng 2.8. Bảng `trips`

| Tên cột | Kiểu dữ liệu | Khóa | Mô tả |
| --- | --- | --- | --- |
| id | INTEGER | PK | Mã chuyến. |
| companyId | INTEGER | FK | Nhà xe vận hành. |
| busId | INTEGER | FK | Xe được gán. |
| driverId | INTEGER | FK | Tài xế phụ trách. |
| routeId | INTEGER | FK | Tuyến chuẩn. |
| departureLocationId / arrivalLocationId | INTEGER | FK | Điểm đón và trả. |
| departureTime / arrivalTime | DATETIME |  | Thời gian khởi hành/đến nơi. |
| basePrice | DECIMAL |  | Giá cơ sở trước nhân hệ số ghế. |
| status | ENUM |  | SCHEDULED/IN_PROGRESS/COMPLETED/CANCELLED. |
| startedAt / endedAt | DATETIME |  | Thời gian thực tế (có thể null). |
| totalSeats / availableSeats | INTEGER |  | Tổng ghế và ghế trống. |
| createdAt / updatedAt | DATETIME |  | Thời gian tạo/cập nhật. |

### Bảng 2.9. Bảng `seats`

| Tên cột | Kiểu dữ liệu | Khóa | Mô tả |
| --- | --- | --- | --- |
| id | INTEGER | PK | Mã ghế. |
| busId | INTEGER | FK | Thuộc xe nào. |
| seatNumber | STRING |  | Ví dụ A01. |
| seatType | ENUM(`STANDARD`,`VIP`,`SLEEPER`) |  | Loại ghế. |
| priceMultiplier | DECIMAL |  | Hệ số nhân theo loại ghế. |
| isActive | BOOLEAN |  | Còn mở bán hay không. |
| createdAt / updatedAt | DATETIME |  | Thời gian tạo/cập nhật. |

### Bảng 2.10. Bảng `seat_locks`

| Tên cột | Kiểu dữ liệu | Khóa | Mô tả |
| --- | --- | --- | --- |
| id | INTEGER | PK | Mã phiên giữ ghế. |
| tripId | INTEGER | FK | Chuyến liên quan. |
| seatId | INTEGER | FK | Ghế đã khóa. |
| userId | INTEGER | FK | Người giữ ghế (có thể null với khách). |
| expiresAt | DATETIME |  | Thời gian hết hạn giữ ghế. |
| createdAt / updatedAt | DATETIME |  | Nhật ký hệ thống. |

### Bảng 2.11. Bảng `bookings`

| Tên cột | Kiểu dữ liệu | Khóa | Mô tả |
| --- | --- | --- | --- |
| id | INTEGER | PK | Mã đặt chỗ. |
| bookingCode | STRING | UNIQUE | Mã vé hiển thị cho khách. |
| userId | INTEGER | FK | Người đặt (có thể null). |
| tripId | INTEGER | FK | Chuyến tương ứng. |
| companyId | INTEGER | FK | Nhà xe cung cấp. |
| passengerName / phone / email | STRING |  | Thông tin hành khách chính. |
| seatNumbers | JSON |  | Danh sách ghế được đặt. |
| totalPrice | DECIMAL |  | Tổng tiền trước giảm giá. |
| discountAmount | DECIMAL |  | Số tiền giảm. |
| voucherId | INTEGER | FK | Voucher áp dụng (nếu có). |
| paymentStatus | ENUM(`PENDING`,`PAID`,`CANCELLED`,`REFUNDED`) |  | Trạng thái thanh toán. |
| bookingStatus | ENUM(`CONFIRMED`,`CANCELLED`,`COMPLETED`) |  | Tình trạng vé. |
| paymentMethod | ENUM(`CASH`,`BANK_TRANSFER`,`CREDIT_CARD`,`E_WALLET`,`VNPAY`) |  | Phương thức đã chọn. |
| notes / guestNotes | TEXT/JSON |  | Ghi chú của khách/nhà xe. |
| createdAt / updatedAt | DATETIME |  | Thời gian tạo/cập nhật. |

### Bảng 2.12. Bảng `booking_items`

| Tên cột | Kiểu dữ liệu | Khóa | Mô tả |
| --- | --- | --- | --- |
| id | INTEGER | PK | Mã dòng chi tiết. |
| bookingId | INTEGER | FK | Thuộc booking nào. |
| seatId | INTEGER | FK | Ghế cụ thể. |
| price | DECIMAL |  | Giá ghế sau nhân hệ số. |
| createdAt / updatedAt | DATETIME |  | Nhật ký thời gian. |

### Bảng 2.13. Bảng `payments`

| Tên cột | Kiểu dữ liệu | Khóa | Mô tả |
| --- | --- | --- | --- |
| id | INTEGER | PK | Mã thanh toán. |
| paymentCode | STRING | UNIQUE | Mã giao dịch nội bộ. |
| bookingId | INTEGER | FK | Booking được thanh toán. |
| amount | DECIMAL |  | Số tiền khách phải trả. |
| discountAmount | DECIMAL |  | Giảm giá từ voucher. |
| paymentMethod | ENUM |  | CASH/BANK_TRANSFER/E_WALLET/VNPAY… |
| paymentStatus | ENUM(`PENDING`,`SUCCESS`,`FAILED`,`CANCELLED`) |  | Trạng thái xử lý. |
| transactionId | STRING |  | Mã giao dịch từ cổng thanh toán. |
| voucherId | INTEGER | FK | Voucher liên quan (nếu có). |
| paymentDetails | JSON |  | Payload bổ sung (VietQR/VNPay). |
| paidAt | DATETIME |  | Khi chuyển SUCCESS. |
| companyId | INTEGER | FK | Nhà xe hưởng doanh thu. |
| createdAt / updatedAt | DATETIME |  | Nhật ký. |

### Bảng 2.14. Bảng `vnpay_transactions`

| Tên cột | Kiểu dữ liệu | Khóa | Mô tả |
| --- | --- | --- | --- |
| id | INTEGER | PK | Mã bản ghi VNPay. |
| paymentId | INTEGER | FK | Tham chiếu `payments`. |
| orderId | STRING | UNIQUE | Mã đơn hàng gửi VNPay. |
| amount | DECIMAL |  | Số tiền yêu cầu. |
| orderInfo | TEXT |  | Nội dung đơn hàng. |
| bankCode | STRING |  | Mã ngân hàng khách chọn. |
| paymentUrl | TEXT |  | URL thanh toán. |
| transactionNo | STRING |  | Mã giao dịch VNPay trả về. |
| responseCode / responseMessage | STRING/TEXT |  | Kết quả phản hồi. |
| status | ENUM(`PENDING`,`SUCCESS`,`FAILED`,`CANCELLED`) |  | Trạng thái hiện tại. |
| paidAt | DATETIME |  | Thời điểm thanh toán thành công. |
| createdAt / updatedAt | DATETIME |  | Thời gian tạo/cập nhật. |

### Bảng 2.15. Bảng `vouchers`

| Tên cột | Kiểu dữ liệu | Khóa | Mô tả |
| --- | --- | --- | --- |
| id | INTEGER | PK | Mã voucher. |
| code | STRING | UNIQUE theo (code, companyId) | Mã áp dụng. |
| name / description | STRING/TEXT |  | Thông tin hiển thị. |
| discountType | ENUM(`PERCENT`,`AMOUNT`) |  | Kiểu giảm giá. |
| discountValue | DECIMAL |  | Giá trị giảm. |
| minOrderValue / maxDiscount | DECIMAL |  | Điều kiện áp dụng. |
| startDate / endDate | DATETIME |  | Khoảng hiệu lực. |
| usageLimit / usagePerUser | INTEGER |  | Giới hạn tổng / mỗi người. |
| usedCount | INTEGER |  | Số lượt đã dùng. |
| companyId | INTEGER | FK | Thuộc nhà xe (hoặc null = toàn hệ thống). |
| createdBy | INTEGER | FK | Người tạo. |
| isActive | BOOLEAN |  | Kích hoạt hay không. |
| metadata | JSON |  | Tham số bổ sung. |
| createdAt / updatedAt | DATETIME |  | Nhật ký thời gian. |

### Bảng 2.16. Bảng `user_vouchers`

| Tên cột | Kiểu dữ liệu | Khóa | Mô tả |
| --- | --- | --- | --- |
| id | INTEGER | PK | Mã lưu ví voucher. |
| userId | INTEGER | FK | Người sở hữu. |
| voucherId | INTEGER | FK | Voucher tương ứng. |
| savedAt | DATETIME |  | Thời điểm lưu. |
| isUsed | BOOLEAN |  | Đã dùng hay chưa. |
| metadata | JSON |  | Thông tin thêm (nguồn, chiến dịch). |
| createdAt / updatedAt | DATETIME |  | Nhật ký. |

### Bảng 2.17. Bảng `voucher_usages`

| Tên cột | Kiểu dữ liệu | Khóa | Mô tả |
| --- | --- | --- | --- |
| id | INTEGER | PK | Mã log sử dụng. |
| voucherId | INTEGER | FK | Voucher áp dụng. |
| bookingId | INTEGER | FK | Booking liên quan. |
| userId | INTEGER | FK | Người dùng (nếu có). |
| appliedDiscount | DECIMAL |  | Số tiền giảm thực tế. |
| metadata | JSON |  | Payload thêm. |
| createdAt / updatedAt | DATETIME |  | Thời gian tạo/cập nhật. |

### Bảng 2.18. Bảng `news`

| Tên cột | Kiểu dữ liệu | Khóa | Mô tả |
| --- | --- | --- | --- |
| id | INTEGER | PK | Mã bài viết. |
| title / slug | STRING |  | Tiêu đề & slug duy nhất. |
| content | LONGTEXT |  | Nội dung chi tiết. |
| summary | TEXT |  | Tóm tắt. |
| category | ENUM |  | TRAFFIC/COMPANY/PROMOTION/ANNOUNCEMENT/OTHER. |
| status | ENUM(`DRAFT`,`PUBLISHED`,`ARCHIVED`) |  | Trạng thái. |
| featuredImage | STRING |  | Ảnh đại diện. |
| publishedAt | DATETIME |  | Ngày xuất bản. |
| authorId | INTEGER | FK | Tác giả. |
| companyId | INTEGER | FK | Nhà xe (nếu bài riêng). |
| viewCount | INTEGER |  | Lượt xem. |
| tags | JSON |  | Tag linh hoạt. |
| isHighlighted | BOOLEAN |  | Đánh dấu nổi bật. |
| createdAt / updatedAt | DATETIME |  | Nhật ký. |

### Bảng 2.19. Bảng `trip_status_logs`

| Tên cột | Kiểu dữ liệu | Khóa | Mô tả |
| --- | --- | --- | --- |
| id | INTEGER | PK | Mã log. |
| tripId | INTEGER | FK | Chuyến được cập nhật. |
| driverId | INTEGER | FK | Tài xế thao tác (có thể null nếu admin đổi). |
| previousStatus / newStatus | ENUM |  | Trạng thái cũ và mới. |
| note | TEXT |  | Ghi chú. |
| createdAt | DATETIME |  | Thời điểm ghi log. |

### Bảng 2.20. Bảng `trip_reports`

| Tên cột | Kiểu dữ liệu | Khóa | Mô tả |
| --- | --- | --- | --- |
| id | INTEGER | PK | Mã báo cáo. |
| tripId | INTEGER | FK | Chuyến liên quan. |
| driverId | INTEGER | FK | Người gửi báo cáo. |
| companyId | INTEGER | FK | Nhà xe nhận báo cáo. |
| note | TEXT |  | Nội dung báo cáo. |
| createdAt | DATETIME |  | Thời điểm gửi; không có updatedAt. |

### Bảng 2.21. Bảng `schedules`

| Tên cột | Kiểu dữ liệu | Khóa | Mô tả |
| --- | --- | --- | --- |
| id | INTEGER | PK | Mã lịch chạy định kỳ. |
| companyId | INTEGER | FK | Nhà xe sở hữu lịch. |
| routeId | INTEGER | FK | Tuyến áp dụng. |
| busId | INTEGER | FK | Xe ưu tiên (có thể null). |
| dayOfWeek | TINYINT |  | Thứ trong tuần (0-6). |
| departureTime | TIME |  | Giờ xuất phát. |
| durationMin | INTEGER |  | Thời lượng dự kiến. |
| effectiveFrom / effectiveTo | DATE |  | Khoảng hiệu lực. |
| isActive | BOOLEAN |  | Lịch còn dùng hay không. |
| createdAt / updatedAt | DATETIME |  | Nhật ký. |

### Bảng 2.22. Bảng `invoices`

| Tên cột | Kiểu dữ liệu | Khóa | Mô tả |
| --- | --- | --- | --- |
| id | INTEGER | PK | Mã hóa đơn. |
| invoiceNumber | STRING |  | Số hóa đơn. |
| companyId | INTEGER | FK | Nhà xe phát hành. |
| bookingId | INTEGER | FK | Booking tương ứng. |
| paymentId | INTEGER | FK | Thanh toán liên quan. |
| status | ENUM(`DRAFT`,`ISSUED`,`CANCELLED`) |  | Trạng thái. |
| subtotal / taxRate / taxAmount / totalAmount | DECIMAL |  | Giá trị hóa đơn. |
| issuedAt | DATETIME |  | Ngày phát hành. |
| metadata | JSON |  | Thông tin thêm (mẫu số, ký hiệu). |
| createdAt / updatedAt | DATETIME |  | Nhật ký. |

### Bảng 2.23. Bảng `user_reports`

| Tên cột | Kiểu dữ liệu | Khóa | Mô tả |
| --- | --- | --- | --- |
| id | INTEGER | PK | Mã báo cáo người dùng. |
| companyId | INTEGER | FK | Nhà xe tiếp nhận. |
| userId | INTEGER | FK | Người bị báo cáo. |
| bookingId | INTEGER | FK | Vé liên quan (nếu có). |
| reason | TEXT |  | Nội dung khiếu nại. |
| status | ENUM(`PENDING`,`REVIEWED`,`ACTION_TAKEN`) |  | Trạng thái xử lý. |
| createdAt | DATETIME |  | Thời điểm tạo; không có updatedAt. |

## 2.6. Cấu hình hệ thống

### 2.6.1. Môi trường phát triển

- Hệ điều hành: Windows 10/11 (Codex CLI đang dùng), macOS hoặc Linux đều hỗ trợ.
- Node.js >= 18.17 LTS, npm >= 10.5. (Frontend dùng Vite nên khuyến nghị Node 20 để có HMR ổn định).
- MySQL Server 8.x với InnoDB, bật chế độ `sql_mode=STRICT_TRANS_TABLES`.
- Công cụ CLI: Git, npx, sequelize-cli, nodemon.
- Trình duyệt hiện đại (Chrome/Edge) để chạy Vite dev server tại `http://localhost:5173`.

### 2.6.2. Khởi chạy ứng dụng

1. **Chuẩn bị cơ sở dữ liệu**
   - Tạo database MySQL, ví dụ `bus_ticketing`.
   - Tạo user riêng và cấp quyền `ALL PRIVILEGES` trên DB đó.

2. **Backend (Express + Sequelize)**
   ```bash
   cd backend
   npm install
   # Tạo hoặc chỉnh sửa file .env với các biến chính:
   # PORT, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_DIALECT=mysql
   # JWT_SECRET, FRONTEND_URL, FRONTEND_URLS
   # GEMINI_API_BASE, GEMINI_API_KEY, GEMINI_MODEL, GEMINI_TEMPERATURE, GEMINI_MAX_TOKENS
   # VNP_TMN_CODE, VNP_HASH_SECRET, VNP_URL, VNP_RETURN_URL, VNP_API
   # VIETQR_BANK_CODE, VIETQR_ACCOUNT_NO, VIETQR_ACCOUNT_NAME
   # Các biến SMTP/email nếu bật gửi mail xác nhận.
   npx sequelize-cli db:migrate
   npx sequelize-cli db:seed:all   # (tuỳ chọn) dữ liệu mẫu trong backend/seeders
   npm run dev                     # chạy ở http://localhost:5000
   ```
   - Khi cần tạo dữ liệu demo nhanh cho nhà xe/trips/vouchers, sử dụng các script `backend/scripts` hoặc `node backend/create-trip-data.js`.
   - Cấu hình chatbot AI theo hướng dẫn `docs/ai-chat-setup.md` (khóa Gemini, Prompt, giới hạn token).

3. **Frontend (React + Vite)**
   ```bash
   cd frontend
   npm install
   # File .env (hoặc .env.local) cần khai báo:
   # VITE_API_URL=http://localhost:5000
   npm run dev   # chạy tại http://localhost:5173
   ```
   - Có thể đặt `VITE_API_URL` động trong localStorage thông qua trang AdminDashboard (ô cấu hình API).
   - Đối với build production: `npm run build` rồi deploy thư mục `dist` lên CDN/Web Server.

4. **Tích hợp VNPay & QR**
   - Đăng ký merchant VNPay để lấy `VNP_TMN_CODE`, `VNP_HASH_SECRET`, `VNP_RETURN_URL`.
   - Cập nhật URL redirect ở backend (`VNP_RETURN_URL`) để khớp với domain frontend thực tế (ví dụ https://app.example.com/payment/vnpay/return).
   - Nếu dùng chuyển khoản qua VietQR, cấu hình chính xác `VIETQR_BANK_CODE`, `VIETQR_ACCOUNT_NO`, `VIETQR_ACCOUNT_NAME`.

5. **Kiểm thử**
   - Mở hai terminal: một cho `npm run dev` backend, một cho frontend.
   - Đăng nhập bằng tài khoản seed (xem `backend/seeders`), thử luồng tìm chuyến → đặt vé → VNPay sandbox → xem MyTickets.
   - Kiểm tra các module quản trị: tạo/khóa nhà xe, thêm chuyến, áp dụng voucher, tạo tin tức.

Sau khi các bước trên hoàn tất, hệ thống Bus Ticketing hoạt động đầy đủ cho bốn vai trò (hành khách, nhà xe, tài xế, admin) với dữ liệu được đồng bộ giữa frontend React và backend Express/MySQL.
