'use strict';

const moment = require('moment');
const { Op } = require('sequelize');
const { UserVoucher, Voucher, BusCompany, Trip } = require('../../../models');
const {
  serializeUserVoucher,
  getAvailableVouchers
} = require('../../services/voucher.service');

const buildVoucherInclude = () => [
  {
    model: Voucher,
    as: 'voucher',
    include: [
      {
        model: BusCompany,
        as: 'company',
        attributes: ['id', 'name']
      }
    ]
  }
];

const attachCompanyInfo = (walletPayload, voucherInstance) => {
  if (!walletPayload || !walletPayload.voucher || !voucherInstance) {
    return walletPayload;
  }

  if (voucherInstance.company) {
    walletPayload.voucher.company = {
      id: voucherInstance.company.id,
      name: voucherInstance.company.name
    };
  }

  return walletPayload;
};

const listUserVouchers = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, orderAmount } = req.query;
    const normalizedStatus = status ? String(status).toUpperCase() : null;
    const now = moment();

    const records = await UserVoucher.findAll({
      where: { userId },
      include: buildVoucherInclude(),
      order: [['savedAt', 'DESC']]
    });

    const result = records
      .map((record) =>
        attachCompanyInfo(
          serializeUserVoucher(record, {
            now,
            orderAmount: orderAmount != null ? Number(orderAmount) : undefined
          }),
          record.voucher
        )
      )
      .filter(Boolean)
      .filter((item) => !normalizedStatus || item.status === normalizedStatus);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('user.voucher#list error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải kho voucher của bạn.'
    });
  }
};

const saveVoucher = async (req, res) => {
  try {
    const userId = req.user.id;
    const voucherId = Number(req.params.voucherId);

    if (!Number.isInteger(voucherId) || voucherId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã voucher không hợp lệ.'
      });
    }

    const voucher = await Voucher.findByPk(voucherId, {
      include: [
        {
          model: BusCompany,
          as: 'company',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!voucher || !voucher.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Voucher không tồn tại hoặc đã bị vô hiệu hóa.'
      });
    }

    const now = moment();
    if (
      (voucher.startDate && moment(voucher.startDate).isAfter(now)) ||
      (voucher.endDate && moment(voucher.endDate).endOf('day').isBefore(now))
    ) {
      return res.status(409).json({
        success: false,
        message: 'Voucher này hiện không khả dụng để lưu.'
      });
    }

    const [record, created] = await UserVoucher.findOrCreate({
      where: { userId, voucherId },
      defaults: {
        userId,
        voucherId,
        savedAt: new Date(),
        isUsed: false
      }
    });

    if (!created) {
      await record.update({
        isUsed: false,
        savedAt: new Date()
      });
    }

    await record.reload({
      include: buildVoucherInclude()
    });

    const payload = attachCompanyInfo(
      serializeUserVoucher(record, { now: moment() }),
      record.voucher
    );

    res.status(created ? 201 : 200).json({
      success: true,
      message: created ? 'Đã lưu voucher vào kho.' : 'Voucher đã được cập nhật trong kho của bạn.',
      data: payload
    });
  } catch (error) {
    console.error('user.voucher#save error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể lưu voucher. Vui lòng thử lại sau.'
    });
  }
};

const removeUserVoucher = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const record = await UserVoucher.findOne({
      where: {
        [Op.and]: [{ id }, { userId }]
      }
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy voucher trong kho của bạn.'
      });
    }

    await record.destroy();

    res.json({
      success: true,
      message: 'Đã bỏ lưu voucher.'
    });
  } catch (error) {
    console.error('user.voucher#remove error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể bỏ lưu voucher. Vui lòng thử lại sau.'
    });
  }
};

const listAvailableForUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const { companyId, tripId, totalAmount, includeGlobal } = req.query;

    let resolvedCompanyId = companyId ? Number(companyId) : null;

    if (!resolvedCompanyId && tripId) {
      const { Trip } = require('../../../models');
      const trip = await Trip.findByPk(tripId, {
        attributes: ['id', 'companyId']
      });
      if (trip) {
        resolvedCompanyId = trip.companyId;
      }
    }

    const vouchers = await getAvailableVouchers({
      userId,
      companyId: resolvedCompanyId,
      orderAmount: totalAmount != null ? Number(totalAmount) : undefined,
      includeGlobal: includeGlobal !== 'false',
      skipOrderAmountValidation: totalAmount == null
    });

    res.json({
      success: true,
      data: vouchers
    });
  } catch (error) {
    console.error('user.voucher#available error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách voucher khả dụng.'
    });
  }
};

module.exports = {
  listUserVouchers,
  saveVoucher,
  removeUserVoucher,
  listAvailableForUser
};
