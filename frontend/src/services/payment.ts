import api from './http';

export const paymentAPI = {
  createVNPayUrl: async (payload: Record<string, unknown>) => {
    const response = await api.post('/payment/vnpay/create-url', payload);
    return response.data;
  },
  getVNPayBanks: async () => {
    const response = await api.get('/payment/vnpay/banks');
    return response.data;
  },
  getInvoice: async (paymentId: number) => {
    const response = await api.get(`/payment/invoice/${paymentId}`);
    return response.data;
  },
};

export default paymentAPI;
