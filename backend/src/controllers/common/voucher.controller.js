'use strict';

const moment = require('moment');
const { Op } = require('sequelize');
const { Voucher, BusCompany, Trip } = require('../../../models');
const {
  validateVoucher,
  normalizeCode,
  formatVoucherResponse,
  getAvailableVouchers
} = require('../../services/voucher.service');

const validateVoucherCode = async (req, res) => {
  try {
    const { code, companyId, totalAmount } = req.body || {};

    const result = await validateVoucher({
      code,
      companyId,
      orderAmount: totalAmount,
      userId: req.user?.id,
      requireCompanyMatch: true
    });

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.reason || 'Voucher is not valid.'
      });
    }

    res.json({
      success: true,
      data: formatVoucherResponse(result.voucher, result.discount)
    });
  } catch (error) {
    console.error('voucher.validate error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to validate voucher.'
    });
  }
};

const listPublicVouchers = async (req, res) => {
  try {
    const { companyId } = req.query;
    const now = moment();

    const where = {
      isActive: true,
      [Op.and]: [
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
      ]
    };

    if (companyId) {
      where[Op.and].push({
        [Op.or]: [
          { companyId: null },
          { companyId: Number(companyId) }
        ]
      });
    }

    const vouchers = await Voucher.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: BusCompany,
          as: 'company',
          attributes: ['id', 'name']
        }
      ]
    });

    const data = vouchers.map((voucher) => {
      const payload = formatVoucherResponse(voucher, 0);
      if (voucher.company) {
        payload.company = {
          id: voucher.company.id,
          name: voucher.company.name
        };
      }
      return payload;
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('voucher.publicList error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to load voucher list.'
    });
  }
};

const listAvailableVouchers = async (req, res) => {
  try {
    const { companyId, tripId, totalAmount, includeGlobal } = req.query;
    let resolvedCompanyId = companyId ? Number(companyId) : null;

    if (!resolvedCompanyId && tripId) {
      const trip = await Trip.findByPk(tripId, {
        attributes: ['id', 'companyId']
      });

      if (trip) {
        resolvedCompanyId = trip.companyId;
      }
    }

    const vouchers = await getAvailableVouchers({
      userId: req.user?.id,
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
    console.error('voucher.available error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to load available vouchers.'
    });
  }
};

const getVoucherByCode = async (req, res) => {
  try {
    const code = normalizeCode(req.params.code);
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Voucher code is not valid.'
      });
    }

    const voucher = await Voucher.findOne({
      where: { code },
      include: [
        {
          model: BusCompany,
          as: 'company',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found.'
      });
    }

    const payload = formatVoucherResponse(voucher, 0);
    if (voucher.company) {
      payload.company = {
        id: voucher.company.id,
        name: voucher.company.name
      };
    }

    res.json({
      success: true,
      data: payload
    });
  } catch (error) {
    console.error('voucher.getByCode error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to load voucher information.'
    });
  }
};

module.exports = {
  validateVoucherCode,
  listPublicVouchers,
  listAvailableVouchers,
  getVoucherByCode
};





