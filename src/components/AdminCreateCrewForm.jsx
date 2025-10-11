"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

export default function AdminCreateCrewForm({ onCreated }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
    display_name: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    display_name: "",
    global: "",
  });

  const pwdScore = useMemo(() => {
    const p = form.password || "";
    let s = 0;
    if (p.length >= 6) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[a-z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return Math.min(s, 4);
  }, [form.password]);

  const pwdLabel = ["Sangat Lemah", "Lemah", "Cukup", "Kuat", "Sangat Kuat"][
    pwdScore
  ];
  const pwdColor =
    pwdScore <= 1
      ? "#ef4444"
      : pwdScore === 2
      ? "#f59e0b"
      : pwdScore === 3
      ? "#22c55e"
      : "#16a34a";

  const validate = () => {
    const next = { email: "", password: "", display_name: "", global: "" };
    if (!form.email.trim()) next.email = "Email wajib diisi.";
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim()))
      next.email = "Format email tidak valid.";
    if (!form.password) next.password = "Password wajib diisi.";
    else if (form.password.length < 6) next.password = "Minimal 6 karakter.";
    if (!form.display_name.trim()) next.display_name = "Nama wajib diisi.";
    setErrors(next);
    return !next.email && !next.password && !next.display_name;
  };

  const submit = async (e) => {
    e.preventDefault();
    setErrors((p) => ({ ...p, global: "" }));
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admins/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          display_name: form.display_name.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal membuat akun admin.");

      toast.success(`Admin ${form.email} dibuat sebagai CREW.`);
      setForm({ email: "", password: "", display_name: "" });
      onCreated && onCreated(json);
    } catch (e) {
      setErrors((p) => ({ ...p, global: e.message || "Terjadi kesalahan." }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-[color:var(--color-border)] bg-white/95 p-4 sm:p-5"
    >
      {errors.global && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          {errors.global}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" error={errors.email}>
          <InputBase
            type="email"
            value={form.email}
            onChange={(v) => setForm((p) => ({ ...p, email: v }))}
            placeholder="crew@treebox.com"
            ariaLabel="Email"
            hasError={!!errors.email}
            leadingIcon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                className="opacity-60"
              >
                <path
                  fill="currentColor"
                  d="M20 4H4a2 2 0 0 0-2 2v1l10 6 10-6V6a2 2 0 0 0-2-2m0 4.5L12 14L4 8.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2z"
                />
              </svg>
            }
          />
        </Field>

        <Field
          labelNode={
            <>
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                Password
              </span>
              {form.password && (
                <span
                  className="text-[11px] font-semibold"
                  style={{ color: pwdColor }}
                >
                  {pwdLabel}
                </span>
              )}
            </>
          }
          error={errors.password}
        >
          <InputBase
            type={showPwd ? "text" : "password"}
            value={form.password}
            onChange={(v) => setForm((p) => ({ ...p, password: v }))}
            placeholder="min. 6 karakter"
            ariaLabel="Password"
            hasError={!!errors.password}
            leadingIcon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                className="opacity-60"
              >
                <path
                  fill="currentColor"
                  d="M12 1a5 5 0 0 0-5 5v3H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2V6a5 5 0 0 0-5-5m-3 8V6a3 3 0 0 1 6 0v3z"
                />
              </svg>
            }
            trailing={
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)]/70 hover:text-[var(--color-primary)]"
              >
                {showPwd ? "Sembunyikan" : "Lihat"}
              </button>
            }
          />
        </Field>

        <Field label="Nama" error={errors.display_name}>
          <InputBase
            value={form.display_name}
            onChange={(v) => setForm((p) => ({ ...p, display_name: v }))}
            placeholder="Nama Crew"
            ariaLabel="Nama"
            hasError={!!errors.display_name}
            leadingIcon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                className="opacity-60"
              >
                <path
                  fill="currentColor"
                  d="M12 12a5 5 0 1 0-5-5a5 5 0 0 0 5 5m-7 9a7 7 0 0 1 14 0z"
                />
              </svg>
            }
          />
        </Field>

        <Field label="Role">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] h-[44px]">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold">
              C
            </span>
            CREW (default)
          </div>
        </Field>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-white shadow-md transition hover:bg-[var(--color-primary-light)] disabled:opacity-60"
        >
          {submitting ? "Membuat…" : "Buat Admin (Crew)"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, labelNode, error, children }) {
  return (
    <div className="flex flex-col gap-2">
      {labelNode ? (
        <div className="flex items-center justify-between w-full">
          {labelNode}
        </div>
      ) : (
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          {label}
        </span>
      )}
      {children}
      {error ? <div className="text-xs text-red-600">{error}</div> : null}
    </div>
  );
}

function InputBase({
  value,
  onChange,
  placeholder,
  type = "text",
  ariaLabel,
  leadingIcon,
  trailing,
  hasError,
}) {
  return (
    <label className="group relative block">
      {leadingIcon && (
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
          {leadingIcon}
        </div>
      )}
      <input
        type={type}
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-2xl border bg-white pl-10 pr-24 py-2.5 text-sm font-medium text-[var(--color-primary)] outline-none transition focus:ring-2 focus:ring-[rgba(12,29,74,0.16)] ${
          hasError
            ? "border-red-300 focus:border-red-400"
            : "border-[color:var(--color-border)] focus:border-[var(--color-primary-light)]"
        }`}
      />
      {trailing && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {trailing}
        </div>
      )}
    </label>
  );
}
