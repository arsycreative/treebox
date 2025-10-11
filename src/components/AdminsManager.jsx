"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { toast } from "sonner";
import AdminCreateCrewForm from "@/components/AdminCreateCrewForm";

export default function AdminsManager({ open, onClose }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editRow, setEditRow] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [confirmRow, setConfirmRow] = useState(null);
  const [deleting, setDeleting] = useState(false); // 🔹 NEW: state loading hapus

  // Fetch all admin records
  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admins")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      toast.error(error.message);
      setRows([]);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchRows();
  }, [open]); // eslint-disable-line

  // Toggle active/inactive
  const toggleActive = async (row, value) => {
    if (row.role === "super") return;
    try {
      const res = await fetch("/api/admins/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, is_active: !!value }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memperbarui status.");
      toast.success(value ? "Admin diaktifkan." : "Admin dinonaktifkan.");
      await fetchRows();
    } catch (e) {
      toast.error(e.message);
    }
  };

  // Delete admin
  const remove = (row) => {
    if (row.role === "super") return;
    setConfirmRow(row);
  };

  // Open edit modal
  const openEdit = (row) => {
    if (row.role === "super") return;
    setEditError("");
    setEditRow({
      id: row.id,
      email: row.email,
      display_name: row.display_name || "",
      role: row.role,
      is_active: !!row.is_active,
    });
  };

  const closeEdit = () => {
    setEditRow(null);
    setEditError("");
  };

  // Save changes
  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editRow) return;
    if (!editRow.display_name.trim()) {
      setEditError("Nama wajib diisi.");
      return;
    }

    setSavingEdit(true);
    setEditError("");

    try {
      const payload = {
        id: editRow.id,
        display_name: editRow.display_name.trim(),
        is_active: !!editRow.is_active,
      };

      const res = await fetch("/api/admins/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan perubahan.");
      toast.success("Perubahan tersimpan.");
      closeEdit();
      await fetchRows();
    } catch (e) {
      setEditError(e.message);
    } finally {
      setSavingEdit(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-5xl rounded-3xl border border-[color:var(--color-border)] bg-white/98 shadow-[0_24px_60px_rgba(12,29,74,0.18)] p-6 overflow-y-auto max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-[var(--color-primary)]">
              Manajemen Admin
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)] hover:text-[#a91020]"
          >
            Tutup
          </button>
        </div>

        {/* Create new admin */}
        <div className="mt-5">
          <AdminCreateCrewForm onCreated={fetchRows} />
        </div>

        {/* Admin table */}
        <div className="mt-8">
          <h4 className="mb-2 text-sm font-semibold text-[var(--color-primary)]">
            Daftar Admin
          </h4>
          <div className="rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-primary)] text-white text-xs uppercase tracking-widest">
                <tr>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Nama</th>
                  <th className="px-3 py-2 text-center">Role</th>
                  <th className="px-3 py-2 text-center">Aktif</th>
                  <th className="px-3 py-2 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-gray-500">
                      Memuat data…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-gray-500">
                      Belum ada admin.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const isSuper = r.role === "super";
                    return (
                      <tr key={r.id}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-semibold">
                              {r.email?.[0]?.toUpperCase() || "A"}
                            </div>
                            <div>
                              <div className="font-medium text-[var(--color-primary)]">
                                {r.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">{r.display_name || "-"}</td>
                        <td className="px-3 py-2 text-center">
                          {isSuper ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 text-xs font-semibold">
                              <LockIcon /> SUPER
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-700 text-xs font-semibold">
                              CREW
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <label
                            className={`inline-flex items-center gap-2 text-xs ${
                              isSuper ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={!!r.is_active}
                              onChange={(e) =>
                                toggleActive(r, e.target.checked)
                              }
                              disabled={isSuper}
                            />
                            {r.is_active ? "Ya" : "Tidak"}
                          </label>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => openEdit(r)}
                              disabled={isSuper}
                              className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${
                                isSuper
                                  ? "border-gray-300 text-gray-400 cursor-not-allowed"
                                  : "border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
                              }`}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => remove(r)}
                              disabled={isSuper}
                              className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${
                                isSuper
                                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                  : "bg-[var(--color-accent)] text-white hover:bg-[#c82636]"
                              }`}
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 🔹 Confirm delete modal */}
        {confirmRow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/45 backdrop-blur-sm"
              onClick={() => (deleting ? null : setConfirmRow(null))}
            />
            <div className="relative z-10 w-full max-w-sm rounded-2xl border border-[color:var(--color-border)] bg-white/98 p-6 text-center shadow-[0_18px_45px_rgba(12,29,74,0.18)]">
              <h4 className="text-lg font-semibold text-[var(--color-primary)] mb-3">
                Hapus Admin?
              </h4>
              <p className="text-sm text-gray-600 mb-6">
                Anda yakin ingin menghapus <b>{confirmRow.email}</b>?<br />
                Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true);
                    try {
                      const res = await fetch("/api/admins/remove", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: confirmRow.id }),
                      });
                      const json = await res.json();
                      if (!res.ok)
                        throw new Error(json.error || "Gagal menghapus admin.");
                      toast.success("Admin berhasil dihapus.");
                      await fetchRows();
                    } catch (e) {
                      toast.error(e.message);
                    } finally {
                      setDeleting(false);
                      setConfirmRow(null);
                    }
                  }}
                  className="rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-white hover:bg-[#c82636] disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {deleting && (
                    <svg
                      className="animate-spin"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="white"
                        strokeWidth="3"
                        fill="none"
                        opacity="0.25"
                      />
                      <path
                        fill="white"
                        d="M4 12a8 8 0 0 1 8-8v3l4-4-4-4v3A10 10 0 0 0 2 12h2z"
                      />
                    </svg>
                  )}
                  {deleting ? "Menghapus…" : "Hapus"}
                </button>
                <button
                  disabled={deleting}
                  onClick={() => setConfirmRow(null)}
                  className="rounded-full border border-[var(--color-border)] px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)] disabled:opacity-60"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit modal */}
        {editRow && (
          <EditAdminModal
            editRow={editRow}
            setEditRow={setEditRow}
            saveEdit={saveEdit}
            closeEdit={closeEdit}
            savingEdit={savingEdit}
            editError={editError}
          />
        )}
      </div>
    </div>
  );
}

function EditAdminModal({
  editRow,
  saveEdit,
  closeEdit,
  savingEdit,
  editError,
  setEditRow,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={closeEdit}
      />
      <form
        onSubmit={saveEdit}
        className="relative z-10 w-full max-w-md rounded-2xl border border-[color:var(--color-border)] bg-white/98 shadow-[0_18px_45px_rgba(12,29,74,0.18)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="text-lg font-semibold text-[var(--color-primary)] mb-3">
          Edit Admin
        </h4>

        {editError && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
            {editError}
          </div>
        )}

        <ReadOnlyField label="Email" value={editRow.email} />

        <EditableField
          label="Nama (wajib)"
          value={editRow.display_name}
          onChange={(v) => setEditRow({ ...editRow, display_name: v })}
          placeholder="Nama lengkap"
        />

        <div className="flex flex-col gap-2 mt-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Role
          </span>
          {editRow.role === "super" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-amber-700 text-xs font-semibold w-fit">
              <LockIcon /> SUPER
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-700 text-xs font-semibold w-fit">
              CREW
            </span>
          )}
        </div>

        <label className="inline-flex items-center gap-2 mt-3">
          <input
            type="checkbox"
            checked={!!editRow.is_active}
            onChange={(e) =>
              setEditRow({ ...editRow, is_active: e.target.checked })
            }
          />
          <span className="text-sm text-[var(--color-primary)]">Aktif</span>
        </label>

        <div className="mt-6 flex gap-3 justify-end">
          <button
            type="submit"
            disabled={savingEdit}
            className="rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-white disabled:opacity-60"
          >
            {savingEdit ? "Menyimpan…" : "Simpan"}
          </button>
          <button
            type="button"
            onClick={closeEdit}
            className="rounded-full border border-[var(--color-border)] px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)]"
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div className="flex flex-col gap-1 mt-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        {label}
      </span>
      <input
        type="text"
        value={value}
        disabled
        readOnly
        className="rounded-2xl border border-[color:var(--color-border)] bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-500 cursor-not-allowed select-none"
      />
    </div>
  );
}

function EditableField({ label, value, onChange, placeholder }) {
  return (
    <div className="flex flex-col gap-1 mt-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-primary)] outline-none focus:ring-2 focus:ring-[rgba(12,29,74,0.16)]"
      />
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M12 1a5 5 0 0 0-5 5v3H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2V6a5 5 0 0 0-5-5m-3 8V6a3 3 0 0 1 6 0v3z"
      />
    </svg>
  );
}
