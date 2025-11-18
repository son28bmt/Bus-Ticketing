export type StatusKey =
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'CANCEL_REQUESTED'
  | 'PENDING'
  | 'PAID'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUNDED'
  | 'REFUND_PENDING'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'EXPIRING'
  | 'EXPIRED'
  | 'UPCOMING'
  | 'USED'
  | 'UNKNOWN'
  | string;

const VI_LABELS: Record<string, string> = {
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  CANCEL_REQUESTED: 'Chờ xác nhận hủy',
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  SUCCESS: 'Thành công',
  FAILED: 'Thất bại',
  REFUNDED: 'Đã hoàn tiền',
  REFUND_PENDING: 'Chờ hoàn tiền',
  SCHEDULED: 'Đã lên lịch',
  IN_PROGRESS: 'Đang chạy',
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Không hoạt động',
  SUSPENDED: 'Tạm khóa',
  EXPIRING: 'Sắp hết hạn',
  EXPIRED: 'Hết hạn',
  UPCOMING: 'Sắp diễn ra',
  USED: 'Đã sử dụng',
  UNKNOWN: 'Không xác định',
};

export function toViStatus(status: StatusKey | undefined | null): string {
  if (!status) return '';
  const key = String(status).toUpperCase();
  return VI_LABELS[key] || key;
}

export function statusVariant(
  status: StatusKey | undefined | null
): 'success' | 'danger' | 'warning' | 'info' | 'secondary' {
  const key = String(status || '').toUpperCase();
  switch (key) {
    case 'CONFIRMED':
    case 'PAID':
    case 'SUCCESS':
    case 'ACTIVE':
      return 'success';
    case 'EXPIRING':
    case 'PENDING':
    case 'CANCEL_REQUESTED':
    case 'REFUND_PENDING':
      return 'warning';
    case 'UPCOMING':
      return 'info';
    case 'CANCELLED':
    case 'FAILED':
    case 'SUSPENDED':
    case 'EXPIRED':
      return 'danger';
    case 'COMPLETED':
    case 'IN_PROGRESS':
      return 'info';
    case 'REFUNDED':
    case 'INACTIVE':
    case 'USED':
    case 'UNKNOWN':
    default:
      return 'secondary';
  }
}
