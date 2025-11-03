import { formatDate, formatTime } from '../../utils/formatDate';
import { formatPrice } from '../../utils/price';
import type { Trip, Seat } from '../../types/payment';
import type { Voucher } from '../../types/voucher';

interface PassengerInfo {
  name: string;
  phone: string;
  email?: string;
}

interface BookingSummaryProps {
  trip: Trip;
  selectedSeats: Seat[];
  passengerInfo: PassengerInfo;
  subtotal?: number;
  discountAmount?: number;
  payableAmount?: number;
  voucher?: Voucher | null;
}

const getSeatTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    STANDARD: 'Standard',
    VIP: 'VIP',
    SLEEPER: 'Sleeper'
  };
  return labels[type] || type;
};

const BookingSummary = ({
  trip,
  selectedSeats,
  passengerInfo,
  subtotal,
  discountAmount = 0,
  payableAmount,
  voucher
}: BookingSummaryProps) => {
  const computedSubtotal = subtotal ?? selectedSeats.reduce((total, seat) => {
    const multiplier = seat.priceMultiplier ?? 1;
    return total + trip.basePrice * multiplier;
  }, 0);

  const payable = payableAmount ?? Math.max(0, computedSubtotal - discountAmount);

  const [routeDeparture = '', routeArrival = ''] = (trip.route || '')
    .split('->')
    .map((part) => part.trim());

  const resolvedDeparture = trip.departureLocation || routeDeparture;
  const resolvedArrival = trip.arrivalLocation || routeArrival;

  return (
    <div className="booking-summary-card">
      <h3>Booking summary</h3>

      <div className="trip-summary">
        <h4>Trip details</h4>
        <div className="trip-route">
          <div className="route-info">
            <span className="departure">
              <strong>{resolvedDeparture}</strong>
              <small>
                {formatTime(trip.departureTime)} - {formatDate(trip.departureTime)}
              </small>
            </span>
            <span className="arrow">→</span>
            <span className="arrival">
              <strong>{resolvedArrival}</strong>
              <small>
                {formatTime(trip.arrivalTime)} - {formatDate(trip.arrivalTime)}
              </small>
            </span>
          </div>
        </div>

        <div className="trip-details">
          <p>
            <strong>Bus:</strong> {trip.bus.busNumber} ({trip.bus.busType})
          </p>
          <p>
            <strong>Route:</strong> {trip.route}
          </p>
        </div>
      </div>

      <div className="passenger-summary">
        <h4>Passenger</h4>
        <div className="passenger-details">
          <p>
            <strong>Name:</strong> {passengerInfo.name}
          </p>
          <p>
            <strong>Phone:</strong> {passengerInfo.phone}
          </p>
          {passengerInfo.email && (
            <p>
              <strong>Email:</strong> {passengerInfo.email}
            </p>
          )}
        </div>
      </div>

      <div className="seats-summary">
        <h4>Selected seats</h4>
        <div className="selected-seats-list">
          {selectedSeats.map((seat) => (
            <div key={seat.id ?? seat.seatNumber} className="seat-item">
              <div className="seat-info">
                <span className="seat-number">{seat.seatNumber}</span>
                <span className="seat-type">({getSeatTypeLabel(seat.seatType)})</span>
              </div>
              <div className="seat-price">
                {formatPrice(trip.basePrice * (seat.priceMultiplier ?? 1))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="price-summary">
        <div className="price-row">
          <span>Subtotal</span>
          <span>{formatPrice(computedSubtotal)}</span>
        </div>
        <div className="price-row">
          <span>Discount</span>
          <span className={discountAmount > 0 ? 'discount-amount' : ''}>
            {discountAmount > 0 ? `- ${formatPrice(discountAmount)}` : formatPrice(0)}
          </span>
        </div>
        {voucher && (
          <div className="price-row">
            <span>Voucher</span>
            <span className="voucher-code">{voucher.code}</span>
          </div>
        )}
        <div className="price-row total">
          <span>Total</span>
          <span className="total-amount">{formatPrice(payable)}</span>
        </div>
      </div>
    </div>
  );
};

export default BookingSummary;
