import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useVNPay } from "../../hooks/useVNPay";
import { toViStatus, statusVariant } from "../../utils/status";
import "../../style/vnpay-return.css";

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

const DEV_LOG_ENABLED = import.meta.env.DEV;

export default function VNPayReturn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { queryTransaction, formatVNPayAmount } = useVNPay();

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
        if (DEV_LOG_ENABLED) {
          console.debug("[vnpay] processing return params");
        }

        const vnpayParams: VNPayReturnParams = {};
        searchParams.forEach((value, key) => {
          if (key.startsWith("vnp_")) {
            vnpayParams[key as keyof VNPayReturnParams] = value;
          }
        });

        if (DEV_LOG_ENABLED) {
          console.debug("[vnpay] params", vnpayParams);
        }

        if (!vnpayParams.vnp_TxnRef) {
          throw new Error("Thieu thong tin giao dich");
        }

        const transaction = await queryTransaction(vnpayParams.vnp_TxnRef);

        if (DEV_LOG_ENABLED) {
          console.debug("[vnpay] transaction data", transaction);
        }

        setTransactionData({
          ...transaction,
          vnpayParams,
        });

        setTimeout(() => {
          if (transaction.status === "SUCCESS") {
            navigate("/payment/success", {
              state: {
                booking: {
                  id: transaction.id,
                  bookingCode: transaction.orderId,
                  paymentStatus: "PAID",
                },
                payment: {
                  id: transaction.id,
                  paymentCode: transaction.orderId,
                  paymentMethod: "VNPAY",
                  paymentStatus: "SUCCESS",
                  amount: transaction.amount,
                  paidAt: transaction.paidAt,
                },
                isVNPay: true,
              },
            });
          } else {
            navigate("/search", { replace: true });
          }
        }, 3000);
      } catch (err) {
        console.error("[vnpay] process return error", err);
        setError(err instanceof Error ? err.message : "Loi xu ly ket qua thanh toan");

        setTimeout(() => {
          navigate("/search", { replace: true });
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
            <h2>Dang xu ly ket qua thanh toan...</h2>
            <p>Vui long doi trong giay lat</p>
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
            <div className="return-icon"></div>
            <h2>Loi xu ly thanh toan</h2>
            <p>{error}</p>
            <div className="return-actions">
              <button className="btn btn-primary" onClick={() => navigate("/search")}>
                Quay ve trang chu
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isSuccess = transactionData?.status === "SUCCESS";
  const vnpayParams = transactionData?.vnpayParams ?? {};

  return (
    <div className="vnpay-return-page">
      <div className="container">
        <div className={`return-card ${isSuccess ? "success" : "failed"}`}>
          <div className="return-icon"></div>

          <h2>{isSuccess ? "Thanh toan thanh cong!" : "Thanh toan that bai"}</h2>

          <p>
            {isSuccess
              ? "Giao dich cua ban da duoc xu ly thanh cong"
              : transactionData?.responseMessage || "Giao dich khong thanh cong"}
          </p>

          <div className="transaction-details">
            <div className="detail-row">
              <span className="label">Ma giao dich:</span>
              <span className="value">{transactionData?.orderId}</span>
            </div>

            <div className="detail-row">
              <span className="label">So tien:</span>
              <span className="value">{formatVNPayAmount(transactionData?.amount || 0)}</span>
            </div>

            <div className="detail-row">
              <span className="label">Trang thai:</span>
              <span className={`badge bg-${statusVariant(transactionData?.status)}`}>
                {toViStatus(transactionData?.status)}
              </span>
            </div>

            {vnpayParams.vnp_BankCode && (
              <div className="detail-row">
                <span className="label">Ngan hang:</span>
                <span className="value">{vnpayParams.vnp_BankCode}</span>
              </div>
            )}

            {vnpayParams.vnp_TransactionNo && (
              <div className="detail-row">
                <span className="label">Ma giao dich VNPay:</span>
                <span className="value">{vnpayParams.vnp_TransactionNo}</span>
              </div>
            )}

            {transactionData?.paidAt && (
              <div className="detail-row">
                <span className="label">Thoi gian:</span>
                <span className="value">
                  {new Date(transactionData.paidAt).toLocaleString("vi-VN")}
                </span>
              </div>
            )}
          </div>

          <div className="return-actions">
            <button
              className="btn btn-primary"
              onClick={() => navigate(isSuccess ? "/my-tickets" : "/search")}
            >
              {isSuccess ? "Xem ve cua toi" : "Thu lai"}
            </button>

            <button className="btn btn-outline" onClick={() => navigate("/search")}>
              Ve trang chu
            </button>
          </div>

          <div className="auto-redirect">
            <p>
              <small>
                {isSuccess
                  ? "Ban se duoc chuyen den trang Ve cua toi sau 3 giay..."
                  : "Ban se duoc chuyen ve trang chu sau 3 giay..."}
              </small>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
