/**
 * Permission constants and default role->permissions mapping.
 * Keep this file simple and in-memory so it's easy to extend.
 */

const { ROLES } = require('./roles');

const PERMISSIONS = {
  // Users
  USERS_VIEW: 'users.view',
  USERS_MANAGE: 'users.manage',

  // Buses
  BUSES_VIEW: 'buses.view',
  BUSES_MANAGE_OWN: 'buses.manage.own',
  BUSES_MANAGE_ANY: 'buses.manage.any',

  // Trips
  TRIPS_VIEW: 'trips.view',
  TRIPS_MANAGE_OWN: 'trips.manage.own',
  TRIPS_MANAGE_ANY: 'trips.manage.any',

  // Bookings
  BOOKINGS_CREATE: 'bookings.create',
  BOOKINGS_VIEW_OWN: 'bookings.view.own',
  BOOKINGS_VIEW_COMPANY: 'bookings.view.company',
  BOOKINGS_MANAGE_ANY: 'bookings.manage.any',

  // Payments
  PAYMENTS_VIEW_OWN: 'payments.view.own',
  PAYMENTS_MANAGE_ANY: 'payments.manage.any',

  // Vouchers
  VOUCHERS_VIEW: 'vouchers.view',
  VOUCHERS_MANAGE_OWN: 'vouchers.manage.own',
  VOUCHERS_MANAGE_ANY: 'vouchers.manage.any',

  // News
  NEWS_VIEW_PUBLIC: 'news.view.public',
  NEWS_MANAGE: 'news.manage',

  // Reports
  REPORTS_VIEW_ADMIN: 'reports.view.admin',
  REPORTS_VIEW_COMPANY: 'reports.view.company',

  // Settings
  SETTINGS_MANAGE: 'settings.manage'
};

// Default role -> permissions mapping. Add or change as needed.
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.COMPANY]: [
    PERMISSIONS.BUSES_VIEW,
    PERMISSIONS.BUSES_MANAGE_OWN,
    PERMISSIONS.TRIPS_VIEW,
    PERMISSIONS.TRIPS_MANAGE_OWN,
    PERMISSIONS.BOOKINGS_VIEW_COMPANY,
    PERMISSIONS.REPORTS_VIEW_COMPANY,
    PERMISSIONS.NEWS_VIEW_PUBLIC,
    PERMISSIONS.VOUCHERS_VIEW,
    PERMISSIONS.VOUCHERS_MANAGE_OWN
  ],
  [ROLES.PASSENGER]: [
    PERMISSIONS.TRIPS_VIEW,
    PERMISSIONS.BOOKINGS_CREATE,
    PERMISSIONS.BOOKINGS_VIEW_OWN,
    PERMISSIONS.PAYMENTS_VIEW_OWN,
    PERMISSIONS.NEWS_VIEW_PUBLIC
  ]
};

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLES,
};
