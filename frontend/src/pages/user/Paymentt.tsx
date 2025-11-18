import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUserStore } from '../../store/user';
import { usePayment } from '../../hooks/usePayment';
import { useVNPay } from '../../hooks/useVNPay';
import { voucherAPI } from '../../services/voucher';
import BookingSummary from '../../components/payment/BookingSummary';
import PaymentForm, { type PaymentMethod } from '../../components/payment/PaymentForm';
import type { BookingData, Seat, Trip } from '../../types/payment';
import type { Voucher, UserVoucher } from '../../types/voucher';
import '../../style/payment.css';
import '../../style/vouchers.css';

interface LocationState {
  trip: Trip;
  selectedSeats: Seat[];
  totalPrice?: number;
}

interface AppliedVoucherState {
  voucher: Voucher;
  source: 'client' | 'server' | 'list';
}

const DEFAULT_PAYMENT_METHOD: PaymentMethod = 'BANK_TRANSFER';

export default function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUserStore();
  const { createBooking, isLoading, error } = usePayment();
  const { payWithVNPay, loading: vnpayLoading } = useVNPay();

  const locationState = (location.state || {}) as LocationState;
  const trip = locationState.trip;
  const selectedSeats = useMemo(() => locationState.selectedSeats ?? [], [locationState.selectedSeats]);

  const [passengerInfo, setPassengerInfo] = useState({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    email: user?.email ?? ''
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(DEFAULT_PAYMENT_METHOD);
  const [notes, setNotes] = useState('');
  const [voucherInput, setVoucherInput] = useState('');
  const [voucherState, setVoucherState] = useState<AppliedVoucherState | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherMessage, setVoucherMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [walletVouchers, setWalletVouchers] = useState<UserVoucher[]>([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [guestNoticeDismissed, setGuestNoticeDismissed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!trip || selectedSeats.length === 0) {
      navigate('/search', { replace: true });
    }
  }, [trip, selectedSeats, navigate]);

  useEffect(() => {
    if (user) {
      setPassengerInfo(prev => ({
        name: prev.name || user.name || '',
        phone: prev.phone || user.phone || '',
        email: prev.email || user.email || ''
      }));
    }
  }, [user]);

  const subtotal = useMemo(() => {
    if (!trip) return 0;
    return selectedSeats.reduce((sum, seat) => {
      const multiplier = seat.priceMultiplier ?? 1;
      return sum + trip.basePrice * multiplier;
    }, 0);
  }, [trip, selectedSeats]);

  const discountAmount = useMemo(() => {
    if (!voucherState) return 0;
    return Math.max(0, Number(voucherState.voucher.discountAmount) || 0);
  }, [voucherState]);

  const payableAmount = useMemo(() => Math.max(0, subtotal - discountAmount), [subtotal, discountAmount]);

  const companyId = useMemo(() => {
    if (!trip) return undefined;
    return trip.company?.id ?? trip.bus?.company?.id ?? undefined;
  }, [trip]);

  const handlePassengerInfoChange = (field: 'name' | 'phone' | 'email', value: string) => {
    setPassengerInfo(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (!user) {
      setWalletVouchers([]);
      return;
    }

    let subscribed = true;
    const fetchWallet = async () => {
      setWalletLoading(true);
      try {
        const response = await voucherAPI.listWallet();
        if (subscribed && response.success) {
          setWalletVouchers(response.data ?? []);
        }
      } catch (error) {
        console.error('wallet vouchers load failed', error);
      } finally {
        if (subscribed) {
          setWalletLoading(false);
        }
      }
    };

    fetchWallet();
    return () => {
      subscribed = false;
    };
  }, [user?.id]);

  const validateVoucher = async (overrideCode?: string): Promise<boolean> => {
    if (!trip) return false;
    const code = (overrideCode ?? voucherInput).trim().toUpperCase();
    if (!code) {
      setVoucherMessage({ type: 'error', text: 'Vui lòng nhập mã ưu đãi.' });
      return false;
    }

    setVoucherLoading(true);
    setVoucherMessage(null);

    try {
      const response = await voucherAPI.validate({
        code,
        companyId,
        totalAmount: subtotal
      });

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Không thể áp dụng voucher.');
      }

      setVoucherState({ voucher: response.data, source: overrideCode ? 'list' : 'server' });
      setVoucherMessage({ type: 'success', text: `Đã áp dụng mã ${response.data.code}.` });
      return true;
    } catch (err) {
      console.error('Voucher validation failed', err);
      const message = err instanceof Error ? err.message : 'Không thể áp dụng voucher.';
      setVoucherMessage({ type: 'error', text: message });
      setVoucherState(null);
      return false;
    } finally {
      setVoucherLoading(false);
    }
  };

  const walletEntries = useMemo(() => {
    const now = new Date();
    return walletVouchers.map((record) => {
      const voucher = record.voucher;
      if (!voucher) {
        return { record, canApply: false, reason: 'Voucher không khả dụng.' };
      }

      const activeStatus = record.status !== 'EXPIRED' && record.status !== 'INACTIVE' && record.status !== 'USED';
      const notUsed = !record.isUsed;
      const inDateRange =
        (!voucher.startDate || new Date(voucher.startDate) <= now) &&
        (!voucher.endDate || new Date(voucher.endDate) >= now);
      const companyMatch = voucher.companyId == null || (companyId != null && voucher.companyId === companyId);
      const orderEligible = voucher.minOrderValue == null || subtotal >= Number(voucher.minOrderValue);

      const canApply = activeStatus && notUsed && inDateRange && companyMatch && orderEligible;

      let reason = '';
      if (!activeStatus || !inDateRange) {
        reason = 'Voucher không còn hiệu lực.';
      } else if (!companyMatch) {
        reason = 'Voucher không áp dụng cho nhà xe này.';
      } else if (!orderEligible) {
        reason = `Cần tối thiểu ${Number(voucher.minOrderValue).toLocaleString('vi-VN')}đ.`;
      } else if (!notUsed) {
        reason = 'Voucher đã sử dụng.';
      }

      return { record, canApply, reason };
    });
  }, [walletVouchers, companyId, subtotal]);

  const handleRemoveVoucher = () => {
    setVoucherState(null);
    setVoucherInput('');
    setVoucherMessage(null);
  };

  const handleSelectWallet = async (entry: (typeof walletEntries)[number]) => {
    if (!entry.canApply || !entry.record.voucher?.code) {
      return;
    }
    setVoucherInput(entry.record.voucher.code);
    await validateVoucher(entry.record.voucher.code);
  };

  const handleSubmitBooking = async () => {
    if (!trip || selectedSeats.length === 0) {
      return;
    }

    setFormError(null);

    const trimmedName = passengerInfo.name.trim();
    const trimmedPhone = passengerInfo.phone.trim();

    if (!trimmedName) {
      setFormError('Vui lòng nhập tên hành khách.');
      return;
    }

    if (!trimmedPhone) {
      setFormError('Vui lòng nhập số điện thoại liên hệ.');
      return;
    }

    const cleanPhone = trimmedPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 9) {
      setFormError('Số điện thoại không hợp lệ.');
      return;
    }

    const bookingPayload: BookingData = {
      tripId: trip.id,
      passengerName: trimmedName,
      passengerPhone: cleanPhone,
      passengerEmail: passengerInfo.email?.trim() || undefined,
      seatNumbers: selectedSeats.map(seat => seat.seatNumber),
      totalPrice: subtotal,
      paymentMethod,
      notes: notes.trim() || undefined,
      voucherCode: voucherState?.voucher.code,
      guestNotes: !user ? { guestCheckout: true } : undefined
    };

    try {
      const bookingResult = await createBooking(bookingPayload);
      const bookedVoucher = bookingResult.voucher || voucherState?.voucher || null;

      if (bookedVoucher) {
        setVoucherState({ voucher: bookedVoucher, source: 'server' });
      }

      if (paymentMethod === 'VNPAY' && user) {
        try {
          await payWithVNPay(bookingResult.booking.id);
          return;
        } catch (vnError) {
          console.error('VNPay redirect failed', vnError);
          setVoucherMessage({ type: 'error', text: 'Không thể chuyển đến VNPay, vui lòng thử lại hoặc chọn phương thức khác.' });
        }
      }

      navigate('/payment/success', {
        state: {
          booking: bookingResult.booking,
          payment: bookingResult.payment,
          trip: bookingResult.trip,
          voucher: bookedVoucher
        }
      });
    } catch (submitError) {
      console.error('Create booking failed', submitError);
    }
  };

  // if (!user) {

  // }

  const showGuestPrompt = !user && !guestNoticeDismissed;
  const isSubmitting = isLoading || vnpayLoading || voucherLoading;

  return (
    <div className="payment-page">
      <div className="container">
        <div className="payment-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            Quay lại
          </button>
          <h1>Thanh toán đặt vé</h1>
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}
        {formError && (
          <div className="error-message">
            <p>{formError}</p>
          </div>
        )}


        {showGuestPrompt && (
          <div className="guest-checkout-notice">
            <div className="guest-checkout-spinner" />
            <div className="guest-checkout-content">
              <h3>Đặt vé nhanh không cần đăng nhập</h3>
              <p>Đăng nhập để lưu lịch sử, quản lý vé và tận dụng các voucher cá nhân.</p>
              <div className="guest-checkout-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => navigate('/login', { state: { redirect: '/payment' } })}
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setGuestNoticeDismissed(true)}
                >
                  Tiếp tục với tư cách khách
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="payment-content">
          <div className="payment-forms">
            <div className="passenger-form-card">
              <h3>Thông tin hành khách</h3>
              <div className="passenger-form">
                <div className="form-group">
                  <label>Họ và tên *</label>
                  <input
                    type="text"
                    value={passengerInfo.name}
                    onChange={(event) => handlePassengerInfoChange('name', event.target.value)}
                    className="form-control"
                    placeholder="Nhập họ và tên"
                  />
                </div>
                <div className="form-group">
                  <label>Số điện thoại *</label>
                  <input
                    type="tel"
                    value={passengerInfo.phone}
                    onChange={(event) => handlePassengerInfoChange('phone', event.target.value)}
                    className="form-control"
                    placeholder="nhập số điện thoại"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={passengerInfo.email}
                    onChange={(event) => handlePassengerInfoChange('email', event.target.value)}
                    className="form-control"
                    placeholder="nhập email (không bắt buộc)"
                  />
                </div>
                <div className="form-group">
                  <label>Ghi chú</label>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="form-control"
                    placeholder="Ghi chú thêm cho nhà xe (không bắt buộc)"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="voucher-card">
              <h3>Voucher Ưu đãi</h3>
              <div className="voucher-form">
                <input
                  type="text"
                  value={voucherInput}
                  onChange={(event) => setVoucherInput(event.target.value.toUpperCase())}
                  className="form-control"
                  placeholder="nhập mã voucher"
                  disabled={voucherLoading}
                />
                <div className="voucher-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => validateVoucher()}
                    disabled={voucherLoading || !voucherInput.trim()}
                  >
                    {voucherLoading ? 'Đang kiểm tra...' : 'Áp dụng'}
                  </button>
                  {voucherState && (
                    <button type="button" className="btn-link" onClick={handleRemoveVoucher}>
                      Bỏ mã
                    </button>
                  )}
                </div>
              </div>
              {voucherMessage && (
                <div className={`voucher-message ${voucherMessage.type}`}>
                  {voucherMessage.text}
                </div>
              )}
              <div className="available-vouchers">
                <h4>Kho voucher của tôi</h4>
                {walletLoading ? (
                  <p className="subtle-text">Đang tải kho voucher...</p>
                ) : walletEntries.length === 0 ? (
                  <p className="subtle-text">
                    Bạn chưa lưu voucher nào. Hãy ghé mục Khuyến mãi để lưu các ưu đãi phù hợp.
                  </p>
                ) : (
                  <div className="available-voucher-list">
                    {walletEntries.map((entry) => {
                      const voucher = entry.record.voucher;
                      return (
                        <div
                          key={entry.record.id}
                          className={`available-voucher-item${entry.canApply ? '' : ' disabled'}`}
                        >
                          <div className="available-voucher-info">
                            <span className="voucher-code">{voucher?.code ?? 'Áp Dụng'}</span>
                            <span>{voucher?.description ?? 'Ưu đãi dành cho chuyến đi của bạn.'}</span>
                            <div className="voucher-meta">
                              <span>
                                💸{' '}
                                {voucher?.discountType === 'PERCENT'
                                  ? `${voucher.discountValue}%`
                                  : Number(voucher?.discountValue || 0).toLocaleString('vi-VN') + 'đ'}
                              </span>
                              {voucher?.minOrderValue != null && (
                                <span>🛼 Tối thiểu {voucher.minOrderValue.toLocaleString('vi-VN')}đ</span>
                              )}
                              {voucher?.maxDiscount != null && voucher.discountType === 'PERCENT' && (
                                <span>🎯 Giảm tối đa {voucher.maxDiscount.toLocaleString('vi-VN')}đ</span>
                              )}
                              {voucher?.company?.name && (
                                <span>🏢 {voucher.company.name}</span>
                              )}
                            </div>
                            {entry.reason && (
                              <small className="subtle-text">{entry.reason}</small>
                            )}
                          </div>
                          <div className="available-voucher-actions">
                            <button
                              type="button"
                              className="btn-outline"
                              onClick={() => handleSelectWallet(entry)}
                              disabled={voucherLoading || !entry.canApply}
                            >
                              Áp dụng
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

              <PaymentForm
                subtotal={subtotal}
              discountAmount={discountAmount}
              payableAmount={payableAmount}
              selectedMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              onSubmit={handleSubmitBooking}
              isLoading={isSubmitting}
            />
          </div>


          <div className="payment-summary">
            {trip && (
              <BookingSummary
                trip={trip}
                selectedSeats={selectedSeats}
                passengerInfo={passengerInfo}
                subtotal={subtotal}
                discountAmount={discountAmount}
                payableAmount={payableAmount}
                voucher={voucherState?.voucher ?? null}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
