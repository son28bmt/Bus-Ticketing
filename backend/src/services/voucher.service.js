'use strict';

const moment = require('moment');
const { Op } = require('sequelize');
const {
  Voucher,
  VoucherUsage,
  UserVoucher,
  BusCompany,
  Booking,
  sequelize
} = require('../../models');

const normalizeCode = (code) =>
  typeof code === 'string' ? code.trim().toUpperCase() : '';

const isWithinDateRange = (voucher, now = moment()) => {
  const startOk =
    !voucher.startDate || moment(voucher.startDate).isSameOrBefore(now);
  const endOk =
    !voucher.endDate || moment(voucher.endDate).endOf('day').isSameOrAfter(now);
  return startOk && endOk;
};

const calculateDiscount = (voucher, orderAmount) => {
  if (!voucher || !Number.isFinite(orderAmount)) {
    return 0;
  }

  const baseAmount = Math.max(orderAmount, 0);
  const discountType = String(voucher.discountType || '').toUpperCase();

  if (discountType === 'PERCENT') {
    const rawDiscount = (baseAmount * Number(voucher.discountValue)) / 100;
    const cappedDiscount =
      voucher.maxDiscount != null
        ? Math.min(rawDiscount, Number(voucher.maxDiscount))
        : rawDiscount;
    return Math.min(cappedDiscount, baseAmount);
  }

  if (discountType === 'AMOUNT' || discountType === 'FIXED') {
    return Math.min(Number(voucher.discountValue), baseAmount);
  }

  return 0;
};

const formatVoucherResponse = (voucher, discount) => {
  const payload = {
    id: voucher.id,
    code: voucher.code,
    name: voucher.name,
    description: voucher.description,
    discountType: voucher.discountType,
    discountValue: Number(voucher.discountValue),
    discountAmount: discount,
    minOrderValue: voucher.minOrderValue != null ? Number(voucher.minOrderValue) : null,
    maxDiscount: voucher.maxDiscount != null ? Number(voucher.maxDiscount) : null,
    companyId: voucher.companyId,
    startDate: voucher.startDate,
    endDate: voucher.endDate,
    usageLimit: voucher.usageLimit != null ? Number(voucher.usageLimit) : null,
    usagePerUser: voucher.usagePerUser != null ? Number(voucher.usagePerUser) : null,
    usedCount: voucher.usedCount != null ? Number(voucher.usedCount) : 0,
    isActive: voucher.isActive,
    metadata: voucher.metadata
  };

  if (voucher.company) {
    payload.company = {
      id: voucher.company.id,
      name: voucher.company.name
    };
  }

  if (voucher.creator) {
    payload.creator = {
      id: voucher.creator.id,
      name: voucher.creator.name,
      email: voucher.creator.email
    };
  }

  return payload;
};

const findVoucherByCode = async (code, options = {}) => {
  const { companyId, transaction } = options || {};
  const normalized = normalizeCode(code || voucherInstance?.code);
  if (!normalized) {
    return null;
  }

  // Prefer exact match for provided companyId, then fallback to global (companyId null), then any by code
  if (companyId != null) {
    const exact = await Voucher.findOne({
      where: { code: normalized, companyId: Number(companyId) },
      transaction
    });
    if (exact) return exact;

    const globalMatch = await Voucher.findOne({
      where: { code: normalized, companyId: null },
      transaction
    });
    if (globalMatch) return globalMatch;
  }

  return Voucher.findOne({
    where: { code: normalized },
    transaction
  });
};

const validateVoucher = async ({
  code,
  voucherInstance,
  companyId,
  orderAmount,
  userId,
  allowInactive = false,
  requireCompanyMatch = true,
  skipOrderAmountValidation = false,
  transaction
}) => {
  const normalized = normalizeCode(code || voucherInstance?.code);

  if (!normalized) {
    return {
      valid: false,
      reason: "Mã khuyến mãi không hợp lệ."
    };
  }

  const voucher =
    voucherInstance ||
    (await findVoucherByCode(normalized, { companyId, transaction }));

  if (!voucher) {
    return {
      valid: false,
      reason: "Không tìm thấy voucher."
    };
  }

  if (!allowInactive && !voucher.isActive) {
    return {
      valid: false,
      reason: "Voucher đã bị vô hiệu hóa."
    };
  }

  if (!isWithinDateRange(voucher)) {
    return {
      valid: false,
      reason: "Voucher đã hết hạn hoặc chưa đến thời gian áp dụng."
    };
  }

  if (
    requireCompanyMatch &&
    voucher.companyId != null &&
    (companyId == null || Number(voucher.companyId) !== Number(companyId))
  ) {
    return {
      valid: false,
      reason: "Voucher này không áp dụng cho nhà xe đã chọn."
    };
  }

  if (
    voucher.usageLimit != null &&
    Number(voucher.usedCount || 0) >= Number(voucher.usageLimit)
  ) {
    return {
      valid: false,
      reason: "Voucher đã được sử dụng tối đa số lần cho phép."
    };
  }

  if (voucher.usagePerUser != null && userId) {
    const usageCount = await VoucherUsage.count({
      where: {
        voucherId: voucher.id,
        userId
      },
      transaction
    });

    if (usageCount >= Number(voucher.usagePerUser)) {
      return {
        valid: false,
        reason: "Bạn đã dùng voucher này tối đa số lần cho phép."
      };
    }
  }

  const numericOrderAmount = Number(orderAmount);
  const hasOrderAmount =
    Number.isFinite(numericOrderAmount) && numericOrderAmount > 0;

  if (!skipOrderAmountValidation && !hasOrderAmount) {
    return {
      valid: false,
      reason: "Tổng tiền đơn hàng không hợp lệ."
    };
  }

  const effectiveAmount = hasOrderAmount
    ? numericOrderAmount
    : Number(voucher.minOrderValue != null ? voucher.minOrderValue : 0);

  if (
    !skipOrderAmountValidation &&
    voucher.minOrderValue != null &&
    numericOrderAmount < Number(voucher.minOrderValue)
  ) {
    return {
      valid: false,
      reason: "Đơn hàng cần tối thiểu " +
        Number(voucher.minOrderValue).toLocaleString("vi-VN") +
        "đ để áp dụng voucher này."
    };
  }

  let discount = 0;
  if (effectiveAmount > 0) {
    discount = calculateDiscount(voucher, effectiveAmount);
  }

  if (!skipOrderAmountValidation && discount <= 0) {
    return {
      valid: false,
      reason: "Voucher không áp dụng được cho đơn hàng này."
    };
  }

  return {
    valid: true,
    voucher,
    discount,
    payload: formatVoucherResponse(voucher, discount)
  };
};
const createVoucherUsage = async ({
  voucher,
  booking,
  userId,
  discountAmount,
  metadata,
  transaction
}) => {
  if (!voucher || !booking) {
    throw new Error('Thiếu thông tin voucher hoặc booking.');
  }

  const usage = await VoucherUsage.create(
    {
      voucherId: voucher.id,
      bookingId: booking.id,
      userId,
      appliedDiscount: discountAmount,
      metadata
    },
    { transaction }
  );

  await voucher.increment('usedCount', { by: 1, transaction });

  if (userId) {
    await UserVoucher.update(
      { isUsed: true },
      {
        where: { userId, voucherId: voucher.id },
        transaction
      }
    );
  }

  return usage;
};

const rollbackVoucherUsage = async ({ voucherUsageId, transaction }) => {
  const usage = await VoucherUsage.findByPk(voucherUsageId, { transaction });
  if (!usage) {
    return;
  }

  await Voucher.decrement('usedCount', {
    by: 1,
    where: { id: usage.voucherId, usedCount: { [Op.gt]: 0 } },
    transaction
  });

  if (usage.userId) {
    await UserVoucher.update(
      { isUsed: false },
      {
        where: { userId: usage.userId, voucherId: usage.voucherId },
        transaction
      }
    );
  }

  await usage.destroy({ transaction });
};

const detachVoucherFromBooking = async ({ bookingId, transaction }) => {
  const booking = await Booking.findByPk(bookingId, { transaction });
  if (!booking) {
    return null;
  }

  const { voucherId } = booking;
  if (!voucherId) {
    return booking;
  }

  const usage = await VoucherUsage.findOne({
    where: { bookingId },
    order: [['createdAt', 'DESC']],
    transaction
  });

  if (usage) {
    await rollbackVoucherUsage({
      voucherUsageId: usage.id,
      transaction
    });
  }

  booking.voucherId = null;
  booking.discountAmount = 0;
  await booking.save({ transaction });
  return booking;
};

const getVoucherStatus = (voucher, { now = moment(), userVoucher } = {}) => {
  if (!voucher) {
    return 'UNKNOWN';
  }

  if (userVoucher?.isUsed) {
    return 'USED';
  }

  if (!voucher.isActive) {
    return 'INACTIVE';
  }

  if (!isWithinDateRange(voucher, now)) {
    return 'EXPIRED';
  }

  if (voucher.endDate) {
    const daysDiff = moment(voucher.endDate).endOf('day').diff(now, 'days');
    if (daysDiff >= 0 && daysDiff <= 3) {
      return 'EXPIRING';
    }
  }

  return 'ACTIVE';
};

const serializeUserVoucher = (userVoucher, { now = moment(), orderAmount } = {}) => {
  if (!userVoucher) {
    return null;
  }

  const voucher = userVoucher.voucher || null;
  const numericOrderAmount = Number(orderAmount);
  const discount =
    voucher && Number.isFinite(numericOrderAmount) && numericOrderAmount > 0
      ? calculateDiscount(voucher, numericOrderAmount)
      : 0;

  const expiresAt = voucher?.endDate ? moment(voucher.endDate) : null;

  return {
    id: userVoucher.id,
    voucherId: userVoucher.voucherId,
    savedAt: userVoucher.savedAt,
    isUsed: userVoucher.isUsed,
    status: getVoucherStatus(voucher, { now, userVoucher }),
    daysToExpire: expiresAt ? expiresAt.startOf('day').diff(now.clone().startOf('day'), 'days') : null,
    voucher: voucher ? formatVoucherResponse(voucher, discount) : null
  };
};

const getAvailableVouchers = async ({
  userId,
  companyId,
  orderAmount,
  includeGlobal = true,
  skipOrderAmountValidation = false,
  transaction
}) => {
  const now = moment();

  const availabilityConditions = [
    { isActive: true },
    {
      [Op.or]: [
        { startDate: null },
        { startDate: { [Op.lte]: now.toDate() } }
      ]
    },
    {
      [Op.or]: [
        { endDate: null },
        { endDate: { [Op.gte]: now.toDate() } }
      ]
    }
  ];

  if (companyId != null) {
    availabilityConditions.push({
      [Op.or]: includeGlobal
        ? [{ companyId: null }, { companyId: Number(companyId) }]
        : [{ companyId: Number(companyId) }]
    });
  } else if (!includeGlobal) {
    availabilityConditions.push({ companyId: null });
  }

  const vouchers = await Voucher.findAll({
    where: { [Op.and]: availabilityConditions },
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: BusCompany,
        as: 'company',
        attributes: ['id', 'name']
      }
    ],
    transaction
  });

  const voucherIds = vouchers.map((voucher) => voucher.id);
  const walletRecords = userId && voucherIds.length
    ? await UserVoucher.findAll({
        where: {
          userId,
          voucherId: { [Op.in]: voucherIds }
        },
        transaction
      })
    : [];

  const walletMap = new Map(
    walletRecords.map((record) => [record.voucherId, record])
  );

  const responses = [];

  for (const voucher of vouchers) {
    const validation = await validateVoucher({
      voucherInstance: voucher,
      companyId,
      orderAmount,
      userId,
      skipOrderAmountValidation,
      transaction
    });

    if (!validation.valid && !skipOrderAmountValidation) {
      continue;
    }

    const walletEntry = walletMap.get(voucher.id) || null;
    const expiresAt = voucher.endDate ? moment(voucher.endDate) : null;

    const basePayload = formatVoucherResponse(voucher, validation.valid ? validation.discount : 0);
    if (voucher.company) {
      basePayload.company = {
        id: voucher.company.id,
        name: voucher.company.name
      };
    }

    responses.push({
      ...basePayload,
      isValid: validation.valid,
      invalidReason: validation.valid ? null : validation.reason,
      isSaved: Boolean(walletEntry),
      walletId: walletEntry?.id || null,
      isUsed: walletEntry?.isUsed || false,
      status: getVoucherStatus(voucher, { now, userVoucher: walletEntry }),
      daysToExpire: expiresAt ? expiresAt.startOf('day').diff(now.clone().startOf('day'), 'days') : null
    });
  }

  return responses;
};

module.exports = {
  normalizeCode,
  findVoucherByCode,
  validateVoucher,
  createVoucherUsage,
  rollbackVoucherUsage,
  detachVoucherFromBooking,
  calculateDiscount,
  formatVoucherResponse,
  getVoucherStatus,
  serializeUserVoucher,
  getAvailableVouchers
};

