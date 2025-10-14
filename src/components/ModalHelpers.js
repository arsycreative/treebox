import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

/* ========== Portal ========== */
export function ModalPortal({ children }) {
  if (typeof window === "undefined") return null;
  return createPortal(children, document.body);
}

/* ========== Fields ========== */
export function EditField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-primary)] outline-none"
      />
    </div>
  );
}

export function FieldRead({ label, value }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        {label}
      </label>
      <input
        type="text"
        value={value}
        readOnly
        disabled
        className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/10 px-4 py-2.5 text-sm font-medium text-[color:var(--color-muted)] cursor-not-allowed select-none opacity-70"
      />
    </div>
  );
}

/* ========== Fallback icon (sederhana) ========== */
function FallbackIcon(props) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 12h8" />
    </svg>
  );
}

/* ========== RoomSelectEdit (tahan banting) ========== */
export function RoomSelectEdit({
  value,
  onChange,
  rooms = [],
  ICONS = {}, // ✅ default biar nggak undefined
  IconConsole = FallbackIcon, // ✅ default ke fallback
  DEFAULT_DETAIL = {
    // ✅ default minimal
    short_code: "--",
    icon: "console",
    accent: "#15306e",
    badge_bg: "rgba(21, 48, 110, 0.18)",
    badge_text: "#112357",
    row_bg: "rgba(21, 48, 110, 0.06)",
    border: "rgba(21, 48, 110, 0.28)",
  },
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Pastikan selected selalu ada
  const selected =
    (rooms || []).find((r) => r && r.name === value) || DEFAULT_DETAIL;

  // Aman: jika ICONS belum ada atau key tidak ditemukan → pakai IconConsole/Fallback
  const Icon =
    (ICONS && selected && selected.icon && ICONS[selected.icon]) || IconConsole;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative flex flex-col gap-2" ref={containerRef}>
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        Bilik / Room
      </span>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex items-center justify-between gap-6 rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-2.5 text-left"
      >
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl border"
            style={{
              backgroundColor: selected.badge_bg,
              borderColor: selected.border,
              color: selected.accent,
            }}
          >
            <Icon width={16} height={16} />
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[var(--color-primary)]">
              {value || "-"}
            </span>
            <span
              className="text-[10px] uppercase tracking-widest"
              style={{ color: selected.accent }}
            >
              Kode {selected.short_code || "--"}
            </span>
          </div>
        </div>
        <span className="text-xs font-semibold uppercase tracking-widest text-[color:var(--color-muted)]">
          {open ? "Tutup" : "Pilih"}
        </span>
      </button>

      {open ? (
        <div className="absolute z-30 mt-2 w-full min-w-[240px] rounded-3xl border border-[color:var(--color-border)] bg-white/95 p-3 shadow-2xl backdrop-blur">
          <div className="space-y-2 max-h-80 overflow-auto">
            {(rooms || []).map((r) => {
              if (!r) return null;
              const Ico = (ICONS && ICONS[r.icon]) || IconConsole;
              const isActive = r.name === value;
              return (
                <button
                  type="button"
                  key={r.id || r.name}
                  onClick={() => {
                    onChange(r.name);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 text-left transition ${
                    isActive
                      ? "border-transparent bg-[var(--color-primary)] text-white shadow-md"
                      : "border-[color:var(--color-border)] hover:border-[var(--color-primary-light)] hover:bg-[var(--color-primary)]/6"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-lg border bg-white"
                      style={{
                        borderColor: r.border || selected.border,
                        color: r.accent || selected.accent,
                      }}
                    >
                      <Ico width={14} height={14} />
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{r.name}</span>
                      <span className="text-[10px] uppercase tracking-widest">
                        Kode {r.short_code || "--"}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.3em]">
                    {isActive ? "Dipilih" : r.short_code || "--"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
