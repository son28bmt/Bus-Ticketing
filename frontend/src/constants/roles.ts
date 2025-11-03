export const ROLES = {
  ADMIN: 'admin',
  COMPANY: 'company',
  PASSENGER: 'passenger',
};

export type RoleKey = keyof typeof ROLES;

export default ROLES;
