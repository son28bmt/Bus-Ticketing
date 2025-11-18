import React, { useState, useEffect } from "react";
import newsService from "../../services/news";
import { adminAPI, type BusCompany } from "../../services/admin";
import RichTextEditor from "../../components/common/RichTextEditor";

import type {
  News,
  NewsCategory,
  NewsStatus,
  NewsSearchParams,
} from "../../types/news";
import { NEWS_CATEGORIES, NEWS_STATUS } from "../../types/news";
import "../../style/admin-news.css";

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5001";

const normalizeContentImages = (html: string) =>
  html
    ? html.replace(/src="\/uploads/gi, `src="${API_BASE}/uploads`)
    : html;

interface NewsFormData {
  title: string;
  content: string;
  summary: string;
  category: NewsCategory;
  status: NewsStatus;
  featuredImage: string;
  tags: string;
  isHighlighted: boolean;
  companyId: number | "";
}

const ManageNews: React.FC = () => {
  const [newsList, setNewsList] = useState<News[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [formData, setFormData] = useState<NewsFormData>({
    title: "",
    content: "",
    summary: "",
    category: "OTHER",
    status: "DRAFT",
    featuredImage: "",
    tags: "",
    isHighlighted: false,
    companyId: "",
  });

  const [companies, setCompanies] = useState<BusCompany[]>([]);

  // Search and filter state
  const [searchParams, setSearchParams] = useState<NewsSearchParams>({
    page: 1,
    limit: 10,
    category: undefined,
    status: undefined,
    search: "",
  });

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
    limit: 10,
  });

  // Stats state
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    highlighted: 0,
  });

  const fetchNews = async () => {
    setLoading(true);
    try {
      const response = await newsService.getAllNews(searchParams);
      setNewsList(response.data.news);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error("Failed to fetch news:", error);
      alert("Không thể tải danh sách tin tức");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await newsService.getNewsStats();
      setStats(response.stats);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const fetchCompaniesList = async () => {
    try {
      const res = await adminAPI.getCompanies({ limit: 200 });
      if (res?.success && Array.isArray(res.data)) {
        setCompanies(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    }
  };

  useEffect(() => {
    fetchNews();
    fetchStats();
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchCompaniesList();
  }, []);

  const handleOpenModal = (news?: News) => {
    if (news) {
      setEditingNews(news);
      setFormData({
        title: news.title,
        content: news.content,
        summary: news.summary || "",
        category: news.category,
        status: news.status,
        featuredImage: news.featuredImage || "",
        tags: Array.isArray(news.tags) ? news.tags.join(", ") : "",
        isHighlighted: news.isHighlighted,
        companyId: news.company?.id ?? "",
      });
    } else {
      setEditingNews(null);
      setFormData({
        title: "",
        content: "",
        summary: "",
        category: "OTHER",
        status: "DRAFT",
        featuredImage: "",
        tags: "",
        isHighlighted: false,
        companyId: "",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingNews(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const newsData = {
        title: formData.title,
        content: formData.content,
        summary: formData.summary || undefined,
        category: formData.category,
        status: formData.status,
        featuredImage: formData.featuredImage || undefined,
        tags: formData.tags
          ? formData.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
        isHighlighted: formData.isHighlighted,
        companyId:
          formData.companyId === "" ? undefined : Number(formData.companyId),
      };
      if (editingNews) {
        await newsService.updateNews(editingNews.id, newsData);
        alert("Cập nhật bài viết thành công!");
      } else {
        await newsService.createNews(newsData);
        alert("Tạo bài viết thành công!");
      }

      handleCloseModal();
      fetchNews();
      fetchStats();
    } catch (error) {
      console.error("Failed to save news:", error);
      alert(
        editingNews ? "Không thể cập nhật bài viết" : "Không thể tạo bài viết"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa bài viết "${title}"?`)) return;

    try {
      await newsService.deleteNews(id);
      alert("Xóa bài viết thành công!");
      fetchNews();
      fetchStats();
    } catch (error) {
      console.error("Failed to delete news:", error);
      alert("Không thể xóa bài viết");
    }
  };

  const handleToggleHighlight = async (id: number) => {
    try {
      await newsService.toggleHighlight(id);
      fetchNews();
      fetchStats();
    } catch (error) {
      console.error("Failed to toggle highlight:", error);
      alert("Không thể thay đổi trạng thái nổi bật");
    }
  };

  const handlePublish = async (id: number) => {
    try {
      await newsService.publishNews(id);
      fetchNews();
      fetchStats();
    } catch (error) {
      console.error("Failed to publish news:", error);
      alert("Không thể xuất bản bài viết");
    }
  };

  const handleArchive = async (id: number) => {
    try {
      await newsService.archiveNews(id);
      fetchNews();
      fetchStats();
    } catch (error) {
      console.error("Failed to archive news:", error);
      alert("Không thể lưu trữ bài viết");
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParams((prev) => ({
      ...prev,
      search: e.target.value,
      page: 1,
    }));
  };

  const handleCategoryFilter = (category?: NewsCategory) => {
    setSearchParams((prev) => ({
      ...prev,
      category,
      page: 1,
    }));
  };

  const handleStatusFilter = (status?: NewsStatus) => {
    setSearchParams((prev) => ({
      ...prev,
      status,
      page: 1,
    }));
  };

  const getStatusBadge = (status: NewsStatus) => {
    const statusClasses = {
      DRAFT: "admin-news-badge status-draft",
      PUBLISHED: "admin-news-badge status-published",
      ARCHIVED: "admin-news-badge status-archived",
    };
    return <span className={statusClasses[status]}>{NEWS_STATUS[status]}</span>;
  };

  return (
    <div className="admin-news-page">
      <div className="admin-news-header">
        <h1 className="admin-news-title">Quản lý tin tức</h1>
        <button
          onClick={() => handleOpenModal()}
          className="admin-news-add-btn"
        >
          Thêm bài viết mới
        </button>
      </div>

      {/* Stats Cards */}
      <div className="admin-news-stats">
        <div className="admin-news-stat-card">
          <div className="admin-news-stat-number total">{stats.total}</div>
          <div className="admin-news-stat-label">Tổng số bài viết</div>
        </div>
        <div className="admin-news-stat-card">
          <div className="admin-news-stat-number published">
            {stats.published}
          </div>
          <div className="admin-news-stat-label">xuất bản</div>
        </div>
        <div className="admin-news-stat-card">
          <div className="admin-news-stat-number draft">{stats.draft}</div>
          <div className="admin-news-stat-label">Bản nháp</div>
        </div>
        <div className="admin-news-stat-card">
          <div className="admin-news-stat-number highlighted">
            {stats.highlighted}
          </div>
          <div className="admin-news-stat-label">Nổi bật</div>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-news-filters">
        <div className="admin-news-filters-row">
          <div className="admin-news-search-container">
            <input
              type="text"
              placeholder="Tìm kiếm bài viết..."
              value={searchParams.search || ""}
              onChange={handleSearchChange}
              className="admin-news-search-input"
            />
          </div>
          <div>
            <select
              value={searchParams.category || ""}
              onChange={(e) =>
                handleCategoryFilter(
                  (e.target.value as NewsCategory) || undefined
                )
              }
              className="admin-news-filter-select"
            >
              <option value="">Tất cả danh mục</option>
              {Object.entries(NEWS_CATEGORIES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={searchParams.status || ""}
              onChange={(e) =>
                handleStatusFilter((e.target.value as NewsStatus) || undefined)
              }
              className="admin-news-filter-select"
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(NEWS_STATUS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* News List */}
      <div className="admin-news-list">
        {loading ? (
          <div className="admin-news-loading">
            <div className="admin-news-loading-spinner"></div>
            <p className="admin-news-loading-text">Đang tải...</p>
          </div>
        ) : (
          <div className="admin-news-table-container">
            <table className="admin-news-table">
              <thead className="admin-news-table-header">
                <tr>
                  <th className="admin-news-table-th">Tiêu đề</th>
                  <th className="admin-news-table-th">Nhà xe</th>
                  <th className="admin-news-table-th">Danh mục</th>
                  <th className="admin-news-table-th">Trạng thái</th>
                  <th className="admin-news-table-th">Tags</th>
                  <th className="admin-news-table-th">Lượt xem</th>
                  <th className="admin-news-table-th">Ngày tạo</th>
                  <th className="admin-news-table-th">Thao tác</th>
                </tr>
              </thead>
              <tbody className="admin-news-table-body">
                {newsList.map((news) => (
                  <tr key={news.id} className="admin-news-table-row">
                    <td className="admin-news-table-td">
                      <div className="admin-news-title-cell">
                        {news.isHighlighted && (
                          <span className="admin-news-highlight-star">⭐</span>
                        )}
                        <div className="admin-news-title-content">
                          <div className="admin-news-item-title">
                            {news.title}
                          </div>
                          {news.summary && (
                            <div className="admin-news-item-summary">
                              {news.summary}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="admin-news-table-td">
                      {news.company ? (
                        <span className="admin-news-badge company">
                          {news.company.name}
                        </span>
                      ) : (
                        <span className="admin-news-badge company neutral">
                          Toàn hệ thống
                        </span>
                      )}
                    </td>
                    <td className="admin-news-table-td">
                      <span className="admin-news-badge category">
                        {NEWS_CATEGORIES[news.category]}
                      </span>
                    </td>
                    <td className="admin-news-table-td">
                      {getStatusBadge(news.status)}
                    </td>
                    <td className="admin-news-table-td admin-news-tags-cell">
                      <div className="admin-news-tags">
                        {Array.isArray(news.tags) && news.tags.length > 0 ? (
                          news.tags.map((tag) => (
                            <span key={tag} className="admin-news-tag">
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="admin-news-tag empty">Không có</span>
                        )}
                      </div>
                    </td>
                    <td className="admin-news-table-td">{news.viewCount}</td>
                    <td className="admin-news-table-td">
                      {new Date(news.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="admin-news-table-td">
                      <div className="admin-news-actions">
                        <button
                          onClick={() => handleOpenModal(news)}
                          className="admin-news-action-btn edit"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleToggleHighlight(news.id)}
                          className="admin-news-action-btn highlight"
                        >
                          {news.isHighlighted ? "Bỏ nổi bật" : "Nổi bật"}
                        </button>
                        {news.status === "DRAFT" && (
                          <button
                            onClick={() => handlePublish(news.id)}
                            className="admin-news-action-btn publish"
                          >
                            Xuất bản
                          </button>
                        )}
                        {news.status === "PUBLISHED" && (
                          <button
                            onClick={() => handleArchive(news.id)}
                            className="admin-news-action-btn archive"
                          >
                            Lưu trữ
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(news.id, news.title)}
                          className="admin-news-action-btn delete"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="admin-news-pagination">
            <div className="admin-news-pagination-info">
              Hiển thị {(pagination.page - 1) * pagination.limit + 1} đến{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              trong tổng số {pagination.total} bài viết
            </div>
            <div className="admin-news-pagination-controls">
              <button
                onClick={() =>
                  setSearchParams((prev) => ({ ...prev, page: prev.page! - 1 }))
                }
                disabled={pagination.page <= 1}
                className="admin-news-pagination-btn"
              >
                Trước
              </button>
              <span className="admin-news-pagination-info-text">
                Trang {pagination.page} / {pagination.pages}
              </span>
              <button
                onClick={() =>
                  setSearchParams((prev) => ({ ...prev, page: prev.page! + 1 }))
                }
                disabled={pagination.page >= pagination.pages}
                className="admin-news-pagination-btn"
              >
                Tiếp
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="admin-news-modal-overlay">
          <div className="admin-news-modal">
            <div className="admin-news-modal-content">
              <div className="admin-news-modal-header">
                <h2 className="admin-news-modal-title">
                  {editingNews ? "Sửa bài viết" : "Thêm bài viết mới"}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="admin-news-modal-close"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="admin-news-form">
                <div className="admin-news-form-row two-cols">
                  <div className="admin-news-form-group">
                    <label className="admin-news-form-label required">
                      Tiêu đề
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      className="admin-news-form-input"
                    />
                  </div>
                  <div className="admin-news-form-group">
                    <label className="admin-news-form-label">Danh mục</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="admin-news-form-select"
                    >
                      {Object.entries(NEWS_CATEGORIES).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="admin-news-form-group">
                  <label className="admin-news-form-label">Tóm tắt</label>
                  <textarea
                    name="summary"
                    value={formData.summary}
                    onChange={handleInputChange}
                    rows={2}
                    className="admin-news-form-textarea"
                  />
                </div>

                <div className="admin-news-form-group">
                  <label className="admin-news-form-label required">
                    Nội dung
                  </label>
                  <RichTextEditor
                    value={formData.content}
                    onChange={(val) =>
                      setFormData((prev) => ({ ...prev, content: val }))
                    }
                  />
                </div>

                <div className="admin-news-form-row two-cols">
                  <div className="admin-news-form-group">
                    <label className="admin-news-form-label">
                      Ảnh đại diện (URL)
                    </label>
                    <input
                      type="url"
                      name="featuredImage"
                      value={formData.featuredImage}
                      onChange={handleInputChange}
                      className="admin-news-form-input"
                    />
                  </div>
                  <div className="admin-news-form-group">
                    <label className="admin-news-form-label">
                      Tags (phân cách bằng dấu phẩy)
                    </label>
                    <input
                      type="text"
                      name="tags"
                      value={formData.tags}
                      onChange={handleInputChange}
                      placeholder="tin tức, khuyến mãi, thông báo"
                      className="admin-news-form-input"
                    />
                  </div>
                </div>

                <div className="admin-news-form-row two-cols">
                  <div className="admin-news-form-group">
                    <label className="admin-news-form-label">Nhà xe</label>
                    <select
                      name="companyId"
                      value={formData.companyId}
                      onChange={handleInputChange}
                      className="admin-news-form-select"
                    >
                      <option value="">Toàn hệ thống</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-news-form-group">
                    <label className="admin-news-form-label">Trạng thái</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="admin-news-form-select"
                    >
                      {Object.entries(NEWS_STATUS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="admin-news-form-checkbox-group">
                  <input
                    type="checkbox"
                    name="isHighlighted"
                    checked={formData.isHighlighted}
                    onChange={handleInputChange}
                    className="admin-news-form-checkbox"
                  />
                  <label className="admin-news-form-checkbox-label">
                    Bài viết nổi bật
                  </label>
                </div>

                <div className="admin-news-form-actions"></div>
                {/* </div> */}
                <div className="admin-news-form-actions">
                  <button
                    type="button"
                    onClick={() => setShowPreview(true)} // ✅ Nút xem trước
                    className="admin-news-form-btn secondary"
                  >
                    Xem trước
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="admin-news-form-btn cancel"
                  >
                    Hủy
                  </button>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="admin-news-form-btn submit"
                  >
                    {loading
                      ? "Đang lưu..."
                      : editingNews
                      ? "Cập nhật"
                      : "Tạo bài viết"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {showPreview && (
        <div className="admin-news-modal-overlay">
          <div className="admin-news-modal">
            <div className="admin-news-modal-content">
              <div className="admin-news-modal-header">
                <h2 className="admin-news-modal-title">Xem trước bài viết</h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="admin-news-modal-close"
                >
                  ✕
                </button>
              </div>

              <div className="preview-content">
                <h1>{formData.title}</h1>
                {formData.featuredImage && (
                  <img
                    src={formData.featuredImage}
                    alt="Ảnh đại diện"
                    style={{
                      width: "100%",
                      borderRadius: 8,
                      marginBottom: "1rem",
                    }}
                  />
                )}
                {formData.summary && (
                  <p style={{ fontStyle: "italic" }}>{formData.summary}</p>
                )}
                <hr />
                <div
                  className="news-preview-html"
                  dangerouslySetInnerHTML={{ __html: normalizeContentImages(formData.content) }}
                />
                {formData.tags && (
                  <div style={{ marginTop: "1rem" }}>
                    <strong>Tags: </strong>
                    {formData.tags}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageNews;
