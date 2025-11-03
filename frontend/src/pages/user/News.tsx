import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import newsService from '../../services/news';
import type { News, NewsCategory, NewsSearchParams } from '../../types/news';
import { NEWS_CATEGORIES } from '../../types/news';
import '../../style/news.css';

const NewsPage: React.FC = () => {
  const [newsList, setNewsList] = useState<News[]>([]);
  const [highlightedNews, setHighlightedNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
    limit: 10
  });

  const [searchParams, setSearchParams] = useState<NewsSearchParams>({
    page: 1,
    limit: 10,
    category: undefined,
    search: '',
    status: 'PUBLISHED'
  });
  // Removed featured promotions sidebar per request


  useEffect(() => {
    fetchNews();
    fetchHighlightedNews();
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps
  // Promotions are now attached within articles; no sidebar fetch/render


  const fetchNews = async () => {
    setLoading(true);
    try {
      const response = await newsService.getPublicNews(searchParams);
      setNewsList(response.data.news);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHighlightedNews = async () => {
    try {
      const response = await newsService.getPublicNews({ 
        limit: 3, 
        highlighted: true,
        status: 'PUBLISHED'
      });
      setHighlightedNews(response.data.news);
    } catch (error) {
      console.error('Failed to fetch highlighted news:', error);
    }
  };
  // Removed voucher save handler


  const handleCategoryFilter = (category?: NewsCategory) => {
    setSelectedCategory(category);
    setSearchParams(prev => ({
      ...prev,
      category,
      page: 1
    }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(prev => ({
      ...prev,
      search: searchQuery,
      page: 1
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="news-page">
      {/* Header */}
      <div className="news-header">
        <div className="container mx-auto px-4">
          <h1>Tin tức & Sự kiện</h1>
          <p>Cập nhật những thông tin mới nhất từ ShanBus</p>
          
          {/* Search */}
          <form onSubmit={handleSearch} className="news-search-form">
            <input
              type="text"
              placeholder="Tìm kiếm tin tức..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="news-search-input"
            />
            <button
              type="submit"
              className="news-search-btn"
            >
              Tìm kiếm
            </button>
          </form>
        </div>
      </div>

      <div className="news-container">
        <div className="news-main">
          {/* Sidebar */}
          <div className="news-sidebar">
            <div className="news-sidebar-card">
              <h3>Danh mục tin tức</h3>
              <ul className="news-category-list">
                <li className="news-category-item">
                  <button
                    onClick={() => handleCategoryFilter(undefined)}
                    className={`news-category-btn ${!selectedCategory ? 'active' : ''}`}
                  >
                    Tất cả tin tức
                  </button>
                </li>
                {Object.entries(NEWS_CATEGORIES).map(([key, label]) => (
                  <li key={key} className="news-category-item">
                    <button
                      onClick={() => handleCategoryFilter(key as NewsCategory)}
                      className={`news-category-btn ${selectedCategory === key ? 'active' : ''}`}
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            {/* Removed "Ưu đãi nổi bật" sidebar */}

          </div>
          {/* Main Content */}
          <div className="news-content">
            {/* Highlighted News */}
            
            {highlightedNews.length > 0 && !searchParams.search && !searchParams.category && (
              <div className="highlighted-news">
                <h2>Tin nổi bật</h2>
                <div className="highlighted-grid">
                  {highlightedNews.map((news) => (
                    <div key={news.id} className="highlighted-card">
                      {news.featuredImage && (
                        <img
                          src={news.featuredImage}
                          alt={news.title}
                          className="highlighted-image"
                        />
                      )}
                      <div className="highlighted-content">
                        <div className="news-meta">
                          <span className="news-category-tag">
                            {NEWS_CATEGORIES[news.category]}
                          </span>
                          {news.company?.name && (
                            <span className="news-company-tag">Nhà xe {news.company.name}</span>
                          )}
                        </div>
                        <h3 className="news-title">
                          <Link to={`/news/${news.slug}`}>
                            {news.title}
                          </Link>
                        </h3>
                        {news.summary && (
                          <p className="news-summary line-clamp-2">
                            {news.summary}
                          </p>
                        )}
                        <div className="news-footer">
                          <span className="news-date">{formatDate(news.publishedAt || news.createdAt)}</span>
                          <span>{news.viewCount} lượt xem</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <hr />
              </div>
            )}

            {/* News List */}
            <div className="news-list">
              <div className="news-list-header">
                <h2 className="news-list-title">
                  {selectedCategory ? NEWS_CATEGORIES[selectedCategory] : 'Tất cả tin tức'}
                </h2>
                <div className="news-count">
                  {pagination.total} bài viết
                </div>
              </div>
            </div>

            {loading ? (
              <div className="news-loading">
                <div className="loading-spinner"></div>
                <p>Đang tải...</p>
              </div>
            ) : newsList.length > 0 ? (
              <>
                <div className="news-items">
                  {newsList.map((news) => (
                    <article key={news.id} className="news-item">
                      {news.featuredImage && (
                        <img
                          src={news.featuredImage}
                          alt={news.title}
                          className="news-item-image"
                        />
                      )}
                      <div className="news-item-content">
                        <div className="news-item-meta">
                          <span className="news-category-tag">
                            {NEWS_CATEGORIES[news.category]}
                          </span>
                          {news.company?.name && (
                            <span className="news-company-tag">Nhà xe {news.company.name}</span>
                          )}
                          {news.isHighlighted && (
                            <span className="news-highlight-icon">⭐</span>
                          )}
                          <time className="news-date">
                            {formatDate(news.publishedAt || news.createdAt)}
                          </time>
                        </div>
                        
                        <h2 className="news-item-title">
                          <Link to={`/news/${news.slug}`}>
                            {news.title}
                          </Link>
                        </h2>
                        
                        {news.summary && (
                          <p className="news-item-summary">
                            {news.summary}
                          </p>
                        )}
                        
                        <div className="news-item-footer">
                          <div className="news-author-info">
                            {news.company?.name && (
                              <span>Nhà xe: {news.company.name}</span>
                            )}
                            <span>Tác giả: {news.author.name}</span>
                            <span>{news.viewCount} lượt xem</span>
                          </div>
                          {Array.isArray(news.tags) && news.tags.length > 0 && (
                            <div className="news-tags">
                              {news.tags.slice(0, 3).map((tag, index) => (
                                <span key={index} className="news-tag">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="news-pagination">
                    <button
                      onClick={() => setSearchParams(prev => ({ ...prev, page: prev.page! - 1 }))}
                      disabled={pagination.page <= 1}
                      className="pagination-btn"
                    >
                      Trang trước
                    </button>
                    
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                        const page = Math.max(1, Math.min(pagination.pages - 4, pagination.page - 2)) + i;
                        return (
                          <button
                            key={page}
                            onClick={() => setSearchParams(prev => ({ ...prev, page }))}
                            className={`pagination-btn ${page === pagination.page ? 'active' : ''}`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setSearchParams(prev => ({ ...prev, page: prev.page! + 1 }))}
                      disabled={pagination.page >= pagination.pages}
                      className="pagination-btn"
                    >
                      Trang tiếp
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="news-empty">
                <div className="news-empty-icon">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <p className="news-empty-title">Không có tin tức nào được tìm thấy</p>
                <p className="news-empty-text">
                  {searchParams.search || selectedCategory
                    ? 'Hãy thử tìm kiếm với từ khóa khác hoặc chọn danh mục khác'
                    : 'Hiện tại chưa có tin tức nào được đăng'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsPage;










