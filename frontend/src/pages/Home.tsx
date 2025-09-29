import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/home.css';
import { tripAPI } from '../services/api';
import { LOCATIONS } from '../constants/locations'; // ✅ Import đúng

// Align local types structurally with API responses
interface Location {
  id: number;
  name: string;
  code: string;
  province?: string;
}

// Minimal trip shape needed for Home UI, structural typing avoids Trip name conflicts
interface TripAPI {
  id: number;
  departureTime: string;
  arrivalTime: string;
  basePrice: number;
  totalSeats?: number;
  availableSeats: number;
  status: string;
  bus: {
    id: number;
    busNumber: string;
    busType: string;
    capacity?: number;
    facilities: string[];
  };
  departureLocation?: { id: number; name: string };
  arrivalLocation?: { id: number; name: string };
}

export default function Home() {
  const navigate = useNavigate();

  // ✅ State với fallback values
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  const [featuredTrips, setFeaturedTrips] = useState<TripAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchForm, setSearchForm] = useState({
    from: "",
    to: "",
    date: new Date().toISOString().split("T")[0],
  });

  // Load dữ liệu
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('🔄 Loading data...');
        
        const [locationsRes, featuredRes] = await Promise.all([
          tripAPI.getLocations().catch(() => ({ locations: { departure: [], arrival: [] } })),
          tripAPI.getFeatured().catch(() => ({ trips: [] }))
        ]);
        
    // ✅ Safe access to API response
    const locations: Location[] = locationsRes?.locations?.departure || [];
    const tripsRaw = featuredRes?.trips || [];
        
    console.log('✅ API Data:', { locations, trips: tripsRaw });
        
        setAvailableLocations(locations);
        // Normalize featured trips into TripAPI shape to avoid type conflicts
        type RawTrip = {
          id?: unknown;
          departureTime?: unknown;
          arrivalTime?: unknown;
          basePrice?: unknown;
          availableSeats?: unknown;
          totalSeats?: unknown;
          status?: unknown;
          bus?: {
            id?: unknown;
            busNumber?: unknown;
            busType?: unknown;
            capacity?: unknown;
            totalSeats?: unknown;
            facilities?: unknown;
          };
          departureLocation?: { id?: unknown; name?: unknown };
          arrivalLocation?: { id?: unknown; name?: unknown };
        };

        const source: RawTrip[] = Array.isArray(tripsRaw) ? (tripsRaw as RawTrip[]) : [];
        const normalizedTrips: TripAPI[] = source.map((t) => ({
          id: Number(t.id ?? 0),
          departureTime: String(t.departureTime ?? ''),
          arrivalTime: String(t.arrivalTime ?? ''),
          basePrice: Number(t.basePrice ?? 0),
          totalSeats: typeof t.totalSeats === 'number' ? t.totalSeats : (typeof t.bus?.totalSeats === 'number' ? t.bus?.totalSeats : 0),
          availableSeats: Number(t.availableSeats ?? 0),
          status: String(t.status ?? 'SCHEDULED'),
          bus: {
            id: Number(t.bus?.id ?? 0),
            busNumber: String(t.bus?.busNumber ?? ''),
            busType: String((t.bus?.busType as string) ?? ''),
            capacity: typeof t.bus?.capacity === 'number' ? t.bus.capacity : (typeof t.bus?.totalSeats === 'number' ? t.bus.totalSeats : undefined),
            facilities: Array.isArray(t.bus?.facilities) ? (t.bus?.facilities as string[]) : []
          },
          departureLocation: t.departureLocation && typeof t.departureLocation.id !== 'undefined' && typeof t.departureLocation.name !== 'undefined'
            ? { id: Number(t.departureLocation.id), name: String(t.departureLocation.name) }
            : undefined,
          arrivalLocation: t.arrivalLocation && typeof t.arrivalLocation.id !== 'undefined' && typeof t.arrivalLocation.name !== 'undefined'
            ? { id: Number(t.arrivalLocation.id), name: String(t.arrivalLocation.name) }
            : undefined
        }));
        setFeaturedTrips(normalizedTrips);
        
      } catch (error) {
        console.error("❌ Error loading data:", error);
        
        // ✅ Fallback to constants when API fails
        // Normalize fallback string[] to Location[]
        const fallbackLocations: Location[] = (LOCATIONS.departure || []).map((name, idx) => ({
          id: idx + 1,
          name,
          code: name.toUpperCase().replace(/\s+/g, '_'),
          province: name
        }));

        setAvailableLocations(fallbackLocations);
        setFeaturedTrips([]);
        
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setSearchForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleQuickSearch = () => {
    if (!searchForm.from || !searchForm.to) {
      alert("Vui lòng chọn điểm đi và điểm đến");
      return;
    }

    if (searchForm.from === searchForm.to) {
      alert("Điểm đi và điểm đến không thể giống nhau");
      return;
    }

    const params = new URLSearchParams(searchForm);
    navigate(`/search?${params}`);
  };

  // Helpers
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const getBusTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      STANDARD: "Thường",
      DELUXE: "Cao cấp",
      LIMOUSINE: "Limousine",
      SLEEPER: "Giường nằm",
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="home-page">
        <div className="loading-center">
          <div className="loading-spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Đặt vé xe khách trực tuyến</h1>
          <p>Tìm và đặt vé xe khách nhanh chóng, tiện lợi với ShanBus</p>
        </div>
      </section>

      {/* Quick Search */}
      <section className="quick-search">
        <div className="container">
          <div className="search-card">
            <h2>Tìm chuyến xe</h2>

            <div className="search-form">
              <div className="search-row">
                {/* From */}
                <div className="form-group">
                  <label>Điểm đi</label>
                  <select
                    value={searchForm.from}
                    onChange={(e) => handleInputChange("from", e.target.value)}
                    className="form-control"
                  >
                    <option value="">Chọn điểm đi</option>
                    {/* ✅ Safe mapping với fallback */}
                    {(availableLocations && Array.isArray(availableLocations)
                      ? availableLocations
                      : (LOCATIONS.departure || []).map((name, idx) => ({ id: idx + 1, name, code: name.toUpperCase().replace(/\s+/g, '_') }))
                    ).map((location) => (
                      <option key={location.id} value={String(location.id)}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* To */}
                <div className="form-group">
                  <label>Điểm đến</label>
                  <select
                    value={searchForm.to}
                    onChange={(e) => handleInputChange("to", e.target.value)}
                    className="form-control"
                  >
                    <option value="">Chọn điểm đến</option>
                    {/* ✅ Safe mapping với fallback */}
                    {(availableLocations && Array.isArray(availableLocations)
                      ? availableLocations
                      : (LOCATIONS.arrival || []).map((name, idx) => ({ id: idx + 1, name, code: name.toUpperCase().replace(/\s+/g, '_') }))
                    ).map((location) => (
                      <option key={location.id} value={String(location.id)}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div className="form-group">
                  <label>Ngày đi</label>
                  <input
                    type="date"
                    value={searchForm.date}
                    onChange={(e) => handleInputChange("date", e.target.value)}
                    className="form-control"
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>

                {/* Search Button */}
                <div className="form-group">
                  <button 
                    onClick={handleQuickSearch}
                    className="search-btn"
                  >
                    Tìm chuyến
                  </button>
                </div>
              </div>
            </div>

            {/* Available Locations Display */}
            <div className="available-locations">
              {availableLocations.length > 0 && (
                <div>
                  <p>Các tuyến phổ biến:</p>
                  <div className="popular-routes">
                    {availableLocations.slice(0, 6).map((location) => (
                      <span key={location.id} className="location-tag">
                        {location.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Trips */}
      <section className="featured-trips">
        <div className="container">
          <h2>Chuyến xe nổi bật</h2>
          <p>Các chuyến xe phổ biến với giá tốt</p>

          {featuredTrips.length > 0 ? (
            <div className="trips-grid">
              {featuredTrips.map((trip) => (
                <div key={trip.id} className="trip-card" onClick={() => navigate(`/trip/${trip.id}`)}>
                  <div className="trip-header">
                    <div className="route">
                      <span>{trip.departureLocation?.name || '—'}</span>
                      <span className="arrow">→</span>
                      <span>{trip.arrivalLocation?.name || '—'}</span>
                    </div>
                    <div className="bus-type">
                      {getBusTypeLabel(trip.bus.busType)}
                    </div>
                  </div>

                  <div className="trip-details">
                    <div className="time">
                      <span>{formatTime(trip.departureTime)}</span>
                      <span className="duration">~4h</span>
                      <span>{formatTime(trip.arrivalTime)}</span>
                    </div>

                    <div className="facilities">
                      {trip.bus.facilities.slice(0, 3).map((facility, idx) => (
                        <span key={idx} className="facility">{facility}</span>
                      ))}
                    </div>
                  </div>

                  <div className="trip-footer">
                    <div className="price">{formatPrice(trip.basePrice)}</div>
                    <div className="seats">Còn {trip.availableSeats} ghế</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-featured">
              <p>🚌 Chưa có chuyến xe nổi bật</p>
              <p>Vui lòng quay lại sau hoặc tìm kiếm chuyến xe khác</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}