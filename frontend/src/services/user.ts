import api from './http';

export const userAPI = {
  getProfile: async () => {
    const response = await api.get('/user/me');
    return response.data;
  },
  getBookings: async () => {
    const response = await api.get('/user/bookings');
    return response.data;
  },
};

export default userAPI;
