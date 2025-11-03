import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import newsService from "../../services/news";
import type { News } from "../../types/news";
import { NEWS_CATEGORIES } from "../../types/news";
import "../../style/news-detail.css";

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/\/$/, "") || "http://localhost:5001";

const normalizeContentImages = (html: string) =>
  html
    ? html.replace(/src="\/uploads/gi, `src="${API_BASE}/uploads`)
    : html;

const NewsDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [news, setNews] = useState<News | null>(null);
  const [relatedNews, setRelatedNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      fetchNewsDetail();
    }
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchNewsDetail = async () => {
    if (!slug) return;

    setLoading(true);
    setError(null);

    try {
      const response = await newsService.getNewsBySlug(slug);
      setNews(response.news);

      // Fetch related news from the same category
      if (response.news) {
        fetchRelatedNews(response.news.category, response.news.id);
      }
    } catch (error) {
      console.error("Failed to fetch news detail:", error);
      setError("Không thể tải thông tin bài viết");
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedNews = async (category: string, currentId: number) => {
    try {
      const response = await newsService.getPublicNews({
        category: category as never,
        limit: 4,
        status: "PUBLISHED",
      });

      // Filter out current news
      const filtered = response.data.news.filter(
        (item) => item.id !== currentId
      );
      setRelatedNews(filtered.slice(0, 3));
    } catch (error) {
      console.error("Failed to fetch related news:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="news-loading-state">
        <div className="news-loading-content">
          <div className="news-loading-spinner"></div>
          <p className="news-loading-text">Đang tải bài viết...</p>
        </div>
      </div>
    );
  }

  if (error || !news) {
    return (
      <div className="news-error-state">
        <div className="news-error-content">
          <svg className="news-error-icon" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h2 className="news-error-title">Không tìm thấy bài viết</h2>
          <p className="news-error-text">
            {error || "Bài viết bạn đang tìm không tồn tại hoặc đã bị xóa"}
          </p>
          <Link to="/news" className="news-error-btn">
            <svg className="news-error-btn-icon" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Quay lại trang tin tức
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="news-detail-page">
      {/* Breadcrumb */}
      <div className="news-breadcrumb">
        <nav className="breadcrumb-nav">
          <Link to="/" className="breadcrumb-link">
            Trang chủ
          </Link>
          <span>/</span>
          <Link to="/news" className="breadcrumb-link">
            Tin tức
          </Link>
          <span>/</span>
          <span className="breadcrumb-current">{news.title}</span>
        </nav>
      </div>

      <div className="news-detail-container">
        {/* Main Content */}
        <article className="news-article">
          <div className="news-article-card">
            {/* Header */}
            <div className="news-article-header">
              <div className="news-article-meta">
                <span className="news-category-tag">
                  {NEWS_CATEGORIES[news.category]}
                </span>
                {news.isHighlighted && (
                  <span className="news-highlight-icon">
                    <span>⭐</span>
                    <span>Tin nổi bật</span>
                  </span>
                )}
              </div>

              <h1 className="news-article-title">{news.title}</h1>

              {news.summary && (
                <p className="news-article-summary">{news.summary}</p>
              )}

              <div className="news-article-info">
                <div className="news-article-left">
                  <div className="news-info-item">
                    <svg className="news-info-icon" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span>
                      Tác giả: <strong>{news.author.name}</strong>
                    </span>
                  </div>
                  <div className="news-info-item">
                    <svg className="news-info-icon" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>
                      {formatDate(news.publishedAt || news.createdAt)}
                    </span>
                  </div>
                  <div className="news-info-item">
                    <svg className="news-info-icon" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    <span>{news.viewCount} lượt xem</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Featured Image */}
            {news.featuredImage && (
              <div className="news-featured-image">
                <img
                  src={news.featuredImage}
                  alt={news.title}
                  className="news-featured-img"
                />
              </div>
            )}

            {/* Content */}
            <div className="news-article-content">
              <div className="news-content">
                <div
                  className="news-html"
                  dangerouslySetInnerHTML={{ __html: normalizeContentImages(news.content) }}
                />
              </div>

              {/* Tags */}
              {news.tags.length > 0 && (
                <div className="news-tags-section">
                  <h3 className="news-tags-title">Tags:</h3>
                  <div className="news-tags-list">
                    {news.tags.map((tag, index) => (
                      <span key={index} className="news-tag-item">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Social Share */}
          <div className="news-social-share">
            <h3 className="news-social-title">Chia sẻ bài viết</h3>
            <div className="news-social-buttons">
              <button
                onClick={() => {
                  const url = window.location.href;
                  window.open(
                    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                      url
                    )}`,
                    "_blank"
                  );
                }}
                className="social-btn social-btn-facebook"
              >
                Facebook
              </button>
              <button
                onClick={() => {
                  const url = window.location.href;
                  const text = `${news.title} - ${news.summary || ""}`;
                  window.open(
                    `https://twitter.com/intent/tweet?url=${encodeURIComponent(
                      url
                    )}&text=${encodeURIComponent(text)}`,
                    "_blank"
                  );
                }}
                className="social-btn social-btn-twitter"
              >
                Twitter
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Đã sao chép link bài viết!");
                }}
                className="social-btn social-btn-copy"
              >
                Copy Link
              </button>
            </div>
          </div>
        </article>

        {/* Sidebar */}
        <aside className="news-sidebar">
          {/* Related News */}
          {relatedNews.length > 0 && (
            <div className="news-related">
              <h3 className="news-related-title">Bài viết liên quan</h3>
              <div className="news-related-list">
                {relatedNews.map((item) => (
                  <Link
                    key={item.id}
                    to={`/news/${item.slug}`}
                    className="news-related-item"
                  >
                    <div className="news-related-content">
                      {item.featuredImage && (
                        <img
                          src={item.featuredImage}
                          alt={item.title}
                          className="news-related-image"
                        />
                      )}
                      <div className="news-related-info">
                        <h4 className="news-related-title-text">
                          {item.title}
                        </h4>
                        <div className="news-related-meta">
                          <span>
                            {new Date(
                              item.publishedAt || item.createdAt
                            ).toLocaleDateString("vi-VN")}
                          </span>
                          <span>•</span>
                          <span>{item.viewCount} lượt xem</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="news-related-all">
                <Link to="/news" className="news-related-all-btn">
                  Xem tất cả tin tức
                </Link>
              </div>
            </div>
          )}

          {/* Back to News */}
          <Link to="/news" className="news-back-link">
            <svg className="news-back-icon" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Quay lại trang tin tức
          </Link>
        </aside>
      </div>
    </div>
  );
};

export default NewsDetail;
