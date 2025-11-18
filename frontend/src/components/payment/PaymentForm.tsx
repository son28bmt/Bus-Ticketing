import React from 'react';
import { formatPrice } from '../../utils/price';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'E_WALLET' | 'VNPAY';

interface PaymentFormProps {
  subtotal: number;
  discountAmount: number;
  payableAmount: number;
  selectedMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onSubmit: () => void;
  isLoading: boolean;
  disabledMethods?: PaymentMethod[];
}

interface PaymentMethodOption {
  value: PaymentMethod;
  label: string;
  description: string;
}

const METHOD_OPTIONS: PaymentMethodOption[] = [
  {
    
    value: 'VNPAY',
    label: 'VNPay',
    description: 'Pay online via VNPay (ATM cards, international cards, QR code)'
  },
  {
    value: 'BANK_TRANSFER',
    label: 'Bank transfer',
    description: 'Transfer to the operator account with booking reference'
  },
  {
    value: 'CREDIT_CARD',
    label: 'Credit / debit card',
    description: 'Visa, Mastercard, JCB and supported cards'
  },
  {
    value: 'E_WALLET',
    label: 'E-wallet',
    description: 'MoMo, ZaloPay and supported wallets'
  },
  {
    value: 'CASH',
    label: 'Cash',
    description: 'Pay at the counter or when boarding'
  }
];

const PaymentForm: React.FC<PaymentFormProps> = ({
  subtotal,
  discountAmount,
  payableAmount,
  selectedMethod,
  onPaymentMethodChange,
  onSubmit,
  isLoading,
  disabledMethods = []
}) => {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;
    onSubmit();
  };

  const isMethodDisabled = (method: PaymentMethod) => disabledMethods.includes(method);

  return (
    <div className="payment-form-card">
      <h3>Payment method</h3>
      <form onSubmit={handleSubmit} className="payment-form" noValidate>
        <div className="payment-methods">
          {METHOD_OPTIONS.map((option) => {
            const disabled = isMethodDisabled(option.value);
            const isSelected = selectedMethod === option.value;
            return (
              <button
                type="button"
                key={option.value}
                className={`payment-method ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                onClick={() => !disabled && onPaymentMethodChange(option.value)}
                aria-disabled={disabled}
              >
                <div className="method-header">
                  <div className="method-text">
                    <div className="method-label">{option.label}</div>
                    <div className="method-description">{option.description}</div>
                  </div>
                  <div className="method-radio">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={option.value}
                      checked={isSelected}
                      readOnly
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="payment-summary">
          <div className="summary-row">
            <span>Tạm tính: </span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="summary-row">
            <span>Giảm giá: </span>
            <span className={discountAmount > 0 ? 'discount-amount' : ''}>
              {discountAmount > 0 ? `- ${formatPrice(discountAmount)}` : formatPrice(0)}
            </span>
          </div>
          <div className="summary-row total">
            <span>Tổng tiền: </span>
            <span>{formatPrice(payableAmount)}</span>
          </div>
        </div>

        <div className="payment-actions">
          <button type="submit" className="btn btn-primary btn-large" disabled={isLoading}>
            {isLoading ? 'Processing...' : `Chuyển qua Trang Thanh Toán ${formatPrice(payableAmount)}`}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentForm;
