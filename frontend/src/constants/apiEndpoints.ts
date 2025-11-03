export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    PROFILE: '/user/me',
  },
  TRIPS: {
    SEARCH: '/trips/search',
    DETAIL: (id: string | number) => `/trips/${id}`,
  },
  BOOKINGS: {
    ROOT: '/bookings',
  },
};

export default API_ENDPOINTS;
