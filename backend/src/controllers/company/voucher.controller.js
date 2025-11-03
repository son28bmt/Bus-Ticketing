'use strict';

const { Op } = require('sequelize');
const moment = require('moment');
const { Voucher, VoucherUsage } = require('../../../models');
const {
  normalizeCode,
  formatVoucherResponse
} = require('../../services/voucher.service');

const ensureCompanyContext = (req) => {
  if (!req.user || !req.user.companyId) {
    const error = new Error('Bạn cần thuộc về một nhà xe để quản lý voucher.');
    error.status = 403;
    throw error;
  }
  return Number(req.user.companyId);
};

const listCompanyVouchers = async (req, res) => {
  try {
    const companyId = ensureCompanyContext(req);
    const { status, search } = req.query;

    const where = {
      companyId
    };

    if (search) {
      const keyword = `%${search.trim()}%`;
      where[Op.or] = [
        { code: { [Op.like]: keyword } },
        { name: { [Op.like]: keyword } },
        { description: { [Op.like]: keyword } }
      ];
    }

    if (status) {
      const now = moment();
      switch (status) {
        case 'active':
          where.isActive = true;
          where[Op.and] = [
            {
              [Op.or]: [
                { startDate: { [Op.lte]: now.toDate() } },
                { startDate: null }
              ]
            },
            {
              [Op.or]: [
                { endDate: { [Op.gte]: now.toDate() } },
                { endDate: null }
              ]
            }
          ];
          break;
        case 'inactive':
          where.isActive = false;
          break;
        case 'expired':
          where.endDate = { [Op.lt]: now.toDate() };
          break;
        default:
          break;
      }
    }

    const vouchers = await Voucher.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: vouchers.map((voucher) => formatVoucherResponse(voucher, 0))
    });
  } catch (error) {
    console.error('company.voucher#list error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Không thể tải danh sách voucher.'
    });
  }
};

const createCompanyVoucher = async (req, res) => {
  try {
    const companyId = ensureCompanyContext(req);
    const payload = {
      code: normalizeCode(req.body.code),
      name: req.body.name,
      description: req.body.description,
      discountType: req.body.discountType,
      discountValue: req.body.discountValue,
      minOrderValue: req.body.minOrderValue ?? null,
      maxDiscount: req.body.maxDiscount ?? null,
      startDate: req.body.startDate || null,
      endDate: req.body.endDate || null,
      usageLimit: req.body.usageLimit ?? null,
      usagePerUser: req.body.usagePerUser ?? null,
      companyId,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      metadata: req.body.metadata ?? null,
      createdBy: req.user.id
    };

    if (!payload.code || !payload.name) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mã và tên voucher.'
      });
    }

    const duplicated = await Voucher.findOne({
      where: { code: payload.code, companyId }
    });

    if (duplicated) {
      return res.status(409).json({
        success: false,
        message: 'Mã voucher đã tồn tại.'
      });
    }

    const voucher = await Voucher.create(payload);

    res.status(201).json({
      success: true,
      message: 'Tạo voucher thành công.',
      data: formatVoucherResponse(voucher, 0)
    });
  } catch (error) {
    console.error('company.voucher#create error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Không thể tạo voucher.'
    });
  }
};

const updateCompanyVoucher = async (req, res) => {
  try {
    const companyId = ensureCompanyContext(req);
    const { id } = req.params;

    const voucher = await Voucher.findOne({
      where: { id, companyId }
    });

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher không tồn tại hoặc không thuộc quyền quản lý của bạn.'
      });
    }

    const updates = {
      name: req.body.name ?? voucher.name,
      description: req.body.description ?? voucher.description,
      discountType: req.body.discountType ?? voucher.discountType,
      discountValue: req.body.discountValue ?? voucher.discountValue,
      minOrderValue: req.body.minOrderValue ?? voucher.minOrderValue,
      maxDiscount: req.body.maxDiscount ?? voucher.maxDiscount,
      startDate: req.body.startDate ?? voucher.startDate,
      endDate: req.body.endDate ?? voucher.endDate,
      usageLimit: req.body.usageLimit ?? voucher.usageLimit,
      usagePerUser: req.body.usagePerUser ?? voucher.usagePerUser,
      isActive: req.body.isActive ?? voucher.isActive,
      metadata: req.body.metadata ?? voucher.metadata,
      companyId // ensure voucher luôn thuộc nhà xe hiện tại
    };

    if (req.body.code) {
      const newCode = normalizeCode(req.body.code);
      if (newCode !== voucher.code) {
        const duplicated = await Voucher.findOne({
          where: {
            code: newCode,
            companyId,
            id: { [Op.ne]: voucher.id }
          }
        });

        if (duplicated) {
          return res.status(409).json({
            success: false,
            message: 'Mã voucher đã được sử dụng.'
          });
        }
        updates.code = newCode;
      }
    }

    await voucher.update(updates);

    res.json({
      success: true,
      message: 'Cập nhật voucher thành công.',
      data: formatVoucherResponse(voucher, 0)
    });
  } catch (error) {
    console.error('company.voucher#update error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Không thể cập nhật voucher.'
    });
  }
};

const toggleCompanyVoucher = async (req, res) => {
  try {
    const companyId = ensureCompanyContext(req);
    const { id } = req.params;
    const { isActive } = req.body;

    const voucher = await Voucher.findOne({ where: { id, companyId } });
    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher không tồn tại hoặc không thuộc quyền quản lý của bạn.'
      });
    }

    await voucher.update({ isActive: !!isActive });

    res.json({
      success: true,
      message: `Voucher đã được ${isActive ? 'kích hoạt' : 'tạm dừng'}.`,
      data: formatVoucherResponse(voucher, 0)
    });
  } catch (error) {
    console.error('company.voucher#toggle error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Không thể thay đổi trạng thái voucher.'
    });
  }
};

const getUsageStats = async (req, res) => {
  try {
    const companyId = ensureCompanyContext(req);
    const { from, to } = req.query;
    const range = {};

    if (from) {
      range[Op.gte] = moment(from).startOf('day').toDate();
    }
    if (to) {
      range[Op.lte] = moment(to).endOf('day').toDate();
    }

    const whereUsage = {
      '$voucher.companyId$': companyId
    };

    if (Object.keys(range).length) {
      whereUsage.createdAt = range;
    }

    const usages = await VoucherUsage.findAll({
      where: whereUsage,
      include: [
        {
          model: Voucher,
          as: 'voucher',
          attributes: ['id', 'code', 'name']
        }
      ]
    });

    const summary = usages.reduce((acc, usage) => {
      const key = usage.voucherId;
      if (!acc[key]) {
        acc[key] = {
          voucherId: usage.voucherId,
          code: usage.voucher?.code,
          name: usage.voucher?.name,
          totalDiscount: 0,
          usageCount: 0
        };
      }
      acc[key].usageCount += 1;
      acc[key].totalDiscount += Number(usage.appliedDiscount);
      return acc;
    }, {});

    res.json({
      success: true,
      data: Object.values(summary)
    });
  } catch (error) {
    console.error('company.voucher#stats error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Không thể tải thống kê voucher.'
    });
  }
};

module.exports = {
  listCompanyVouchers,
  createCompanyVoucher,
  updateCompanyVoucher,
  toggleCompanyVoucher,
  getUsageStats
};
