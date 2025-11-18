import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent, FormEvent, ReactElement } from "react";
import newsService from "../../services/news";
import RichTextEditor from "../../components/common/RichTextEditor";

import type {
  News,
  NewsCategory,
  NewsSearchParams,
  NewsStatus,
} from "../../types/news";
import { NEWS_CATEGORIES, NEWS_STATUS } from "../../types/news";
import "../../style/admin-news.css";

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/\/$/, "") || "http://localhost:5001";

const normalizeContentImages = (html: string) =>
  html
    ? html.replace(/src="\/uploads/gi, `src="${API_BASE}/uploads`)
    : html;

interface CompanyNewsFormData {
  title: string;
  content: string;
  summary: string;
  category: NewsCategory;
  status: NewsStatus;
  featuredImage: string;
  tags: string;
  isHighlighted: boolean;
}

const defaultForm: CompanyNewsFormData = {
  title: "",
  content: "",
  summary: "",
  category: "OTHER",
  status: "DRAFT",
  featuredImage: "",
  tags: "",
  isHighlighted: false,
};

export default function CompanyManageNews(): ReactElement {
  const [newsList, setNewsList] = useState<News[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [formData, setFormData] = useState<CompanyNewsFormData>(defaultForm);
  const [showPreview, setShowPreview] = useState(false);
  const [searchParams, setSearchParams] = useState<NewsSearchParams>({
    page: 1,
    limit: 10,
    search: "",
    status: undefined,
    category: undefined,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
    limit: 10,
  });

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const response = await newsService.getCompanyNews(searchParams);
      setNewsList(response.data.news);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error("Failed to fetch company news:", error);
      alert("Không thể tải danh sách tin tức của nhà xe.");
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

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
      });
    } else {
      setEditingNews(null);
      setFormData(defaultForm);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingNews(null);
    setFormData(defaultForm);
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const payload = {
      title: formData.title,
      content: formData.content,
      summary: formData.summary || undefined,
      category: formData.category,
      status: formData.status,
      featuredImage: formData.featuredImage || undefined,
      isHighlighted: formData.isHighlighted,
      tags: formData.tags
        ? formData.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
    };

    try {
      if (editingNews) {
        await newsService.updateCompanyNews(editingNews.id, payload);
        alert("Cập nhật bài viết thành công!");
      } else {
        await newsService.createCompanyNews(payload);
        alert("Tạo bài viết thành công!");
      }
      handleCloseModal();
      fetchNews();
    } catch (error) {
      console.error("Failed to save company news:", error);
      alert(
        editingNews
          ? "Không thể cập nhật bài viết."
          : "Không thể tạo bài viết mới."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa bài viết "${title}"?`)) return;
    try {
      await newsService.deleteCompanyNews(id);
      alert("Xóa bài viết thành công!");
      fetchNews();
    } catch (error) {
      console.error("Failed to delete company news:", error);
      alert("Không thể xóa bài viết.");
    }
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
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

  const renderStatusBadge = (status: NewsStatus) => {
    const statusClasses: Record<NewsStatus, string> = {
      DRAFT: "admin-news-badge status-draft",
      PUBLISHED: "admin-news-badge status-published",
      ARCHIVED: "admin-news-badge status-archived",
    };
    return <span className={statusClasses[status]}>{NEWS_STATUS[status]}</span>;
  };

  return (
    <div className="admin-news-page">
      <div className="admin-news-header">
        <h1 className="admin-news-title">Tin tức của nhà xe</h1>
        <button
          onClick={() => handleOpenModal()}
          className="admin-news-add-btn"
        >
          Thêm bài viết
        </button>
      </div>

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
                      <span className="admin-news-badge category">
                        {NEWS_CATEGORIES[news.category]}
                      </span>
                    </td>
                    <td className="admin-news-table-td">
                      {renderStatusBadge(news.status)}
                    </td>
                    <td className="admin-news-table-td">
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
                  setSearchParams((prev) => ({
                    ...prev,
                    page: (prev.page || 1) - 1,
                  }))
                }
                disabled={(pagination.page || 1) <= 1}
                className="admin-news-pagination-btn"
              >
                Trước
              </button>
              <button
                onClick={() =>
                  setSearchParams((prev) => ({
                    ...prev,
                    page: (prev.page || 1) + 1,
                  }))
                }
                disabled={(pagination.page || 1) >= pagination.pages}
                className="admin-news-pagination-btn"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="admin-news-modal-overlay">
          <div className="admin-news-modal">
            <div className="admin-news-modal-content">
              <div className="admin-news-modal-header">
                <h2 className="admin-news-modal-title">
                  {editingNews ? "Chỉnh sửa bài viết" : "Bài viết mới"}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="admin-news-modal-close"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="admin-news-form">
                {/* Tiêu đề */}
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

                {/* Tóm tắt */}
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

                {/* Nội dung (Rich Text Editor) */}
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

                {/* Ảnh + Tags */}
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
                      Tags (cách nhau bởi dấu phẩy)
                    </label>
                    <input
                      type="text"
                      name="tags"
                      value={formData.tags}
                      onChange={handleInputChange}
                      placeholder="khuyến mãi, thông báo"
                      className="admin-news-form-input"
                    />
                  </div>
                </div>

                {/* Danh mục + Trạng thái + Nổi bật */}
                <div className="admin-news-form-row two-cols">
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
                {/* Buttons */}
                <div className="admin-news-form-actions">
                  <button
                    type="button"
                    onClick={() => setShowPreview(true)} // ✅ Nút xem trước
                    className="admin-news-form-btn secondary"
                  >
                    Xem trước
                  </button>
                </div>
                {/* Buttons */}
                <div className="admin-news-form-actions">
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
       {/* ✅ Modal Preview */}
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
}
