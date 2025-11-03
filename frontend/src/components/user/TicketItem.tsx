import type { UserBooking } from '../../types/payment';

type TicketItemProps = {
  booking: UserBooking;
  onSelect?: (booking: UserBooking) => void;
};

const TicketItem = ({ booking, onSelect }: TicketItemProps) => {
  const handleClick = () => {
    if (onSelect) {
      onSelect(booking);
    }
  };

  return (
    <div className="ticket-item" onClick={handleClick} role={onSelect ? 'button' : 'listitem'}>
      <h4>{booking.bookingCode}</h4>
      <p>
        {booking.trip.departureLocation} → {booking.trip.arrivalLocation}
      </p>
      <p>{booking.totalPrice.toLocaleString('vi-VN')} ₫</p>
    </div>
  );
};

export default TicketItem;
