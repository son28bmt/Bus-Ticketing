'use strict';

const { Notification, User } = require('../../models');
const mailService = require('./mail.service');

const getUsersByRole = async (role) => {
  if (role === 'ALL') {
    return User.findAll({ attributes: ['id', 'email', 'role'] });
  }
  return User.findAll({
    where: { role },
    attributes: ['id', 'email', 'role']
  });
};

const createNotificationRecord = async (payload) => {
  return Notification.create(payload);
};

const notifyUser = async ({ userId, email, title, message, type = 'OTHER', payload }) => {
  const notification = await createNotificationRecord({
    userId: userId || null,
    guestEmail: !userId ? email : null,
    type,
    title,
    message,
    payload,
    targetRole: 'PASSENGER'
  });

  if (email) {
    await mailService.sendCustomEmail({
      to: email,
      subject: title,
      html: `<p>${message}</p>`
    });
  }

  return notification;
};

const notifyAllUsers = async ({ role = 'PASSENGER', title, message, type = 'OTHER', payload }) => {
  const targets = await getUsersByRole(role === 'ALL' ? undefined : role);

  const records = [];
  for (const user of targets) {
    records.push(
      await createNotificationRecord({
        userId: user.id,
        guestEmail: null,
        targetRole: role,
        type,
        title,
        message,
        payload
      })
    );
  }

  return records;
};

module.exports = {
  notifyUser,
  notifyAllUsers
};
