import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { formatPrice } from '../utils/price';
import { formatTime, formatDate } from '../utils/formatDate';
import '../style/payment-success.css';
import { useVNPay, type InvoiceData } from '../hooks/useVNPay';

interface LocationState {
  booking: {
    id: number;
    bookingCode: string;
    passengerName: string;
    passengerPhone: string;
    seatNumbers: string[];
    totalPrice: number;
    paymentStatus: string;
    bookingStatus: string;
    createdAt: string;
  };
  payment: {
    id: number;
    paymentCode: string;
    amount: number;
    paymentMethod: string;
    paymentStatus: string;
  };
  trip: {
    id: number;
    route: string;
    departureLocation: string;
    arrivalLocation: string;
    departureTime: string;
    arrivalTime: string;
  };
}

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const locationState = location.state as LocationState;
  const { getInvoice } = useVNPay();

  // Local state to support invoice-based rendering when location state is absent
  const [booking, setBooking] = useState<LocationState['booking'] | undefined>(locationState?.booking);
  const [payment, setPayment] = useState<LocationState['payment'] | undefined>(locationState?.payment);
  const [trip, setTrip] = useState<LocationState['trip'] | undefined>(locationState?.trip);

  const [showQR, setShowQR] = useState(false);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    let timer: number | undefined;

    const bootstrap = async () => {
      try {
        // If no booking info from state, try loading from invoice API using paymentId
        if (!booking) {
          const paymentIdParam = searchParams.get('paymentId');
          const paymentId = paymentIdParam ? parseInt(paymentIdParam, 10) : (locationState?.payment?.id ?? undefined);

          if (paymentId) {
            const inv: InvoiceData = await getInvoice(paymentId);

            // Map invoice to UI shape
            const mappedBooking: LocationState['booking'] = {
              id: inv.booking?.id || 0,
              bookingCode: inv.booking?.code || inv.vnpay?.orderId || 'N/A',
              passengerName: inv.customer?.name || '',
              passengerPhone: inv.customer?.phone || '',
              seatNumbers: inv.booking?.seats || [],
              totalPrice: inv.booking?.totalPrice || inv.amount || 0,
              paymentStatus: inv.booking?.paymentStatus || (inv.status === 'SUCCESS' ? 'PAID' : 'PENDING'),
              bookingStatus: 'CONFIRMED',
              createdAt: new Date().toISOString()
            };

            const mappedPayment: LocationState['payment'] = {
              id: paymentId,
              paymentCode: inv.receiptNo,
              amount: inv.amount,
              paymentMethod: inv.method,
              paymentStatus: inv.status
            };

            const routeStr = inv.trip?.from && inv.trip?.to ? `${inv.trip.from} → ${inv.trip.to}` : '';
            const mappedTrip: LocationState['trip'] = {
              id: inv.trip?.id || 0,
              route: routeStr,
              departureLocation: inv.trip?.from || '',
              arrivalLocation: inv.trip?.to || '',
              departureTime: inv.trip?.departureTime || new Date().toISOString(),
              arrivalTime: inv.trip?.arrivalTime || new Date().toISOString()
            };

            setBooking(mappedBooking);
            setPayment(mappedPayment);
            setTrip(mappedTrip);
          }
        }

        // Auto redirect countdown
        timer = window.setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              navigate('/my-tickets');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } catch {
        // If invoice fetch fails, fallback to home
        navigate('/');
      }
    };

    bootstrap();

    return () => {
      if (timer) window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const getPaymentStatusColor = (status: string) => {
    const colors = {
      PENDING: '#f59e0b',
      PAID: '#10b981',
      SUCCESS: '#10b981',
      FAILED: '#ef4444',
      CANCELLED: '#ef4444',
      REFUNDED: '#6b7280'
    };
    return colors[status as keyof typeof colors] || '#6b7280';
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      CASH: 'Tiền mặt',
      BANK_TRANSFER: 'Chuyển khoản',
      CREDIT_CARD: 'Thẻ tín dụng',
      E_WALLET: 'Ví điện tử',
      VNPAY: 'VNPay'
    };
    return labels[method as keyof typeof labels] || method;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Generate PDF (would integrate with jsPDF or similar)
    alert('Tính năng tải PDF đang phát triển');
  };

  if (!booking) {
    return (
      <div className="payment-success-page">
        <div className="container">
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Đang tải...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-success-page">
      <div className="container">
        <div className="success-content">
          {/* Success Header */}
          <div className="success-header">
            <div className="success-icon">
              <div className="checkmark">✓</div>
            </div>
            <h1>Đặt vé thành công!</h1>
            <p className="success-message">
              Cảm ơn bạn đã tin tướng và sử dụng dịch vụ của ShanBus
            </p>
          </div>

          {/* Booking Information */}
          <div className="booking-info-card">
            <div className="card-header">
              <h3>📋 Thông tin đặt vé</h3>
              <div className="booking-code">
                <span>Mã đặt vé:</span>
                <strong>{booking.bookingCode}</strong>
              </div>
            </div>

            <div className="card-content">
              <div className="info-grid">
                {/* Trip Information */}
                <div className="info-section">
                  <h4>🚌 Thông tin chuyến xe</h4>
                  <div className="trip-route">
                    <div className="route-display">
                      <div className="departure">
                        <div className="location">{trip?.departureLocation || ''}</div>
                        <div className="time">
                          {trip ? `${formatTime(trip.departureTime)} - ${formatDate(trip.departureTime)}` : ''}
                        </div>
                      </div>
                      <div className="route-arrow">→</div>
                      <div className="arrival">
                        <div className="location">{trip?.arrivalLocation || ''}</div>
                        <div className="time">
                          {trip ? `${formatTime(trip.arrivalTime)} - ${formatDate(trip.arrivalTime)}` : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="route-name">
                    <strong>Tuyến:</strong> {trip?.route || ''}
                  </div>
                </div>

                {/* Passenger Information */}
                <div className="info-section">
                  <h4>👤 Thông tin hành khách</h4>
                  <div className="passenger-details">
                    <p><strong>Họ tên:</strong> {booking.passengerName}</p>
                    <p><strong>Điện thoại:</strong> {booking.passengerPhone}</p>
                  </div>
                </div>

                {/* Seat Information */}
                <div className="info-section">
                  <h4>💺 Ghế đã đặt</h4>
                  <div className="seat-list">
                    {booking.seatNumbers.map((seat, index) => (
                      <span key={index} className="seat-badge">
                        {seat}
                      </span>
                    ))}
                  </div>
                  <p className="seat-count">
                    Tổng số ghế: <strong>{booking.seatNumbers.length}</strong>
                  </p>
                </div>

                {/* Payment Information */}
                <div className="info-section">
                  <h4>💳 Thông tin thanh toán</h4>
                  <div className="payment-details">
                    <div className="payment-row">
                      <span>Mã thanh toán:</span>
                      <strong>{payment?.paymentCode || ''}</strong>
                    </div>
                    <div className="payment-row">
                      <span>Phương thức:</span>
                      <span>{payment ? getPaymentMethodLabel(payment.paymentMethod) : ''}</span>
                    </div>
                    <div className="payment-row">
                      <span>Trạng thái:</span>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getPaymentStatusColor(payment?.paymentStatus || 'PENDING') }}
                      >
                        {payment?.paymentStatus === 'PENDING' ? 'Chờ thanh toán' : 
                         payment?.paymentStatus === 'PAID' || payment?.paymentStatus === 'SUCCESS' ? 'Đã thanh toán' : (payment?.paymentStatus || '')}
                      </span>
                    </div>
                    <div className="payment-row total">
                      <span>Tổng tiền:</span>
                      <strong className="total-amount">
                        {formatPrice(booking.totalPrice)}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Status Alert */}
          {payment?.paymentStatus === 'PENDING' && payment?.paymentMethod === 'BANK_TRANSFER' && (
            <div className="payment-alert">
              <h4>⚠️ Hoàn tất thanh toán</h4>
              <div className="bank-transfer-info">
                <p>Vui lòng chuyển khoản theo thông tin sau:</p>
                <div className="bank-details">
                  <div className="bank-info">
                    <p><strong>Ngân hàng:</strong> Vietcombank</p>
                    <p><strong>Số tài khoản:</strong> 0123456789</p>
                    <p><strong>Chủ tài khoản:</strong> CONG TY SHANBUS</p>
                    <p><strong>Số tiền:</strong> {formatPrice(booking.totalPrice)}</p>
                    <p><strong>Nội dung:</strong> <code>SHANBUS {booking.bookingCode}</code></p>
                  </div>
                </div>
                <p className="transfer-note">
                  💡 <strong>Lưu ý:</strong> Vé sẽ được kích hoạt sau khi chúng tôi nhận được thanh toán (trong vòng 5-10 phút)
                </p>
              </div>
            </div>
          )}

          {payment?.paymentStatus === 'PENDING' && payment?.paymentMethod === 'CASH' && (
            <div className="payment-alert cash-payment">
              <h4>💵 Thanh toán tại bến xe</h4>
              <div className="cash-instructions">
                <ul>
                  <li>Vui lòng đến bến xe trước giờ khởi hành <strong>30 phút</strong></li>
                  <li>Mang theo <strong>CCCD/CMND</strong> để đối chiếu thông tin</li>
                  <li>Xuất trình mã đặt vé: <strong>{booking.bookingCode}</strong></li>
                  <li>Thanh toán số tiền: <strong>{formatPrice(booking.totalPrice)}</strong></li>
                </ul>
              </div>
            </div>
          )}

          {/* QR Code Section */}
          <div className="qr-section">
            <button 
              className="show-qr-btn"
              onClick={() => setShowQR(!showQR)}
            >
              📱 {showQR ? 'Ẩn mã QR' : 'Hiển thị mã QR'}
            </button>
            
            {showQR && (
              <div className="qr-code-display">
                <div className="qr-placeholder">
                  <div className="qr-code">
                    {/* QR Code would be generated here */}
                    <div className="qr-pattern">
                      <div></div><div></div><div></div>
                      <div></div><div></div><div></div>
                      <div></div><div></div><div></div>
                    </div>
                  </div>
                  <p>Quét mã QR để kiểm tra thông tin vé</p>
                  <p className="qr-code-text">{booking.bookingCode}</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button 
              className="btn btn-outline"
              onClick={handlePrint}
            >
              🖨️ In vé
            </button>
            
            <button 
              className="btn btn-outline"
              onClick={handleDownloadPDF}
            >
              📄 Tải PDF
            </button>
            
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/my-tickets')}
            >
              📋 Xem vé của tôi
            </button>
          </div>

          {/* Auto redirect notice */}
          <div className="redirect-notice">
            <p>
              Tự động chuyển đến trang vé của bạn sau <strong>{countdown}</strong> giây
            </p>
            <button 
              className="cancel-redirect"
              onClick={() => setCountdown(0)}
            >
              Hủy tự động chuyển
            </button>
          </div>

          {/* Important Notes */}
          <div className="important-notes">
            <h4>📝 Lưu ý quan trọng</h4>
            <ul>
              <li>Vui lòng lưu lại mã đặt vé: <strong>{booking.bookingCode}</strong></li>
              <li>Đến bến xe trước giờ khởi hành 30 phút để làm thủ tục lên xe</li>
              <li>Mang theo CCCD/CMND để đối chiếu thông tin</li>
              <li>Liên hệ hotline <strong>1900-6067</strong> nếu cần hỗ trợ</li>
              <li>Có thể hủy vé trước giờ khởi hành 2 tiếng (phí hủy 10%)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}