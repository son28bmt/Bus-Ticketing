'use strict';

const { Op } = require('sequelize');
const moment = require('moment');
const { Voucher, BusCompany, User } = require('../../../models');
const {
  normalizeCode,
  formatVoucherResponse
} = require('../../services/voucher.service');

const buildFilters = (query = {}) => {
  const where = {};

  if (query.companyId) {
    where.companyId = query.companyId === 'null' ? null : Number(query.companyId);
  }

  if (query.code) {
    where.code = normalizeCode(query.code);
  }

  if (query.search) {
    const keyword = `%${query.search.trim()}%`;
    where[Op.or] = [
      { code: { [Op.like]: keyword } },
      { name: { [Op.like]: keyword } },
      { description: { [Op.like]: keyword } }
    ];
  }

  if (query.isActive != null) {
    where.isActive = query.isActive === 'true' || query.isActive === true;
  }

  if (query.status) {
    const now = moment();
    switch (query.status) {
      case 'upcoming':
        where.startDate = { [Op.gt]: now.toDate() };
        break;
      case 'expired':
        where.endDate = { [Op.lt]: now.toDate() };
        break;
      case 'ongoing':
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
      default:
        break;
    }
  }

  return where;
};

const listVouchers = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const where = buildFilters(req.query);

    const result = await Voucher.findAndCountAll({
      where,
      include: [
        {
          model: BusCompany,
          as: 'company',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit)
    });

    const data = result.rows.map((voucher) =>
      formatVoucherResponse(voucher, 0)
    );

    res.json({
      success: true,
      data,
      pagination: {
        total: result.count,
        page: Number(page),
        pages: Math.ceil(result.count / Number(limit)),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('admin.voucher#list error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách voucher.'
    });
  }
};

const getVoucherById = async (req, res) => {
  try {
    const { id } = req.params;
    const voucher = await Voucher.findByPk(id, {
      include: [
        {
          model: BusCompany,
          as: 'company',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher không tồn tại.'
      });
    }

    res.json({
      success: true,
      data: formatVoucherResponse(voucher, 0)
    });
  } catch (error) {
    console.error('admin.voucher#get error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải thông tin voucher.'
    });
  }
};

const parseVoucherPayload = (body, actor) => {
  const payload = {
    code: normalizeCode(body.code),
    name: body.name,
    description: body.description,
    discountType: body.discountType,
    discountValue: body.discountValue,
    minOrderValue: body.minOrderValue ?? null,
    maxDiscount: body.maxDiscount ?? null,
    startDate: body.startDate || null,
    endDate: body.endDate || null,
    usageLimit: body.usageLimit ?? null,
    usagePerUser: body.usagePerUser ?? null,
    companyId: body.companyId === undefined ? null : body.companyId,
    isActive: body.isActive !== undefined ? body.isActive : true,
    metadata: body.metadata ?? null
  };

  if (actor) {
    payload.createdBy = actor.id;
  }

  return payload;
};

const createVoucher = async (req, res) => {
  try {
    const payload = parseVoucherPayload(req.body, req.user);

    if (!payload.code || !payload.name || !payload.discountType) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin voucher.'
      });
    }

  const existing = await Voucher.findOne({ where: { code: payload.code, companyId: payload.companyId ?? null } });
    if (existing) {
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
    console.error('admin.voucher#create error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tạo voucher.'
    });
  }
};

const updateVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const voucher = await Voucher.findByPk(id);

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher không tồn tại.'
      });
    }

    const payload = parseVoucherPayload(req.body);
    delete payload.createdBy;

    if (payload.code) {
      const duplicated = await Voucher.findOne({
        where: {
          code: payload.code,
          companyId: payload.companyId === undefined ? voucher.companyId : payload.companyId,
          id: { [Op.ne]: voucher.id }
        }
      });

      if (duplicated) {
        return res.status(409).json({
          success: false,
          message: 'Mã voucher đã được sử dụng.'
        });
      }
    }

    await voucher.update(payload);

    res.json({
      success: true,
      message: 'Cập nhật voucher thành công.',
      data: formatVoucherResponse(voucher, 0)
    });
  } catch (error) {
    console.error('admin.voucher#update error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể cập nhật voucher.'
    });
  }
};

const toggleVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const voucher = await Voucher.findByPk(id);
    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher không tồn tại.'
      });
    }

    await voucher.update({ isActive: !!isActive });

    res.json({
      success: true,
      message: `Voucher đã được ${isActive ? 'kích hoạt' : 'tạm dừng'}.`,
      data: formatVoucherResponse(voucher, 0)
    });
  } catch (error) {
    console.error('admin.voucher#toggle error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể cập nhật trạng thái voucher.'
    });
  }
};

const archiveVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const voucher = await Voucher.findByPk(id);

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher không tồn tại.'
      });
    }

    await voucher.update({ isActive: false, endDate: moment().toDate() });

    res.json({
      success: true,
      message: 'Voucher đã được vô hiệu hóa.',
      data: formatVoucherResponse(voucher, 0)
    });
  } catch (error) {
    console.error('admin.voucher#archive error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể vô hiệu hóa voucher.'
    });
  }
};

module.exports = {
  listVouchers,
  getVoucherById,
  createVoucher,
  updateVoucher,
  toggleVoucher,
  archiveVoucher
};
