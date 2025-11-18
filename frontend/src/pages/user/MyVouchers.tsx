import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import voucherAPI from '../../services/voucher';
import type { UserVoucher, VoucherStatus } from '../../types/voucher';
import '../../style/vouchers.css';

const STATUS_LABELS: Record<VoucherStatus, string> = {
  ACTIVE: 'Con hieu luc',
  EXPIRING: 'Sap het han',
  EXPIRED: 'Het han',
  USED: 'Da dung',
  INACTIVE: 'Ngung ap dung',
  UNKNOWN: 'Khong xac dinh',
  UPCOMING: 'Sap ap dung'
};

const statusOptions: Array<{ value: VoucherStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'ACTIVE', label: STATUS_LABELS.ACTIVE },
  { value: 'EXPIRING', label: STATUS_LABELS.EXPIRING },
  { value: 'UPCOMING', label: STATUS_LABELS.UPCOMING },
  { value: 'USED', label: STATUS_LABELS.USED },
  { value: 'EXPIRED', label: STATUS_LABELS.EXPIRED }
];

const formatCurrency = (value?: number | null) =>
  value != null ? `${value.toLocaleString('vi-VN')}đ` : '—';
const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('vi-VN') : 'Không giới hạn';

const MyVouchers = () => {
  const [vouchers, setVouchers] = useState<UserVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<VoucherStatus | 'ALL'>('ALL');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const loadVouchers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await voucherAPI.listWallet();
      if (response.success) {
        setVouchers(response.data);
      } else {
        setError('Không thể tải kho voucher.');
      }
    } catch (err) {
      console.error('Failed to load user vouchers', err);
      setError('Đã xảy ra lỗi khi tải kho voucher.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVouchers();
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  const filteredVouchers = useMemo(() => {
    if (statusFilter === 'ALL') {
      return vouchers;
    }
    return vouchers.filter((voucher) => voucher.status === statusFilter);
  }, [vouchers, statusFilter]);

  const handleRemove = async (id: number) => {
    if (!window.confirm('Bạn chắc chắn muốn bỏ lưu voucher này?')) {
      return;
    }
    try {
      const response = await voucherAPI.removeFromWallet(id);
      if (response.success) {
        setMessage({ type: 'success', text: response.message || 'Đã bỏ lưu voucher.' });
        await loadVouchers();
      } else {
        setMessage({ type: 'error', text: response.message || 'Không thể bỏ lưu voucher.' });
      }
    } catch (err) {
      console.error('remove voucher failed', err);
      setMessage({ type: 'error', text: 'Đã xảy ra lỗi. Vui lòng thử lại.' });
    }
  };

  const handleSaveByCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = codeInput.trim().toUpperCase();
    if (!normalized) {
      setMessage({ type: 'error', text: 'Vui lòng nhập mã voucher.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const lookup = await voucherAPI.getByCode(normalized);
      if (!lookup.success || !lookup.data?.id) {
        throw new Error('Khong tim thay voucher.');
      }

      const response = await voucherAPI.saveToWallet(lookup.data.id);
      if (!response.success) {
        throw new Error(response.message || 'Không thể lưu voucher.');
      }

      setMessage({ type: 'success', text: response.message || 'Đã lưu voucher vào kho.' });
      setCodeInput('');
      await loadVouchers();
    } catch (err) {
      console.error('save voucher by code failed', err);
      const errorMessage = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string } | undefined)?.message || 'Không thể lưu voucher.'
        : err instanceof Error
        ? err.message
        : 'Không thể lưu voucher.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyCode = async (code?: string) => {
    if (!code) {
      setMessage({ type: 'error', text: 'Không tìm thấy mã voucher để sao chép.' });
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      setMessage({ type: 'success', text: `Đã sao chép mã ${code}.` });
    } catch (err) {
      console.error('Clipboard copy failed', err);
      setMessage({ type: 'error', text: 'Không thể sao chép mã. Vui lòng thử lại.' });
    }
  };

  const handleUseVoucher = (voucher: UserVoucher) => {
    if (!voucher.voucher?.code) {
      setMessage({ type: 'error', text: 'Voucher không khả dụng.' });
      return;
    }
    navigate('/search', { state: { voucherCode: voucher.voucher.code } });
  };

  return (
    <section className="voucher-page">
      <div className="voucher-container">
        <header className="voucher-header">
          <h1>Kho voucher của tôi</h1>
          <p>Quản lý và áp dụng các ưu đãi đã lưu để tiết kiệm chi phí cho mỗi chuyến đi.</p>
        </header>

        <div className="voucher-toolbar">
          <form className="voucher-save-form" onSubmit={handleSaveByCode}>
            <input
              type="text"
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value)}
              placeholder="Nhập mã voucher để lưu"
              maxLength={32}
              disabled={saving}
            />
            <button type="submit" className="btn-outline" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu vào kho'}
            </button>
          </form>
          <div className="voucher-filter-group">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as VoucherStatus | 'ALL')}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button type="button" className="btn-outline" onClick={loadVouchers} disabled={loading}>
              {loading ? 'Đang tải...' : 'Làm mới'}
            </button>
          </div>
          <button type="button" className="btn-outline" onClick={() => navigate('/news')}>
            Tìm ưu đãi mới
          </button>
        </div>

        {message && (
          <div className={`voucher-message ${message.type === 'success' ? 'success' : 'error'}`}>
            {message.text}
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {loading ? (
          <div className="empty-state">
            <div className="guest-checkout-spinner" />
            <h3>Đang tải voucher của bạn...</h3>
            <p>Vui lòng chờ trong giây lát.</p>
          </div>
        ) : filteredVouchers.length === 0 ? (
          <div className="empty-state">
            <h3>Chưa có voucher nào</h3>
            <p>
              Hãy ghé thăm mục Tin khuyến mãi để lưu các ưu đãi mới nhất và nhận thông báo khi sắp hết hạn.
            </p>
            <button type="button" className="btn-outline" onClick={() => navigate('/news')}>
              Khám phá ưu đãi
            </button>
          </div>
        ) : (
          <div className="voucher-grid">
            {filteredVouchers.map((item) => {
              const voucher = item.voucher;
              const status = item.status || 'UNKNOWN';
              return (
                <article key={item.id} className="voucher-card">
                  <div className="voucher-card-header">
                    <span className="voucher-code">{voucher?.code ?? '—'}</span>
                    <span className={`voucher-status-badge ${status}`}>
                      {STATUS_LABELS[status] ?? 'Không xác định'}
                    </span>
                  </div>

                  <div className="voucher-body">
                    <p>{voucher?.description || 'Ưu đãi dành riêng cho bạn.'}</p>
                    <div className="voucher-meta">
                      <span>
                        💸{' '}
                        {voucher?.discountType === 'PERCENT'
                          ? `${voucher?.discountValue || 0}%`
                          : formatCurrency(voucher?.discountValue)}
                      </span>
                      <span>🧾 Tối thiểu: {formatCurrency(voucher?.minOrderValue)}</span>
                      {voucher?.maxDiscount != null && (
                        <span>🎯 Giảm tối đa: {formatCurrency(voucher?.maxDiscount)}</span>
                      )}
                      <span>
                        ⏱{' '}
                        {voucher?.startDate
                          ? `${formatDate(voucher.startDate)} → ${formatDate(voucher?.endDate ?? null)}`
                          : 'Hiệu lực linh hoạt'}
                      </span>
                      {item.daysToExpire != null && item.daysToExpire >= 0 && (
                        <span>📅 Còn {item.daysToExpire} ngày</span>
                      )}
                      {voucher?.company?.name && (
                        <span>🏢 {voucher.company.name}</span>
                      )}
                    </div>
                  </div>

                  <div className="voucher-actions">
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => handleCopyCode(voucher?.code)}
                    >
                      Sao chép mã
                    </button>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => handleUseVoucher(item)}
                      disabled={!voucher}
                    >
                      Dùng ngay
                    </button>
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => handleRemove(item.id)}
                    >
                      Bỏ lưu
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default MyVouchers;
