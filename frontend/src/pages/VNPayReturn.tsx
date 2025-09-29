import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useVNPay } from '../hooks/useVNPay';
import '../style/vnpay-return.css';

interface VNPayReturnParams {
  vnp_Amount?: string;
  vnp_BankCode?: string;
  vnp_BankTranNo?: string;
  vnp_CardType?: string;
  vnp_OrderInfo?: string;
  vnp_PayDate?: string;
  vnp_ResponseCode?: string;
  vnp_TmnCode?: string;
  vnp_TransactionNo?: string;
  vnp_TransactionStatus?: string;
  vnp_TxnRef?: string;
  vnp_SecureHash?: string;
}

export default function VNPayReturn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { queryTransaction, formatVNPayAmount, getStatusText, getStatusColor } = useVNPay();
  
  const [processing, setProcessing] = useState(true);
  const [transactionData, setTransactionData] = useState<{
    id: number;
    orderId: string;
    amount: number;
    status: string;
    responseMessage?: string;
    paidAt?: string;
    vnpayParams?: VNPayReturnParams;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processVNPayReturn = async () => {
      try {
        console.log('🔄 Processing VNPay return...');

        // Get all VNPay parameters from URL
        const vnpayParams: VNPayReturnParams = {};
        searchParams.forEach((value, key) => {
          if (key.startsWith('vnp_')) {
            vnpayParams[key as keyof VNPayReturnParams] = value;
          }
        });

        console.log('📝 VNPay params:', vnpayParams);

        if (!vnpayParams.vnp_TxnRef) {
          throw new Error('Thiếu thông tin giao dịch');
        }

        // Query transaction status from backend
        const transaction = await queryTransaction(vnpayParams.vnp_TxnRef);
        console.log('✅ Transaction data:', transaction);

        setTransactionData({
          ...transaction,
          vnpayParams
        });

        // Auto redirect to payment success/failure after 3 seconds
        setTimeout(() => {
          if (transaction.status === 'SUCCESS') {
            navigate('/payment/success', {
              state: {
                booking: {
                  id: transaction.id,
                  bookingCode: transaction.orderId,
                  paymentStatus: 'PAID'
                },
                payment: {
                  id: transaction.id,
                  paymentCode: transaction.orderId,
                  paymentMethod: 'VNPAY',
                  paymentStatus: 'SUCCESS',
                  amount: transaction.amount,
                  paidAt: transaction.paidAt
                },
                isVNPay: true
              }
            });
          } else {
            navigate('/search', { replace: true });
          }
        }, 3000);

      } catch (err) {
        console.error('❌ Process VNPay return error:', err);
        setError(err instanceof Error ? err.message : 'Lỗi xử lý kết quả thanh toán');
        
        // Redirect to search page after error
        setTimeout(() => {
          navigate('/search', { replace: true });
        }, 5000);
      } finally {
        setProcessing(false);
      }
    };

    processVNPayReturn();
  }, [searchParams, navigate, queryTransaction]);

  if (processing) {
    return (
      <div className="vnpay-return-page">
        <div className="container">
          <div className="return-card processing">
            <div className="return-icon">
              <div className="loading-spinner large"></div>
            </div>
            <h2>Đang xử lý kết quả thanh toán...</h2>
            <p>Vui lòng đợi trong giây lát</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vnpay-return-page">
        <div className="container">
          <div className="return-card error">
            <div className="return-icon">
              <span style={{ fontSize: '64px', color: '#ef4444' }}>❌</span>
            </div>
            <h2>Lỗi xử lý thanh toán</h2>
            <p>{error}</p>
            <div className="return-actions">
              <button
                className="btn btn-primary"
                onClick={() => navigate('/search')}
              >
                Quay về trang chủ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isSuccess = transactionData?.status === 'SUCCESS';
  const vnpayParams = transactionData?.vnpayParams || {};

  return (
    <div className="vnpay-return-page">
      <div className="container">
        <div className={`return-card ${isSuccess ? 'success' : 'failed'}`}>
          <div className="return-icon">
            <span style={{ 
              fontSize: '64px', 
              color: getStatusColor(transactionData?.status || 'FAILED') 
            }}>
              {isSuccess ? '✅' : '❌'}
            </span>
          </div>
          
          <h2>
            {isSuccess ? 'Thanh toán thành công!' : 'Thanh toán thất bại'}
          </h2>
          
          <p>
            {isSuccess 
              ? 'Giao dịch của bạn đã được xử lý thành công'
              : transactionData?.responseMessage || 'Giao dịch không thành công'
            }
          </p>

          {/* Transaction Details */}
          <div className="transaction-details">
            <div className="detail-row">
              <span className="label">Mã giao dịch:</span>
              <span className="value">{transactionData?.orderId}</span>
            </div>
            
            <div className="detail-row">
              <span className="label">Số tiền:</span>
              <span className="value">{formatVNPayAmount(transactionData?.amount || 0)}</span>
            </div>
            
            <div className="detail-row">
              <span className="label">Trạng thái:</span>
              <span 
                className="status-badge"
                style={{ backgroundColor: getStatusColor(transactionData?.status || 'FAILED') }}
              >
                {getStatusText(transactionData?.status || 'FAILED')}
              </span>
            </div>

            {vnpayParams.vnp_BankCode && (
              <div className="detail-row">
                <span className="label">Ngân hàng:</span>
                <span className="value">{vnpayParams.vnp_BankCode}</span>
              </div>
            )}

            {vnpayParams.vnp_TransactionNo && (
              <div className="detail-row">
                <span className="label">Mã GD VNPay:</span>
                <span className="value">{vnpayParams.vnp_TransactionNo}</span>
              </div>
            )}

            {transactionData?.paidAt && (
              <div className="detail-row">
                <span className="label">Thời gian:</span>
                <span className="value">
                  {new Date(transactionData.paidAt).toLocaleString('vi-VN')}
                </span>
              </div>
            )}
          </div>

          <div className="return-actions">
            <button
              className="btn btn-primary"
              onClick={() => navigate(isSuccess ? '/my-tickets' : '/search')}
            >
              {isSuccess ? 'Xem vé của tôi' : 'Thử lại'}
            </button>
            
            <button
              className="btn btn-outline"
              onClick={() => navigate('/search')}
            >
              Về trang chủ
            </button>
          </div>

          <div className="auto-redirect">
            <p>
              <small>
                {isSuccess 
                  ? 'Bạn sẽ được chuyển đến trang vé của tôi sau 3 giây...'
                  : 'Bạn sẽ được chuyển về trang chủ sau 3 giây...'
                }
              </small>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}