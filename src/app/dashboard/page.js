"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import RoomsManager from "@/components/RoomsManager";
import { Toaster, toast } from "sonner";
import AdminsManager from "@/components/AdminsManager";
import { createPortal } from "react-dom";
import {
  EditField,
  FieldRead,
  ModalPortal,
  RoomSelectEdit,
} from "@/components/ModalHelpers";

const MAX_BOOKING_HOURS = 6;

/* ================= Scroll lock (freeze page when modal open) ================= */
function useScrollLock(isOpen) {
  const restoreRef = useRef({ top: 0, hadInline: false });

  useEffect(() => {
    if (!isOpen) return;

    const body = document.body;
    const html = document.documentElement;

    // Save current scroll and inline styles to restore later
    restoreRef.current.top = window.scrollY || window.pageYOffset || 0;
    restoreRef.current.hadInline = !!body.getAttribute("style");

    // Lock (iOS-friendly)
    body.style.position = "fixed";
    body.style.top = `-${restoreRef.current.top}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    // Prevent overscroll on html too
    html.style.overscrollBehavior = "contain";

    return () => {
      // Unlock and restore scroll
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      body.style.overflow = "";
      html.style.overscrollBehavior = "";

      window.scrollTo(0, restoreRef.current.top || 0);
    };
  }, [isOpen]);
}

/* ====== ICONS ====== */
const iconBaseProps = {
  width: 20,
  height: 20,
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

const DEFAULT_DETAIL = {
  short_code: "--",
  icon: "console",
  accent: "#15306e",
  badge_bg: "rgba(21, 48, 110, 0.18)",
  badge_text: "#112357",
  row_bg: "rgba(21, 48, 110, 0.06)",
  border: "rgba(21, 48, 110, 0.28)",
};

/* ====== HELPERS ====== */
const HOURS_IN_MS = 60 * 60 * 1000;
const pad = (v) => String(v).padStart(2, "0");
const WINDOW_SIZE = 30;

const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};
const toDateKey = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const toInputDateString = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const formatTimeOnly = (iso) =>
  new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
const resolveQtyFromBooking = (b) => {
  const n = Number(b.qty_jam);
  if (Number.isFinite(n) && n > 0) return n;
  const s = new Date(b.waktu_mulai);
  const e = new Date(b.waktu_selesai);
  return Math.round((e - s) / HOURS_IN_MS);
};
const getDatesInRange = (startDate, numDays) => {
  const res = [];
  for (let i = 0; i < numDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    res.push(d);
  }
  return res;
};

/* ====== Jam bisnis: 06:00 real s/d 04:00 real keesokan hari (label geser) ====== */
const BUSINESS_START_HOUR = 6; // 06:00 real
const BUSINESS_END_HOUR = 4; // 04:00 real
const buildBusinessTimeSlots = () => {
  const slots = [];
  for (let i = 0; i < 24; i++) {
    const h = (BUSINESS_START_HOUR + i) % 24;
    const next = (h + 1) % 24;
    slots.push({ startHour: h, endHour: next });
  }
  return slots;
};
const businessSlotLabel = (startHour, endHour) => {
  const shift = (hour) => (hour - BUSINESS_START_HOUR + 24) % 24;
  const sh = shift(startHour);
  const eh = shift(endHour);
  return `${pad(sh)}:00 - ${pad(eh)}:00`;
};

/* ====== PAGE ====== */
export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [sessionReady, setSessionReady] = useState(false);
  const didInitFetch = useRef(false);

  // ROOMS
  const [rooms, setRooms] = useState([]);
  const [roomsOpen, setRoomsOpen] = useState(false);

  // Bookings
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  // Edit / Delete / Quick add + errors
  const [editing, setEditing] = useState(null);
  const [editingLoading, setEditingLoading] = useState(false);
  const [editingError, setEditingError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [quickAdd, setQuickAdd] = useState(null);
  const [quickAddForm, setQuickAddForm] = useState({
    namaKasir: "",
    namaPelanggan: "",
    noHp: "",
    qtyJam: 1,
  });
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  const [quickAddError, setQuickAddError] = useState("");

  // NAV tanggal
  const [dateWindowStart, setDateWindowStart] = useState(startOfDay());
  const visibleDates = useMemo(
    () => getDatesInRange(dateWindowStart, WINDOW_SIZE),
    [dateWindowStart]
  );
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const selectedDate = visibleDates[selectedDateIndex];
  const selectedDateKey = toInputDateString(selectedDate);

  // User & profile
  const [me, setMe] = useState({
    role: "crew",
    is_active: true,
    display_name: "",
  });
  const [openAdmins, setOpenAdmins] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Nama kasir fallback (metadata/email)
  const [metaName, setMetaName] = useState("");
  const cashierDisplayName = useMemo(() => {
    const m = (me?.display_name || "").trim();
    if (m) return m;
    return (metaName || "").trim();
  }, [me?.display_name, metaName]);
  const shiftHour = (h) => (h - BUSINESS_START_HOUR + 24) % 24;

  const toBusinessDate = (dateLike) => {
    const real = new Date(dateLike);
    const biz = new Date(real);
    // Jika jam real < 06:00, secara "bisnis" itu milik H-1
    if (real.getHours() < BUSINESS_START_HOUR) {
      biz.setDate(biz.getDate() - 1);
    }
    biz.setHours(0, 0, 0, 0);
    return biz;
  };

  const formatBusinessDateTime = (iso) => {
    const real = new Date(iso);
    const bizDate = toBusinessDate(real);
    const bizHour = shiftHour(real.getHours());
    const out = new Date(bizDate);
    out.setHours(bizHour, real.getMinutes(), 0, 0);
    return out.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Lock page scroll whenever ANY modal is open (local modals + external modals)
  const anyModalOpen = !!(
    editing ||
    deleteTarget ||
    quickAdd ||
    roomsOpen ||
    openAdmins
  );
  useScrollLock(anyModalOpen);

  const shiftWindow = (days) => {
    setSelectedDateIndex(0);
    setDateWindowStart((prev) =>
      startOfDay(
        new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + days)
      )
    );
  };
  const goToday = () => {
    setDateWindowStart(startOfDay());
    setSelectedDateIndex(0);
  };

  // Fetch rooms
  const fetchRooms = useCallback(async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (error) {
      toast.error(error.message);
      setRooms([]);
    } else {
      setRooms(data || []);
    }
  }, [supabase]);

  // Fetch bookings (ambil semua; filter di memori)
  const fetchBookings = useCallback(async () => {
    setBookingsLoading(true);
    const { data, error } = await supabase
      .from("rental_sesi")
      .select("*")
      .order("waktu_mulai", { ascending: true });
    if (error) {
      toast.error(error.message);
      setBookings([]);
    } else {
      setBookings(data ?? []);
    }
    setBookingsLoading(false);
  }, [supabase]);

  // Init sekali
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const session = data.session;
      if (!session) {
        router.replace("/login");
        return;
      }

      const user = session.user;
      const fromMeta =
        user?.user_metadata?.display_name ||
        user?.user_metadata?.full_name ||
        (user?.email ? user.email.split("@")[0] : "");
      setMetaName(fromMeta);

      const { data: adminData, error: adminErr } = await supabase
        .from("admins")
        .select("role,is_active,display_name,email")
        .eq("id", user.id)
        .maybeSingle();

      if (adminErr || !adminData) {
        router.replace("/login");
        return;
      }
      if (!adminData.is_active) {
        router.replace("/login");
        return;
      }

      setMe(adminData);
      setSessionReady(true);

      if (!didInitFetch.current) {
        didInitFetch.current = true;
        await Promise.all([fetchRooms(), fetchBookings()]);
      }
    })();

    // Listener minimal (hindari refetch ganda)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT") {
          router.replace("/login");
        } else if (event === "SIGNED_IN" && session?.user) {
          setSessionReady(true);
          fetchRooms();
          fetchBookings();
        }
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [fetchBookings, fetchRooms, router, supabase]);

  // Helpers detail room
  const findRoom = (name) => rooms.find((r) => r.name === name);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const getDetail = (name) => findRoom(name) || DEFAULT_DETAIL;
  const roomNames = useMemo(() => rooms.map((r) => r.name), [rooms]);

  const filteredByDate = useMemo(
    () => bookings.filter((b) => toDateKey(b.waktu_mulai) === selectedDateKey),
    [bookings, selectedDateKey]
  );

  // Time slots (06:00 real → 04:00 real) with shifted labels
  const timeSlots = useMemo(() => buildBusinessTimeSlots(), []);

  // Rowspan helpers
  const getStartHour = (b) => new Date(b.waktu_mulai).getHours();
  const getSpanHours = (b) => resolveQtyFromBooking(b);

  const { startsIndex, occupiedIndex } = useMemo(() => {
    const starts = {};
    const occ = {};
    roomNames.forEach((room) => {
      starts[room] = {};
      occ[room] = {};
    });

    filteredByDate.forEach((b) => {
      const room = b.room;
      if (!roomNames.includes(room)) return;
      const startH = getStartHour(b);
      const span = Math.max(1, Math.min(24, getSpanHours(b)));
      starts[room][startH] = { booking: b, span };
      for (let h = 0; h < span; h++) occ[room][(startH + h) % 24] = true;
    });

    return { startsIndex: starts, occupiedIndex: occ };
  }, [filteredByDate, roomNames]);

  // Ringkasan
  const summaryCards = useMemo(() => {
    const byRoom = roomNames.map((room) => {
      const sessions = filteredByDate.filter((b) => b.room === room);
      const totalHours = sessions.reduce(
        (sum, b) => sum + resolveQtyFromBooking(b),
        0
      );
      return {
        room,
        count: sessions.length,
        totalHours,
        detail: getDetail(room),
      };
    });
    const totalCount = filteredByDate.length;
    const totalHours = byRoom.reduce((s, i) => s + i.totalHours, 0);
    return [
      { room: "ALL", count: totalCount, totalHours, detail: DEFAULT_DETAIL },
      ...byRoom,
    ];
  }, [filteredByDate, getDetail, roomNames]);

  // Actions
  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.replace("/login");
    } catch (e) {
      toast.error(e.message || "Gagal keluar.");
    } finally {
      setSigningOut(false);
    }
  };

  const startEdit = (b) => {
    setEditingError("");
    setEditing({
      id: b.id,
      namaKasir: b.nama_kasir,
      namaPelanggan: b.nama_pelanggan,
      noHp: b.no_hp ?? "",
      room: b.room,
      catatan: b.catatan ?? "",
      qtyJam: resolveQtyFromBooking(b) || 1,
      startISO: b.waktu_mulai,
    });
  };
  const cancelEdit = () => {
    setEditing(null);
    setEditingError("");
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setEditingLoading(true);
    setEditingError("");

    try {
      if (!cashierDisplayName?.trim() || !editing.namaPelanggan.trim()) {
        setEditingError(
          "Nama kasir (dari akun) dan nama pelanggan wajib diisi."
        );
        setEditingLoading(false);
        return;
      }
      if (!roomNames.includes(editing.room)) {
        setEditingError(
          "Room tidak valid. Perbarui daftar rooms terlebih dahulu."
        );
        setEditingLoading(false);
        return;
      }

      const start = new Date(editing.startISO || new Date());
      const qty = Math.min(Math.max(editing.qtyJam || 1, 1), MAX_BOOKING_HOURS);
      const end = new Date(start);
      end.setHours(start.getHours() + qty);

      // Cek tabrakan
      const { data: konflik, error: conflictError } = await supabase
        .from("rental_sesi")
        .select("id")
        .eq("room", editing.room)
        .lt("waktu_mulai", end.toISOString())
        .gt("waktu_selesai", start.toISOString());
      if (conflictError) throw conflictError;
      if ((konflik || []).some((k) => k.id !== editing.id)) {
        setEditingError("Rentang waktu bertabrakan. Ubah durasi/ruangan.");
        setEditingLoading(false);
        return;
      }

      const payload = {
        nama_kasir: cashierDisplayName?.trim() || "-",
        nama_pelanggan: editing.namaPelanggan.trim(),
        no_hp: editing.noHp.trim() || null,
        room: editing.room,
        catatan: editing.catatan.trim() || null,
        qty_jam: qty,
        waktu_mulai: start.toISOString(),
        waktu_selesai: end.toISOString(),
      };
      const { error } = await supabase
        .from("rental_sesi")
        .update(payload)
        .eq("id", editing.id);
      if (error) throw error;

      toast.success("Perubahan berhasil disimpan.");
      setEditing(null);
      fetchBookings();
    } catch (err) {
      setEditingError(err.message);
    } finally {
      setEditingLoading(false);
    }
  };

  const confirmDelete = (b) => setDeleteTarget(b);
  const handleDelete = async (id) => {
    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from("rental_sesi")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Sesi berhasil dihapus.");
      if (editing?.id === id) setEditing(null);
      fetchBookings();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    setQuickAddLoading(true);
    setQuickAddError("");

    try {
      if (!cashierDisplayName?.trim() || !quickAddForm.namaPelanggan.trim()) {
        setQuickAddError(
          "Nama kasir (dari akun) dan nama pelanggan wajib diisi."
        );
        setQuickAddLoading(false);
        return;
      }
      if (!roomNames.includes(quickAdd.room)) {
        setQuickAddError(
          "Room tidak valid. Perbarui daftar rooms terlebih dahulu."
        );
        setQuickAddLoading(false);
        return;
      }

      const startDate = new Date(selectedDate);
      // startHour di slot tetap jam real
      startDate.setHours(quickAdd.startHour, 0, 0, 0);
      const qty = Math.min(
        Math.max(quickAddForm.qtyJam || 1, 1),
        MAX_BOOKING_HOURS
      );
      const latestEndHour = Math.min(24, quickAdd.startHour + qty);
      const endDate = new Date(startDate);
      endDate.setHours(latestEndHour, 0, 0, 0);

      const { data: konflik, error: conflictError } = await supabase
        .from("rental_sesi")
        .select("id")
        .eq("room", quickAdd.room)
        .lt("waktu_mulai", endDate.toISOString())
        .gt("waktu_selesai", startDate.toISOString());
      if (conflictError) throw conflictError;
      if (konflik?.length) {
        setQuickAddError(
          "Jadwal terpakai. Pilih jam lain atau kurangi durasi."
        );
        setQuickAddLoading(false);
        return;
      }

      const payload = {
        nama_kasir: cashierDisplayName?.trim() || "-",
        nama_pelanggan: quickAddForm.namaPelanggan.trim(),
        no_hp: quickAddForm.noHp.trim() || null,
        room: quickAdd.room,
        qty_jam: latestEndHour - quickAdd.startHour,
        catatan: null,
        waktu_mulai: startDate.toISOString(),
        waktu_selesai: endDate.toISOString(),
      };
      const { error } = await supabase.from("rental_sesi").insert(payload);
      if (error) throw error;

      toast.success("Sesi berhasil dibuat!");
      setQuickAdd(null);
      setQuickAddForm({
        namaKasir: "",
        namaPelanggan: "",
        noHp: "",
        qtyJam: 1,
      });
      fetchBookings();
    } catch (err) {
      setQuickAddError(err.message);
    } finally {
      setQuickAddLoading(false);
    }
  };

  // Export CSV
  const exportCSV = () => {
    const rows = [
      [
        "No.",
        "Room",
        "Nama Pelanggan",
        "Nama Kasir",
        "No. HP",
        "Durasi (jam)",
        "Waktu Mulai",
        "Waktu Selesai",
        // "Waktu Mulai (Kalender)",
        // "Waktu Selesai (Kalender)",
        "Catatan",
      ],
      ...filteredByDate.map((b, i) => {
        const fReal = (iso) =>
          new Date(iso).toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

        return [
          i + 1,
          b.room,
          b.nama_pelanggan,
          b.nama_kasir,
          b.no_hp ?? "",
          resolveQtyFromBooking(b),
          // Bisnis (mengikuti label 00:00-04:00 setelah geser dari jam real)
          formatBusinessDateTime(b.waktu_mulai),
          formatBusinessDateTime(b.waktu_selesai),
          // Kalender (jam real di DB)
          // fReal(b.waktu_mulai),
          // fReal(b.waktu_selesai),
          b.catatan ?? "",
        ];
      }),
    ];

    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell ?? "");
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const fname = `treebox-sesi_${selectedDateKey}.csv`;
    a.href = url;
    a.download = fname;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`CSV diekspor: ${fname}`);
  };

  if (!sessionReady) {
    return (
      <div className="flex grow items-center justify-center">
        <div className="rounded-3xl border border-[color:var(--color-border)] bg-white/70 px-8 py-10 text-sm text-[color:var(--color-muted)] shadow-2xl backdrop-blur-lg">
          Memuat data Treebox…
        </div>
        <Toaster richColors position="top-right" />
      </div>
    );
  }

  return (
    <div className="relative flex grow flex-col px-6 pb-16">
      <Toaster richColors position="top-right" />

      {/* BG blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-6 top-6 h-48 w-48 rounded-full bg-[rgba(21,48,110,0.18)] blur-3xl" />
        <div className="absolute right-2 top-24 h-56 w-56 rounded-full bg-[rgba(230,57,70,0.16)] blur-3xl" />
        <div className="absolute bottom-8 left-1/3 h-52 w-52 rounded-full bg-[rgba(12,29,74,0.22)] blur-3xl" />
      </div>

      <header className="relative z-10 flex flex-col gap-4 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-primary)]">
            Treebox Admin
          </span>
          <h1 className="mt-4 text-4xl font-semibold text-[var(--color-primary)] md:text-5xl">
            Panel Kasir Treebox
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[color:var(--color-muted)] md:text-base">
            Pantau jadwal ruangan dan sesi rental PlayStation secara real-time.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {me.role === "super" ? (
            <button
              type="button"
              onClick={() => setOpenAdmins(true)}
              className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-white/90 px-6 text-sm font-semibold text-[var(--color-primary)] shadow-lg transition focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
            >
              Kelola Admin
            </button>
          ) : null}

          {me.role === "super" ? (
            <button
              type="button"
              onClick={() => setRoomsOpen(true)}
              className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--color-border)] bg-white px-6 text-sm font-semibold text-[var(--color-primary)] shadow-lg"
            >
              Kelola Rooms
            </button>
          ) : null}

          <button
            type="button"
            onClick={exportCSV}
            className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-white/90 px-6 text-sm font-semibold text-[var(--color-primary)] shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
          >
            <span className="relative flex items-center gap-2">Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-white/90 px-6 text-sm font-semibold text-[var(--color-primary)] shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-70"
          >
            <span className="absolute inset-0 bg-[var(--color-accent)] opacity-0 transition group-hover:opacity-100" />
            <span className="relative flex items-center gap-2 group-hover:text-white">
              {signingOut ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
              ) : null}
              {signingOut ? "Memproses…" : "Keluar"}
            </span>
          </button>
        </div>
      </header>

      <main className="relative z-10 flex flex-col gap-8">
        <section className="rounded-3xl border border-[var(--color-border)] bg-white/80 p-6 shadow-2xl backdrop-blur">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--color-primary)]">
                Jadwal Ruangan
              </h2>
              <p className="text-sm text-[color:var(--color-muted)]">
                {selectedDate.toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => shiftWindow(-WINDOW_SIZE)}
                className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)] hover:border-[var(--color-primary-light)]"
              >
                ← {WINDOW_SIZE} hari
              </button>
              <button
                type="button"
                onClick={goToday}
                className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)] hover:border-[var(--color-primary-light)]"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => shiftWindow(WINDOW_SIZE)}
                className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)] hover:border-[var(--color-primary-light)]"
              >
                {WINDOW_SIZE} hari →
              </button>
            </div>
          </div>

          {/* Bar tanggal */}
          <div className="mb-6">
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-2">
                {visibleDates.map((date, index) => {
                  const isSelected = index === selectedDateIndex;
                  const dateStr = toInputDateString(date);
                  const isToday =
                    dateStr === toInputDateString(startOfDay(new Date()));
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => setSelectedDateIndex(index)}
                      className={`flex min-w-[70px] flex-col items-center justify-center gap-1 rounded-2xl border px-3 py-2 transition ${
                        isSelected
                          ? "border-transparent bg-[var(--color-primary)] text-white shadow-md"
                          : "border-[color:var(--color-border)] bg-white text-[var(--color-primary)] hover:border-[var(--color-primary-light)]"
                      }`}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-[0.3em]">
                        {date.toLocaleDateString("id-ID", { weekday: "short" })}
                      </span>
                      <span
                        className={`text-lg font-semibold ${
                          isToday && !isSelected
                            ? "text-[var(--color-accent)]"
                            : ""
                        }`}
                      >
                        {date.getDate()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Ringkasan */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {summaryCards.map((card) => {
              const detail =
                card.room === "ALL" ? DEFAULT_DETAIL : getDetail(card.room);
              const IconComponent = ICONS[detail.icon] || IconConsole;
              return (
                <div
                  key={card.room}
                  className="rounded-2xl border px-4 py-4 shadow-sm"
                  style={{
                    borderColor: detail.border,
                    backgroundColor: "rgba(255,255,255,0.92)",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full border"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.9)",
                          borderColor: detail.border,
                          color: detail.accent,
                        }}
                      >
                        <IconComponent width={18} height={18} />
                      </span>
                      <span>
                        {card.room === "ALL" ? "Semua Ruangan" : card.room}
                      </span>
                    </div>
                    <span
                      className="text-xs font-semibold uppercase tracking-widest"
                      style={{ color: detail.accent }}
                    >
                      {card.count} sesi
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span
                      className="text-2xl font-semibold"
                      style={{ color: detail.accent }}
                    >
                      {card.totalHours.toLocaleString("id-ID")} jam
                    </span>
                    <span className="text-xs uppercase tracking-widest text-[color:var(--color-muted)]">
                      total
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Jadwal */}
          {bookingsLoading ? (
            <div className="mt-6 flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-[color:var(--color-border)] bg-white/70 text-sm text-[color:var(--color-muted)]">
              Mengambil data sesi…
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-white shadow-inner md:block">
                <table className="w-full border-collapse">
                  <thead className="bg-[var(--color-primary)] text-left text-xs font-semibold uppercase tracking-widest text-white">
                    <tr>
                      <th className="border-b border-[color:var(--color-border)] px-4 py-3">
                        Waktu
                      </th>
                      {roomNames.map((room) => (
                        <th
                          key={`head-${room}`}
                          className="border-b border-[color:var(--color-border)] px-4 py-3 text-center"
                        >
                          {room}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-sm text-[var(--color-primary)]">
                    {timeSlots.map((slot) => {
                      const hour = slot.startHour; // jam real
                      return (
                        <tr
                          key={`slot-${hour}`}
                          className="border-t border-[color:var(--color-border)]"
                        >
                          <td className="border-r border-[color:var(--color-border)] px-4 py-3 font-semibold align-top">
                            {businessSlotLabel(slot.startHour, slot.endHour)}
                          </td>
                          {roomNames.map((room) => {
                            const startInfo = startsIndex[room]?.[hour];
                            const detail = getDetail(room);

                            if (occupiedIndex[room]?.[hour] && !startInfo)
                              return null;

                            if (startInfo) {
                              const b = startInfo.booking;
                              const span = startInfo.span;
                              return (
                                <td
                                  key={`cell-${hour}-${room}`}
                                  rowSpan={span}
                                  className="border-r border-[color:var(--color-border)] px-4 py-3 align-top last:border-r-0"
                                >
                                  <div
                                    className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs shadow-sm"
                                    style={{
                                      borderColor: detail.border,
                                      backgroundColor: detail.row_bg,
                                    }}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold truncate text-[var(--color-primary)]">
                                        {b.nama_pelanggan}
                                      </p>
                                      <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-muted)]">
                                        {b.nama_kasir} •{" "}
                                        {resolveQtyFromBooking(b)} jam
                                      </p>
                                      <p className="text-[10px] text-[color:var(--color-muted)]">
                                        {formatTimeOnly(b.waktu_mulai)} -{" "}
                                        {formatTimeOnly(b.waktu_selesai)}
                                      </p>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => startEdit(b)}
                                        className="rounded-full border border-[var(--color-primary)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
                                      >
                                        Ubah
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => confirmDelete(b)}
                                        className="rounded-full border border-transparent bg-[var(--color-accent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white hover:bg-[#c82636]"
                                      >
                                        Hapus
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              );
                            }

                            return (
                              <td
                                key={`cell-${hour}-${room}`}
                                className="border-r border-[color:var(--color-border)] px-4 py-3 last:border-r-0"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickAddError("");
                                    setQuickAdd({ startHour: hour, room });
                                  }}
                                  className="w-full rounded-lg px-2 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--color-muted)] hover:bg-[var(--color-primary)]/8 hover:text-[var(--color-primary)]"
                                >
                                  + Tambah
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="mt-6 space-y-4 md:hidden">
                {timeSlots.map((slot) => {
                  const hour = slot.startHour; // jam real
                  return (
                    <section
                      key={`mobile-slot-${hour}`}
                      className="rounded-2xl border border-[color:var(--color-border)] bg-white/95 p-4 shadow-md"
                    >
                      <div className="mb-3 border-b border-[color:var(--color-border)] pb-2">
                        <h3 className="text-sm font-semibold text-[var(--color-primary)]">
                          {businessSlotLabel(slot.startHour, slot.endHour)}
                        </h3>
                      </div>
                      <div className="space-y-3">
                        {roomNames.map((room) => {
                          const startInfo = startsIndex[room]?.[hour];
                          const detail = getDetail(room);
                          const isOccupiedButNotStart =
                            occupiedIndex[room]?.[hour] && !startInfo;

                          return (
                            <div
                              key={`mobile-slot-${hour}-${room}`}
                              className="rounded-xl border px-3 py-3"
                              style={{ borderColor: detail.border }}
                            >
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-primary)]">
                                  {room}
                                </span>
                                <span
                                  className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] ${
                                    startInfo || isOccupiedButNotStart
                                      ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                                      : "bg-[color:var(--color-muted)]/10 text-[color:var(--color-muted)]"
                                  }`}
                                >
                                  {startInfo || isOccupiedButNotStart
                                    ? "Terisi"
                                    : "Kosong"}
                                </span>
                              </div>

                              {startInfo ? (
                                <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-sm">
                                  <p className="font-semibold text-[var(--color-primary)]">
                                    {startInfo.booking.nama_pelanggan}
                                  </p>
                                  <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-muted)]">
                                    {startInfo.booking.nama_kasir} •{" "}
                                    {startInfo.span} jam
                                  </p>
                                  <p className="text-[10px] text-[color:var(--color-muted)]">
                                    {formatTimeOnly(
                                      startInfo.booking.waktu_mulai
                                    )}{" "}
                                    -{" "}
                                    {formatTimeOnly(
                                      startInfo.booking.waktu_selesai
                                    )}
                                  </p>
                                  <div className="mt-2 flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        startEdit(startInfo.booking)
                                      }
                                      className="rounded-full border border-[var(--color-primary)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
                                    >
                                      Ubah
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        confirmDelete(startInfo.booking)
                                      }
                                      className="rounded-full border border-transparent bg-[var(--color-accent)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white hover:bg-[#c82636]"
                                    >
                                      Hapus
                                    </button>
                                  </div>
                                </div>
                              ) : isOccupiedButNotStart ? (
                                <div className="text-[11px] text-[color:var(--color-muted)]">
                                  Bagian dari sesi sebelumnya.
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickAddError("");
                                    setQuickAdd({ startHour: hour, room });
                                  }}
                                  className="w-full rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--color-muted)] hover:bg-[var(--color-primary)]/8 hover:text-[var(--color-primary)]"
                                >
                                  + Tambah sesi
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </>
          )}

          {/* EDIT MODAL */}
          {editing ? (
            <ModalPortal>
              <div className="fixed inset-0 z-[9998] pointer-events-none backdrop-blur-sm" />
              <div
                className="fixed inset-0 z-[9999] bg-black/45"
                onClick={cancelEdit}
              />
              <form
                onSubmit={handleUpdate}
                role="dialog"
                aria-modal="true"
                className="fixed z-[10000] top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2
                 max-h-[85vh] overflow-y-auto rounded-3xl border border-[color:var(--color-border)]
                 bg-white/98 px-6 py-6 shadow-[0_24px_60px_rgba(12,29,74,0.18)] backdrop-blur-md md:px-8"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {/* === ISI FORM KAMU TETAP SAMA MULAI DARI SINI === */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-5">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-[color:var(--color-muted)]">
                      Edit sesi pelanggan
                    </p>
                    <h3 className="text-xl font-semibold text-[var(--color-primary)]">
                      {editing.namaPelanggan}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)] hover:text-[#a91020]"
                  >
                    Batal
                  </button>
                </div>

                {editingError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                    {editingError}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <FieldRead
                    label="Nama kasir"
                    value={cashierDisplayName || "-"}
                  />
                  <EditField
                    id="edit-namaPelanggan"
                    label="Nama pelanggan"
                    value={editing.namaPelanggan}
                    onChange={(v) =>
                      setEditing((prev) =>
                        prev ? { ...prev, namaPelanggan: v } : prev
                      )
                    }
                  />
                  <EditField
                    id="edit-noHp"
                    label="No HP pelanggan"
                    value={editing.noHp}
                    onChange={(v) =>
                      setEditing((prev) => (prev ? { ...prev, noHp: v } : prev))
                    }
                    placeholder="08xxxxxxxxxx"
                  />
                  <RoomSelectEdit
                    value={editing.room}
                    onChange={(room) =>
                      setEditing((prev) => (prev ? { ...prev, room } : prev))
                    }
                    rooms={rooms}
                    ICONS={ICONS}
                    IconConsole={IconConsole}
                    DEFAULT_DETAIL={DEFAULT_DETAIL}
                  />

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                      Durasi (jam)
                    </label>
                    <select
                      value={editing.qtyJam}
                      onChange={(e) =>
                        setEditing((prev) =>
                          prev
                            ? { ...prev, qtyJam: Number(e.target.value) }
                            : prev
                        )
                      }
                      className="rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-primary)] outline-none"
                    >
                      {Array.from(
                        { length: MAX_BOOKING_HOURS },
                        (_, i) => i + 1
                      ).map((h) => (
                        <option key={h} value={h}>
                          {h} jam
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-2 flex flex-col gap-2">
                    <label
                      htmlFor="edit-catatan"
                      className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]"
                    >
                      Catatan
                    </label>
                    <textarea
                      id="edit-catatan"
                      rows={2}
                      value={editing.catatan}
                      onChange={(e) =>
                        setEditing((prev) =>
                          prev ? { ...prev, catatan: e.target.value } : prev
                        )
                      }
                      className="resize-none rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-2 text-sm text-[var(--color-primary)] outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-5">
                  <button
                    type="submit"
                    disabled={editingLoading}
                    className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-white disabled:opacity-60"
                  >
                    {editingLoading ? "Memperbarui…" : "Simpan perubahan"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)]"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </ModalPortal>
          ) : null}

          {/* DELETE MODAL */}
          {deleteTarget ? (
            <ModalPortal>
              <div className="fixed inset-0 z-[9998] pointer-events-none backdrop-blur-sm" />

              <div
                className="fixed inset-0 z-[9999] bg-black/45"
                onClick={() => (!deleteLoading ? setDeleteTarget(null) : null)}
              />

              <div
                role="dialog"
                aria-modal="true"
                className="fixed z-[10000] top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2
                 max-h-[85vh] overflow-y-auto rounded-2xl border border-[color:var(--color-border)]
                 bg-white/98 px-6 py-6 shadow-[0_18px_45px_rgba(12,29,74,0.18)] backdrop-blur-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-[var(--color-primary)]">
                    Hapus sesi pelanggan?
                  </h3>
                  <p className="text-sm text-[color:var(--color-muted)]">
                    Data pelanggan{" "}
                    <span className="font-semibold text-[var(--color-primary)]">
                      {deleteTarget.nama_pelanggan}
                    </span>{" "}
                    di ruangan{" "}
                    <span className="font-semibold text-[var(--color-primary)]">
                      {deleteTarget.room}
                    </span>{" "}
                    akan dihapus permanen.
                  </p>
                </div>

                <dl className="mt-3 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[color:var(--color-muted)]">
                  <div className="flex justify-between">
                    <dt>Waktu</dt>
                    <dd className="font-semibold text-[var(--color-primary)]">
                      {formatTimeOnly(deleteTarget.waktu_mulai)} -{" "}
                      {formatTimeOnly(deleteTarget.waktu_selesai)}
                    </dd>
                  </div>
                  <div className="mt-2 flex justify-between">
                    <dt>Kasir</dt>
                    <dd className="font-semibold text-[var(--color-primary)]">
                      {deleteTarget.nama_kasir}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      !deleteLoading ? setDeleteTarget(null) : null
                    }
                    className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)] disabled:opacity-60"
                    disabled={deleteLoading}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(deleteTarget.id)}
                    className="inline-flex items-center justify-center rounded-full border border-transparent bg-[var(--color-accent)] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white disabled:opacity-60"
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? "Menghapus…" : "Hapus sesi"}
                  </button>
                </div>
              </div>
            </ModalPortal>
          ) : null}

          {/* QUICK ADD MODAL */}
          {quickAdd ? (
            <ModalPortal>
              <div className="fixed inset-0 z-[9998] pointer-events-none backdrop-blur-sm" />
              <div
                className="fixed inset-0 z-[9999] bg-black/45"
                onClick={() => (!quickAddLoading ? setQuickAdd(null) : null)}
              />
              <form
                onSubmit={handleQuickAdd}
                role="dialog"
                aria-modal="true"
                className="fixed z-[10000] top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2
                 max-h-[85vh] overflow-y-auto rounded-3xl border border-[var(--color-border)]
                 bg-white/98 px-6 py-6 shadow-[0_24px_60px_rgba(12,29,74,0.18)] backdrop-blur-md"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-widest text-[color:var(--color-muted)]">
                    Tambah sesi cepat
                  </p>
                  <h3 className="text-lg font-semibold text-[var(--color-primary)]">
                    {quickAdd.room} •{" "}
                    {businessSlotLabel(
                      quickAdd.startHour,
                      (quickAdd.startHour + 1) % 24
                    )}
                  </h3>
                  <p className="text-xs text-[color:var(--color-muted)]">
                    {selectedDate.toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                </div>

                {quickAddError ? (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                    {quickAddError}
                  </div>
                ) : null}

                <div className="mt-3 space-y-3">
                  <FieldRead
                    label="Nama kasir"
                    value={cashierDisplayName || "-"}
                  />

                  <EditField
                    id="qa-nama"
                    label="Nama pelanggan"
                    value={quickAddForm.namaPelanggan}
                    onChange={(v) =>
                      setQuickAddForm((prev) => ({
                        ...prev,
                        namaPelanggan: v,
                      }))
                    }
                    placeholder="Contoh: Abi Saputra"
                  />

                  <EditField
                    id="qa-hp"
                    label="No HP pelanggan"
                    value={quickAddForm.noHp}
                    onChange={(v) =>
                      setQuickAddForm((prev) => ({ ...prev, noHp: v }))
                    }
                    placeholder="08xxxxxxxxxx"
                  />

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                      Durasi (jam)
                    </label>
                    <select
                      value={quickAddForm.qtyJam}
                      onChange={(e) =>
                        setQuickAddForm((prev) => ({
                          ...prev,
                          qtyJam: Number(e.target.value),
                        }))
                      }
                      className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-primary)] outline-none"
                    >
                      {Array.from(
                        { length: MAX_BOOKING_HOURS },
                        (_, i) => i + 1
                      ).map((h) => (
                        <option key={h} value={h}>
                          {h} jam
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={quickAddLoading}
                    className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-white disabled:opacity-60"
                  >
                    {quickAddLoading ? "Membuat…" : "Buat sesi"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      !quickAddLoading ? setQuickAdd(null) : null
                    }
                    className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)] disabled:opacity-60"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </ModalPortal>
          ) : null}
        </section>
      </main>

      <AdminsManager open={openAdmins} onClose={() => setOpenAdmins(false)} />
      <RoomsManager
        open={roomsOpen}
        onClose={() => setRoomsOpen(false)}
        onSaved={() => {
          fetchRooms();
        }}
      />
    </div>
  );
}
