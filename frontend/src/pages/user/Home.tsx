import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import "../../style/home.css";
import { tripAPI } from "../../services/http";
import { LOCATIONS } from "../../constants/locations";
import newsService from "../../services/news";
import type { News } from "../../types/news";

type Location = { id: number; name: string; code: string; province?: string };
type TripAPI = {
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
    facilities: string[];
    totalSeats?: number;
    company?: { name?: string };
  };
  departureLocation?: { id: number; name: string };
  arrivalLocation?: { id: number; name: string };
};

export default function Home() {
  const navigate = useNavigate();
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  const [featuredTrips, setFeaturedTrips] = useState<TripAPI[]>([]);
  type DisplayNews = Pick<News, 'id' | 'title' | 'slug' | 'summary' | 'featuredImage'> & { company?: { name?: string } };
  const [highlightedNews, setHighlightedNews] = useState<DisplayNews[]>([]);
  const [otherNews, setOtherNews] = useState<DisplayNews[]>([]);
  const [searchForm, setSearchForm] = useState({
    from: "",
    to: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [featuredPage, setFeaturedPage] = useState(1);
  const FEATURED_PAGE_SIZE = 6;

  // Map full News to display shape for the homepage cards
  const toDisplayNews = (n: News): DisplayNews => ({
    id: n.id,
    title: n.title,
    slug: n.slug,
    summary: n.summary,
    featuredImage: n.featuredImage,
    company: n.company && n.company.name ? { name: n.company.name } : undefined,
  });

  const featuredTotalPages = useMemo(
    () => Math.max(1, Math.ceil(featuredTrips.length / FEATURED_PAGE_SIZE)),
    [featuredTrips.length]
  );

  const paginatedFeaturedTrips = useMemo(() => {
    const start = (featuredPage - 1) * FEATURED_PAGE_SIZE;
    return featuredTrips.slice(start, start + FEATURED_PAGE_SIZE);
  }, [featuredTrips, featuredPage]);

  useEffect(() => {
    if (featuredPage > featuredTotalPages) {
      setFeaturedPage(featuredTotalPages);
    }
  }, [featuredTotalPages, featuredPage]);

  useEffect(() => {
    const load = async () => {
      try {
        const [locRes, featRes] = await Promise.all([
          tripAPI
            .getLocations()
            .catch(() => ({ locations: { departure: [], arrival: [] } })),
          tripAPI.getFeatured().catch(() => ({ trips: [] })),
        ]);

        const locs: Location[] = locRes?.locations?.departure || [];
  const tripsRaw: TripAPI[] = (featRes?.trips || []) as TripAPI[];

        setAvailableLocations(
          locs.length
            ? locs
            : (LOCATIONS.departure || []).map((n, i) => ({
                id: i + 1,
                name: n,
                code: n.toUpperCase().replace(/\s+/g, "_"),
                province: n,
              }))
        );

        // Load highlighted news (big card) and other news list
        try {
          const [hiRes, otherRes] = await Promise.all([
            newsService.getPublicNews({ highlighted: true, limit: 10, sortBy: 'publishedAt', sortOrder: 'DESC' }),
            newsService.getPublicNews({ highlighted: false, limit: 10, sortBy: 'publishedAt', sortOrder: 'DESC' }),
          ]);
          const hiArr: News[] = (hiRes?.data?.news || []) as News[];
          const otherArr: News[] = (otherRes?.data?.news || []) as News[];
          setHighlightedNews(hiArr.map(toDisplayNews));
          setOtherNews(otherArr.map(toDisplayNews));
        } catch (err) {
          console.warn("⚠️ Failed to load highlighted news:", err);
          setHighlightedNews([]);
          setOtherNews([]);
        }
  const normalized = tripsRaw.map((t: TripAPI) => ({
          id: Number(t.id || 0),
          departureTime: String(t.departureTime || ""),
          arrivalTime: String(t.arrivalTime || ""),
          basePrice: Number(t.basePrice || 0),
          totalSeats: Number(t.totalSeats || t.bus?.totalSeats || 0),
          availableSeats: Number(t.availableSeats || 0),
          status: String(t.status || "SCHEDULED"),
          bus: {
            id: Number(t.bus?.id || 0),
            busNumber: String(t.bus?.busNumber || ""),
            busType: String(t.bus?.busType || ""),
            facilities: Array.isArray(t.bus?.facilities)
              ? t.bus.facilities
              : [],
            company: t.bus?.company || {},
          },
          departureLocation: t.departureLocation || undefined,
          arrivalLocation: t.arrivalLocation || undefined,
        })) as TripAPI[];

        const nowTs = Date.now();
        const upcomingTrips = normalized.filter((trip) => {
          const departureTs = new Date(trip.departureTime).getTime();
          return Number.isFinite(departureTs) && departureTs >= nowTs;
        });

        setFeaturedTrips(upcomingTrips.slice(0, 30));
        setFeaturedPage(1);
      } catch (err) {
        console.error("Home load error", err);
        setAvailableLocations(
          (LOCATIONS.departure || []).map((n, i) => ({
            id: i + 1,
            name: n,
            code: n.toUpperCase().replace(/\s+/g, "_"),
            province: n,
          }))
        );
        setFeaturedTrips([]);
        setHighlightedNews([]);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (field: string, value: string) =>
    setSearchForm((prev) => ({ ...prev, [field]: value }));
  const handleQuickSearch = () => {
    if (!searchForm.from || !searchForm.to)
      return alert("Vui lòng chọn điểm đi và điểm đến");
    if (searchForm.from === searchForm.to)
      return alert("Điểm đi và điểm đến không thể giống nhau");
  navigate(`/search?${new URLSearchParams({ from: searchForm.from, to: searchForm.to, date: searchForm.date })}`);
  };

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(p);
  const formatTime = (s: string) =>
    new Date(s).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  const getBusTypeLabel = (t: string) =>
    ({
      STANDARD: "Thường",
      DELUXE: "Cao cấp",
      LIMOUSINE: "Limousine",
      SLEEPER: "Giường nằm",
    }[t] || t);

  return (
    <div className="home-page">
      <section className="quick-search">
        <div className="container">
          <div className="search-card">
            <h2>Tìm chuyến xe</h2>

            <div className="search-form">
              <div className="search-row">
                <div className="form-group">
                  <label>Điểm đi</label>
                  <select
                    value={searchForm.from}
                    onChange={(e) => handleInputChange("from", e.target.value)}
                    className="form-control"
                  >
                    <option value="">Chọn điểm đi</option>
                    {(availableLocations || []).map((l) => (
                      <option key={l.id} value={String(l.id)}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Điểm đến</label>
                  <select
                    value={searchForm.to}
                    onChange={(e) => handleInputChange("to", e.target.value)}
                    className="form-control"
                  >
                    <option value="">Chọn điểm đến</option>
                    {(availableLocations || []).map((l) => (
                      <option key={l.id} value={String(l.id)}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

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
                <div className="form-group">
                  <button onClick={handleQuickSearch} className="search-btn">
                    Tìm chuyến
                  </button>
                </div>
              </div>
            </div>

            <div className="available-locations">
              {availableLocations.length > 0 && (
                <div>
                  <p>Các tuyến phổ biến:</p>
                  <div className="popular-routes">
                    {availableLocations.slice(0, 6).map((l) => (
                      <span key={l.id} className="location-tag">
                        {l.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
      </section>
      
      <section className="featured-trips">
        <div className="container">
          <h2>Chuyến xe nổi bật</h2>
          <p>Các chuyến xe phổ biến với giá tốt</p>
              
          {featuredTrips.length > 0 ? (
            <div className="trips-grid">
              {paginatedFeaturedTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="trip-card"
                  onClick={() => navigate(`/trip/${trip.id}`)}
                >
                  <div className="trip-header">
                    <div className="route">
                      <span>{trip.departureLocation?.name || "—"}</span>
                      <span className="arrow">→</span>
                      <span>{trip.arrivalLocation?.name || "—"}</span>
                    </div>
                    <div className="bus-type">
                      {getBusTypeLabel(trip.bus.busType)}
                    </div>
                  </div>
                  {trip.bus?.company?.name && (
                    <div className="company-name" style={{ marginTop: 6, fontSize: 13, color: '#64748b' }}>
                      Nhà xe {trip.bus.company.name}
                    </div>
                  )}

                  <div className="trip-details">
                    <div className="time">
                      <span>{formatTime(trip.departureTime)}</span>
                      <span className="duration">~4h</span>
                      <span>{formatTime(trip.arrivalTime)}</span>
                    </div>

                    <div className="facilities">
                      {trip.bus.facilities.slice(0, 3).map((f, i) => (
                        <span key={i} className="facility">
                          {f}
                        </span>
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
              <p>Chưa có chuyến xe nổi bật</p>
              <p>Vui lòng quay lại sau hoặc tìm kiếm chuyến xe khác</p>
            </div>
          )}
        {featuredTrips.length > FEATURED_PAGE_SIZE && (
          <div className="container">
            <div className="pagination-controls">
              <button
                className="pagination-btn"
                onClick={() => {
                  const next = Math.max(1, featuredPage - 1);
                  if (next !== featuredPage) {
                    setFeaturedPage(next);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                disabled={featuredPage === 1}
              >
                Truoc
              </button>
              {Array.from({ length: featuredTotalPages }).map((_, index) => {
                const page = index + 1;
                return (
                  <button
                    key={page}
                    className={`pagination-btn ${page === featuredPage ? 'active' : ''}`}
                    onClick={() => {
                      setFeaturedPage(page);
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
                  const next = Math.min(featuredTotalPages, featuredPage + 1);
                  if (next !== featuredPage) {
                    setFeaturedPage(next);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                disabled={featuredPage === featuredTotalPages}
              >
                Sau
              </button>
            </div>
          </div>
        )}
        </div>
      </section>
      <section className="news-section">
        <div className="container">
          <h2>Tin tức</h2>
          <p>Cập nhật mới nhất về các tuyến đường, khuyến mãi và thông báo.</p>

          {/* Highlighted news grid (slightly larger than normal) */}
          {highlightedNews.length > 0 && (
            <>
              <h3 style={{ marginTop: 8, marginBottom: 12 }}>Tin nổi bật</h3>
              <div className="news-grid-3">
                {highlightedNews.map((n) => (
                  <div key={n.id} className="news-small-card highlighted">
                    {n.featuredImage && (
                      <img className="news-small-image" src={n.featuredImage} alt={n.title} />
                    )}
                    <div className="news-small-content">
                      <div className="news-meta">
                        <span className="news-category-tag">Tin nổi bật</span>
                        {n.company?.name && (
                          <span className="news-company-tag">Nhà xe {n.company.name}</span>
                        )}
                      </div>
                      <h4 className="news-small-title">
                        <Link to={`/news/${n.slug}`}>{n.title}</Link>
                      </h4>
                      {n.summary && <p className="news-small-summary">{n.summary}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Normal news in 3-column grid */}
          {otherNews.length > 0 && (
            <div className="news-grid-3" style={{ marginTop: 16 }}>
              {otherNews.map((n) => (
                <div key={n.id} className="news-small-card">
                  {n.featuredImage && (
                    <img className="news-small-image" src={n.featuredImage} alt={n.title} />
                  )}
                  <div className="news-small-content">
                    <div className="news-meta">
                      {n.company?.name && (
                        <span className="news-company-tag">Nhà xe {n.company.name}</span>
                      )}
                    </div>
                    <h4 className="news-small-title">
                      <Link to={`/news/${n.slug}`}>{n.title}</Link>
                    </h4>
                    {n.summary && <p className="news-small-summary">{n.summary}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>


      <section className="about-section">
        <div className="container">
          <h2>Giới thiệu</h2>
          <p>
            ShanBus - Dịch vụ đặt vé xe khách trực tuyến uy tín, an toàn và tiện
            lợi. Sứ mệnh của chúng tôi là kết nối hành khách với các nhà xe chất
            lượng trên toàn quốc.
          </p>
        </div>
      </section>
      
    </div>
  );
}







