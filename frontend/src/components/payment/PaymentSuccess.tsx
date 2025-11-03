import type { InvoiceData } from '../../hooks/useVNPay';

type PaymentSuccessProps = {
  invoice?: InvoiceData | null;
};

const PaymentSuccess = ({ invoice }: PaymentSuccessProps) => {
  if (!invoice) return <p>Thanh toán thành công.</p>;

  return (
    <div className="payment-success-summary">
  <h2>Thanh toán thành công</h2>
  <p>Mã đơn hàng: {invoice.vnpay?.orderId ?? invoice.receiptNo}</p>
  <p>Số tiền: {invoice.amount?.toLocaleString('vi-VN')} ₫</p>
  <p>Trạng thái: {invoice.status}</p>
    </div>
  );
};

export default PaymentSuccess;
