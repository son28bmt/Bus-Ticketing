import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUserStore } from '../../store/user';
import { tripAPI } from '../../services/http';
import type { Trip as ApiTrip, Bus as ApiBus } from '../../types/trip';
import type { Trip as PaymentTrip, Seat as PaymentSeat } from '../../types/payment';
import '../../style/trip-detail.css';

// UI seat type (compatible with payment Seat)
type Seat = PaymentSeat;

// UI Trip type extends API Trip with optional seats for layout
type UITrip = ApiTrip & { bus: ApiBus & { seats?: Seat[] } };

export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUserStore();

  const [trip, setTrip] = useState<UITrip | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load trip detail
  const loadTripDetail = useCallback(async (tripId: string) => {
    const normalizeSeatNumber = (value: unknown, fallback: string): string => {
      if (value == null) return fallback;
      const raw = String(value).trim();
      return raw.length > 0 ? raw : fallback;
    };

    const generateMockSeats = (
      totalSeats: number,
      seatTypeHint: string,
      bookedSeats: Set<string>
    ): Seat[] => {
      const seats: Seat[] = [];
      const normalizedHint = seatTypeHint?.toUpperCase?.() ?? '';

      const deriveSeatType = (index: number): Seat['seatType'] => {
        if (normalizedHint.includes('SLEEPER')) return 'SLEEPER';
        if (normalizedHint.includes('LIMOUSINE') || normalizedHint.includes('DELUXE'))
          return (index + 1) % 4 === 0 ? 'VIP' : 'STANDARD';
        if (normalizedHint.includes('VIP')) return 'VIP';
        return (index + 1) % 5 === 0 ? 'VIP' : 'STANDARD';
      };

      const multiplierForSeatType = (seatType: Seat['seatType']): number => {
        if (seatType === 'VIP') return 1.2;
        if (seatType === 'SLEEPER') return 1.1;
        return 1;
      };

      for (let i = 0; i < totalSeats; i++) {
        const seatNumber = (i + 1).toString().padStart(2, '0');
        const seatType = deriveSeatType(i);
        const isBooked = bookedSeats.has(seatNumber) || bookedSeats.has(String(i + 1));
        seats.push({
          id: i + 1,
          seatNumber,
          seatType,
          isBooked,
          priceMultiplier: multiplierForSeatType(seatType)
        });
      }
      return seats;
    };

    try {
      console.log('Loading trip detail for ID:', tripId);
      setLoading(true);
      setError(null);

      const response = await tripAPI.getById(tripId);
      if (!response.success || !response.trip) {
        throw new Error(response.message || 'Không tìm thấy chuyến xe');
      }

      const rawTrip = response.trip as ApiTrip & { bookedSeatNumbers?: unknown };
      const bookedSeatNumbers = Array.isArray(rawTrip.bookedSeatNumbers)
        ? rawTrip.bookedSeatNumbers
            .map((v) => normalizeSeatNumber(v, ''))
            .filter(Boolean)
        : [];
      const bookedSeatSet = new Set<string>(bookedSeatNumbers);

      const potentialSeats = rawTrip.bus?.seats;
      const busTypeHint = rawTrip.bus?.busType ?? '';
      const normalizeSeatCollection = (seats: Seat[] | undefined): Seat[] | undefined => {
        if (!seats) return undefined;
        return seats
          .map((seat, index) => {
            const fallbackNumber = (index + 1).toString().padStart(2, '0');
            const seatNumber = normalizeSeatNumber(seat.seatNumber, fallbackNumber);
            const seatIdStr = String(seat.id ?? '');
            const computedIsBooked =
              seat.isBooked != null
                ? seat.isBooked
                : bookedSeatSet.has(seatNumber) || bookedSeatSet.has(seatIdStr);
            return {
              ...seat,
              id: seat.id ?? index + 1,
              seatNumber,
              priceMultiplier: seat.priceMultiplier ?? 1,
              isBooked: computedIsBooked
            };
          })
          .sort((a, b) =>
            a.seatNumber.localeCompare(b.seatNumber, undefined, {
              numeric: true,
              sensitivity: 'base'
            })
          );
      };
    const normalizedSeats = normalizeSeatCollection(
        Array.isArray(potentialSeats) ? (potentialSeats as Seat[]) : undefined
      );

      const busWithSeats: UITrip['bus'] = {
        ...rawTrip.bus,
        facilities: Array.isArray(rawTrip.bus.facilities) ? rawTrip.bus.facilities : [],
        seats: normalizedSeats ?? generateMockSeats(rawTrip.totalSeats, busTypeHint, bookedSeatSet)
      };

      const uiTrip: UITrip = {
        ...rawTrip,
        bus: busWithSeats,
        bookedSeatNumbers: Array.from(bookedSeatSet)
      };

      setTrip(uiTrip);
      setSelectedSeats([]);
    } catch (err) {
      console.error('Error loading trip detail:', err);
      setError('Không thể tải thông tin chuyến xe');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) loadTripDetail(id);
  }, [id, loadTripDetail]);

  const handleSeatSelect = (seat: Seat) => {
    if (seat.isBooked) return;
    setSelectedSeats((prev) => {
      const isSelected = prev.some((s) => s.seatNumber === seat.seatNumber);
      return isSelected
        ? prev.filter((s) => s.seatNumber !== seat.seatNumber)
        : [...prev, seat];
    });
  };

  const calculateTotalPrice = () =>
    trip
      ? selectedSeats.reduce(
          (sum, seat) => sum + trip.basePrice * (seat.priceMultiplier ?? 1),
          0
        )
      : 0;

  const handleBooking = () => {
    if (!user) {
      alert('Vui lòng đăng nhập để đặt vé');
      navigate('/login');
      return;
    }
    if (!trip) {
      alert('Không thể tải thông tin chuyến xe');
      return;
    }
    if (selectedSeats.length === 0) {
      alert('Vui lòng chọn ít nhất một ghế');
      return;
    }

    const toPaymentTrip = (t: UITrip): PaymentTrip => {
      const dep = t.departureLocation?.name || '';
      const arr = t.arrivalLocation?.name || '';
      const durationMins = Math.max(
        0,
        Math.floor(
          (new Date(t.arrivalTime).getTime() - new Date(t.departureTime).getTime()) / 60000
        )
      );

      return {
        id: t.id,
        route: `${dep} -> ${arr}`,
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
          seats: t.bus.seats
        }
      };
    };

    navigate('/payment', {
      state: {
        trip: toPaymentTrip(trip),
        selectedSeats,
        totalPrice: calculateTotalPrice()
      }
    });
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  // Render states
  if (loading)
    return (
      <div className="trip-detail-page">
        <div className="container">
          <div className="loading">
            <div className="loading-spinner" />
            <p>Đang tải thông tin chuyến xe...</p>
          </div>
        </div>
      </div>
    );

  if (error || !trip)
    return (
      <div className="trip-detail-page">
        <div className="container">
          <div className="error-message">
            <h3>Lỗi tải dữ liệu</h3>
            <p>{error || 'Không thể tải thông tin chuyến xe'}</p>
            <button onClick={() => navigate(-1)} className="btn btn-primary">
              Quay lại
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="trip-detail-page">
      <div className="container">
        <div className="trip-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← Quay lại
          </button>
          <h1>Chi tiết chuyến xe</h1>
        </div>

        <div className="trip-detail-content">
          {/* Left Column */}
          <div className="trip-info-card">
            <div className="route-info">
              <h2>
                {trip.departureLocation?.name} → {trip.arrivalLocation?.name}
              </h2>
              <p className="route-code">Mã chuyến: {trip.id}</p>
            </div>

            <div className="bus-info">
              <h3>Thông tin xe</h3>
              <p>
                <strong>Số xe:</strong> {trip.bus.busNumber}
              </p>
              <p>
                <strong>Loại xe:</strong> {trip.bus.busType}
              </p>
              <p>
                <strong>Tổng số ghế:</strong> {trip.bus.capacity}
              </p>
              <p>
                <strong>Còn trống:</strong> {trip.availableSeats}
              </p>

              <h4>Tiện ích:</h4>
              <div className="facilities-list">
                {trip.bus.facilities.map((f, i) => (
                  <span key={i} className="facility-tag">
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div className="seat-selection">
              <h3>Chọn ghế</h3>
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

              <div className="bus-layout">
                <div className="bus-front">Tài xế</div>
                <div className="seats-grid">
                  {(trip.bus.seats as Seat[] | undefined)?.map((seat: Seat) => {
                    const isSelected = selectedSeats.some(
                      (s) => s.seatNumber === seat.seatNumber
                    );
                    const cls = seat.isBooked
                      ? 'seat booked'
                      : isSelected
                      ? 'seat selected'
                      : 'seat available';
                    return (
                      <div
                        key={seat.id ?? seat.seatNumber}
                        className={cls}
                        onClick={() => handleSeatSelect(seat as Seat)}
                      >
                        {seat.seatNumber}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="seat-selection-card">
            <h3>Thông tin đặt vé</h3>
            <div className="booking-summary">
              <h4>Ghế đã chọn:</h4>
              {selectedSeats.length > 0 ? (
                selectedSeats.map((s) => (
                  <div key={s.id} className="selected-seat">
                    Ghế {s.seatNumber} ({s.seatType}) —{' '}
                    {formatPrice(trip.basePrice * (s.priceMultiplier || 1))}
                  </div>
                ))
              ) : (
                <p>Chưa chọn ghế nào</p>
              )}

              <hr />
              <p>
                <strong>Tổng cộng:</strong> {formatPrice(calculateTotalPrice())}
              </p>

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
  );
}
