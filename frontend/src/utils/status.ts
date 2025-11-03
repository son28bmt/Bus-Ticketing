export type StatusKey =
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PENDING'
  | 'PAID'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUNDED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | string;

const VI_LABELS: Record<string, string> = {
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  SUCCESS: 'Đã thanh toán',
  FAILED: 'Thất bại',
  REFUNDED: 'Đã hoàn tiền',
  SCHEDULED: 'Đã lên lịch',
  IN_PROGRESS: 'Đang chạy',
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Không hoạt động',
  SUSPENDED: 'Tạm khóa',
};

export function toViStatus(status: StatusKey | undefined | null): string {
  if (!status) return '';
  const key = String(status).toUpperCase();
  return VI_LABELS[key] || key; // fallback to original if missing
}

export function statusVariant(status: StatusKey | undefined | null):
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'secondary' {
  const key = String(status || '').toUpperCase();
  switch (key) {
    case 'CONFIRMED':
    case 'PAID':
    case 'SUCCESS':
    case 'ACTIVE':
      return 'success';
    case 'CANCELLED':
    case 'FAILED':
    case 'SUSPENDED':
      return 'danger';
    case 'PENDING':
      return 'warning';
    case 'COMPLETED':
      return 'info';
    case 'IN_PROGRESS':
      return 'info';
    case 'REFUNDED':
    case 'INACTIVE':
      return 'secondary';
    default:
      return 'secondary';
  }
}
