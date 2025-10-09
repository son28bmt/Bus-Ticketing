import { formatPrice } from '../../utils/price';
import { formatTime, formatDate } from '../../utils/formatDate';
import type { Trip, Seat } from '../../types/payment';

interface BookingSummaryProps {
  trip: Trip;
  selectedSeats: Seat[];
  passengerInfo: {
    name: string;
    phone: string;
    email?: string;
  };
}

export default function BookingSummary({ trip, selectedSeats, passengerInfo }: BookingSummaryProps) {
  const calculateTotal = () => {
    return selectedSeats.reduce((total, seat) => {
      const multiplier = seat.priceMultiplier ?? 1;
      return total + trip.basePrice * multiplier;
    }, 0);
  };

  const getSeatTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      STANDARD: 'Standard',
      VIP: 'VIP',
      SLEEPER: 'Sleeper'
    };
    return labels[type] || type;
  };

  const [routeDeparture = '', routeArrival = ''] = (trip.route || '')
    .split('->')
    .map((part) => part.trim());

  const resolvedDeparture = trip.departureLocation || routeDeparture;
  const resolvedArrival = trip.arrivalLocation || routeArrival;

  return (
    <div className="booking-summary-card">
      <h3>Booking summary</h3>

      {/* Trip Info */}
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
            <span className="arrow">-&gt;</span>
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

      {/* Passenger Info */}
      <div className="passenger-summary">
        <h4>Passenger details</h4>
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

      {/* Selected Seats */}
      <div className="seats-summary">
        <h4>Selected seats</h4>
        <div className="selected-seats-list">
          {selectedSeats.map((seat) => (
            <div key={seat.id} className="seat-item">
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

      {/* Price Summary */}
      <div className="price-summary">
        <div className="price-breakdown">
          <div className="price-row">
            <span>Seats:</span>
            <span>{selectedSeats.length}</span>
          </div>
          <div className="price-row">
            <span>Base fare:</span>
            <span>{formatPrice(trip.basePrice)}</span>
          </div>
          {selectedSeats.some((seat) => (seat.priceMultiplier ?? 1) > 1) && (
            <div className="price-row">
              <span>VIP surcharge:</span>
              <span>Included</span>
            </div>
          )}
        </div>

        <div className="total-price">
          <div className="price-row total">
            <span>Total:</span>
            <span className="total-amount">{formatPrice(calculateTotal())}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
