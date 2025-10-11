"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

const initialForm = { email: "", password: "" };

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Cek sesi sekali saat mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data.session) router.replace("/dashboard");
    })();
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1) Login
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email: form.email.trim(),
          password: form.password,
        }
      );
      if (authError) {
        setError(
          authError.message === "Invalid login credentials"
            ? "Email atau kata sandi salah."
            : authError.message
        );
        setLoading(false);
        return;
      }

      const user = data?.user;
      if (!user) throw new Error("Gagal mengambil user setelah login.");

      // 2) Validasi row admins via RLS
      const { data: adminRow, error: adminErr } = await supabase
        .from("admins")
        .select("role,is_active")
        .eq("id", user.id)
        .maybeSingle();

      if (adminErr) throw adminErr;
      if (!adminRow) {
        await supabase.auth.signOut();
        setError("Akun tidak terdaftar sebagai admin Treebox.");
        setLoading(false);
        return;
      }
      if (!adminRow.is_active) {
        await supabase.auth.signOut();
        setError("Akun admin non-aktif. Hubungi super admin.");
        setLoading(false);
        return;
      }

      // 3) Sinkron role ke app_metadata (non-blocking)
      fetch("/api/admins/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      }).catch(() => {});

      // 4) Lanjut ke dashboard (tanpa refreshSession; hemat round-trip)
      router.replace("/dashboard");
    } catch (e) {
      setError(e.message || "Terjadi kesalahan saat login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex grow flex-col items-center justify-center px-6 py-16">
      <div
        className="pointer-events-none absolute inset-0 bg-[rgba(10,20,43,0.6)]"
        style={{
          backgroundImage:
            'linear-gradient(135deg, rgba(12,29,74,0.55), rgba(230,57,70,0.35)), url("https://images.unsplash.com/photo-1512494777473-41ceb668c5b1")',
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-12 h-72 w-72 rounded-full bg-[rgba(21,48,110,0.16)] blur-3xl" />
        <div className="absolute bottom-8 right-6 h-80 w-80 rounded-full bg-[rgba(230,57,70,0.22)] blur-3xl" />
      </div>

      <div className="relative z-10 flex w-full max-w-5xl flex-col gap-12 md:flex-row md:items-center">
        <div className="max-w-xl space-y-6 text-white">
          <div className="inline-flex items-center gap-3 rounded-full bg-white/10 px-4 py-1 text-xs uppercase tracking-widest">
            <Image
              src="/treebox.png"
              alt="Logo Treebox"
              width={36}
              height={36}
              className="h-9 w-9 rounded-full border border-white/40 bg-white/20 object-contain p-1"
              priority
            />
            Treebox Admin
          </div>
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            Kendalikan setiap sesi rental PlayStation dengan tenang.
          </h1>
          <p className="text-base text-white/70">
            Panel Treebox membantu kasir mencatat pelanggan, mengatur ruangan,
            dan memastikan jadwal tidak saling tumpang tindih.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="relative w-full max-w-md rounded-3xl border border-white/20 bg-[var(--card-glass)] px-8 py-10 text-white shadow-2xl backdrop-blur-lg"
        >
          <div className="mb-8 space-y-3 text-center">
            <div className="flex items-center justify-center">
              <Image
                src="/treebox.png"
                alt="Treebox Logo"
                width={72}
                height={72}
                className="h-[72px] w-[72px] rounded-2xl border border-white/30 bg-white/20 p-3"
                priority
              />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Masuk sebagai admin</h2>
              <p className="text-sm text-white/70">
                Gunakan email dan kata sandi admin yang terdaftar di Supabase.
              </p>
            </div>
          </div>

          <div className="mb-6 space-y-1">
            <label
              htmlFor="email"
              className="text-sm font-medium text-white/90"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-white focus:bg-white/15"
              placeholder="admin@treebox.id"
            />
          </div>

          <div className="mb-6 space-y-1">
            <label
              htmlFor="password"
              className="text-sm font-medium text-white/90"
            >
              Kata sandi
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, password: e.target.value }))
              }
              className="w-full rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-white focus:bg-white/15"
              placeholder="••••••••"
            />
          </div>

          {error ? (
            <div className="mb-6 rounded-xl border border-red-300/80 bg-red-50/40 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center rounded-xl bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#c82636] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Mengautentikasi…" : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
