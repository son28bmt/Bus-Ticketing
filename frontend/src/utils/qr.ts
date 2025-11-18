export const buildTicketQrPayload = (bookingCode: string) => {
  return `shanbus-ticket:${bookingCode}`;
};

export default {
  buildTicketQrPayload,
};
