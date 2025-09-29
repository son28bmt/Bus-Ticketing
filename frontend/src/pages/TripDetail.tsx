import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/user';
import { tripAPI } from '../services/api';
import type { Trip as ApiTrip, Bus as ApiBus } from '../types/trip';
import type { Trip as PaymentTrip, Seat as PaymentSeat } from '../types/payment';
import '../style/trip-detail.css';

// Local UI seat type (compatible with payment Seat)
type Seat = PaymentSeat;

// UI Trip type extends API Trip bus with optional seats for layout
type UITrip = ApiTrip & { bus: ApiBus & { seats?: Seat[] } };

export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUserStore(); // ✅ Get user from store

  const [trip, setTrip] = useState<UITrip | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Move helper functions inside useCallback để tránh dependency issues
  const loadTripDetail = useCallback(async (tripId: string) => {
    // ✅ Type guard để kiểm tra seats array (moved inside)
    const isValidSeatArray = (seats: unknown): seats is Seat[] => {
      return (
        Array.isArray(seats) &&
        seats.length > 0 &&
        seats.every(
          (seat) =>
            typeof seat === "object" &&
            seat !== null &&
            "id" in seat &&
            "seatNumber" in seat &&
            "seatType" in seat
        )
      );
    };

    // ✅ Generate mock seats if not provided by API (moved inside)
    const generateMockSeats = (totalSeats: number, availableSeats: number): Seat[] => {
      const seats: Seat[] = [];
      const bookedSeats = totalSeats - availableSeats;
      console.log(`🎯 Generating seats: ${bookedSeats}/${totalSeats} booked, ${availableSeats} available`);

      // Create array of all seat numbers and randomize which ones are booked
      // but keep VIP seats (every 5th) more likely to be available
      const vipSeats: number[] = [];
      const standardSeats: number[] = [];
      
      for (let i = 1; i <= totalSeats; i++) {
        if (i % 5 === 0) {
          vipSeats.push(i);
        } else {
          standardSeats.push(i);
        }
      }
      
      // Book seats: prefer to book standard seats first, then VIP if needed
      const standardToBook = Math.min(bookedSeats, standardSeats.length);
      const vipToBook = Math.max(0, bookedSeats - standardSeats.length);
      
      const bookedSeatNumbers = new Set<number>();
      
      // Book random standard seats first
      const shuffledStandard = [...standardSeats].sort(() => Math.random() - 0.5);
      for (let i = 0; i < standardToBook; i++) {
        bookedSeatNumbers.add(shuffledStandard[i]);
      }
      
      // Book VIP seats if needed
      const shuffledVip = [...vipSeats].sort(() => Math.random() - 0.5);
      for (let i = 0; i < vipToBook; i++) {
        bookedSeatNumbers.add(shuffledVip[i]);
      }

      for (let i = 1; i <= totalSeats; i++) {
        const isVip = i % 5 === 0;
        const isBooked = bookedSeatNumbers.has(i);
        
        seats.push({
          id: i,
          seatNumber: i.toString().padStart(2, '0'),
          seatType: isVip ? 'VIP' : 'STANDARD',
          isBooked: isBooked,
          priceMultiplier: isVip ? 1.2 : 1.0
        });
      }

      return seats;
    };

    try {
      console.log("🔄 Loading trip detail for ID:", tripId);
      setLoading(true);
      setError(null);

      const response = await tripAPI.getById(tripId);
      console.log('✅ Trip detail loaded:', response);

      if (!response.success || !response.trip) {
        throw new Error(response.message || 'Không tìm thấy chuyến xe');
      }

  const rawTrip = response.trip as ApiTrip;

      // Ensure facilities array and seats available for UI
      // Try to read seats if backend provided them (optional), else generate mock
      type MaybeSeats = ApiTrip & { bus: ApiBus & { seats?: Seat[] } };
      const potentialSeats = (rawTrip as Partial<MaybeSeats>)?.bus?.seats;

      const busWithSeats: UITrip['bus'] = {
        ...rawTrip.bus,
        facilities: Array.isArray(rawTrip.bus.facilities) ? rawTrip.bus.facilities : [],
        seats: isValidSeatArray(potentialSeats)
          ? potentialSeats
          : generateMockSeats(rawTrip.totalSeats, rawTrip.availableSeats)
      };

      const uiTrip: UITrip = {
        ...rawTrip,
        bus: busWithSeats
      };

      setTrip(uiTrip);
    } catch (error) {
      console.error("❌ Error loading trip detail:", error);
      setError("Không thể tải thông tin chuyến xe");
    } finally {
      setLoading(false);
    }
  }, []); // ✅ Empty dependencies - không có external dependencies

  // ✅ useEffect với proper dependency
  useEffect(() => {
    if (id) {
      loadTripDetail(id);
    }
  }, [id, loadTripDetail]);

  const handleSeatSelect = (seat: Seat) => {
    if (seat.isBooked) return;

    setSelectedSeats((prev) => {
      const isSelected = prev.some(s => s.id === seat.id);
      if (isSelected) {
        return prev.filter(s => s.id !== seat.id);
      } else {
        return [...prev, seat];
      }
    });
  };

  const handleBooking = () => {
    if (!user) {
      alert('Vui lòng đăng nhập để đặt vé');
      navigate('/login');
      return;
    }

    if (selectedSeats.length === 0) {
      alert('Vui lòng chọn ít nhất một ghế');
      return;
    }

    // ✅ Use 'trip' instead of 'tripData'
    if (!trip) {
      alert('Không thể tải thông tin chuyến xe');
      return;
    }

    // Map API Trip to Payment Trip shape (strings for locations and route)
    const toPaymentTrip = (t: UITrip): PaymentTrip => {
      const dep = t.departureLocation?.name || '';
      const arr = t.arrivalLocation?.name || '';
      const durationMins = Math.max(
        0,
        Math.floor((new Date(t.arrivalTime).getTime() - new Date(t.departureTime).getTime()) / 60000)
      );
      return {
        id: t.id,
        route: `${dep} → ${arr}`,
        departureLocation: dep,
        arrivalLocation: arr,
        departureTime: t.departureTime,
        arrivalTime: t.arrivalTime,
        basePrice: t.basePrice,
        totalSeats: t.totalSeats,
        availableSeats: t.availableSeats,
        status: t.status,
        duration: durationMins,
        distance: 0,
        bus: {
          id: t.bus.id,
          busNumber: t.bus.busNumber,
          busType: t.bus.busType,
          capacity: t.bus.capacity,
          facilities: t.bus.facilities,
          seats: trip.bus.seats as Seat[] | undefined
        }
      };
    };

    const paymentTrip = toPaymentTrip(trip);

    navigate('/payment', {
      state: {
        trip: paymentTrip,
        selectedSeats,
        totalPrice: calculateTotalPrice()
      }
    });
  };

  const calculateTotalPrice = () => {
    if (!trip) return 0;
    return selectedSeats.length * trip.basePrice;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? ` ${mins}m` : ""}`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const getBusTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      STANDARD: "Thường",
      SEAT: "Ghế ngồi",
      DELUXE: "Cao cấp",
      LIMOUSINE: "Limousine",
      SLEEPER: "Giường nằm",
    };
    return labels[type] || type;
  };

  const getSeatTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      STANDARD: "Thường",
      VIP: "VIP",
      SLEEPER: "Giường nằm",
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="trip-detail-page">
        <div className="container">
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Đang tải thông tin chuyến xe...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="trip-detail-page">
        <div className="container">
          <div className="error-message">
            <h3>Lỗi tải dữ liệu</h3>
            <p>{error || "Không thể tải thông tin chuyến xe"}</p>
            <button 
              onClick={() => navigate(-1)}
              className="btn btn-primary"
            >
              Quay lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="trip-detail-page">
      <div className="container">
        {/* Header */}
        <div className="trip-header">
          <button
            className="back-btn"
            onClick={() => navigate(-1)}
          >
            ← Quay lại
          </button>
          <h1>Chi tiết chuyến xe</h1>
        </div>

        <div className="trip-detail-content">
          {/* Left Column - Trip Info */}
          <div className="trip-info-card">
            {/* Route Info */}
            <div className="route-info">
              <h2>{`${trip.departureLocation?.name || '—'} → ${trip.arrivalLocation?.name || '—'}`}</h2>
              <p className="route-code">Mã chuyến: {trip.id}</p>
            </div>

            {/* Time Info */}
            <div className="time-info">
              <div className="departure">
                <h3>Điểm đi</h3>
                <div className="time">{formatTime(trip.departureTime)}</div>
                <div className="date">{formatDate(trip.departureTime)}</div>
                <div className="location">{trip.departureLocation?.name || '—'}</div>
              </div>

              <div className="duration">
                <div className="duration-line">
                  <div className="duration-text">{formatDuration(Math.max(0, Math.floor((new Date(trip.arrivalTime).getTime() - new Date(trip.departureTime).getTime()) / 60000)))}</div>
                  <div className="line"></div>
                </div>
              </div>

              <div className="arrival">
                <h3>Điểm đến</h3>
                <div className="time">{formatTime(trip.arrivalTime)}</div>
                <div className="date">{formatDate(trip.arrivalTime)}</div>
                <div className="location">{trip.arrivalLocation?.name || '—'}</div>
              </div>
            </div>

            {/* Bus Info */}
            <div className="bus-info">
              <h3>🚌 Thông tin xe</h3>
              <div className="bus-details">
                <p><strong>Số xe:</strong> {trip.bus.busNumber}</p>
                <p><strong>Loại xe:</strong> {getBusTypeLabel(trip.bus.busType)}</p>
                <p><strong>Số ghế:</strong> {trip.bus.capacity} ghế</p>
                <p><strong>Còn trống:</strong> {trip.availableSeats} ghế</p>
              </div>

              <div className="facilities">
                <h4>Tiện ích:</h4>
                <div className="facilities-list">
                  {trip.bus.facilities.map((facility, index) => (
                    <span key={index} className="facility-tag">
                      {facility}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Seat Selection */}
            <div className="seat-selection">
              <h3>💺 Chọn ghế</h3>
              
              {/* Seat Legend */}
              <div className="seat-legend">
                <div className="legend-item">
                  <span className="seat-demo available"></span>
                  <span>Trống</span>
                </div>
                <div className="legend-item">
                  <span className="seat-demo selected"></span>
                  <span>Đã chọn</span>
                </div>
                <div className="legend-item">
                  <span className="seat-demo booked"></span>
                  <span>Đã đặt</span>
                </div>
              </div>

              {/* Bus Layout */}
              <div className="bus-layout">
                <div className="bus-front">Lái xe</div>
                <div className="seats-grid">
                  {trip.bus.seats && trip.bus.seats.length > 0 ? (
                    trip.bus.seats.map((seat) => {
                      const isSelected = selectedSeats.some(s => s.id === seat.id);
                      const seatClass = `seat ${
                        seat.isBooked ? 'booked' : 
                        isSelected ? 'selected' : 'available'
                      }`;

                      return (
                        <div
                          key={seat.id}
                          className={seatClass}
                          onClick={() => handleSeatSelect(seat)}
                          title={`Ghế ${seat.seatNumber} - ${formatPrice(trip.basePrice)}`}
                        >
                          {seat.seatNumber}
                        </div>
                      );
                    })
                  ) : (
                    <div className="no-seats">
                      <p>Không có thông tin ghế</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Booking Summary */}
          <div className="seat-selection-card">
            <h3>📋 Thông tin đặt vé</h3>
            
            <div className="booking-summary">
              <div className="summary-content">
                <div className="selected-info">
                  <h4>Ghế đã chọn:</h4>
                  {selectedSeats.length > 0 ? (
                    <div className="selected-seats">
                      {selectedSeats.map((seat) => (
                        <div key={seat.id} className="selected-seat">
                          <span>Ghế {seat.seatNumber}</span>
                          <span>({getSeatTypeLabel(seat.seatType)})</span>
                          <span>{formatPrice(trip.basePrice * (seat.priceMultiplier || 1))}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>Chưa chọn ghế nào</p>
                  )}
                </div>

                <div className="price-info">
                  <div className="price-row">
                    <span>Số ghế:</span>
                    <span>{selectedSeats.length}</span>
                  </div>
                  <div className="price-row">
                    <span>Giá vé cơ bản:</span>
                    <span>{formatPrice(trip.basePrice)}</span>
                  </div>
                  <div className="price-row total">
                    <span>Tổng cộng:</span>
                    <span>{formatPrice(calculateTotalPrice())}</span>
                  </div>
                </div>

                <button
                  className="book-btn"
                  onClick={handleBooking}
                  disabled={selectedSeats.length === 0}
                >
                  Đặt vé - {formatPrice(calculateTotalPrice())}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}