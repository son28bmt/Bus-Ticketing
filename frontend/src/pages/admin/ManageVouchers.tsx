"use client"

import type React from "react"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  adminAPI,
  type AdminVoucherListResponse,
  type BusCompany,
  type VoucherPayload,
} from "../../services/admin"
import type { Voucher } from "../../types/voucher"
import { toViStatus, statusVariant } from "../../utils/status"
import "../../style/dashboard.css"
import "../../style/vouchers.css"

type FormState = VoucherPayload

type AdminVoucher = Voucher & {
  creator?: {
    id: number
    name?: string | null
    email?: string | null
  } | null
}

const defaultForm: FormState = {
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
  companyId: null,
  isActive: true,
  metadata: null,
}

const initialPagination = {
  total: 0,
  page: 1,
  pages: 1,
  limit: 20,
}
const ManageVouchers = () => {
  const [vouchers, setVouchers] = useState<AdminVoucher[]>([])
  const [companies, setCompanies] = useState<BusCompany[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [formVisible, setFormVisible] = useState(false)
  const [formData, setFormData] = useState<FormState>(defaultForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const [pagination, setPagination] = useState(initialPagination)

  // Helpers to handle datetime-local without timezone drift
  const toLocalDateTimeInput = (iso?: string | null) => {
    if (!iso) return ""
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
      d.getMinutes(),
    )}`
  }
  const fromLocalInputToISO = (value: string | null) => {
    if (!value) return null
    const d = new Date(value)
    return d.toISOString()
  }

  const loadCompanies = useCallback(async () => {
    setLoadingCompanies(true)
    try {
      const response = await adminAPI.getCompanies({ limit: 200, isActive: true })
      if (response.success && Array.isArray(response.data)) {
        setCompanies(response.data)
      }
    } catch (err) {
      console.error("Failed to load companies", err)
    } finally {
      setLoadingCompanies(false)
    }
  }, [])

  const fetchVouchers = async (page = 1) => {
    setLoading(true)
    setError(null)
    try {
      const response: AdminVoucherListResponse = await adminAPI.getVouchers({
        page,
        limit: pagination.limit,
        search: search.trim() || undefined,
      })
      const next = Array.isArray(response.data) ? (response.data as AdminVoucher[]) : []
      setVouchers(next)
      if (response.pagination) {
        setPagination(response.pagination)
      }
    } catch (err) {
      console.error("Failed to load vouchers", err)
      setError("Khong the tai danh sach voucher.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVouchers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadCompanies()
  }, [loadCompanies])

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(null), 3200)
    return () => window.clearTimeout(timer)
  }, [message])

  const pagedVouchers = useMemo(() => vouchers ?? [], [vouchers])

  const summary = useMemo(() => {
    const nowTs = Date.now()
    let active = 0
    let upcoming = 0
    let expired = 0

    pagedVouchers.forEach((voucher) => {
      const startTs = voucher.startDate ? new Date(voucher.startDate).getTime() : null
      const statusKey = (voucher.status ?? (voucher.isActive ? "ACTIVE" : "INACTIVE")).toUpperCase()

      if (startTs != null && startTs > nowTs) {
        upcoming += 1
        return
      }

      if (statusKey === "EXPIRED") {
        expired += 1
        return
      }

      if (statusKey === "ACTIVE" || statusKey === "EXPIRING") {
        active += 1
      }
    })

    return {
      total: pagination.total ?? pagedVouchers.length,
      active,
      upcoming,
      expired,
    }
  }, [pagedVouchers, pagination.total])

  const setFormValue = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const openCreateModal = () => {
    setFormData(defaultForm)
    setEditingId(null)
    setFormVisible(true)
    if (!companies.length) {
      void loadCompanies()
    }
  }

  const openEditModal = (voucher: AdminVoucher) => {
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
      companyId: voucher.companyId ?? null,
      isActive: voucher.isActive ?? true,
      metadata: voucher.metadata ?? null,
    })
    setFormVisible(true)
    if (!companies.length) {
      void loadCompanies()
    }
  }

  const closeForm = () => {
    setFormVisible(false)
    setEditingId(null)
    setFormData(defaultForm)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!formData.code.trim() || !formData.name.trim()) {
      setMessage({ type: "error", text: "Vui long nhap ma va ten voucher." })
      return
    }

    if (Number(formData.discountValue) <= 0) {
      setMessage({ type: "error", text: "Gia tri uu dai phai lon hon 0." })
      return
    }

    if (formData.discountType === "PERCENT") {
      const value = Number(formData.discountValue)
      if (value <= 0 || value > 100) {
        setMessage({ type: "error", text: "Phan tram uu dai phai trong khoang 1-100%." })
        return
      }
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate).getTime()
      const end = new Date(formData.endDate).getTime()
      if (end <= start) {
        setMessage({ type: "error", text: "Ngay ket thuc phai sau ngay bat dau." })
        return
      }
    }

    try {
      if (editingId) {
        const { code, ...rest } = formData
        await adminAPI.updateVoucher(editingId, {
          ...rest,
          code: code.trim(),
          name: formData.name.trim(),
        })
        setMessage({ type: "success", text: "Da cap nhat voucher." })
      } else {
        await adminAPI.createVoucher({
          ...formData,
          code: formData.code.trim(),
          name: formData.name.trim(),
        })
        setMessage({ type: "success", text: "Tao voucher thanh cong." })
      }

      closeForm()
      await fetchVouchers(pagination.page)
    } catch (err: unknown) {
      console.error("Voucher submit failed", err)
      const anyErr = err as { response?: { status?: number; data?: { message?: string } } }
      if (anyErr?.response?.status === 409) {
        setMessage({ type: "error", text: anyErr.response.data?.message || "Ma voucher da ton tai." })
      } else {
        setMessage({
          type: "error",
          text: anyErr?.response?.data?.message || (editingId ? "Khong the cap nhat voucher." : "Khong the tao voucher moi."),
        })
      }
    }
  }

  const handleToggle = async (voucher: AdminVoucher) => {
    try {
      await adminAPI.toggleVoucher(voucher.id, !(voucher.isActive ?? true))
      setMessage({
        type: "success",
        text: voucher.isActive ? "Da tam dung voucher." : "Da kich hoat voucher.",
      })
      await fetchVouchers(pagination.page)
    } catch (err) {
      console.error("toggle voucher failed", err)
      setMessage({ type: "error", text: "Khong the cap nhat trang thai voucher." })
    }
  }

  const handleArchive = async (voucher: AdminVoucher) => {
    if (!window.confirm(`Ban chac chan muon vo hieu hoa voucher ${voucher.code}?`)) {
      return
    }

    try {
      await adminAPI.archiveVoucher(voucher.id)
      setMessage({ type: "success", text: "Voucher da duoc vo hieu hoa." })
      await fetchVouchers(pagination.page)
    } catch (err) {
      console.error("archive voucher failed", err)
      setMessage({ type: "error", text: "Khong the vo hieu hoa voucher." })
    }
  }

  const handlePageChange = (direction: "prev" | "next") => {
    const nextPage = direction === "prev" ? pagination.page - 1 : pagination.page + 1
    if (nextPage < 1 || nextPage > pagination.pages) return
    void fetchVouchers(nextPage)
  }

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void fetchVouchers(1)
  }
  return (
    <div className="container-fluid py-3 py-md-4 px-2 px-sm-3 px-md-4">
      <div className="d-flex flex-column flex-md-row align-items-start align-md-items-center justify-content-between gap-3 mb-4">
        <div className="flex-grow-1">
          <h1 className="h2 mb-2">Quan ly voucher</h1>
          <p className="text-muted small mb-0">Theo doi, tao moi va kiem soat cac chuong trinh khuyen mai.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary w-100 w-sm-auto"
          onClick={openCreateModal}
          style={{ whiteSpace: "nowrap" }}
        >
          <span className="me-2">+</span>
          <span>Tao voucher</span>
        </button>
      </div>

      <div className="card shadow-sm">
        {(message || error) && (
          <div className="card-body border-bottom">
            {message && (
              <div className={`alert alert-${message.type === "success" ? "success" : "danger"} mb-0`} role="alert">
                {message.text}
              </div>
            )}
            {error && (
              <div className="alert alert-danger mb-0 mt-2" role="alert">
                {error}
              </div>
            )}
          </div>
        )}

        <div className="card-body border-bottom">
          <div className="admin-summary-grid">
            <div className="summary-card total">
              <span className="summary-value">{summary.total}</span>
              <span className="summary-label">Tong voucher</span>
            </div>
            <div className="summary-card active">
              <span className="summary-value">{summary.active}</span>
              <span className="summary-label">Dang ap dung</span>
            </div>
            <div className="summary-card upcoming">
              <span className="summary-value">{summary.upcoming}</span>
              <span className="summary-label">Sap dien ra</span>
            </div>
            <div className="summary-card expired">
              <span className="summary-value">{summary.expired}</span>
              <span className="summary-label">Het han</span>
            </div>
          </div>
        </div>

        <div className="card-body border-bottom bg-light">
          <form onSubmit={handleSearchSubmit} className="row g-2 align-items-end">
            <div className="col-12 col-md-6 col-lg-4">
              <label className="form-label small fw-semibold mb-1" htmlFor="voucherSearch">
                Tim kiem
              </label>
              <input
                id="voucherSearch"
                type="text"
                className="form-control form-control-sm"
                placeholder="Ma hoac ten voucher..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="col-12 col-md-auto">
              <button type="submit" className="btn btn-primary btn-sm w-100" disabled={loading}>
                Tim kiem
              </button>
            </div>
          </form>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="text-nowrap">Ma</th>
                <th className="text-nowrap d-none d-md-table-cell">Ten hien thi</th>
                <th className="text-nowrap">Uu dai</th>
                <th className="text-nowrap d-none d-lg-table-cell">Dieu kien</th>
                <th className="text-nowrap d-none d-xl-table-cell">Hieu luc</th>
                <th className="text-nowrap d-none d-lg-table-cell">Thong ke</th>
                <th className="text-nowrap">Trang thai</th>
                <th className="text-nowrap">Hanh dong</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-4">
                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                      <span className="visually-hidden">Dang tai...</span>
                    </div>
                  </td>
                </tr>
              ) : pagedVouchers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-5 text-muted">
                    Chua co voucher nao.
                  </td>
                </tr>
              ) : (
                pagedVouchers.map((voucher) => {
                  const nowTs = Date.now()
                  const startTs = voucher.startDate ? new Date(voucher.startDate).getTime() : null
                  const baseStatus = (voucher.status ?? (voucher.isActive ? "ACTIVE" : "INACTIVE")).toUpperCase()
                  const computedStatus = startTs != null && startTs > nowTs ? "UPCOMING" : baseStatus
                  const badgeVariant = statusVariant(computedStatus)
                  const statusLabel = toViStatus(computedStatus)
                  const expNote =
                    computedStatus === "EXPIRING" && typeof voucher.daysToExpire === "number"
                      ? `Con ${voucher.daysToExpire} ngay`
                      : null
                  const discountValue =
                    voucher.discountType === "PERCENT"
                      ? `${voucher.discountValue}%`
                      : `${voucher.discountValue.toLocaleString("vi-VN")}d`
                  const maxDiscount =
                    voucher.discountType === "PERCENT" && voucher.maxDiscount != null
                      ? `Toi da ${voucher.maxDiscount.toLocaleString("vi-VN")}d`
                      : null
                  const minOrder =
                    voucher.minOrderValue != null ? `${voucher.minOrderValue.toLocaleString("vi-VN")}d` : "-"
                  const usageLimit = voucher.usageLimit ?? "Unlimited"
                  const usagePerUser = voucher.usagePerUser ?? "Unlimited"
                  const startLabel = voucher.startDate ? new Date(voucher.startDate).toLocaleString("vi-VN") : "-"
                  const endLabel = voucher.endDate ? new Date(voucher.endDate).toLocaleString("vi-VN") : "-"

                  return (
                    <tr key={voucher.id}>
                      <td className="fw-semibold text-nowrap">
                        <div>{voucher.code}</div>
                        <div className="text-muted small">
                          {voucher.company?.name ? `Nha xe ${voucher.company.name}` : "Toan he thong"}
                        </div>
                      </td>
                      <td className="d-none d-md-table-cell">
                        <div className="fw-semibold">{voucher.name}</div>
                        {voucher.description && (
                          <div className="text-muted small text-truncate" title={voucher.description ?? undefined}>
                            {voucher.description}
                          </div>
                        )}
                      </td>
                      <td>
                        <div>{discountValue}</div>
                        {maxDiscount && <div className="text-muted small">{maxDiscount}</div>}
                      </td>
                      <td className="d-none d-lg-table-cell small">
                        <div>
                          <strong>Toi thieu:</strong> {minOrder}
                        </div>
                        <div>
                          <strong>Luot:</strong> {usageLimit}
                        </div>
                        <div>
                          <strong>Khach:</strong> {usagePerUser}
                        </div>
                      </td>
                      <td className="d-none d-xl-table-cell small">
                        <div>
                          <strong>Bat dau:</strong> {startLabel}
                        </div>
                        <div>
                          <strong>Ket thuc:</strong> {endLabel}
                        </div>
                      </td>
                      <td className="d-none d-lg-table-cell small">
                        <div>
                          <strong>Da dung:</strong> {voucher.usedCount ?? 0}
                        </div>
                        {voucher.creator?.name && (
                          <div className="text-muted small">Tao boi {voucher.creator.name}</div>
                        )}
                      </td>
                      <td>
                        <div className="d-flex flex-column">
                          <span className={`badge bg-${badgeVariant}`}>
                            {statusLabel}
                          </span>
                          {expNote && <span className="text-muted small mt-1">{expNote}</span>}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex gap-1 flex-wrap">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => openEditModal(voucher)}
                            title="Sua voucher"
                          >
                            Sua
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning"
                            onClick={() => handleToggle(voucher)}
                            title={voucher.isActive ? "Tam dung" : "Kich hoat"}
                          >
                            {voucher.isActive ? "Pause" : "Start"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleArchive(voucher)}
                            title="Vo hieu hoa"
                          >
                            Remove
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
        {pagination.pages > 1 && (
          <div className="card-footer bg-white">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => handlePageChange("prev")}
                >
                  {"< Prev"}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={pagination.page >= pagination.pages || loading}
                  onClick={() => handlePageChange("next")}
                >
                  {"Next >"}
                </button>
              </div>
              <div className="text-muted small">
                Trang {pagination.page}/{pagination.pages}
              </div>
            </div>
          </div>
        )}
      </div>
      {formVisible && (
        <div
          className="modal d-block"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          tabIndex={-1}
          role="dialog"
          onClick={closeForm}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-dialog-scrollable"
            style={{ maxWidth: "520px" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fs-6">{editingId ? "Cap nhat voucher" : "Tao voucher moi"}</h5>
                <button type="button" className="btn-close" onClick={closeForm} aria-label="Dong"></button>
              </div>
              <form className="modal-body px-2 px-sm-3" onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <h6 className="text-uppercase text-muted fw-semibold fs-7 mb-2">Thong tin co ban</h6>
                    <div className="row g-2">
                      <div className="col-12 col-sm-6">
                        <label className="form-label small fw-semibold mb-1" htmlFor="voucherCode">
                          Ma voucher <span className="text-danger">*</span>
                        </label>
                        <input
                          id="voucherCode"
                          type="text"
                          className="form-control form-control-sm"
                          value={formData.code}
                          onChange={(event) => setFormValue("code", event.target.value.toUpperCase())}
                          placeholder="VD: SUMMER2025"
                          required
                          disabled={!!editingId}
                        />
                      </div>
                      <div className="col-12 col-sm-6">
                        <label className="form-label small fw-semibold mb-1" htmlFor="voucherName">
                          Ten hien thi <span className="text-danger">*</span>
                        </label>
                        <input
                          id="voucherName"
                          type="text"
                          className="form-control form-control-sm"
                          value={formData.name}
                          onChange={(event) => setFormValue("name", event.target.value)}
                          placeholder="VD: Khuyen mai he"
                          required
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-semibold mb-1" htmlFor="voucherScope">
                          Ap dung cho
                        </label>
                        <select
                          id="voucherScope"
                          className="form-select form-select-sm"
                          value={formData.companyId ?? ""}
                          onChange={(event) =>
                            setFormValue("companyId", event.target.value ? Number(event.target.value) : null)
                          }
                        >
                          <option value="">Toan he thong</option>
                          {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                              Nha xe {company.name}
                            </option>
                          ))}
                        </select>
                        {loadingCompanies && <div className="form-text">Dang tai danh sach nha xe...</div>}
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-semibold mb-1" htmlFor="voucherDescription">
                          Mo ta
                        </label>
                        <textarea
                          id="voucherDescription"
                          className="form-control form-control-sm"
                          value={formData.description ?? ""}
                          onChange={(event) => setFormValue("description", event.target.value)}
                          rows={2}
                          placeholder="Mo ta ngan ve voucher"
                          style={{ resize: "vertical", maxHeight: "80px" }}
                        />
                      </div>
                    </div>
                  </div>

                  <hr className="my-2" />

                  <div className="mb-3">
                    <h6 className="text-uppercase text-muted fw-semibold fs-7 mb-2">Uu dai</h6>
                    <div className="row g-2">
                      <div className="col-12 col-sm-6">
                        <label className="form-label small fw-semibold mb-1" htmlFor="voucherDiscountType">
                          Kieu uu dai
                        </label>
                        <select
                          id="voucherDiscountType"
                          className="form-select form-select-sm"
                          value={formData.discountType}
                          onChange={(event) =>
                            setFormValue("discountType", event.target.value as FormState["discountType"])
                          }
                        >
                          <option value="AMOUNT">Theo so tien</option>
                          <option value="PERCENT">Theo phan tram</option>
                        </select>
                      </div>
                      <div className="col-12 col-sm-6">
                        <label className="form-label small fw-semibold mb-1" htmlFor="voucherDiscountValue">
                          Gia tri uu dai <span className="text-danger">*</span>
                        </label>
                        <input
                          id="voucherDiscountValue"
                          type="number"
                          className="form-control form-control-sm"
                          min={0}
                          step={formData.discountType === "PERCENT" ? 1 : 1000}
                          value={formData.discountValue}
                          onChange={(event) => setFormValue("discountValue", Number(event.target.value))}
                          required
                          placeholder={formData.discountType === "PERCENT" ? "0-100" : " "}
                        />
                      </div>
                      {formData.discountType === "PERCENT" && (
                        <div className="col-12">
                          <label className="form-label small fw-semibold mb-1" htmlFor="voucherMaxDiscount">
                            Giam toi da (d)
                          </label>
                          <input
                            id="voucherMaxDiscount"
                            type="number"
                            className="form-control form-control-sm"
                            min={0}
                            step={1000}
                            value={formData.maxDiscount ?? ""}
                            onChange={(event) =>
                              setFormValue("maxDiscount", event.target.value ? Number(event.target.value) : null)
                            }
                            placeholder="Khong gioi han neu de trong"
                          />
                        </div>
                      )}
                      <div className="col-12">
                        <label className="form-label small fw-semibold mb-1" htmlFor="voucherMinOrder">
                          Don toi thieu (d)
                        </label>
                        <input
                          id="voucherMinOrder"
                          type="number"
                          className="form-control form-control-sm"
                          min={0}
                          step={1000}
                          value={formData.minOrderValue ?? ""}
                          onChange={(event) =>
                            setFormValue("minOrderValue", event.target.value ? Number(event.target.value) : null)
                          }
                          placeholder="Khong gioi han neu de trong"
                        />
                      </div>
                    </div>
                  </div>

                  <hr className="my-2" />

                  <div className="mb-3">
                    <h6 className="text-uppercase text-muted fw-semibold fs-7 mb-2">Gioi han su dung</h6>
                    <div className="row g-2">
                      <div className="col-12 col-sm-6">
                        <label className="form-label small fw-semibold mb-1" htmlFor="voucherUsageLimit">
                          Tong luot dung
                        </label>
                        <input
                          id="voucherUsageLimit"
                          type="number"
                          className="form-control form-control-sm"
                          min={0}
                          value={formData.usageLimit ?? ""}
                          onChange={(event) =>
                            setFormValue("usageLimit", event.target.value ? Number(event.target.value) : null)
                          }
                          placeholder="Khong gioi han"
                        />
                      </div>
                      <div className="col-12 col-sm-6">
                        <label className="form-label small fw-semibold mb-1" htmlFor="voucherUsagePerUser">
                          Moi khach dung
                        </label>
                        <input
                          id="voucherUsagePerUser"
                          type="number"
                          className="form-control form-control-sm"
                          min={0}
                          value={formData.usagePerUser ?? ""}
                          onChange={(event) =>
                            setFormValue("usagePerUser", event.target.value ? Number(event.target.value) : null)
                          }
                          placeholder="Khong gioi han"
                        />
                      </div>
                    </div>
                  </div>

                  <hr className="my-2" />

                  <div className="mb-3">
                    <h6 className="text-uppercase text-muted fw-semibold fs-7 mb-2">Thoi gian ap dung</h6>
                    <div className="row g-2">
                      <div className="col-12 col-sm-6">
                        <label className="form-label small fw-semibold mb-1" htmlFor="voucherStartDate">
                          Bat dau
                        </label>
                        <input
                          id="voucherStartDate"
                          type="datetime-local"
                          className="form-control form-control-sm"
                          value={toLocalDateTimeInput(formData.startDate)}
                          onChange={(event) => setFormValue("startDate", fromLocalInputToISO(event.target.value))}
                        />
                      </div>
                      <div className="col-12 col-sm-6">
                        <label className="form-label small fw-semibold mb-1" htmlFor="voucherEndDate">
                          Ket thuc
                        </label>
                        <input
                          id="voucherEndDate"
                          type="datetime-local"
                          className="form-control form-control-sm"
                          value={toLocalDateTimeInput(formData.endDate)}
                          onChange={(event) => setFormValue("endDate", fromLocalInputToISO(event.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  <hr className="my-2" />

                  <div className="mb-0">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="voucherIsActive"
                        checked={!!formData.isActive}
                        onChange={(event) => setFormValue("isActive", event.target.checked)}
                      />
                      <label className="form-check-label small" htmlFor="voucherIsActive">
                        Kich hoat ngay
                      </label>
                    </div>
                  </div>
                </div>

                <div className="modal-footer gap-2 border-top">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={closeForm}>
                    Huy
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm">
                    {editingId ? "Luu thay doi" : "Tao voucher"}
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

export default ManageVouchers
