'use strict';

const { Notification } = require('../../../models');
const { Op } = require('sequelize');

const listNotifications = async (req, res) => {
  try {
    const { status } = req.query;
    const whereClause = {
      [Op.or]: [
        { userId: req.user.id },
        { targetRole: 'ALL' },
        { targetRole: req.user.role?.toUpperCase?.() ?? 'PASSENGER' }
      ]
    };

    if (status && status !== 'ALL') {
      whereClause.status = status.toUpperCase();
    }

    const notifications = await Notification.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('listNotifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải thông báo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOne({
      where: {
        id,
        [Op.or]: [
          { userId: req.user.id },
          { targetRole: 'ALL' },
          { targetRole: req.user.role?.toUpperCase?.() ?? 'PASSENGER' }
        ]
      }
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Thông báo không tồn tại' });
    }

    await notification.update({
      status: 'READ',
      readAt: new Date()
    });

    res.json({ success: true, message: 'Đã đánh dấu đã đọc' });
  } catch (error) {
    console.error('markAsRead error:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể cập nhật thông báo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  listNotifications,
  markAsRead
};
