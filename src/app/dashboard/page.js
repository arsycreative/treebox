"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

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

const IconCube = (props) => (
  <svg {...iconBaseProps} {...props}>
    <path d="M12 3 4 7v6l8 4 8-4V7z" />
    <path d="M12 3v14" />
    <path d="M4 7l8 4 8-4" />
  </svg>
);

const IconGem = (props) => (
  <svg {...iconBaseProps} {...props}>
    <path d="M12 3 4 9l8 12 8-12z" />
    <path d="M9 9 12 3l3 6" />
    <path d="M4 9h16" />
  </svg>
);

const IconDiamond = (props) => (
  <svg {...iconBaseProps} {...props}>
    <path d="M12 3 20 12l-8 9-8-9z" />
    <path d="M12 3v18" />
    <path d="M6.5 7.5 17.5 16.5" />
    <path d="M17.5 7.5 6.5 16.5" />
  </svg>
);

const IconLayers = (props) => (
  <svg {...iconBaseProps} {...props}>
    <path d="m12 3 8 4-8 4-8-4Z" />
    <path d="m4 11 8 4 8-4" />
    <path d="m4 15 8 4 8-4" />
  </svg>
);

const IconStar = (props) => (
  <svg {...iconBaseProps} {...props}>
    <path d="m12 4 2.2 4.46 4.92.71-3.56 3.47.84 4.9-4.4-2.32-4.4 2.32.84-4.9-3.56-3.47 4.92-.71z" />
  </svg>
);

const IconConsole = (props) => (
  <svg {...iconBaseProps} {...props}>
    <rect x="3.5" y="6" width="17" height="12" rx="4" />
    <path d="M8.5 12h3" />
    <path d="M7.5 10v4" />
    <circle cx="16" cy="10.5" r="1" />
    <circle cx="17.5" cy="13.5" r="1" />
  </svg>
);

const ROOM_OPTIONS = [
  "BROWN WALLNUT",
  "RED RUBY",
  "BLUE DIAMONT",
  "GREY SAND",
  "BLACK GOLD",
];

const ROOM_SEGMENTS = ["ALL", ...ROOM_OPTIONS];

const DAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const ROOM_DETAILS = {
  "BROWN WALLNUT": {
    short: "BW",
    Icon: IconCube,
    accent: "#c27541",
    badgeBg: "rgba(194, 117, 65, 0.22)",
    badgeText: "#6a3816",
    rowBg: "rgba(194, 117, 65, 0.08)",
    border: "rgba(194, 117, 65, 0.3)",
  },
  "RED RUBY": {
    short: "RR",
    Icon: IconGem,
    accent: "#d63b52",
    badgeBg: "rgba(214, 59, 82, 0.22)",
    badgeText: "#7f1224",
    rowBg: "rgba(214, 59, 82, 0.08)",
    border: "rgba(214, 59, 82, 0.28)",
  },
  "BLUE DIAMONT": {
    short: "BD",
    Icon: IconDiamond,
    accent: "#1f7acb",
    badgeBg: "rgba(31, 122, 203, 0.2)",
    badgeText: "#0f3c6a",
    rowBg: "rgba(31, 122, 203, 0.09)",
    border: "rgba(31, 122, 203, 0.26)",
  },
  "GREY SAND": {
    short: "GS",
    Icon: IconLayers,
    accent: "#8f949f",
    badgeBg: "rgba(143, 148, 159, 0.18)",
    badgeText: "#464a52",
    rowBg: "rgba(143, 148, 159, 0.08)",
    border: "rgba(143, 148, 159, 0.26)",
  },
  "BLACK GOLD": {
    short: "BG",
    Icon: IconStar,
    accent: "#c9a63a",
    badgeBg: "rgba(201, 166, 58, 0.2)",
    badgeText: "#5a4611",
    rowBg: "rgba(201, 166, 58, 0.08)",
    border: "rgba(201, 166, 58, 0.28)",
  },
};

const DEFAULT_ROOM_DETAIL = {
  short: "--",
  Icon: IconConsole,
  accent: "#15306e",
  badgeBg: "rgba(21, 48, 110, 0.18)",
  badgeText: "#112357",
  rowBg: "rgba(21, 48, 110, 0.06)",
  border: "rgba(21, 48, 110, 0.28)",
};

const getRoomDetail = (room) => ROOM_DETAILS[room] ?? DEFAULT_ROOM_DETAIL;

const HOURS_IN_MS = 60 * 60 * 1000;

const pad = (value) => String(value).padStart(2, "0");

const startOfDay = (date = new Date()) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const roundUpToHour = (date = new Date()) => {
  const result = new Date(date);
  if (
    result.getMinutes() > 0 ||
    result.getSeconds() > 0 ||
    result.getMilliseconds() > 0
  ) {
    result.setHours(result.getHours() + 1);
  }
  result.setMinutes(0, 0, 0);
  return result;
};

const ensureHourString = (value) => {
  if (!value) return "00:00";
  const [hourRaw] = value.split(":");
  const hour = Math.min(23, Math.max(0, Number.parseInt(hourRaw, 10) || 0));
  return `${pad(hour)}:00`;
};

const normalizeStartTime = (value) => {
  const safe = ensureHourString(value);
  const hour = Math.min(22, Number.parseInt(safe.split(":")[0], 10) || 0);
  return `${pad(hour)}:00`;
};

const normalizeEndTime = (startTime, proposedValue) => {
  const startHour = Number.parseInt(
    normalizeStartTime(startTime).split(":")[0],
    10
  );
  const safe = ensureHourString(proposedValue);
  let endHour = Number.parseInt(safe.split(":")[0], 10);
  if (Number.isNaN(endHour)) endHour = startHour + 1;
  if (endHour <= startHour) endHour = startHour + 1;
  if (endHour > 23) endHour = 23;
  return `${pad(endHour)}:00`;
};

const nextHourString = (startTime) => {
  const startHour = Number.parseInt(
    normalizeStartTime(startTime).split(":")[0],
    10
  );
  return `${pad(Math.min(23, startHour + 1))}:00`;
};

const combineDateAndTime = (baseDate, timeString) => {
  const [hourRaw] = ensureHourString(timeString).split(":");
  const combined = new Date(baseDate);
  combined.setHours(Number.parseInt(hourRaw, 10), 0, 0, 0);
  return combined;
};

const diffHours = (baseDate, startTime, endTime) => {
  const start = combineDateAndTime(baseDate, startTime);
  const end = combineDateAndTime(baseDate, endTime);
  return (end.getTime() - start.getTime()) / HOURS_IN_MS;
};

const sanitizeQty = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 1;
  return Math.round(numeric);
};

const clampQty = (startTime, qty) => {
  const startHour = Number.parseInt(
    normalizeStartTime(startTime).split(":")[0],
    10
  );
  const maxDuration = Math.max(1, 23 - startHour);
  return Math.max(1, Math.min(sanitizeQty(qty), maxDuration));
};

const deriveEndTimeFromQty = (baseDate, startTime, qty) => {
  const safeStart = normalizeStartTime(startTime);
  const safeQty = clampQty(safeStart, qty);
  const startDate = combineDateAndTime(baseDate, safeStart);
  const endDate = new Date(startDate.getTime() + safeQty * HOURS_IN_MS);
  return {
    qty: safeQty,
    endTime: ensureHourString(
      `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`
    ),
  };
};

const calculateQtyFromTimes = (baseDate, startTime, endTime) => {
  const diff = diffHours(baseDate, normalizeStartTime(startTime), endTime);
  if (!Number.isFinite(diff) || diff <= 0) return 1;
  return sanitizeQty(diff);
};

const extractTimeFromIso = (isoString) => {
  const date = new Date(isoString);
  return ensureHourString(`${pad(date.getHours())}:${pad(date.getMinutes())}`);
};

const resolveQtyFromBooking = (booking) => {
  const numeric = Number(booking.qty_jam);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const baseDate = startOfDay(new Date(booking.waktu_mulai));
  const startTime = extractTimeFromIso(booking.waktu_mulai);
  const endTime = extractTimeFromIso(booking.waktu_selesai);
  return calculateQtyFromTimes(baseDate, startTime, endTime);
};

const toDisplayDate = (isoString) =>
  new Date(isoString).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const toDateKey = (isoString) => {
  const date = new Date(isoString);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
};

const formatDateOnly = (isoString) =>
  new Date(isoString).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatTimeOnly = (isoString) =>
  new Date(isoString).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

const fromInputDate = (value) => {
  if (!value) return null;
  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const toInputDateString = (date) => {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  return `${y}-${m}-${d}`;
};

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const addMonths = (date, months) =>
  new Date(date.getFullYear(), date.getMonth() + months, 1);

const getCalendarDays = (monthDate) => {
  const firstOfMonth = startOfMonth(monthDate);
  const firstDayIndex = (firstOfMonth.getDay() + 6) % 7; // Monday start
  const totalCells = 42; // 6 weeks view
  const days = [];
  for (let index = 0; index < totalCells; index += 1) {
    const current = new Date(firstOfMonth);
    current.setDate(firstOfMonth.getDate() + (index - firstDayIndex));
    days.push(current);
  }
  return days;
};

const defaultFormTimes = () => {
  const now = new Date();
  const rounded = roundUpToHour(now);
  let startHour = rounded.getHours();
  if (now.getDate() !== rounded.getDate() || startHour > 22) {
    startHour = 22;
  }
  const startTime = `${pad(startHour)}:00`;
  const { endTime } = deriveEndTimeFromQty(startOfDay(), startTime, 1);
  return {
    start: normalizeStartTime(startTime),
    end: endTime,
  };
};

const createEmptyForm = () => {
  const { start, end } = defaultFormTimes();
  const qty = calculateQtyFromTimes(startOfDay(), start, end);
  return {
    namaKasir: "",
    namaPelanggan: "",
    noHp: "",
    room: ROOM_OPTIONS[0],
    waktuMulai: start,
    waktuSelesai: end,
    qtyJam: String(qty),
    catatan: "",
  };
};

const serializeCsvRow = (cells) =>
  cells
    .map((cell) => {
      if (cell === null || cell === undefined) return "";
      const value = String(cell);
      if (value.includes('"') || value.includes(",") || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    })
    .join(",");

const downloadCsv = (content, filename) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [sessionReady, setSessionReady] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [form, setForm] = useState(createEmptyForm);
  const [formLoading, setFormLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [editing, setEditing] = useState(null);
  const [editingLoading, setEditingLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    room: "ALL",
    date: "",
  });

  const fetchBookings = useCallback(async () => {
    setBookingsLoading(true);
    const { data, error } = await supabase
      .from("rental_sesi")
      .select("*")
      .order("waktu_mulai", { ascending: true });

    if (error) {
      setFeedback(error.message);
      setBookings([]);
    } else {
      setBookings(data ?? []);
    }
    setBookingsLoading(false);
  }, [supabase]);

  useEffect(() => {
    const prepare = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }
      setSessionReady(true);
      fetchBookings();
    };

    prepare();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          router.replace("/login");
        } else {
          setSessionReady(true);
          fetchBookings();
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [fetchBookings, router, supabase]);

  const filteredByDate = useMemo(() => {
    const dateFilter = filters.date;
    if (!dateFilter) return bookings;
    return bookings.filter(
      (booking) => toDateKey(booking.waktu_mulai) === dateFilter
    );
  }, [bookings, filters.date]);

  const filteredBySearch = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();
    if (!searchTerm) return filteredByDate;
    return filteredByDate.filter((booking) =>
      [
        booking.nama_pelanggan,
        booking.nama_kasir,
        booking.no_hp,
        booking.catatan,
        booking.room,
      ]
        .filter(Boolean)
        .some((text) => text.toLowerCase().includes(searchTerm))
    );
  }, [filteredByDate, filters.search]);

  const filteredBookings = useMemo(() => {
    if (filters.room === "ALL") return filteredBySearch;
    const roomKey = filters.room.toLowerCase();
    return filteredBySearch.filter(
      (booking) => booking.room && booking.room.toLowerCase() === roomKey
    );
  }, [filteredBySearch, filters.room]);

  const groupedBookings = useMemo(
    () =>
      ROOM_OPTIONS.map((room) => ({
        room,
        bookings: filteredBookings.filter((booking) => booking.room === room),
      })).filter((group) => group.bookings.length > 0),
    [filteredBookings]
  );

  const roomSummaries = useMemo(() => {
    const byRoom = ROOM_OPTIONS.map((room) => {
      const sessions = filteredByDate.filter(
        (booking) => booking.room === room
      );
      const totalHours = sessions.reduce(
        (sum, booking) => sum + resolveQtyFromBooking(booking),
        0
      );
      return {
        room,
        count: sessions.length,
        totalHours,
        detail: getRoomDetail(room),
      };
    });

    const totalCount = filteredByDate.length;
    const totalHours = byRoom.reduce((sum, item) => sum + item.totalHours, 0);

    return {
      all: {
        room: "ALL",
        count: totalCount,
        totalHours,
        detail: DEFAULT_ROOM_DETAIL,
      },
      rooms: byRoom,
    };
  }, [filteredByDate]);

  const summaryCards = useMemo(
    () => [roomSummaries.all, ...roomSummaries.rooms],
    [roomSummaries]
  );

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.replace("/login");
    } catch (error) {
      setFeedback(error.message ?? "Gagal keluar. Coba lagi.");
    } finally {
      setSigningOut(false);
    }
  };

  const handleFormStartChange = (value) => {
    setForm((prev) => {
      const safeStart = normalizeStartTime(value);
      const baseDate = startOfDay();
      const { qty, endTime } = deriveEndTimeFromQty(
        baseDate,
        safeStart,
        prev.qtyJam
      );
      return {
        ...prev,
        waktuMulai: safeStart,
        qtyJam: String(qty),
        waktuSelesai: endTime,
      };
    });
  };

  const handleFormQtyChange = (value) => {
    setForm((prev) => {
      const baseDate = startOfDay();
      const { qty, endTime } = deriveEndTimeFromQty(
        baseDate,
        prev.waktuMulai,
        value
      );
      return {
        ...prev,
        qtyJam: String(qty),
        waktuSelesai: endTime,
      };
    });
  };

  const handleFormEndChange = (value) => {
    setForm((prev) => {
      const baseDate = startOfDay();
      const safeEnd = normalizeEndTime(prev.waktuMulai, value);
      const qty = calculateQtyFromTimes(baseDate, prev.waktuMulai, safeEnd);
      return {
        ...prev,
        waktuSelesai: safeEnd,
        qtyJam: String(qty),
      };
    });
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setFormLoading(true);
    setFeedback("");

    try {
      if (!form.namaKasir.trim() || !form.namaPelanggan.trim()) {
        setFeedback("Nama kasir dan nama pelanggan wajib diisi.");
        setFormLoading(false);
        return;
      }

      const baseDate = startOfDay();
      const safeStart = normalizeStartTime(form.waktuMulai);
      const safeEnd = normalizeEndTime(safeStart, form.waktuSelesai);

      const startDate = combineDateAndTime(baseDate, safeStart);
      const endDate = combineDateAndTime(baseDate, safeEnd);
      if (endDate <= startDate) {
        setFeedback("Waktu selesai harus lebih besar dari waktu mulai.");
        setFormLoading(false);
        return;
      }

      const qtyNumber = calculateQtyFromTimes(baseDate, safeStart, safeEnd);

      const { data: konflik, error: conflictError } = await supabase
        .from("rental_sesi")
        .select("id")
        .eq("room", form.room)
        .lt("waktu_mulai", endDate.toISOString())
        .gt("waktu_selesai", startDate.toISOString());

      if (conflictError) throw conflictError;
      if (konflik?.length) {
        setFeedback(
          "Jadwal tersebut sudah terpakai di ruangan ini. Silakan pilih jam lain atau pindahkan ruangan."
        );
        setFormLoading(false);
        return;
      }

      const payload = {
        nama_kasir: form.namaKasir.trim(),
        nama_pelanggan: form.namaPelanggan.trim(),
        no_hp: form.noHp.trim(),
        room: form.room,
        qty_jam: qtyNumber,
        catatan: form.catatan.trim() || null,
        waktu_mulai: startDate.toISOString(),
        waktu_selesai: endDate.toISOString(),
      };

      const { error } = await supabase.from("rental_sesi").insert(payload);
      if (error) throw error;

      setFeedback("Data pelanggan berhasil disimpan.");
      setForm(createEmptyForm());
      fetchBookings();
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const startEdit = (booking) => {
    setFeedback("");
    const baseDate = startOfDay(new Date(booking.waktu_mulai));
    const startTime = normalizeStartTime(
      extractTimeFromIso(booking.waktu_mulai)
    );
    const endCandidate = normalizeEndTime(
      startTime,
      extractTimeFromIso(booking.waktu_selesai)
    );
    const qty = calculateQtyFromTimes(baseDate, startTime, endCandidate);
    const { endTime } = deriveEndTimeFromQty(baseDate, startTime, qty);

    setEditing({
      id: booking.id,
      baseDate: baseDate.toISOString(),
      namaKasir: booking.nama_kasir,
      namaPelanggan: booking.nama_pelanggan,
      noHp: booking.no_hp ?? "",
      room: booking.room,
      waktuMulai: startTime,
      waktuSelesai: endTime,
      qtyJam: String(qty),
      catatan: booking.catatan ?? "",
    });
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  const handleEditingStartChange = (value) => {
    setEditing((prev) => {
      if (!prev) return prev;
      const baseDate = new Date(prev.baseDate);
      const safeStart = normalizeStartTime(value);
      const { qty, endTime } = deriveEndTimeFromQty(
        baseDate,
        safeStart,
        prev.qtyJam
      );
      return {
        ...prev,
        waktuMulai: safeStart,
        waktuSelesai: endTime,
        qtyJam: String(qty),
      };
    });
  };

  const handleEditingQtyChange = (value) => {
    setEditing((prev) => {
      if (!prev) return prev;
      const baseDate = new Date(prev.baseDate);
      const { qty, endTime } = deriveEndTimeFromQty(
        baseDate,
        prev.waktuMulai,
        value
      );
      return {
        ...prev,
        qtyJam: String(qty),
        waktuSelesai: endTime,
      };
    });
  };

  const handleEditingEndChange = (value) => {
    setEditing((prev) => {
      if (!prev) return prev;
      const baseDate = new Date(prev.baseDate);
      const safeEnd = normalizeEndTime(prev.waktuMulai, value);
      const qty = calculateQtyFromTimes(baseDate, prev.waktuMulai, safeEnd);
      return {
        ...prev,
        waktuSelesai: safeEnd,
        qtyJam: String(qty),
      };
    });
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!editing) return;
    setEditingLoading(true);
    setFeedback("");

    try {
      if (!editing.namaKasir.trim() || !editing.namaPelanggan.trim()) {
        setFeedback("Nama kasir dan nama pelanggan wajib diisi.");
        setEditingLoading(false);
        return;
      }

      const baseDate = new Date(editing.baseDate);
      const safeStart = normalizeStartTime(editing.waktuMulai);
      const safeEnd = normalizeEndTime(safeStart, editing.waktuSelesai);

      const startDate = combineDateAndTime(baseDate, safeStart);
      const endDate = combineDateAndTime(baseDate, safeEnd);

      if (endDate <= startDate) {
        setFeedback("Waktu selesai harus lebih besar dari waktu mulai.");
        setEditingLoading(false);
        return;
      }

      const qtyNumber = calculateQtyFromTimes(baseDate, safeStart, safeEnd);

      const { data: konflik, error: conflictError } = await supabase
        .from("rental_sesi")
        .select("id")
        .eq("room", editing.room)
        .lt("waktu_mulai", endDate.toISOString())
        .gt("waktu_selesai", startDate.toISOString())
        .neq("id", editing.id);

      if (conflictError) throw conflictError;
      if (konflik?.length) {
        setFeedback(
          "Jadwal bentrok dengan sesi lain. Sesuaikan jam atau ruangan."
        );
        setEditingLoading(false);
        return;
      }

      const payload = {
        nama_kasir: editing.namaKasir.trim(),
        nama_pelanggan: editing.namaPelanggan.trim(),
        no_hp: editing.noHp.trim(),
        room: editing.room,
        qty_jam: qtyNumber,
        catatan: editing.catatan.trim() || null,
        waktu_mulai: startDate.toISOString(),
        waktu_selesai: endDate.toISOString(),
      };

      const { error } = await supabase
        .from("rental_sesi")
        .update(payload)
        .eq("id", editing.id);

      if (error) throw error;

      setFeedback("Perubahan berhasil disimpan.");
      setEditing(null);
      fetchBookings();
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setEditingLoading(false);
    }
  };

  const handleDelete = async (bookingId) => {
    setFeedback("");
    const { error } = await supabase
      .from("rental_sesi")
      .delete()
      .eq("id", bookingId);
    if (error) {
      setFeedback(error.message);
    } else {
      setFeedback("Sesi berhasil dihapus.");
      if (editing?.id === bookingId) {
        setEditing(null);
      }
      fetchBookings();
    }
  };

  const handleExportCsv = () => {
    if (!filteredBookings.length) {
      setFeedback(
        "Tidak ada data untuk diekspor. Gunakan filter lain atau tambah data."
      );
      return;
    }

    const sortedBookings = filteredBookings.slice().sort((a, b) => {
      const roomIndexA = ROOM_OPTIONS.indexOf(a.room);
      const roomIndexB = ROOM_OPTIONS.indexOf(b.room);
      const normalizedRoomA =
        roomIndexA === -1 ? Number.MAX_SAFE_INTEGER : roomIndexA;
      const normalizedRoomB =
        roomIndexB === -1 ? Number.MAX_SAFE_INTEGER : roomIndexB;
      if (normalizedRoomA !== normalizedRoomB)
        return normalizedRoomA - normalizedRoomB;
      return (
        new Date(a.waktu_mulai).getTime() - new Date(b.waktu_mulai).getTime()
      );
    });

    const headers = [
      "Tanggal",
      "Mulai",
      "Selesai",
      "Durasi (Jam)",
      "Ruangan",
      "Kode Ruangan",
      "Nama Pelanggan",
      "Nama Kasir",
      "No HP",
      "Catatan",
      "Dibuat Pada",
    ];

    const rows = sortedBookings.map((booking) => {
      const detail = getRoomDetail(booking.room);
      const tanggal = formatDateOnly(booking.waktu_mulai);
      const mulai = formatTimeOnly(booking.waktu_mulai);
      const selesai = formatTimeOnly(booking.waktu_selesai);
      const qtyJam = resolveQtyFromBooking(booking);
      const dibuatPada = booking.created_at
        ? `${formatDateOnly(booking.created_at)} ${formatTimeOnly(
            booking.created_at
          )}`
        : "";

      return [
        tanggal,
        mulai,
        selesai,
        qtyJam,
        booking.room,
        detail.short,
        booking.nama_pelanggan,
        booking.nama_kasir,
        booking.no_hp ?? "",
        booking.catatan ? booking.catatan.trim() : "",
        dibuatPada,
      ];
    });

    const csvContent = [headers, ...rows].map(serializeCsvRow).join("\n");
    const filename = `treebox-rental-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    downloadCsv(csvContent, filename);
  };

  if (!sessionReady) {
    return (
      <div className="flex grow items-center justify-center">
        <div className="rounded-3xl border border-[color:var(--color-border)] bg-white/70 px-8 py-10 text-sm text-[color:var(--color-muted)] shadow-2xl backdrop-blur-lg">
          Memuat data Treebox…
        </div>
      </div>
    );
  }

  let rowCounter = 0;

  return (
    <div className="relative flex grow flex-col px-6 pb-16">
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
            Catat pelanggan, atur jadwal ruangan, dan pantau sesi rental
            PlayStation secara real-time.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-white/90 px-6 text-sm font-semibold text-[var(--color-primary)] shadow-lg transition focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-70"
        >
          <span className="absolute inset-0 bg-[var(--color-accent)] opacity-0 transition group-hover:opacity-100" />
          <span className="relative flex items-center gap-2 group-hover:text-white">
            {signingOut ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
            ) : null}
            {signingOut ? "Memproses…" : "Keluar"}
          </span>
        </button>
      </header>

      <main className="relative z-10 grid gap-8 lg:grid-cols-[420px_1fr]">
        <section className="rounded-3xl border border-[color:var(--color-border)] bg-white/80 p-6 shadow-2xl backdrop-blur">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-[var(--color-primary)]">
              Input Pelanggan
            </h2>
            <p className="text-sm text-[color:var(--color-muted)]">
              Lengkapi detail pelanggan Treebox, pilih ruangan, serta tentukan
              jam mulai dan selesai pada hari ini.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleCreate}>
            <Field
              id="namaKasir"
              label="Nama kasir"
              value={form.namaKasir}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, namaKasir: value }))
              }
              required
              placeholder="Contoh: Rani"
            />
            <Field
              id="namaPelanggan"
              label="Nama pelanggan"
              value={form.namaPelanggan}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, namaPelanggan: value }))
              }
              required
              placeholder="Contoh: Abi Saputra"
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field
                id="noHp"
                label="No HP pelanggan"
                value={form.noHp}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, noHp: value }))
                }
                placeholder="08xxxxxxxxxx"
              />
              <Field
                id="qtyJam"
                label="Qty jam"
                type="number"
                min="1"
                step="1"
                value={form.qtyJam}
                onChange={handleFormQtyChange}
              />
            </div>

            <RoomSelect
              value={form.room}
              onChange={(room) => setForm((prev) => ({ ...prev, room }))}
            />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <TimeField
                id="waktuMulai"
                label="Waktu mulai"
                value={form.waktuMulai}
                onChange={handleFormStartChange}
                max="22:00"
                description="Jam menggunakan format 24 jam (WIB)."
              />
              <TimeField
                id="waktuSelesai"
                label="Waktu selesai"
                value={form.waktuSelesai}
                onChange={handleFormEndChange}
                min={nextHourString(form.waktuMulai)}
                description="Durasi akan menyesuaikan perbedaan jam."
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="catatan"
                className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]"
              >
                Catatan
              </label>
              <textarea
                id="catatan"
                value={form.catatan}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, catatan: event.target.value }))
                }
                rows={3}
                className="resize-none rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-primary)] outline-none transition focus:border-[var(--color-primary-light)] focus:ring-2 focus:ring-[rgba(12,29,74,0.16)]"
                placeholder="Contoh: request joystick tambahan"
              />
            </div>

            <button
              type="submit"
              disabled={formLoading}
              className="flex w-full items-center justify-center rounded-full bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white shadow-xl transition hover:bg-[var(--color-primary-light)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {formLoading ? "Menyimpan…" : "Simpan data pelanggan"}
            </button>
          </form>

          {feedback ? (
            <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-white/90 px-5 py-4 text-sm text-[var(--color-primary)] shadow-lg">
              {feedback}
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-[color:var(--color-border)] bg-white/80 p-6 shadow-2xl backdrop-blur">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--color-primary)]">
                Jadwal Ruangan
              </h2>
              <p className="text-sm text-[color:var(--color-muted)]">
                Gunakan filter untuk mencari pelanggan, memilih ruangan, atau
                menampilkan sesi pada hari tertentu.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* <button
                type="button"
                onClick={fetchBookings}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)] transition hover:border-[var(--color-primary-light)] hover:bg-white"
              >
                Muat ulang
              </button> */}
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)] transition hover:border-[var(--color-primary-light)] hover:bg-white/60"
              >
                Ekspor CSV
              </button>
            </div>
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {summaryCards.map((card) => {
              const isActive =
                filters.room === card.room ||
                (card.room === "ALL" && filters.room === "ALL");
              const detail =
                card.room === "ALL"
                  ? DEFAULT_ROOM_DETAIL
                  : getRoomDetail(card.room);
              const accent = detail.accent;
              const IconComponent = detail.Icon;
              return (
                <div
                  key={card.room}
                  className={`rounded-2xl border px-4 py-4 transition ${
                    isActive ? "shadow-lg" : "shadow-sm"
                  }`}
                  style={{
                    borderColor: isActive ? detail.accent : detail.border,
                    backgroundColor: isActive
                      ? "rgba(255,255,255,0.96)"
                      : "rgba(255,255,255,0.88)",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full border"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.9)",
                          borderColor: detail.border,
                          color: accent,
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
                      style={{ color: accent }}
                    >
                      {card.count} sesi
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span
                      className="text-2xl font-semibold"
                      style={{
                        color: isActive ? accent : "var(--color-primary)",
                      }}
                    >
                      {card.totalHours.toLocaleString("id-ID")} jam
                    </span>
                    <span className="text-xs uppercase tracking-widest text-[color:var(--color-muted)]">
                      total durasi
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FilterGroup label="Cari nama pelanggan / kasir / catatan">
              <input
                type="search"
                value={filters.search}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    search: event.target.value,
                  }))
                }
                placeholder="Ketik kata kunci…"
                className="rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-2.5 text-sm text-[var(--color-primary)] outline-none transition focus:border-[var(--color-primary-light)] focus:ring-2 focus:ring-[rgba(12,29,74,0.16)]"
              />
            </FilterGroup>
            <FilterGroup label="Tanggal sesi">
              <DateFilter
                value={filters.date}
                onChange={(dateValue) =>
                  setFilters((prev) => ({ ...prev, date: dateValue }))
                }
              />
            </FilterGroup>
            <FilterGroup label=" ">
              <button
                type="button"
                onClick={() =>
                  setFilters({ search: "", room: "ALL", date: "" })
                }
                className="rounded-2xl border border-[color:var(--color-border)] px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)] transition hover:border-[var(--color-primary-light)] hover:bg-white"
              >
                Reset filter
              </button>
            </FilterGroup>
          </div>

          <div className="mb-6">
            <div className="grid gap-2 rounded-3xl border border-[color:var(--color-border)] bg-white/80 p-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {ROOM_SEGMENTS.map((segment) => {
                const isActive = filters.room === segment;
                const summary =
                  segment === "ALL"
                    ? roomSummaries.all
                    : roomSummaries.rooms.find((item) => item.room === segment);
                const detail =
                  segment === "ALL"
                    ? DEFAULT_ROOM_DETAIL
                    : getRoomDetail(segment);
                return (
                  <button
                    key={segment}
                    type="button"
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, room: segment }))
                    }
                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-2.5 transition focus:outline-none ${
                      isActive
                        ? "border-transparent text-white shadow-md"
                        : "text-[var(--color-primary)]"
                    }`}
                    style={{
                      borderColor: isActive ? "transparent" : detail.border,
                      backgroundColor: isActive
                        ? detail.accent
                        : "rgba(255,255,255,0.92)",
                    }}
                  >
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold uppercase"
                      style={{
                        backgroundColor: isActive
                          ? "rgba(255,255,255,0.2)"
                          : detail.badgeBg,
                        borderColor: isActive
                          ? "rgba(255,255,255,0.35)"
                          : detail.border,
                        color: isActive ? "#fff" : detail.badgeText,
                      }}
                    >
                      {detail.short}
                    </span>
                    <span className="flex flex-col leading-tight">
                      <span className="text-xs font-semibold uppercase tracking-widest">
                        {segment === "ALL" ? "Semua ruangan" : segment}
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          isActive
                            ? "text-white"
                            : "text-[color:var(--color-muted)]"
                        }`}
                      >
                        {(summary?.count ?? 0).toLocaleString("id-ID")} sesi
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {bookingsLoading ? (
            <div className="flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-[color:var(--color-border)] bg-white/60 text-sm text-[color:var(--color-muted)]">
              Mengambil data sesi…
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="flex h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-[color:var(--color-border)] bg-white/60 text-center text-sm text-[color:var(--color-muted)]">
              <span>Data tidak ditemukan.</span>
              <span>Sesuaikan filter atau tambahkan sesi baru.</span>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-2xl border border-[color:var(--color-border)] bg-white shadow-inner md:block">
              <table className="min-w-full divide-y divide-[color:var(--color-border)]">
                <thead className="bg-[var(--color-primary)] text-left text-xs font-semibold uppercase tracking-widest text-white">
                  <tr>
                    <th className="px-4 py-3">No</th>
                    <th className="px-4 py-3">Pelanggan</th>
                    <th className="px-4 py-3">Ruangan</th>
                    <th className="px-4 py-3">Kasir</th>
                    <th className="px-4 py-3">Mulai</th>
                    <th className="px-4 py-3">Selesai</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="px-4 py-3">Catatan</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                {groupedBookings.map((group) => {
                  const detail = getRoomDetail(group.room);
                  const IconComponent = detail.Icon;
                  const totalGroupHours = group.bookings.reduce(
                    (sum, booking) => sum + resolveQtyFromBooking(booking),
                    0
                  );
                  return (
                    <tbody
                      key={group.room}
                      className="text-sm text-[var(--color-primary)]"
                    >
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-3"
                          style={{
                            backgroundColor: detail.rowBg,
                            borderLeft: `4px solid ${detail.accent}`,
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-3 font-semibold">
                              <span
                                className="flex h-9 w-9 items-center justify-center rounded-full border text-sm uppercase"
                                style={{
                                  backgroundColor: detail.badgeBg,
                                  borderColor: detail.border,
                                  color: detail.badgeText,
                                }}
                              >
                                {detail.short}
                              </span>
                              <span>{group.room}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs uppercase tracking-widest">
                              <span style={{ color: detail.accent }}>
                                {group.bookings.length} sesi
                              </span>
                              <span className="text-[color:var(--color-muted)]">
                                {totalGroupHours.toLocaleString("id-ID")} jam
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                      {group.bookings.map((booking) => {
                        const rowNumber = ++rowCounter;
                        const qty = resolveQtyFromBooking(booking);
                        const rowBackground = detail.rowBg;
                        const rowAccent = detail.accent;
                        const badgeStyles = {
                          backgroundColor: detail.badgeBg,
                          color: detail.badgeText,
                          border: `1px solid ${detail.border}`,
                        };
                        const catatanContent = booking.catatan ? (
                          <p className="max-w-xs text-sm">{booking.catatan}</p>
                        ) : (
                          <span className="text-xs text-[color:var(--color-muted)]">
                            —
                          </span>
                        );
                        return (
                          <tr
                            key={booking.id}
                            className="border-t border-transparent transition hover:bg-white/70"
                            style={{
                              backgroundColor: rowBackground,
                              borderLeft: `4px solid ${rowAccent}`,
                            }}
                          >
                            <td className="px-4 py-3 align-top text-xs font-semibold uppercase tracking-widest text-[color:var(--color-muted)]">
                              {rowNumber}
                            </td>
                            <td className="px-4 py-3 align-top">
                              <p className="font-semibold">
                                {booking.nama_pelanggan}
                              </p>
                              <p className="text-xs text-[color:var(--color-muted)]">
                                {booking.no_hp
                                  ? `HP: ${booking.no_hp}`
                                  : "HP: —"}
                              </p>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <span
                                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest"
                                style={badgeStyles}
                              >
                                <IconComponent width={16} height={16} />
                                {booking.room}
                              </span>
                            </td>
                            <td className="px-4 py-3 align-top">
                              {booking.nama_kasir}
                            </td>
                            <td className="px-4 py-3 align-top">
                              {toDisplayDate(booking.waktu_mulai)}
                            </td>
                            <td className="px-4 py-3 align-top">
                              {toDisplayDate(booking.waktu_selesai)}
                            </td>
                            <td className="px-4 py-3 align-top">
                              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">
                                {qty} jam
                              </span>
                            </td>
                            <td className="px-4 py-3 align-top">
                              {catatanContent}
                            </td>
                            <td className="px-4 py-3 align-top text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEdit(booking)}
                                  className="inline-flex items-center justify-center rounded-full border border-[var(--color-primary)] px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white"
                                >
                                  Ubah
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(booking.id)}
                                  className="inline-flex items-center justify-center rounded-full border border-transparent bg-[var(--color-accent)] px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-[#c82636]"
                                >
                                  Hapus
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  );
                })}
              </table>
              </div>
              <div className="space-y-4 md:hidden">
                {groupedBookings.map((group) => {
                  const detail = getRoomDetail(group.room);
                  const IconComponent = detail.Icon;
                  return (
                    <section
                      key={`mobile-${group.room}`}
                      className="rounded-2xl border border-[color:var(--color-border)] bg-white/95 p-4 shadow-md"
                    >
                      <div className="mb-3 flex items-center justify-between border-b border-[color:var(--color-border)] pb-2">
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-10 w-10 items-center justify-center rounded-lg border bg-white"
                            style={{
                              borderColor: detail.border,
                              color: detail.accent,
                            }}
                          >
                            <IconComponent width={18} height={18} />
                          </span>
                          <div className="flex flex-col">
                            <span className="text-base font-semibold text-[var(--color-primary)]">
                              {group.room}
                            </span>
                            <span className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-muted)]">
                              {group.bookings.length} sesi ·{" "}
                              {group.bookings
                                .reduce((acc, booking) => acc + resolveQtyFromBooking(booking), 0)
                                .toLocaleString("id-ID")}{" "}
                              jam
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {group.bookings.map((booking) => {
                          const qty = resolveQtyFromBooking(booking);
                          return (
                            <article
                              key={`mobile-card-${booking.id}`}
                              className="rounded-xl border border-[color:var(--color-border)] bg-white p-4 shadow-sm transition hover:shadow-md"
                            >
                              <div className="mb-3 flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold text-[var(--color-primary)]">
                                    {booking.nama_pelanggan}
                                  </p>
                                  <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-muted)]">
                                    {booking.nama_kasir}
                                  </p>
                                </div>
                                <span className="rounded-full bg-[var(--color-accent)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--color-accent)]">
                                  {qty} jam
                                </span>
                              </div>
                              <dl className="grid grid-cols-2 gap-2 text-xs text-[color:var(--color-muted)]">
                                <div>
                                  <dt>Mulai</dt>
                                  <dd className="font-semibold text-[var(--color-primary)]">
                                    {toDisplayDate(booking.waktu_mulai)}
                                  </dd>
                                </div>
                                <div>
                                  <dt>Selesai</dt>
                                  <dd className="font-semibold text-[var(--color-primary)]">
                                    {toDisplayDate(booking.waktu_selesai)}
                                  </dd>
                                </div>
                                <div>
                                  <dt>No HP</dt>
                                  <dd className="font-semibold text-[var(--color-primary)]">
                                    {booking.no_hp ? booking.no_hp : "—"}
                                  </dd>
                                </div>
                                <div>
                                  <dt>Ruangan</dt>
                                  <dd className="font-semibold text-[var(--color-primary)]">
                                    {booking.room}
                                  </dd>
                                </div>
                              </dl>
                              {booking.catatan ? (
                                <p className="mt-2 rounded-lg bg-[var(--color-primary)]/6 px-3 py-2 text-xs text-[var(--color-primary)]">
                                  {booking.catatan}
                                </p>
                              ) : null}
                              <div className="mt-3 flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEdit(booking)}
                                  className="inline-flex items-center justify-center rounded-full border border-[var(--color-primary)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white"
                                >
                                  Ubah
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(booking.id)}
                                  className="inline-flex items-center justify-center rounded-full border border-transparent bg-[var(--color-accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-[#c82636]"
                                >
                                  Hapus
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </>
          )}

          {editing ? (
            <div className="fixed inset-0 z-40 flex items-center justify-center px-4 py-8">
              <div
                className="absolute inset-0 bg-black/45 backdrop-blur-sm"
                aria-hidden="true"
                onClick={cancelEdit}
              />
              <form
                onSubmit={handleUpdate}
                className="relative z-50 w-full max-w-4xl space-y-4 overflow-y-auto rounded-3xl border border-[color:var(--color-border)] bg-white/98 px-6 py-6 shadow-[0_24px_60px_rgba(12,29,74,0.18)] backdrop-blur-md md:px-8"
                onClick={(event) => event.stopPropagation()}
              >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
                  className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)] transition hover:text-[#a91020]"
                >
                  Batal
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                <Field
                  id="edit-namaKasir"
                  label="Nama kasir"
                  value={editing.namaKasir}
                  onChange={(value) =>
                    setEditing((prev) =>
                      prev ? { ...prev, namaKasir: value } : prev
                    )
                  }
                  required
                  wrapperClassName="lg:col-span-3"
                />
                <Field
                  id="edit-namaPelanggan"
                  label="Nama pelanggan"
                  value={editing.namaPelanggan}
                  onChange={(value) =>
                    setEditing((prev) =>
                      prev ? { ...prev, namaPelanggan: value } : prev
                    )
                  }
                  required
                  wrapperClassName="lg:col-span-3"
                />
                <Field
                  id="edit-noHp"
                  label="No HP pelanggan"
                  value={editing.noHp}
                  onChange={(value) =>
                    setEditing((prev) =>
                      prev ? { ...prev, noHp: value } : prev
                    )
                  }
                  wrapperClassName="lg:col-span-3"
                  placeholder="08xxxxxxxxxx"
                />
                <Field
                  id="edit-qty"
                  label="Qty jam"
                  type="number"
                  min="1"
                  step="1"
                  value={editing.qtyJam}
                  onChange={handleEditingQtyChange}
                  wrapperClassName="lg:col-span-3"
                />
                <RoomSelect
                  value={editing.room}
                  onChange={(room) =>
                    setEditing((prev) => (prev ? { ...prev, room } : prev))
                  }
                  wrapperClassName="lg:col-span-4"
                  label="Bilik / Room"
                />
                <TimeField
                  id="edit-waktuMulai"
                  label="Waktu mulai"
                  value={editing.waktuMulai}
                  onChange={handleEditingStartChange}
                  max="22:00"
                  wrapperClassName="lg:col-span-4"
                  description="Jam 24 jam (WIB)."
                />
                <TimeField
                  id="edit-waktuSelesai"
                  label="Waktu selesai"
                  value={editing.waktuSelesai}
                  onChange={handleEditingEndChange}
                  min={nextHourString(editing.waktuMulai)}
                  wrapperClassName="lg:col-span-4"
                  description="Sesuaikan apabila durasi perlu ditambah."
                />
                <div className="flex flex-col gap-2 lg:col-span-12">
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
                    onChange={(event) =>
                      setEditing((prev) =>
                        prev ? { ...prev, catatan: event.target.value } : prev
                      )
                    }
                    className="resize-none rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-2 text-sm text-[var(--color-primary)] outline-none transition focus:border-[var(--color-primary-light)] focus:ring-2 focus:ring-[rgba(12,29,74,0.16)]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={editingLoading}
                  className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-white shadow-md transition hover:bg-[var(--color-primary-light)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editingLoading ? "Memperbarui…" : "Simpan perubahan"}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)] transition hover:border-[var(--color-primary-light)] hover:bg-white"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  required = false,
  placeholder,
  type = "text",
  wrapperClassName = "",
  leadingIcon,
  description,
  ...rest
}) {
  return (
    <div className={`flex flex-col gap-2 ${wrapperClassName}`}>
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]"
      >
        {label}
      </label>
      <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-3 transition focus-within:border-[var(--color-primary-light)] focus-within:ring-2 focus-within:ring-[rgba(12,29,74,0.16)]">
        {leadingIcon ? (
          <span className="text-[color:var(--color-muted)]">{leadingIcon}</span>
        ) : null}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          placeholder={placeholder}
          className="w-full border-none bg-transparent text-sm font-medium text-[var(--color-primary)] outline-none"
          {...rest}
        />
      </div>
      {description ? (
        <p className="pl-1 text-xs text-[color:var(--color-muted)]">{description}</p>
      ) : null}
    </div>
  );
}

function TimeField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  wrapperClassName = "",
  description,
}) {
  const minHour = min ? Number.parseInt(min.split(":")[0], 10) : 0;
  const maxHour = max ? Number.parseInt(max.split(":")[0], 10) : 23;
  const normalizedMin = Number.isNaN(minHour) ? 0 : Math.max(0, minHour);
  const normalizedMax = Number.isNaN(maxHour) ? 23 : Math.min(23, maxHour);
  const hours = [];
  for (let hour = normalizedMin; hour <= normalizedMax; hour += 1) {
    hours.push(`${pad(hour)}:00`);
  }
  const options = hours.length ? hours : [ensureHourString(value)];
  const normalizedValue = ensureHourString(value);
  const safeValue = options.includes(normalizedValue)
    ? normalizedValue
    : options[0];

  return (
    <div className={`flex flex-col gap-2 ${wrapperClassName}`}>
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]"
      >
        {label}
      </label>
      <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-3 transition focus-within:border-[var(--color-primary-light)] focus-within:ring-2 focus-within:ring-[rgba(12,29,74,0.16)]">
        <span className="text-lg text-[color:var(--color-muted)]">🕒</span>
        <select
          id={id}
          value={safeValue}
          onChange={(event) => onChange(ensureHourString(event.target.value))}
          className="w-full border-none bg-transparent text-sm font-medium text-[var(--color-primary)] outline-none"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      {description ? (
        <p className="pl-1 text-xs text-[color:var(--color-muted)]">{description}</p>
      ) : null}
    </div>
  );
}

function FilterGroup({ label, children }) {
  const hasLabel = label && label.trim().length > 0;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="h-[1.25rem] text-[10px] font-semibold uppercase tracking-[0.35em] text-[color:var(--color-muted)]">
        {hasLabel ? label : ""}
      </span>
      {children}
    </div>
  );
}

function DateFilter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => fromInputDate(value), [value]);
  const [viewDate, setViewDate] = useState(() => selectedDate ?? new Date());
  const containerRef = useRef(null);

  useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open]);

  const days = useMemo(() => getCalendarDays(viewDate), [viewDate]);
  const monthLabel = viewDate.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
  const selectedKey = selectedDate ? toInputDateString(selectedDate) : "";
  const todayKey = toInputDateString(new Date());

  const handleSelect = (date) => {
    onChange(toInputDateString(date));
    setOpen(false);
  };

  const clearDate = () => {
    onChange("");
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-2.5 text-left text-sm text-[var(--color-primary)] outline-none transition focus:border-[var(--color-primary-light)] focus:ring-2 focus:ring-[rgba(12,29,74,0.16)]"
      >
        <span>
          {selectedDate
            ? selectedDate.toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "Semua tanggal"}
        </span>
        <span className="text-xs uppercase tracking-widest text-[color:var(--color-muted)]">
          {open ? "Tutup" : "Pilih"}
        </span>
      </button>

      {open ? (
        <div className="absolute z-20 mt-2 w-full min-w-[260px] max-w-[280px] rounded-3xl border border-[color:var(--color-border)] bg-white/95 p-4 shadow-2xl backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewDate((prev) => addMonths(prev, -1))}
              className="rounded-full border border-[color:var(--color-border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)] transition hover:border-[var(--color-primary-light)] hover:text-[var(--color-primary)]"
            >
              &lt;
            </button>
            <div className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--color-primary)]">
              {monthLabel}
            </div>
            <button
              type="button"
              onClick={() => setViewDate((prev) => addMonths(prev, 1))}
              className="rounded-full border border-[color:var(--color-border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)] transition hover:border-[var(--color-primary-light)] hover:text-[var(--color-primary)]"
            >
              &gt;
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--color-muted)]">
            {DAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1 text-sm">
            {days.map((date) => {
              const key = toInputDateString(date);
              const isSameMonth = date.getMonth() === viewDate.getMonth();
              const isSelected = key === selectedKey;
              const isToday = key === todayKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelect(date)}
                  className={`flex h-9 w-full items-center justify-center rounded-full border text-sm font-medium transition ${
                    isSelected
                      ? "border-transparent bg-[var(--color-primary)] text-white shadow-md"
                      : isToday
                      ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                      : "border-transparent text-[var(--color-primary)] hover:border-[var(--color-primary-light)] hover:bg-[var(--color-primary)]/8"
                  } ${isSameMonth ? "" : "opacity-50"}`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                onChange(toInputDateString(today));
                setViewDate(today);
                setOpen(false);
              }}
              className="rounded-full border border-[color:var(--color-border)] px-3 py-1 font-semibold uppercase tracking-[0.3em] text-[var(--color-primary)] transition hover:border-[var(--color-primary-light)] hover:bg-white"
            >
              Hari ini
            </button>
            <button
              type="button"
              onClick={clearDate}
              className="rounded-full border border-transparent bg-[var(--color-accent)] px-3 py-1 font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-[#c82636]"
            >
              Kosongkan
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RoomSelect({ value, onChange, wrapperClassName = "", label = "Bilik / Room" }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const selectedDetail = getRoomDetail(value);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className={`relative flex flex-col gap-2 ${wrapperClassName}`} ref={containerRef}>
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        {label}
      </span>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center justify-between gap-6 rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-3 text-left transition focus:outline-none focus:border-[var(--color-primary-light)] focus:ring-2 focus:ring-[rgba(12,29,74,0.16)]"
      >
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl border"
            style={{
              backgroundColor: selectedDetail.badgeBg,
              borderColor: selectedDetail.border,
              color: selectedDetail.accent,
            }}
          >
            <selectedDetail.Icon width={18} height={18} />
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[var(--color-primary)]">{value}</span>
            <span
              className="text-[11px] uppercase tracking-widest"
              style={{ color: selectedDetail.accent }}
            >
              Kode {selectedDetail.short}
            </span>
          </div>
        </div>
        <span className="text-xs font-semibold uppercase tracking-widest text-[color:var(--color-muted)]">
          {open ? "Tutup" : "Pilih"}
        </span>
      </button>
      {open ? (
        <div className="absolute z-30 mt-2 w-full min-w-[240px] rounded-3xl border border-[color:var(--color-border)] bg-white/95 p-3 shadow-2xl backdrop-blur">
          <div className="space-y-2">
            {ROOM_OPTIONS.map((room) => {
              const detail = getRoomDetail(room);
              const isActive = room === value;
              return (
                <button
                  type="button"
                  key={room}
                  onClick={() => {
                    onChange(room);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-transparent bg-[var(--color-primary)] text-white shadow-md"
                      : "border-[color:var(--color-border)] hover:border-[var(--color-primary-light)] hover:bg-[var(--color-primary)]/6"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-xl border bg-white"
                      style={{
                        borderColor: detail.border,
                        color: detail.accent,
                      }}
                    >
                      <detail.Icon width={16} height={16} />
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{room}</span>
                      <span className="text-[11px] uppercase tracking-widest">
                        Kode {detail.short}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.3em]">
                    {isActive ? "Dipilih" : detail.short}
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
