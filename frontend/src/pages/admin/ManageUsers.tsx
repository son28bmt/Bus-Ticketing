import { useEffect, useState } from "react";
import api from "../../services/http";
import ROLES from "../../constants/roles";
import { adminAPI } from "../../services/admin";
import "../../style/table.css";
import { toViStatus, statusVariant } from "../../utils/status";

type UserRow = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  company?: { id: number; name: string } | null;
  status: string;
  createdAt?: string;
};

type EditingUser = Partial<UserRow> & { companyId?: number | null; password?: string };

const PASSWORD_MIN_LENGTH = 8;

export default function ManageUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<EditingUser | null>(null);
  const [companies, setCompanies] = useState<Array<{ id: number; name: string }>>([]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/users", { params: { page, limit, search } });
      if (res.data && res.data.data) {
        setUsers(res.data.data.users || []);
        setTotal(res.data.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error("Error fetching users", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await adminAPI.getCompanies({ limit: 100 });
      if (res.success) {
        const list = (res.data || []).map((company) => ({
          id: company.id,
          name: company.name,
        }));
        setCompanies(list);
      }
    } catch (err) {
      console.error("Error fetching companies", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  const openCreate = () => {
    setEditingUser({ role: ROLES.PASSENGER, status: "ACTIVE" });
    setShowModal(true);
  };

  const openEdit = (u: UserRow) => {
    setEditingUser({ ...u, companyId: u.company?.id });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editingUser) return;
    try {
      if (editingUser.id) {
        await api.put(
          `/admin/users/${editingUser.id}`,
          editingUser as Record<string, unknown>
        );
      } else {
        const payload = {
          ...(editingUser as Record<string, unknown>),
        } as Record<string, unknown>;
        const rawPassword = (payload as { password?: string }).password;
        const password =
          typeof rawPassword === "string" ? rawPassword.trim() : undefined;

        if (!password || password.length < PASSWORD_MIN_LENGTH) {
          alert(`Vui long nhap mat khau toi thieu ${PASSWORD_MIN_LENGTH} ky tu.`);
          return;
        }

        (payload as { password: string }).password = password;
        await api.post("/admin/users", payload);
      }

      setShowModal(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Save user error", msg);
      alert("Loi khi luu nguoi dung: " + msg);
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (!confirm("Ban chac chan muon xoa nguoi dung nay?")) return;
    try {
      await api.delete(`/admin/users/${id}`);
      fetchUsers();
    } catch (err) {
      console.error("Delete user error", err);
      alert("Loi khi xoa nguoi dung");
    }
  };

  const roleLabel = (r: string) => {
    if (r === ROLES.ADMIN) return "Quan tri vien";
    if (r === ROLES.COMPANY) return "Nha xe";
    return "Hanh khach";
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Quan ly tai khoan</h2>
        <div>
          <button className="btn btn-primary" onClick={openCreate}>
            Them nguoi dung
          </button>
        </div>
      </div>

      <div className="card p-3 mb-3">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-4">
            <input
              className="form-control"
              placeholder="Tim theo ten hoac email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-3">
            <button className="btn btn-outline-secondary" onClick={() => setPage(1)}>
              Lam moi
            </button>
          </div>
        </div>
      </div>

      <div className="card p-3">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Ho ten</th>
                <th>Email</th>
                <th>So dien thoai</th>
                <th>Nha xe</th>
                <th>Vai tro</th>
                <th>Trang thai</th>
                <th>Hanh dong</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8}>Dang tai...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8}>Khong co nguoi dung</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.phone || "-"}</td>
                    <td>{u.company?.name || "-"}</td>
                    <td>{roleLabel(u.role)}</td>
                    <td>
                      <span className={`badge bg-${statusVariant(u.status)}`}>
                        {toViStatus(u.status)}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => openEdit(u)}
                      >
                        Sua
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        style={{ marginLeft: 8 }}
                        onClick={() => handleDelete(u.id)}
                      >
                        Xoa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>Tong: {total} nguoi dung</div>
          <div>
            <button className="btn btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </button>
            <span style={{ margin: "0 8px" }}>Trang {page}</span>
            <button className="btn btn-sm" onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </div>
      </div>

      {showModal && editingUser && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="card" style={{ width: "min(640px, 95vw)", padding: 16 }}>
            <h3>{editingUser.id ? "Sua nguoi dung" : "Tao nguoi dung"}</h3>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label>Ho ten</label>
                <input
                  className="form-control"
                  value={editingUser.name || ""}
                  onChange={(e) =>
                    setEditingUser((prev) => ({ ...(prev || {}), name: e.target.value }))
                  }
                />
              </div>
              <div className="col-12 col-md-6">
                <label>Email</label>
                <input
                  className="form-control"
                  value={editingUser.email || ""}
                  onChange={(e) =>
                    setEditingUser((prev) => ({ ...(prev || {}), email: e.target.value }))
                  }
                />
              </div>
              <div className="col-12 col-md-6">
                <label>So dien thoai</label>
                <input
                  className="form-control"
                  value={editingUser.phone || ""}
                  onChange={(e) =>
                    setEditingUser((prev) => ({ ...(prev || {}), phone: e.target.value }))
                  }
                />
              </div>
              <div className="col-12 col-md-6">
                <label>Vai tro</label>
                <select
                  className="form-select"
                  value={editingUser.role}
                  onChange={(e) =>
                    setEditingUser((prev) => ({ ...(prev || {}), role: e.target.value }))
                  }
                >
                  <option value={ROLES.PASSENGER}>Hanh khach</option>
                  <option value={ROLES.COMPANY}>Nha xe</option>
                  <option value={ROLES.ADMIN}>Quan tri vien</option>
                </select>
              </div>

              <div className="col-12 col-md-6">
                <label>Nha xe (neu co)</label>
                <select
                  className="form-select"
                  value={editingUser?.companyId ?? ""}
                  onChange={(e) =>
                    setEditingUser((prev) => ({
                      ...(prev || {}),
                      companyId: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                >
                  <option value="">-- Khong --</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-6">
                <label>Trang thai</label>
                <select
                  className="form-select"
                  value={editingUser.status}
                  onChange={(e) =>
                    setEditingUser((prev) => ({ ...(prev || {}), status: e.target.value }))
                  }
                >
                  <option value="ACTIVE">Dang hoat dong</option>
                  <option value="INACTIVE">Khong hoat dong</option>
                  <option value="SUSPENDED">Tam khoa</option>
                </select>
              </div>

              {!editingUser.id && (
                <div className="col-12 col-md-6">
                  <label>Mat khau</label>
                  <input
                    className="form-control"
                    type="password"
                    value={editingUser?.password || ""}
                    onChange={(e) =>
                      setEditingUser((prev) => ({ ...(prev || {}), password: e.target.value }))
                    }
                  />
                  <small className="text-muted">
                    Toi thieu {PASSWORD_MIN_LENGTH} ky tu, nen co chu hoa, chu thuong va so.
                  </small>
                </div>
              )}
            </div>

            <div style={{ marginTop: 12, textAlign: "right" }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowModal(false);
                  setEditingUser(null);
                }}
              >
                Huy
              </button>
              <button className="btn btn-primary" style={{ marginLeft: 8 }} onClick={handleSave}>
                Luu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
