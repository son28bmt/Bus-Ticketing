import React from 'react';
import { formatPrice } from '../../utils/price';

type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'E_WALLET' | 'VNPAY';

interface PaymentFormProps {
  totalAmount: number;
  selectedMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

interface PaymentMethodOption {
  value: PaymentMethod;
  label: string;
  icon: string;
  description: string;
}

export default function PaymentForm({
  totalAmount,
  selectedMethod,
  onPaymentMethodChange,
  onSubmit,
  isLoading
}: PaymentFormProps) {
  
  const paymentMethods: PaymentMethodOption[] = [
    {
      value: 'VNPAY',
      label: 'VNPay',
      icon: '🔵',
      description: 'Thanh toán qua cổng VNPay (ATM/Internet Banking/QR Code)'
    },
    {
      value: 'BANK_TRANSFER',
      label: 'Chuyển khoản ngân hàng',
      icon: '🏦',
      description: 'Thanh toán qua chuyển khoản ngân hàng'
    },
    {
      value: 'CREDIT_CARD',
      label: 'Thẻ tín dụng/Ghi nợ',
      icon: '💳',
      description: 'Thanh toán bằng thẻ Visa, Mastercard'
    },
    {
      value: 'E_WALLET',
      label: 'Ví điện tử',
      icon: '📱',
      description: 'MoMo, ZaloPay, VNPay'
    },
    {
      value: 'CASH',
      label: 'Tiền mặt',
      icon: '💵',
      description: 'Thanh toán tiền mặt tại quầy'
    }
  ];

  const handleMethodSelect = (method: PaymentMethod) => {
    onPaymentMethodChange(method);
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit();
  };

  const renderPaymentDetails = () => {
    switch (selectedMethod) {
      case 'VNPAY':
        return (
          <div className="payment-details">
            <h4>🔵 Thanh toán VNPay</h4>
            <div className="vnpay-info">
              <div className="vnpay-features">
                <div className="feature-item">
                  <span className="feature-icon">🏧</span>
                  <span>Thẻ ATM nội địa</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">💳</span>
                  <span>Internet Banking</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">📱</span>
                  <span>Ví điện tử</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">📊</span>
                  <span>QR Code</span>
                </div>
              </div>
              <div className="vnpay-note">
                <p>🔒 Bạn sẽ được chuyển đến cổng thanh toán VNPay an toàn</p>
                <p>⚡ Thanh toán nhanh chóng, xác nhận ngay lập tức</p>
                <div className="vnpay-brands">
                  <small>Hỗ trợ: Vietcombank, BIDV, VietinBank, Agribank, ACB, Techcombank, MB Bank và 40+ ngân hàng khác</small>
                </div>
              </div>
            </div>
          </div>
        );

      case 'BANK_TRANSFER':
        return (
          <div className="payment-details">
            <h4>🏦 Thông tin chuyển khoản</h4>
            <div className="bank-info">
              <div className="bank-account">
                <div className="account-row">
                  <span className="label">Ngân hàng:</span>
                  <span className="value">Vietcombank - Chi nhánh Hà Nội</span>
                </div>
                <div className="account-row">
                  <span className="label">Số tài khoản:</span>
                  <span className="value">1234567890</span>
                </div>
                <div className="account-row">
                  <span className="label">Chủ tài khoản:</span>
                  <span className="value">CONG TY SHAN BUS</span>
                </div>
                <div className="account-row">
                  <span className="label">Số tiền:</span>
                  <span className="value highlight">{formatPrice(totalAmount)}</span>
                </div>
              </div>
              <div className="transfer-note">
                <p><strong>Nội dung chuyển khoản:</strong></p>
                <p className="note-text">DAT VE [Số điện thoại của bạn]</p>
                <small>* Vui lòng chuyển khoản đúng số tiền và nội dung để được xử lý nhanh nhất</small>
              </div>
            </div>
          </div>
        );

      case 'CREDIT_CARD':
        return (
          <div className="payment-details">
            <h4>💳 Thanh toán bằng thẻ</h4>
            <div className="card-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Số thẻ</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Tên chủ thẻ</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="NGUYEN VAN A"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group half">
                  <label>Ngày hết hạn</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="MM/YY"
                    maxLength={5}
                  />
                </div>
                <div className="form-group half">
                  <label>CVV</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="123"
                    maxLength={3}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'E_WALLET':
        return (
          <div className="payment-details">
            <h4>📱 Ví điện tử</h4>
            <div className="wallet-options">
              {[
                { name: 'MoMo', icon: '🟣', code: 'MOMO' },
                { name: 'ZaloPay', icon: '🔵', code: 'ZALOPAY' },
                { name: 'VNPay', icon: '🟢', code: 'VNPAY' },
                { name: 'ShopeePay', icon: '🟠', code: 'SHOPEEPAY' }
              ].map((wallet) => (
                <div key={wallet.code} className="wallet-option">
                  <span className="wallet-icon">{wallet.icon}</span>
                  <span className="wallet-name">{wallet.name}</span>
                </div>
              ))}
            </div>
            <div className="wallet-note">
              <p>Bạn sẽ được chuyển đến ứng dụng ví để hoàn tất thanh toán</p>
            </div>
          </div>
        );

      case 'CASH':
        return (
          <div className="payment-details">
            <h4>💵 Thanh toán tiền mặt</h4>
            <div className="cash-info">
              <div className="info-card">
                <h5>📍 Địa chỉ thanh toán</h5>
                <p>123 Đường ABC, Quận XYZ, Hà Nội</p>
                <p>📞 Hotline: 0123.456.789</p>
              </div>
              <div className="info-card">
                <h5>🕐 Giờ làm việc</h5>
                <p>Thứ 2 - Thứ 7: 7:00 - 20:00</p>
                <p>Chủ nhật: 8:00 - 18:00</p>
              </div>
              <div className="cash-note">
                <p><strong>Lưu ý:</strong> Vui lòng thanh toán trong vòng 24h để giữ chỗ</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="payment-form-card">
      <h3>💳 Phương thức thanh toán</h3>
      
      <form onSubmit={handleFormSubmit} className="payment-form" noValidate>
        {/* Payment Method Selection */}
        <div className="payment-methods">
          {paymentMethods.map((method) => (
            <div
              key={method.value}
              className={`payment-method ${selectedMethod === method.value ? 'selected' : ''}`}
              onClick={() => handleMethodSelect(method.value)}
            >
              <div className="method-header">
                <div className="method-info">
                  <span className="method-icon">{method.icon}</span>
                  <div className="method-text">
                    <div className="method-label">{method.label}</div>
                    <div className="method-description">{method.description}</div>
                  </div>
                </div>
                <div className="method-radio">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.value}
                    checked={selectedMethod === method.value}
                    onChange={() => handleMethodSelect(method.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Payment Details */}
        {renderPaymentDetails()}

        {/* Total Amount */}
        <div className="payment-summary">
          <div className="summary-row">
            <span className="label">Tổng thanh toán:</span>
            <span className="amount">{formatPrice(totalAmount)}</span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="payment-actions">
          <button
            type="submit"
            className="btn btn-primary btn-large"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="loading-spinner small"></div>
                Đang xử lý...
              </>
            ) : (
              <>
                🎫 Xác nhận đặt vé - {formatPrice(totalAmount)}
              </>
            )}
          </button>
        </div>

        {/* Security Notice */}
        <div className="security-notice">
          <p>🔒 Thông tin của bạn được bảo mật và mã hóa</p>
        </div>
      </form>
    </div>
  );
}