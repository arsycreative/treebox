"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { HexColorPicker, RgbaColorPicker } from "react-colorful";

/** Ikon yang tersedia (sinkron dengan nilai kolom "icon") */
const iconBaseProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const IconCube = (p) => (
  <svg {...iconBaseProps} {...p}>
    <path d="M12 3 4 7v6l8 4 8-4V7z" />
    <path d="M12 3v14" />
    <path d="M4 7l8 4 8-4" />
  </svg>
);
const IconGem = (p) => (
  <svg {...iconBaseProps} {...p}>
    <path d="M12 3 4 9l8 12 8-12z" />
    <path d="M9 9 12 3l3 6" />
    <path d="M4 9h16" />
  </svg>
);
const IconDiamond = (p) => (
  <svg {...iconBaseProps} {...p}>
    <path d="M12 3 20 12l-8 9-8-9z" />
    <path d="M12 3v18" />
    <path d="M6.5 7.5 17.5 16.5" />
    <path d="M17.5 7.5 6.5 16.5" />
  </svg>
);
const IconLayers = (p) => (
  <svg {...iconBaseProps} {...p}>
    <path d="m12 3 8 4-8 4-8-4Z" />
    <path d="m4 11 8 4 8-4" />
    <path d="m4 15 8 4 8-4" />
  </svg>
);
const IconStar = (p) => (
  <svg {...iconBaseProps} {...p}>
    <path d="m12 4 2.2 4.46 4.92.71-3.56 3.47.84 4.9-4.4-2.32-4.4 2.32.84-4.9-3.56-3.47 4.92-.71z" />
  </svg>
);
const IconConsole = (p) => (
  <svg {...iconBaseProps} {...p}>
    <rect x="3.5" y="6" width="17" height="12" rx="4" />
    <path d="M8.5 12h3" />
    <path d="M7.5 10v4" />
    <circle cx="16" cy="10.5" r="1" />
    <circle cx="17.5" cy="13.5" r="1" />
  </svg>
);

const ICONS = {
  cube: IconCube,
  gem: IconGem,
  diamond: IconDiamond,
  layers: IconLayers,
  star: IconStar,
  console: IconConsole,
};

const ICON_OPTIONS = Object.keys(ICONS);

/* ================= Helpers RGBA <-> string ================= */
function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}
function parseRgbaString(str) {
  // expect "rgba(r,g,b,alpha)" OR "rgb(r,g,b)"
  if (!str) return { r: 31, g: 122, b: 203, a: 0.2 };
  const m = str.match(
    /rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i
  );
  if (!m) return { r: 31, g: 122, b: 203, a: 0.2 };
  const r = Math.max(0, Math.min(255, Math.round(Number(m[1]))));
  const g = Math.max(0, Math.min(255, Math.round(Number(m[2]))));
  const b = Math.max(0, Math.min(255, Math.round(Number(m[3]))));
  const a = m[4] != null ? clamp01(Number(m[4])) : 1;
  return { r, g, b, a };
}
function toRgbaString({ r, g, b, a }) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(
    b
  )}, ${+a.toFixed(2)})`;
}

/* ================= Component ================= */
export default function RoomsManager({ open, onClose, onSaved }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    id: null,
    name: "",
    short_code: "",
    icon: "cube",
    accent: "#1f7acb", // HEX
    badge_bg: "rgba(31, 122, 203, 0.2)", // RGBA
    badge_text: "#0f3c6a", // HEX
    row_bg: "rgba(31, 122, 203, 0.09)", // RGBA
    border: "rgba(31, 122, 203, 0.26)", // RGBA
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () =>
    setForm({
      id: null,
      name: "",
      short_code: "",
      icon: "cube",
      accent: "#1f7acb",
      badge_bg: "rgba(31, 122, 203, 0.2)",
      badge_text: "#0f3c6a",
      row_bg: "rgba(31, 122, 203, 0.09)",
      border: "rgba(31, 122, 203, 0.26)",
      is_active: true,
    });

  const fetchRooms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .order("name", { ascending: true });
    if (error) {
      toast.error(error.message);
      setRooms([]);
    } else {
      setRooms(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchRooms();
  }, [open]); // eslint-disable-line

  const startCreate = () => {
    setError("");
    resetForm();
  };

  const startEdit = (r) => {
    setError("");
    setForm({
      id: r.id,
      name: r.name || "",
      short_code: r.short_code || "",
      icon: r.icon || "cube",
      accent: r.accent || "#1f7acb",
      badge_bg: r.badge_bg || "rgba(31,122,203,0.2)",
      badge_text: r.badge_text || "#0f3c6a",
      row_bg: r.row_bg || "rgba(31,122,203,0.09)",
      border: r.border || "rgba(31,122,203,0.26)",
      is_active: !!r.is_active,
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (!form.name.trim() || !form.short_code.trim()) {
        setError("Nama dan short code wajib diisi.");
        setSaving(false);
        return;
      }

      const payload = {
        name: form.name.trim(),
        short_code: form.short_code.trim().toUpperCase(),
        icon: form.icon,
        accent: form.accent,
        badge_bg: form.badge_bg,
        badge_text: form.badge_text,
        row_bg: form.row_bg,
        border: form.border,
        is_active: form.is_active,
      };

      if (form.id) {
        const { error } = await supabase
          .from("rooms")
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
        toast.success("Room diperbarui.");
      } else {
        const { error } = await supabase.from("rooms").insert(payload);
        if (error) throw error;
        toast.success("Room ditambahkan.");
      }

      await fetchRooms();
      if (onSaved) onSaved();
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Hapus room ini?")) return;
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Room dihapus.");
      await fetchRooms();
      if (onSaved) onSaved();
    }
  };

  const IconPreview = ICONS[form.icon] || IconConsole;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 overscroll-contain">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-4xl rounded-3xl border border-[color:var(--color-border)] bg-white/98 shadow-[0_24px_60px_rgba(12,29,74,0.18)] p-5 sm:p-7 max-h-[80vh] sm:max-h-[80vh] overflow-y-auto overscroll-contain">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-[color:var(--color-muted)]">
              Manajemen Rooms
            </p>
            <h3 className="text-xl font-semibold text-[var(--color-primary)]">
              Tambah / Ubah / Hapus
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

        {/* Form */}
        <form onSubmit={handleSave} className="mt-4 grid gap-3 sm:grid-cols-2">
          {error ? (
            <div className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <Field
            label="Nama"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
          />
          <Field
            label="Short Code"
            value={form.short_code}
            onChange={(v) => setForm({ ...form, short_code: v })}
            placeholder="BW / RR / BD / ..."
          />

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              Icon
            </span>
            <select
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              className="rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-primary)] outline-none"
            >
              {ICON_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-2.5">
            <span className="text-xs text-[color:var(--color-muted)]">
              Preview
            </span>
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl border"
              style={{
                backgroundColor: form.badge_bg,
                borderColor: form.border,
                color: form.accent,
              }}
              title={form.name || "Room"}
            >
              <IconPreview />
            </span>
            <span className="text-xs text-[color:var(--color-muted)]">
              Kode {form.short_code || "--"}
            </span>
          </div>

          {/* ======= Color Pickers ======= */}
          <ColorFieldHex
            label="Accent (HEX)"
            value={form.accent}
            onChange={(hex) => setForm({ ...form, accent: hex })}
          />
          <ColorFieldHex
            label="Badge Text (HEX)"
            value={form.badge_text}
            onChange={(hex) => setForm({ ...form, badge_text: hex })}
          />
          <ColorFieldRgba
            label="Badge BG (RGBA)"
            value={form.badge_bg}
            onChange={(rgba) => setForm({ ...form, badge_bg: rgba })}
          />
          <ColorFieldRgba
            label="Row BG (RGBA)"
            value={form.row_bg}
            onChange={(rgba) => setForm({ ...form, row_bg: rgba })}
          />
          <ColorFieldRgba
            label="Border (RGBA)"
            value={form.border}
            onChange={(rgba) => setForm({ ...form, border: rgba })}
          />

          <label className="inline-flex items-center gap-2 text-sm mt-1">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm({ ...form, is_active: e.target.checked })
              }
            />
            Aktif
          </label>

          <div className="sm:col-span-2 flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-white disabled:opacity-60"
            >
              {saving
                ? "Menyimpan…"
                : form.id
                ? "Simpan Perubahan"
                : "Tambah Room"}
            </button>
            {form.id ? (
              <button
                type="button"
                onClick={startCreate}
                className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)]"
              >
                Buat Baru
              </button>
            ) : null}
          </div>
        </form>

        {/* List */}
        <div className="mt-6">
          <h4 className="mb-2 text-sm font-semibold text-[var(--color-primary)]">
            Daftar Rooms
          </h4>
          <div className="rounded-2xl border border-[color:var(--color-border)] bg-white overflow-hidden ">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-primary)] text-white text-xs uppercase tracking-widest">
                <tr>
                  <th className="px-3 py-2 text-left">Room</th>
                  <th className="px-3 py-2">Kode</th>
                  <th className="px-3 py-2">Icon</th>
                  <th className="px-3 py-2">Aktif</th>
                  <th className="px-3 py-2">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y max-h-[40vh] overflow-auto">
                {loading ? (
                  <tr>
                    <td
                      className="px-3 py-3 text-[color:var(--color-muted)]"
                      colSpan={5}
                    >
                      Memuat…
                    </td>
                  </tr>
                ) : rooms.length === 0 ? (
                  <tr>
                    <td
                      className="px-3 py-3 text-[color:var(--color-muted)]"
                      colSpan={5}
                    >
                      Belum ada room.
                    </td>
                  </tr>
                ) : (
                  rooms.map((r) => {
                    const Ico = ICONS[r.icon] || IconConsole;
                    return (
                      <tr key={r.id}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="flex h-8 w-8 items-center justify-center rounded-lg border"
                              style={{
                                backgroundColor: r.badge_bg,
                                borderColor: r.border,
                                color: r.accent,
                              }}
                              title={r.name}
                            >
                              <Ico />
                            </span>
                            <span className="font-medium">{r.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {r.short_code}
                        </td>
                        <td className="px-3 py-2 text-center">{r.icon}</td>
                        <td className="px-3 py-2 text-center">
                          {r.is_active ? "Ya" : "Tidak"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => startEdit(r)}
                              className="rounded-full border border-[var(--color-primary)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
                            >
                              Ubah
                            </button>
                            <button
                              onClick={() => handleDelete(r.id)}
                              className="rounded-full border border-transparent bg-[var(--color-accent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white hover:bg-[#c82636]"
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
      </div>
    </div>
  );
}

/* ============== Reusable Fields ============== */
function Field({ label, value, onChange, placeholder }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-primary)] outline-none"
      />
    </div>
  );
}

function useOutsideClose(ref, onClose) {
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose]);
}

function ColorPopover({ children, onClose }) {
  const boxRef = useRef(null);
  useOutsideClose(boxRef, onClose);
  return (
    <div
      ref={boxRef}
      className="absolute z-50 mt-2 rounded-2xl border border-[color:var(--color-border)] bg-white p-3 shadow-2xl"
    >
      {children}
    </div>
  );
}

function ColorFieldHex({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useOutsideClose(wrapRef, () => setOpen(false));

  return (
    <div className="relative flex flex-col gap-2" ref={wrapRef}>
      <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--color-border)] bg-white px-3 py-2.5"
      >
        <span className="flex items-center gap-3">
          <span
            className="h-6 w-6 rounded-md border"
            style={{ backgroundColor: value }}
          />
          <span className="text-sm font-medium text-[var(--color-primary)]">
            {value}
          </span>
        </span>
        <span className="text-xs text-[color:var(--color-muted)]">Pilih</span>
      </button>
      {open ? (
        <ColorPopover onClose={() => setOpen(false)}>
          <HexColorPicker color={value} onChange={onChange} />
        </ColorPopover>
      ) : null}
    </div>
  );
}

function ColorFieldRgba({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useOutsideClose(wrapRef, () => setOpen(false));
  const rgba = parseRgbaString(value);

  return (
    <div className="relative flex flex-col gap-2" ref={wrapRef}>
      <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--color-border)] bg-white px-3 py-2.5"
      >
        <span className="flex items-center gap-3">
          <span
            className="h-6 w-6 rounded-md border"
            style={{ backgroundColor: toRgbaString(rgba) }}
          />
          <span className="text-sm font-medium text-[var(--color-primary)]">
            {toRgbaString(rgba)}
          </span>
        </span>
        <span className="text-xs text-[color:var(--color-muted)]">Pilih</span>
      </button>
      {open ? (
        <ColorPopover onClose={() => setOpen(false)}>
          <div className="space-y-2">
            <RgbaColorPicker
              color={rgba}
              onChange={(c) => onChange(toRgbaString(c))}
            />
            <div className="flex items-center justify-between text-xs text-[color:var(--color-muted)]">
              <span>
                R:{rgba.r} G:{rgba.g} B:{rgba.b} A:{rgba.a.toFixed(2)}
              </span>
            </div>
          </div>
        </ColorPopover>
      ) : null}
    </div>
  );
}
