import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from '../store/user';
import { usePayment } from '../hooks/usePayment';
import { useVNPay } from '../hooks/useVNPay';
import BookingSummary from '../components/payment/BookingSummary';
import PaymentForm from '../components/payment/PaymentForm';
import type { Trip, Seat, BookingData } from '../types/payment';
import '../style/payment.css';

interface LocationState {
  trip: Trip;
  selectedSeats: Seat[];
  totalPrice: number;
}

export default function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUserStore();
  const { createBooking, processPayment, isLoading, error } = usePayment();
  const { payWithVNPay, loading: vnpayLoading } = useVNPay();
  
  const locationState = location.state as LocationState;
  const { trip, selectedSeats, totalPrice } = locationState || {};

  const [passengerInfo, setPassengerInfo] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || ''
  });

  // Debug user data
  console.log('🔍 User data:', user);
  console.log('🔍 Initial passenger info:', passengerInfo);

  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'E_WALLET' | 'VNPAY'>('BANK_TRANSFER');
  const [notes, setNotes] = useState('');
  const [pendingPayment, setPendingPayment] = useState<{
    booking: { id: number; bookingCode: string };
    payment: { id: number; paymentCode: string; qrImageUrl?: string };
  } | null>(null);

  // Redirect if no trip data
  useEffect(() => {
    if (!trip || !selectedSeats || selectedSeats.length === 0) {
      navigate('/search');
      return;
    }
  }, [trip, selectedSeats, navigate]);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  const handlePassengerInfoChange = (field: string, value: string) => {
    console.log(`📝 Changing ${field}:`, value);
    setPassengerInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitBooking = async () => {
    console.log('🚀 Starting handleSubmitBooking...');
    
    if (!trip || !selectedSeats || !user) {
      console.log('❌ Missing required data:', { trip: !!trip, selectedSeats: !!selectedSeats, user: !!user });
      return;
    }

    console.log('🔍 Validating form data:', {
      name: `"${passengerInfo.name}"`,
      nameLength: passengerInfo.name.trim().length,
      phone: `"${passengerInfo.phone}"`,
      phoneLength: passengerInfo.phone.trim().length,
      email: `"${passengerInfo.email}"`
    });

    // Validation with better error messages and debugging
    const trimmedName = passengerInfo.name.trim();
    const trimmedPhone = passengerInfo.phone.trim();

    if (!trimmedName) {
      console.log('❌ Name validation failed');
      alert('Vui lòng nhập tên hành khách');
      return;
    }

    if (!trimmedPhone) {
      console.log('❌ Phone validation failed - empty');
      alert('Vui lòng nhập số điện thoại');
      return;
    }

    // More flexible phone validation (allow 0 prefix and various formats)
    // Remove spaces, dashes, and other common phone number separators
    const cleanPhone = trimmedPhone.replace(/[\s\-()./]/g, '');
    const phonePattern = /^0?[1-9][0-9]{8,9}$/; // Allow optional 0 prefix, then 9-10 digits
    
    if (!phonePattern.test(cleanPhone)) {
      console.log('❌ Phone validation failed - format:', trimmedPhone, 'cleaned:', cleanPhone);
      alert(`Số điện thoại không hợp lệ. Vui lòng nhập 10-11 số (VD: 0123456789)\nBạn đã nhập: "${trimmedPhone}"`);
      return;
    }

    console.log('✅ Validation passed');

    try {
      const bookingData: BookingData = {
        tripId: trip.id,
        passengerName: trimmedName,
        passengerPhone: cleanPhone, // Use cleaned phone number
        passengerEmail: passengerInfo.email.trim() || undefined,
        seatNumbers: selectedSeats.map(seat => seat.seatNumber),
        totalPrice,
        paymentMethod,
        notes: notes.trim() || undefined
      };

      console.log('🔄 Submitting booking:', bookingData);

      // Handle VNPay payment flow
      if (paymentMethod === 'VNPAY') {
        const bookingResult = await createBooking(bookingData);
        console.log('✅ Booking created for VNPay:', bookingResult);
        
        // Use VNPay hook to redirect to payment URL
        await payWithVNPay(bookingResult.booking.id);
        return; // Redirect happens in payWithVNPay
      }

      // Handle other payment methods
      const bookingResult = await createBooking(bookingData);
      console.log('✅ Booking created successfully:', bookingResult);

      // Show VietQR for BANK_TRANSFER flow; otherwise proceed to success
      if (paymentMethod === 'BANK_TRANSFER' && bookingResult.payment) {
        setPendingPayment({
          booking: { id: bookingResult.booking.id, bookingCode: bookingResult.booking.bookingCode },
          payment: { id: bookingResult.payment.id, paymentCode: bookingResult.payment.paymentCode, qrImageUrl: (bookingResult as unknown as { payment?: { qrImageUrl?: string } }).payment?.qrImageUrl }
        });
        return;
      }

      // For other payment methods, go to success immediately
      navigate('/payment/success', { state: { booking: bookingResult.booking, payment: bookingResult.payment, trip: bookingResult.trip } });

    } catch (error) {
      console.error('❌ Booking failed:', error);
      // Error is handled by usePayment hook
    }
  };

  if (!trip || !selectedSeats) {
    return (
      <div className="payment-page">
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
    <div className="payment-page">
      <div className="container">
        <div className="payment-header">
          <button
            className="back-btn"
            onClick={() => navigate(-1)}
          >
            ← Quay lại
          </button>
          <h1>Thanh toán đặt vé</h1>
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        {/* Debug info - remove in production */}
        {import.meta.env.DEV && (
          <div style={{ background: '#f0f0f0', padding: '10px', marginBottom: '20px', fontSize: '12px' }}>
            <strong>Debug Info:</strong>
            <pre>{JSON.stringify({
              name: passengerInfo.name,
              phone: passengerInfo.phone,
              email: passengerInfo.email,
              paymentMethod,
              selectedSeats: selectedSeats?.length || 0,
              trip: trip?.id || 'null'
            }, null, 2)}</pre>
          </div>
        )}

        <div className="payment-content">
          {/* Left Column - Forms */}
          <div className="payment-forms">
            {/* Passenger Information */}
            <div className="passenger-form-card">
              <h3>👤 Thông tin hành khách</h3>
              <div className="passenger-form">
                <div className="form-group">
                  <label>Họ và tên *</label>
                  <input
                    type="text"
                    value={passengerInfo.name}
                    onChange={(e) => handlePassengerInfoChange('name', e.target.value)}
                    className="form-control"
                    placeholder="Nhập họ và tên"
                  />
                </div>

                <div className="form-group">
                  <label>Số điện thoại *</label>
                  <input
                    type="tel"
                    value={passengerInfo.phone}
                    onChange={(e) => handlePassengerInfoChange('phone', e.target.value)}
                    className="form-control"
                    placeholder="Nhập số điện thoại"
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={passengerInfo.email}
                    onChange={(e) => handlePassengerInfoChange('email', e.target.value)}
                    className="form-control"
                    placeholder="Nhập email (không bắt buộc)"
                  />
                </div>

                <div className="form-group">
                  <label>Ghi chú</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="form-control"
                    placeholder="Ghi chú thêm (không bắt buộc)"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Payment Form or VietQR Confirmation */}
            {!pendingPayment ? (
              <PaymentForm
                totalAmount={totalPrice}
                selectedMethod={paymentMethod}
                onPaymentMethodChange={setPaymentMethod}
                onSubmit={handleSubmitBooking}
                isLoading={isLoading || vnpayLoading}
              />
            ) : (
              <div className="payment-confirm-card">
                <h3>💳 Quét mã VietQR để thanh toán</h3>
                {pendingPayment.payment.qrImageUrl ? (
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
                    <img src={pendingPayment.payment.qrImageUrl} alt="VietQR" style={{ width: 240, height: 240 }} />
                  </div>
                ) : (
                  <p>Vui lòng chuyển khoản theo thông tin hiển thị trong ứng dụng ngân hàng của bạn.</p>
                )}
                <button
                  className="search-btn"
                  disabled={isLoading}
                  onClick={async () => {
                    try {
                      // Mark payment as processed
                      await processPayment(pendingPayment.payment.id, { transactionId: `CONFIRM-${Date.now()}` });
                      navigate('/payment/success', {
                        state: {
                          booking: {
                            id: pendingPayment.booking.id,
                            bookingCode: pendingPayment.booking.bookingCode,
                            passengerName: passengerInfo.name,
                            passengerPhone: passengerInfo.phone,
                            seatNumbers: selectedSeats.map(s => s.seatNumber),
                            totalPrice,
                            paymentStatus: 'PAID',
                            bookingStatus: 'CONFIRMED',
                            createdAt: new Date().toISOString()
                          },
                          payment: { id: pendingPayment.payment.id, paymentCode: pendingPayment.payment.paymentCode, paymentStatus: 'SUCCESS', paidAt: new Date().toISOString() },
                          trip
                        }
                      });
                    } catch (e) {
                      console.error('❌ Confirm payment failed:', e);
                      alert('Xác nhận thanh toán thất bại. Vui lòng thử lại.');
                    }
                  }}
                >
                  Tôi đã thanh toán
                </button>
              </div>
            )}
          </div>

          {/* Right Column - Summary */}
          <div className="payment-summary">
            <BookingSummary
              trip={trip}
              selectedSeats={selectedSeats}
              passengerInfo={passengerInfo}
            />
          </div>
        </div>
      </div>
    </div>
  );
}