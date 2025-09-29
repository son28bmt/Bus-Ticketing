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
      const multiplier = seat.priceMultiplier || 1;
      return total + (trip.basePrice * multiplier);
    }, 0);
  };

  const getSeatTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      STANDARD: 'Thường',
      VIP: 'VIP',
      SLEEPER: 'Giường nằm'
    };
    return labels[type] || type;
  };

  return (
    <div className="booking-summary-card">
      <h3>📋 Thông tin đặt vé</h3>
      
      {/* Trip Info */}
      <div className="trip-summary">
        <h4>🚌 Thông tin chuyến xe</h4>
        <div className="trip-route">
          <div className="route-info">
            <span className="departure">
              <strong>{trip.departureLocation || (trip.route?.split('→')[0]?.trim() || '')}</strong>
              <small>{formatTime(trip.departureTime)} - {formatDate(trip.departureTime)}</small>
            </span>
            <span className="arrow">→</span>
            <span className="arrival">
              <strong>{trip.arrivalLocation || (trip.route?.split('→')[1]?.trim() || '')}</strong>
              <small>{formatTime(trip.arrivalTime)} - {formatDate(trip.arrivalTime)}</small>
            </span>
          </div>
        </div>
        
        <div className="trip-details">
          <p><strong>Xe:</strong> {trip.bus.busNumber} ({trip.bus.busType})</p>
          <p><strong>Tuyến:</strong> {trip.route}</p>
        </div>
      </div>

      {/* Passenger Info */}
      <div className="passenger-summary">
        <h4>👤 Thông tin hành khách</h4>
        <div className="passenger-details">
          <p><strong>Họ tên:</strong> {passengerInfo.name}</p>
          <p><strong>Điện thoại:</strong> {passengerInfo.phone}</p>
          {passengerInfo.email && (
            <p><strong>Email:</strong> {passengerInfo.email}</p>
          )}
        </div>
      </div>

      {/* Selected Seats */}
      <div className="seats-summary">
        <h4>💺 Ghế đã chọn</h4>
        <div className="selected-seats-list">
          {selectedSeats.map((seat) => (
            <div key={seat.id} className="seat-item">
              <div className="seat-info">
                <span className="seat-number">{seat.seatNumber}</span>
                <span className="seat-type">({getSeatTypeLabel(seat.seatType)})</span>
              </div>
              <div className="seat-price">
                {formatPrice(trip.basePrice * (seat.priceMultiplier || 1))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Price Summary */}
      <div className="price-summary">
        <div className="price-breakdown">
          <div className="price-row">
            <span>Số ghế:</span>
            <span>{selectedSeats.length} ghế</span>
          </div>
          <div className="price-row">
            <span>Giá vé cơ bản:</span>
            <span>{formatPrice(trip.basePrice)}</span>
          </div>
          {selectedSeats.some(seat => seat.priceMultiplier && seat.priceMultiplier > 1) && (
            <div className="price-row">
              <span>Phí ghế VIP:</span>
              <span>Đã tính</span>
            </div>
          )}
        </div>
        
        <div className="total-price">
          <div className="price-row total">
            <span>Tổng cộng:</span>
            <span className="total-amount">{formatPrice(calculateTotal())}</span>
          </div>
        </div>
      </div>
    </div>
  );
}