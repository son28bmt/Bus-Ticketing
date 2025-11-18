export const ROLES = {
  ADMIN: 'admin',
  COMPANY: 'company',
  DRIVER: 'driver',
  PASSENGER: 'passenger',
};

export type RoleKey = keyof typeof ROLES;

export default ROLES;
