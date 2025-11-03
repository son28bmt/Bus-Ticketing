"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { companyAPI } from "../../services/company"
import type { Voucher } from "../../types/voucher"
import "../../style/dashboard.css"
import "../../style/vouchers.css"

type FormState = {
  code: string
  name: string
  description?: string
  discountType: "PERCENT" | "AMOUNT"
  discountValue: number
  minOrderValue?: number | null
  maxDiscount?: number | null
  usageLimit?: number | null
  usagePerUser?: number | null
  startDate?: string | null
  endDate?: string | null
  isActive?: boolean
}

type UsageStat = {
  voucherId: number
  code?: string
  name?: string
  totalDiscount: number
  usageCount: number
}

const initialForm: FormState = {
  code: "",
  name: "",
  description: "",
  discountType: "AMOUNT",
  discountValue: 0,
  minOrderValue: null,
  maxDiscount: null,
  usageLimit: null,
  usagePerUser: null,
  startDate: null,
  endDate: null,
  isActive: true,
}

const ManageCompanyVouchers = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [usageStats, setUsageStats] = useState<UsageStat[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [formVisible, setFormVisible] = useState(false)
  const [formData, setFormData] = useState<FormState>(initialForm)
  const [editingId, setEditingId] = useState<number | null>(null)

  const loadVouchers = async () => {
    setLoading(true)
    try {
      const response = await companyAPI.getVouchers()
      if (response.success && response.data) {
        setVouchers(response.data)
      }
    } finally {
      setLoading(false)
    }
  }

  const loadUsageStats = async () => {
    try {
      const response = await companyAPI.getVoucherUsage()
      if (response.success && response.data) {
        setUsageStats(response.data)
      }
    } catch (err) {
      console.error("Usage stats load failed", err)
    }
  }

  useEffect(() => {
    loadVouchers()
    loadUsageStats()
  }, [])

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(null), 3200)
    return () => window.clearTimeout(timer)
  }, [message])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formData.code.trim() || !formData.name.trim()) {
      setMessage({ type: "error", text: "Vui lòng nhập mã và tên voucher." })
      return
    }

    try {
      if (editingId) {
        await companyAPI.updateVoucher(editingId, {
          ...formData,
          code: formData.code.trim(),
          name: formData.name.trim(),
        })
        setMessage({ type: "success", text: "Đã cập nhật voucher." })
      } else {
        await companyAPI.createVoucher({
          ...formData,
          code: formData.code.trim(),
          name: formData.name.trim(),
        })
        setMessage({ type: "success", text: "Tạo voucher mới thành công." })
      }

      setFormVisible(false)
      setFormData(initialForm)
      setEditingId(null)
      await loadVouchers()
      await loadUsageStats()
    } catch (err) {
      console.error("company voucher submit error", err)
      setMessage({ type: "error", text: "Không thể lưu voucher." })
    }
  }

  const handleToggle = async (voucher: Voucher) => {
    try {
      await companyAPI.toggleVoucher(voucher.id, !(voucher.isActive ?? true))
      setMessage({
        type: "success",
        text: voucher.isActive ? "Đã tạm dừng voucher." : "Đã kích hoạt voucher.",
      })
      await loadVouchers()
    } catch (err) {
      console.error("toggle voucher failed", err)
      setMessage({ type: "error", text: "Không thể cập nhật trạng thái." })
    }
  }

  const openCreateForm = () => {
    setFormData(initialForm)
    setEditingId(null)
    setFormVisible(true)
  }

  const openEditForm = (voucher: Voucher) => {
    setEditingId(voucher.id)
    setFormData({
      code: voucher.code,
      name: voucher.name,
      description: voucher.description ?? "",
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      minOrderValue: voucher.minOrderValue ?? null,
      maxDiscount: voucher.maxDiscount ?? null,
      usageLimit: voucher.usageLimit ?? null,
      usagePerUser: voucher.usagePerUser ?? null,
      startDate: voucher.startDate ?? null,
      endDate: voucher.endDate ?? null,
      isActive: voucher.isActive ?? true,
    })
    setFormVisible(true)
  }

  const statsMap = useMemo(() => {
    const map = new Map<number, UsageStat>()
    usageStats.forEach((item) => map.set(item.voucherId, item))
    return map
  }, [usageStats])

  const setFormValue = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="container-fluid py-3 py-md-4 px-2 px-sm-3 px-md-4">
      <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 mb-4">
        <div className="flex-grow-1">
          <h1 className="h2 mb-2">Voucher của nhà xe</h1>
          <p className="text-muted small mb-0">Thiết lập ưu đãi riêng cho khách hàng của bạn.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary w-100 w-md-auto"
          onClick={openCreateForm}
          style={{ whiteSpace: "nowrap" }}
        >
          <span className="me-2">＋</span>
          <span>Tạo voucher</span>
        </button>
      </div>

      <div className="card shadow-sm">
        {message && (
          <div className={`alert alert-${message.type === "success" ? "success" : "danger"} m-3 mb-0`} role="alert">
            {message.text}
          </div>
        )}

        <div className="table-responsive-sm">
          <table className="table table-hover mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th className="text-nowrap fs-7">Mã</th>
                <th className="text-nowrap d-none d-lg-table-cell fs-7">Tên</th>
                <th className="text-nowrap fs-7">Ưu đãi</th>
                <th className="text-nowrap d-none d-xxl-table-cell fs-7">Điều kiện</th>
                <th className="text-nowrap d-none d-lg-table-cell fs-7">Thống kê</th>
                <th className="text-nowrap fs-7">Trạng thái</th>
                <th className="text-nowrap fs-7">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-4">
                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                      <span className="visually-hidden">Đang tải...</span>
                    </div>
                  </td>
                </tr>
              ) : vouchers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted">
                    Bạn chưa có voucher nào. Hãy tạo ưu đãi mới để thu hút khách hàng.
                  </td>
                </tr>
              ) : (
                vouchers.map((voucher) => {
                  const stat = statsMap.get(voucher.id)
                  return (
                    <tr key={voucher.id}>
                      <td className="fw-bold">
                        <div className="fs-7">{voucher.code}</div>
                        {voucher.description && (
                          <div className="text-muted small text-truncate" title={voucher.description}>
                            {voucher.description}
                          </div>
                        )}
                      </td>
                      <td className="d-none d-lg-table-cell fs-7">{voucher.name}</td>
                      <td className="fs-7">
                        <div>
                          {voucher.discountType === "PERCENT"
                            ? `${voucher.discountValue}%`
                            : `${voucher.discountValue.toLocaleString("vi-VN")}đ`}
                        </div>
                        {voucher.maxDiscount != null && voucher.discountType === "PERCENT" && (
                          <div className="text-muted small">Tối đa {voucher.maxDiscount.toLocaleString("vi-VN")}đ</div>
                        )}
                      </td>
                      <td className="d-none d-xxl-table-cell small fs-7">
                        <div className="mb-1">
                          <strong>Tối thiểu:</strong>{" "}
                          {voucher.minOrderValue != null ? `${voucher.minOrderValue.toLocaleString("vi-VN")}đ` : "—"}
                        </div>
                        <div className="mb-1">
                          <strong>Lượt:</strong> {voucher.usageLimit ?? "∞"}
                        </div>
                        <div>
                          <strong>Khách:</strong> {voucher.usagePerUser ?? "∞"}
                        </div>
                      </td>
                      <td className="d-none d-lg-table-cell small fs-7">
                        <div className="mb-1">
                          <strong>Lượt:</strong> {stat?.usageCount ?? 0}
                        </div>
                        <div>
                          <strong>Giá trị:</strong> {(stat?.totalDiscount ?? 0).toLocaleString("vi-VN")}đ
                        </div>
                      </td>
                      <td className="fs-7">
                        <span className={`badge bg-${voucher.isActive ? "success" : "secondary"}`}>
                          {voucher.isActive ? "Áp dụng" : "Dừng"}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-1 flex-column flex-sm-row">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => openEditForm(voucher)}
                            title="Sửa voucher"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning"
                            onClick={() => handleToggle(voucher)}
                            title={voucher.isActive ? "Tạm dừng" : "Kích hoạt"}
                          >
                            {voucher.isActive ? "⏸" : "▶"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {formVisible && (
        <div
          className="modal d-block"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          tabIndex={-1}
          role="dialog"
          onClick={() => setFormVisible(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-dialog-scrollable"
            style={{ maxWidth: "min(500px, 95vw)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fs-6">{editingId ? "Cập nhật voucher" : "Tạo voucher mới"}</h5>
                <button
                  type="button"
                  className="btn-close btn-sm"
                  onClick={() => setFormVisible(false)}
                  aria-label="Đóng"
                ></button>
              </div>
              <form className="modal-body px-2 px-sm-3" onSubmit={handleSubmit}>
                <div className="mb-3">
                  <h6 className="text-uppercase text-muted fw-semibold fs-7 mb-2">Thông tin cơ bản</h6>
                  <div className="row g-2">
                    <div className="col-12 col-sm-6">
                      <label className="form-label small fw-semibold mb-1">
                        Mã voucher <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={formData.code}
                        onChange={(event) => setFormValue("code", event.target.value.toUpperCase())}
                        required
                        disabled={!!editingId}
                        placeholder="VD: SUMMER2024"
                      />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label small fw-semibold mb-1">
                        Tên hiển thị <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={formData.name}
                        onChange={(event) => setFormValue("name", event.target.value)}
                        required
                        placeholder="VD: Khuyến mãi hè"
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold mb-1">Mô tả</label>
                      <textarea
                        className="form-control form-control-sm"
                        value={formData.description ?? ""}
                        onChange={(event) => setFormValue("description", event.target.value)}
                        rows={2}
                        placeholder="Mô tả ngắn về voucher"
                        style={{ resize: "vertical", maxHeight: "80px" }}
                      />
                    </div>
                  </div>
                </div>

                <hr className="my-2" />

                <div className="mb-3">
                  <h6 className="text-uppercase text-muted fw-semibold fs-7 mb-2">Ưu đãi</h6>
                  <div className="row g-2">
                    <div className="col-12 col-sm-6">
                      <label className="form-label small fw-semibold mb-1">Kiểu ưu đãi</label>
                      <select
                        className="form-select form-select-sm"
                        value={formData.discountType}
                        onChange={(event) =>
                          setFormValue("discountType", event.target.value as FormState["discountType"])
                        }
                      >
                        <option value="AMOUNT">Theo số tiền</option>
                        <option value="PERCENT">Theo phần trăm</option>
                      </select>
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label small fw-semibold mb-1">
                        Giá trị ưu đãi <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        min={0}
                        step={formData.discountType === "PERCENT" ? 1 : 1000}
                        value={formData.discountValue}
                        onChange={(event) => setFormValue("discountValue", Number(event.target.value))}
                        required
                        placeholder={formData.discountType === "PERCENT" ? "0-100" : "0"}
                      />
                    </div>
                    {formData.discountType === "PERCENT" && (
                      <div className="col-12">
                        <label className="form-label small fw-semibold mb-1">Giảm tối đa (đ)</label>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          min={0}
                          step={1000}
                          value={formData.maxDiscount ?? ""}
                          onChange={(event) =>
                            setFormValue("maxDiscount", event.target.value ? Number(event.target.value) : null)
                          }
                          placeholder="Không giới hạn nếu để trống"
                        />
                      </div>
                    )}
                    <div className="col-12">
                      <label className="form-label small fw-semibold mb-1">Đơn tối thiểu (đ)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        min={0}
                        step={1000}
                        value={formData.minOrderValue ?? ""}
                        onChange={(event) =>
                          setFormValue("minOrderValue", event.target.value ? Number(event.target.value) : null)
                        }
                        placeholder="Không giới hạn nếu để trống"
                      />
                    </div>
                  </div>
                </div>

                <hr className="my-2" />

                <div className="mb-3">
                  <h6 className="text-uppercase text-muted fw-semibold fs-7 mb-2">Giới hạn sử dụng</h6>
                  <div className="row g-2">
                    <div className="col-12 col-sm-6">
                      <label className="form-label small fw-semibold mb-1">Tổng lượt dùng</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        min={0}
                        value={formData.usageLimit ?? ""}
                        onChange={(event) =>
                          setFormValue("usageLimit", event.target.value ? Number(event.target.value) : null)
                        }
                        placeholder="Không giới hạn"
                      />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label small fw-semibold mb-1">Mỗi khách dùng</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        min={0}
                        value={formData.usagePerUser ?? ""}
                        onChange={(event) =>
                          setFormValue("usagePerUser", event.target.value ? Number(event.target.value) : null)
                        }
                        placeholder="Không giới hạn"
                      />
                    </div>
                  </div>
                </div>

                <hr className="my-2" />

                <div className="mb-3">
                  <h6 className="text-uppercase text-muted fw-semibold fs-7 mb-2">Thời gian áp dụng</h6>
                  <div className="row g-2">
                    <div className="col-12 col-sm-6">
                      <label className="form-label small fw-semibold mb-1">Bắt đầu</label>
                      <input
                        type="datetime-local"
                        className="form-control form-control-sm"
                        value={formData.startDate ? new Date(formData.startDate).toISOString().slice(0, 16) : ""}
                        onChange={(event) =>
                          setFormValue(
                            "startDate",
                            event.target.value ? new Date(event.target.value).toISOString() : null,
                          )
                        }
                      />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label small fw-semibold mb-1">Kết thúc</label>
                      <input
                        type="datetime-local"
                        className="form-control form-control-sm"
                        value={formData.endDate ? new Date(formData.endDate).toISOString().slice(0, 16) : ""}
                        onChange={(event) =>
                          setFormValue(
                            "endDate",
                            event.target.value ? new Date(event.target.value).toISOString() : null,
                          )
                        }
                      />
                    </div>
                  </div>
                </div>

                <hr className="my-2" />

                <div className="mb-0">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="isActive"
                      checked={!!formData.isActive}
                      onChange={(event) => setFormValue("isActive", event.target.checked)}
                    />
                    <label className="form-check-label small" htmlFor="isActive">
                      Kích hoạt ngay
                    </label>
                  </div>
                </div>

                <div className="modal-footer mt-3 gap-2 border-top pt-3">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFormVisible(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm">
                    {editingId ? "Lưu thay đổi" : "Tạo voucher"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManageCompanyVouchers
