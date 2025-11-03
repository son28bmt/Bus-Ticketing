export type VoucherDiscountType = 'PERCENT' | 'AMOUNT';

export type VoucherStatus = 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'USED' | 'INACTIVE' | 'UNKNOWN';

export interface VoucherCompany {
  id: number;
  name: string;
}

export interface Voucher {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  discountType: VoucherDiscountType;
  discountValue: number;
  discountAmount: number;
  minOrderValue?: number | null;
  maxDiscount?: number | null;
  companyId?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  usageLimit?: number | null;
  usagePerUser?: number | null;
  usedCount?: number | null;
  isActive?: boolean;
  metadata?: Record<string, unknown> | null;
  company?: VoucherCompany | null;
  status?: VoucherStatus;
  daysToExpire?: number | null;
  isValid?: boolean;
  invalidReason?: string | null;
  isSaved?: boolean;
  walletId?: number | null;
  isUsed?: boolean;
}

export interface UserVoucher {
  id: number;
  voucherId: number;
  savedAt: string;
  isUsed: boolean;
  status: VoucherStatus;
  daysToExpire: number | null;
  voucher: Voucher | null;
}

export interface VoucherValidationRequest {
  code: string;
  companyId?: number | null;
  totalAmount: number;
}

export interface VoucherValidationResponse {
  success: boolean;
  data: Voucher;
  message?: string;
}
