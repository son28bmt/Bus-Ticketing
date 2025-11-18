import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import '../../style/search.css';
import { tripAPI } from '../../services/http';
import { LOCATIONS } from '../../constants/locations';
import type { Trip, Location } from '../../types/trip';

// Using shared Trip and Location types

interface SearchFilters {
  busType: string;
  priceRange: {
    min: number;
    max: number;
  };
  departureTime: string;
  company: string;
}

const Search: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // ? States with proper initialization
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([]);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [loadingAllTrips, setLoadingAllTrips] = useState(false);
  const [allTripsError, setAllTripsError] = useState<string | null>(null);
  const [availableLocations, setAvailableLocations] = useState<{ departure: Location[]; arrival: Location[] }>({ departure: [], arrival: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [allTripsPage, setAllTripsPage] = useState(1);

  // Search form state
  const [searchForm, setSearchForm] = useState({
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
    departureDate: searchParams.get('departureDate') || searchParams.get('date') || new Date().toISOString().split('T')[0],
    passengerCount: parseInt(searchParams.get('passengerCount') || '1')
  });

  // Filters state
  const [filters, setFilters] = useState<SearchFilters>({
    busType: '',
    priceRange: { min: 0, max: 10000000 },
    departureTime: '',
    company: ''
  });

  // Available filter options
  const [filterOptions, setFilterOptions] = useState({
    busTypes: [] as string[],
    companies: [] as string[],
    priceRange: { min: 0, max: 10000000 }
  });

  const PAGE_SIZE = 6;
  const ALL_TRIPS_PAGE_SIZE = 8;

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredTrips.length / PAGE_SIZE)),
    [filteredTrips.length]
  );

  const paginatedTrips = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredTrips.slice(start, start + PAGE_SIZE);
  }, [filteredTrips, currentPage]);

  const allTripsTotalPages = useMemo(
    () => Math.max(1, Math.ceil(allTrips.length / ALL_TRIPS_PAGE_SIZE)),
    [allTrips.length]
  );

  const paginatedAllTrips = useMemo(() => {
    const start = (allTripsPage - 1) * ALL_TRIPS_PAGE_SIZE;
    return allTrips.slice(start, start + ALL_TRIPS_PAGE_SIZE);
  }, [allTrips, allTripsPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    if (allTripsPage > allTripsTotalPages) {
      setAllTripsPage(allTripsTotalPages);
    }
  }, [allTripsTotalPages, allTripsPage]);

  // ? Load locations with useCallback (no dependencies needed)
  const loadLocations = useCallback(async () => {
    try {
      console.log('?? Loading locations...');
      const response = await tripAPI.getLocations();
      
      if (response.success && response.locations?.departure) {
        const dep = response.locations.departure;
        const arr = response.locations.arrival || [];
        if ((dep.length === 0) && (arr.length === 0)) {
          console.log('?? API returned empty locations; using fallback');
          const fDep: Location[] = (LOCATIONS.departure || []).map((name, index) => ({ id: index + 1, name, code: name.toUpperCase().replace(/ /g, '_'), province: name }));
          const fArr: Location[] = (LOCATIONS.arrival || LOCATIONS.departure || []).map((name, index) => ({ id: index + 1000, name, code: name.toUpperCase().replace(/ /g, '_'), province: name }));
          setAvailableLocations({ departure: fDep, arrival: fArr });
        } else {
          setAvailableLocations({
            departure: dep,
            arrival: arr
          });
        }
      } else {
        console.log('?? Using fallback locations');
        // Build minimal fallback
        const dep: Location[] = (LOCATIONS.departure || []).map((name, index) => ({ id: index + 1, name, code: name.toUpperCase().replace(/ /g, '_'), province: name }));
        const arr: Location[] = (LOCATIONS.arrival || LOCATIONS.departure || []).map((name, index) => ({ id: index + 1000, name, code: name.toUpperCase().replace(/ /g, '_'), province: name }));
        setAvailableLocations({ departure: dep, arrival: arr });
      }
    } catch (error) {
      console.error('? Error loading locations:', error);
      const dep: Location[] = (LOCATIONS.departure || []).map((name, index) => ({ id: index + 1, name, code: name.toUpperCase().replace(/ /g, '_'), province: name }));
      const arr: Location[] = (LOCATIONS.arrival || LOCATIONS.departure || []).map((name, index) => ({ id: index + 1000, name, code: name.toUpperCase().replace(/ /g, '_'), province: name }));
      setAvailableLocations({ departure: dep, arrival: arr });
    }
  }, []);

  // ? Extract filter options with useCallback
  const extractFilterOptions = useCallback((tripsData: Trip[]) => {
    const busTypes = [...new Set(tripsData.map(trip => trip.bus.busType))];
    const companies = [...new Set(tripsData.map(trip => trip.bus.company?.name || 'Unknown'))];
    const prices = tripsData.map(trip => trip.basePrice);
    
    setFilterOptions({
      busTypes,
      companies: companies.filter(company => company !== 'Unknown'),
      priceRange: {
        min: Math.min(...prices, 0),
        max: Math.max(...prices, 10000000)
      }
    });
  }, []);

  // ? Search trips with proper dependencies
  const searchTrips = useCallback(async (from: string, to: string, departureDate: string, passengerCount: number) => {
    if (!from || !to) {
      setTrips([]);
      setFilteredTrips([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('?? Searching trips:', { from, to, departureDate, passengerCount });

      const response = await tripAPI.searchTrips({
        from,
        to,
        departureDate,
        passengerCount
      });

      console.log('? Search response:', response);

      if (response.success && Array.isArray(response.trips)) {
        setTrips(response.trips);
        extractFilterOptions(response.trips);
      } else {
        setTrips([]);
        setError(response.message || 'Không tìm thấy chuyến xe phù hợp');
      }

    } catch (error) {
      console.error('? Search error:', error);
      setError('Lỗi khi tìm kiếm chuyến xe. Vui lòng thử lại.');
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, [extractFilterOptions]);

  // ? Apply filters with proper dependencies
  const applyFilters = useCallback(() => {
    let filtered = [...trips];

    // Filter by bus type
    if (filters.busType) {
      filtered = filtered.filter(trip => trip.bus.busType === filters.busType);
    }

    // Filter by price range
    filtered = filtered.filter(trip => 
      trip.basePrice >= filters.priceRange.min && 
      trip.basePrice <= filters.priceRange.max
    );

    // Filter by departure time
    if (filters.departureTime) {
      filtered = filtered.filter(trip => {
        const hour = new Date(trip.departureTime).getHours();
        switch (filters.departureTime) {
          case 'morning': return hour >= 6 && hour < 12;
          case 'afternoon': return hour >= 12 && hour < 18;
          case 'evening': return hour >= 18 && hour < 24;
          case 'night': return hour >= 0 && hour < 6;
          default: return true;
        }
      });
    }

    // Filter by company
    if (filters.company) {
      filtered = filtered.filter(trip => trip.bus.company?.name === filters.company);
    }

    setFilteredTrips(filtered);
    setCurrentPage(1);
  }, [trips, filters.busType, filters.priceRange.min, filters.priceRange.max, filters.departureTime, filters.company]);

  // ? Load locations on mount
  useEffect(() => {
    loadLocations();
  }, [loadLocations]);
  // Load a broader list of upcoming trips for discovery section
  useEffect(() => {
    const fetchAllTrips = async () => {
      try {
        setLoadingAllTrips(true);
        setAllTripsError(null);
        const response = await tripAPI.listUpcoming(40);
        const nowTs = Date.now();
        const upcomingTrips = (response.trips || []).filter((trip) => {
          const departureTs = new Date(trip.departureTime).getTime();
          return Number.isFinite(departureTs) && departureTs >= nowTs;
        });

        if (response.success) {
        setAllTrips(upcomingTrips);
        setAllTripsPage(1);
        } else {
          setAllTrips(upcomingTrips);
          if (response.message) setAllTripsError(response.message);
        }
      } catch (err) {
        console.error('List upcoming trips error', err);
  setAllTrips([]);
  setAllTripsError('Không thể tải danh sách chuyến xe');
      } finally {
        setLoadingAllTrips(false);
      }
    };
    fetchAllTrips();
  }, []);

  // Trigger new search whenever form fields change
  useEffect(() => {
    searchTrips(
      searchForm.from,
      searchForm.to,
      searchForm.departureDate,
      searchForm.passengerCount
    );
  }, [searchForm.from, searchForm.to, searchForm.departureDate, searchForm.passengerCount, searchTrips]);

  // ? Apply filters when trips or filters change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // ? Event handlers with proper typing
  const handleSearchFormChange = useCallback((field: string, value: string | number) => {
    const newForm = { ...searchForm, [field]: value };
    setSearchForm(newForm);

    // Update URL params
    const newParams = new URLSearchParams();
    Object.entries(newForm).forEach(([key, val]) => {
      if (val) newParams.set(key, val.toString());
    });
    setSearchParams(newParams);
  }, [searchForm, setSearchParams]);

  // Atomic swap handler: swaps 'from' and 'to' reliably and updates URL
  const handleSwap = useCallback(() => {
    setSearchForm((prev) => {
      const newForm = { ...prev, from: String(prev.to || ''), to: String(prev.from || '') };
      const params = new URLSearchParams();
      Object.entries(newForm).forEach(([key, val]) => {
        if (val !== undefined && val !== null && String(val) !== '') params.set(key, String(val));
      });
      setSearchParams(params);
      return newForm;
    });
  }, [setSearchParams]);

  const handleFilterChange = useCallback((filterType: keyof SearchFilters, value: string | { min: number; max: number }) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      busType: '',
      priceRange: filterOptions.priceRange,
      departureTime: '',
      company: ''
    });
  }, [filterOptions.priceRange]);

  const selectTrip = useCallback((trip: Trip) => {
    navigate(`/trip/${trip.id}`, {
      state: { 
        searchParams: searchForm,
        trip 
      }
    });
  }, [navigate, searchForm]);

  // ? Helper functions (memoized to avoid recreating)
  const formatPrice = useCallback((price: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  }, []);

  const formatTime = useCallback((dateString: string): string => {
    return new Date(dateString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const formatDuration = useCallback((departure: string, arrival: string): string => {
    const dep = new Date(departure);
    const arr = new Date(arrival);
    const diffMs = arr.getTime() - dep.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }, []);

  const getBusTypeLabel = useCallback((type: string): string => {
    const labels: Record<string, string> = {
      SLEEPER: 'Giường nằm',
      SEAT: 'Ghế ngồi',
      LIMOUSINE: 'Limousine',
      VIP: 'VIP'
    };
    return labels[type] || type;
  }, []);

  // Map location ID strings to display names for header
  const getLocationNameById = useCallback((idStr: string, kind: 'from' | 'to'): string => {
    if (!idStr) return '';
    const id = Number(idStr);
    const list = kind === 'from' ? availableLocations.departure : availableLocations.arrival;
    return list.find(l => l.id === id)?.name || idStr;
  }, [availableLocations.arrival, availableLocations.departure]);

  // ? Manual search trigger
  const handleManualSearch = useCallback(() => {
    searchTrips(
      searchForm.from,
      searchForm.to,
      searchForm.departureDate,
      searchForm.passengerCount
    );
  }, [searchForm.from, searchForm.to, searchForm.departureDate, searchForm.passengerCount, searchTrips]);

  const renderTripCard = (trip: Trip) => (
    <div
      key={trip.id}
      className="trip-card"
      onClick={() => selectTrip(trip)}
    >
      <div className="trip-header">
        <div className="route-info">
          <h3>{trip.bus.company?.name || 'Unknown Company'}</h3>
          <p className="bus-type">{getBusTypeLabel(trip.bus.busType)}</p>
        </div>
        <div className="trip-status">
          <span className={`status ${(trip.status || 'unknown').toLowerCase()}`}>
            {trip.availableSeats > 0 ? 'Còn chỗ' : 'Hết chỗ'}
          </span>
        </div>
      </div>

      <div className="trip-details">
        <div className="time-info">
          <div className="departure">
            <span className="time">{formatTime(trip.departureTime)}</span>
            <span className="location">{trip.departureLocation?.name || 'Unknown'}</span>
          </div>
          <div className="duration">
            <span>{formatDuration(trip.departureTime, trip.arrivalTime)}</span>
            <div className="route-line"></div>
          </div>
          <div className="arrival">
            <span className="time">{formatTime(trip.arrivalTime)}</span>
            <span className="location">{trip.arrivalLocation?.name || 'Unknown'}</span>
          </div>
        </div>

        <div className="facilities">
          {trip.bus.facilities.slice(0, 4).map((facility, idx) => (
            <span key={idx} className="facility">{facility}</span>
          ))}
        </div>
      </div>

      <div className="trip-footer">
        <div className="price-info">
          <span className="price">{formatPrice(trip.basePrice)}</span>
          <span className="per-person">/ người</span>
        </div>
        <div className="seats-info">
          <span>Còn {trip.availableSeats}/{trip.totalSeats} ghế</span>
        </div>
        <button
          className="select-btn"
          disabled={trip.availableSeats === 0}
        >
          {trip.availableSeats > 0 ? 'Chọn chuyến' : 'Hết chỗ'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="search-page">
      {/* Search Header */}
      <div className="search-header">
        <div className="container">
          <div className="search-form-horizontal">
            <div className="form-group">
              <label>Điểm đi</label>
              <select
                value={searchForm.from}
                onChange={(e) => handleSearchFormChange('from', e.target.value)}
                className="form-control"
              >
                <option value="">Chọn điểm đi</option>
                {availableLocations.departure.map((location) => (
                  <option key={location.id} value={String(location.id)}>{location.name}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="swap-button"
              onClick={handleSwap}
              aria-label="Đổi điểm đi và điểm đến"
              title="Đổi điểm đi/đến"
            >
              ⇄
            </button>

            <div className="form-group">
              <label>Điểm đến</label>
              <select
                value={searchForm.to}
                onChange={(e) => handleSearchFormChange('to', e.target.value)}
                className="form-control"
              >
                <option value="">Chọn điểm đến</option>
                {(searchForm.from
                  ? availableLocations.arrival.filter(l => String(l.id) !== String(searchForm.from))
                  : availableLocations.arrival
                ).map((location) => (
                  <option key={location.id} value={String(location.id)}>{location.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Ngày đi</label>
              <input
                type="date"
                value={searchForm.departureDate}
                onChange={(e) => handleSearchFormChange('departureDate', e.target.value)}
                className="form-control"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* <div className="form-group">
              <label>số hành khách</label>
              <select
                value={searchForm.passengerCount}
                onChange={(e) => handleSearchFormChange('passengerCount', parseInt(e.target.value))}
                className="form-control"
              >
                {[1,2,3,4,5,6,7,8,9,10].map(num => (
                  <option key={num} value={num}>{num} người</option>
                ))}
              </select>
            </div> */}

            <button 
              onClick={handleManualSearch}
              className="search-btn"
              disabled={loading || !searchForm.from || !searchForm.to}
            >
              {loading ? 'Đang tìm...' : 'Tìm chuyến'}
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="search-content">
          {/* Sidebar Filters */}
          <aside className="search-sidebar">
            <div className="filter-section">
              <div className="filter-header">
                <h3>Bộ lọc</h3>
                <button onClick={clearFilters} className="clear-filters">
                  Xóa bộ lọc
                </button>
              </div>

              {/* Bus Type Filter */}
              {filterOptions.busTypes.length > 0 && (
                <div className="filter-group">
                  <h4>Loại xe</h4>
                  <div className="filter-options">
                    {filterOptions.busTypes.map(type => (
                      <label key={type} className="filter-option">
                        <input
                          type="radio"
                          name="busType"
                          value={type}
                          checked={filters.busType === type}
                          onChange={(e) => handleFilterChange('busType', e.target.value)}
                        />
                        <span>{getBusTypeLabel(type)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Range Filter */}
              <div className="filter-group">
                <h4>Khoảng giá</h4>
                <div className="price-range">
                  <input
                    type="range"
                    min={filterOptions.priceRange.min}
                    max={filterOptions.priceRange.max}
                    value={filters.priceRange.max}
                    onChange={(e) => handleFilterChange('priceRange', {
                      ...filters.priceRange,
                      max: parseInt(e.target.value)
                    })}
                    className="price-slider"
                  />
                  <div className="price-labels">
                    <span>{formatPrice(filters.priceRange.min)}</span>
                    <span>{formatPrice(filters.priceRange.max)}</span>
                  </div>
                </div>
              </div>

              {/* Departure Time Filter */}
              <div className="filter-group">
                <h4>Giờ khởi hành</h4>
                <div className="filter-options">
                  {[
                    { value: 'morning', label: 'Sáng (6:00 - 12:00)' },
                    { value: 'afternoon', label: 'Chiều (12:00 - 18:00)' },
                    { value: 'evening', label: 'Tối (18:00 - 24:00)' },
                    { value: 'night', label: 'Đêm (0:00 - 6:00)' }
                  ].map(time => (
                    <label key={time.value} className="filter-option">
                      <input
                        type="radio"
                        name="departureTime"
                        value={time.value}
                        checked={filters.departureTime === time.value}
                        onChange={(e) => handleFilterChange('departureTime', e.target.value)}
                      />
                      <span>{time.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Company Filter */}
              {filterOptions.companies.length > 0 && (
                <div className="filter-group">
                  <h4>Nhà xe</h4>
                  <div className="filter-options">
                    {filterOptions.companies.map(company => (
                      <label key={company} className="filter-option">
                        <input
                          type="radio"
                          name="company"
                          value={company}
                          checked={filters.company === company}
                          onChange={(e) => handleFilterChange('company', e.target.value)}
                        />
                        <span>{company}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <main className="search-main">
            {/* Search Results Header */}
            <div className="results-header">
              <h2>
                {searchForm.from && searchForm.to
                  ? `${getLocationNameById(searchForm.from, 'from')} - ${getLocationNameById(searchForm.to, 'to')}`
                  : 'Kết quả tìm kiếm'}
              </h2>
              <p>
                {loading ? (
                  'Đang tìm kiếm...'
                ) : (
                  `Tìm thấy ${filteredTrips.length} chuyến xe`
                )}
              </p>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Đang tìm kiếm chuyến xe...</p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="error-container">
                <p className="error-message">Lỗi: {error}</p>
                <button onClick={handleManualSearch} className="retry-btn">
                  Thử lại
                </button>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && filteredTrips.length === 0 && trips.length === 0 && (
              <div className="empty-state">
                <h3>Chưa có tìm kiếm nào</h3>
                <p>Vui lòng chọn điểm đi, điểm đến và ngày khởi hành</p>
              </div>
            )}

            {/* No Results State */}
            {!loading && !error && trips.length > 0 && filteredTrips.length === 0 && (
              <div className="no-results">
                <h3>Không tìm thấy chuyến xe phù hợp</h3>
                <p>Thử điều chỉnh bộ lọc hoặc thay đổi điều kiện tìm kiếm</p>
                <button onClick={clearFilters} className="clear-filters-btn">
                  Xóa bộ lọc
                </button>
              </div>
            )}

            {/* Trip Results */}
            {!loading && filteredTrips.length > 0 && (
              <div className="trip-results">
                {paginatedTrips.map(renderTripCard)}
              </div>
            )}

            {!loading && !error && totalPages > 1 && (
              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  onClick={() => {
                    const next = Math.max(1, currentPage - 1);
                    if (next !== currentPage) {
                      setCurrentPage(next);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  disabled={currentPage === 1}
                >
                  Truoc
                </button>
                {Array.from({ length: totalPages }).map((_, index) => {
                  const page = index + 1;
                  return (
                    <button
                      key={page}
                      className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
                      onClick={() => {
                        setCurrentPage(page);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  className="pagination-btn"
                  onClick={() => {
                    const next = Math.min(totalPages, currentPage + 1);
                    if (next !== currentPage) {
                      setCurrentPage(next);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  disabled={currentPage === totalPages}
                >
                  Sau
                </button>
              </div>
            )}

            <section className="all-trips-section">
              <div className="results-header">
                <h2>Tất cả chuyến xe</h2>
                <p>Danh sách các chuyến đang mở đặt vé</p>
              </div>

              {loadingAllTrips && (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Đang tải danh sách chuyến xe...</p>
                </div>
              )}

              {allTripsError && !loadingAllTrips && (
                <div className="error-container">
                  <p className="error-message">Lỗi: {allTripsError}</p>
                </div>
              )}

              {!loadingAllTrips && !allTripsError && allTrips.length === 0 && (
                <div className="empty-state">
                  <p>Không có chuyến xe nào sẵn sàng.</p>
                </div>
              )}

              {!loadingAllTrips && !allTripsError && allTrips.length > 0 && (
                <div className="trip-results">
                  {paginatedAllTrips.map(renderTripCard)}
                </div>
              )}

              {!loadingAllTrips && !allTripsError && allTripsTotalPages > 1 && (
                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    onClick={() => {
                      const next = Math.max(1, allTripsPage - 1);
                      if (next !== allTripsPage) {
                        setAllTripsPage(next);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    disabled={allTripsPage === 1}
                  >
                    Truoc
                  </button>
                  {Array.from({ length: allTripsTotalPages }).map((_, index) => {
                    const page = index + 1;
                    return (
                      <button
                        key={page}
                        className={`pagination-btn ${page === allTripsPage ? 'active' : ''}`}
                        onClick={() => {
                          setAllTripsPage(page);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    className="pagination-btn"
                    onClick={() => {
                      const next = Math.min(allTripsTotalPages, allTripsPage + 1);
                      if (next !== allTripsPage) {
                        setAllTripsPage(next);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    disabled={allTripsPage === allTripsTotalPages}
                  >
                    Sau
                  </button>
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Search;











