import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  Car,
  Loader2,
  Calendar,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDealership } from "@/hooks/useDealership";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/* ── Event type config ── */
const eventTypes: Record<
  string,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  visita: {
    label: "Visita",
    color: "text-blue-400",
    bg: "bg-blue-500/[0.08]",
    border: "border-blue-500/20",
    dot: "bg-blue-400",
  },
  test_drive: {
    label: "Test Drive",
    color: "text-teal-400",
    bg: "bg-teal-500/[0.08]",
    border: "border-teal-500/20",
    dot: "bg-teal-400",
  },
  retorno: {
    label: "Retorno",
    color: "text-amber-400",
    bg: "bg-amber-500/[0.08]",
    border: "border-amber-500/20",
    dot: "bg-amber-400",
  },
  entrega: {
    label: "Entrega",
    color: "text-emerald-400",
    bg: "bg-emerald-500/[0.08]",
    border: "border-emerald-500/20",
    dot: "bg-emerald-400",
  },
};

const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const daysOfWeekFull = [
  "Domingo",
  "Segunda",
  "Terca",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sabado",
];

const inputClass =
  "bg-transparent border-0 border-b border-white/[0.06] rounded-none h-11 text-[13px] text-white/70 placeholder:text-white/45 px-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300";

/* ══════════════════════════════════════════════════════════════ */

const CalendarPage = () => {
  const { dealershipId } = useDealership();
  const [view, setView] = useState<"day" | "week" | "month">("month");
  const [weekOffset, setWeekOffset] = useState(0);
  const [dayOffset, setDayOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const today = new Date();
  const [openModal, setOpenModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    type: "visita" as "visita" | "test_drive" | "retorno" | "entrega",
    scheduled_at: "",
    notes: "",
  });

  const baseDate = new Date(today);
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - baseDate.getDay() + i);
    return d;
  });

  // Day view
  const currentDay = new Date(today);
  currentDay.setDate(today.getDate() + dayOffset);

  // Month view
  const currentMonth = new Date(
    today.getFullYear(),
    today.getMonth() + monthOffset,
    1
  );
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();
  const firstDayOfMonth = currentMonth.getDay();
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
    return new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      i + 1
    );
  });

  // Previous month trailing days
  const prevMonthDays = useMemo(() => {
    if (firstDayOfMonth === 0) return [];
    const prevMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      0
    );
    const prevDaysInMonth = prevMonth.getDate();
    return Array.from({ length: firstDayOfMonth }, (_, i) => {
      return new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() - 1,
        prevDaysInMonth - firstDayOfMonth + 1 + i
      );
    });
  }, [currentMonth, firstDayOfMonth]);

  // Next month trailing days
  const nextMonthDays = useMemo(() => {
    const totalCells = prevMonthDays.length + monthDays.length;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    return Array.from({ length: remaining }, (_, i) => {
      return new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        i + 1
      );
    });
  }, [prevMonthDays, monthDays, currentMonth]);

  const queryStart = useMemo(() => {
    if (view === "day") {
      const d = new Date(currentDay);
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }
    if (view === "month") {
      const d = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1
      );
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }
    return weekDays[0].toISOString();
  }, [view, dayOffset, weekOffset, monthOffset]);

  const queryEnd = useMemo(() => {
    if (view === "day") {
      const d = new Date(currentDay);
      d.setHours(23, 59, 59, 999);
      return d.toISOString();
    }
    if (view === "month") {
      const d = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0
      );
      d.setHours(23, 59, 59, 999);
      return d.toISOString();
    }
    const end = new Date(weekDays[6]);
    end.setHours(23, 59, 59);
    return end.toISOString();
  }, [view, dayOffset, weekOffset, monthOffset]);

  const { data: appointments, isLoading } = useQuery({
    queryKey: [
      "appointments",
      dealershipId,
      view,
      weekOffset,
      dayOffset,
      monthOffset,
    ],
    queryFn: async () => {
      if (!dealershipId) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select(
          "*, lead:leads(name), vehicle:vehicles(brand, model), vendor:profiles!appointments_vendor_id_fkey(full_name)"
        )
        .eq("dealership_id", dealershipId)
        .gte("scheduled_at", queryStart)
        .lte("scheduled_at", queryEnd)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!dealershipId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!dealershipId) throw new Error("Sem dealership");
      if (!form.scheduled_at) throw new Error("Informe data e hora");
      const { error } = await supabase.from("appointments").insert({
        dealership_id: dealershipId,
        title: form.title || null,
        type: form.type,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["appointments", dealershipId],
      });
      toast({ title: "Evento criado com sucesso!" });
      setOpenModal(false);
      setForm({ title: "", type: "visita", scheduled_at: "", notes: "" });
    },
    onError: (err: any) => {
      toast({
        title: "Erro ao criar evento",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const getEventsForDay = (date: Date) =>
    (appointments ?? []).filter((a) => {
      const d = new Date(a.scheduled_at);
      return d.toDateString() === date.toDateString();
    });

  const todayEvents = getEventsForDay(today);

  const navigate = (dir: -1 | 1) => {
    if (view === "week") setWeekOffset((o) => o + dir);
    else if (view === "day") setDayOffset((o) => o + dir);
    else setMonthOffset((o) => o + dir);
  };

  const goToday = () => {
    setDayOffset(0);
    setWeekOffset(0);
    setMonthOffset(0);
  };

  const headerLabel = useMemo(() => {
    if (view === "day") {
      return currentDay.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    if (view === "month") {
      return currentMonth.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });
    }
    const start = weekDays[0];
    const end = weekDays[6];
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} - ${end.getDate()} de ${start.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`;
    }
    return `${start.getDate()} ${start.toLocaleDateString("pt-BR", { month: "short" })} - ${end.getDate()} ${end.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}`;
  }, [view, currentDay, currentMonth, weekDays]);

  const isNotToday =
    dayOffset !== 0 || weekOffset !== 0 || monthOffset !== 0;

  /* ── Event Card (reusable) ── */
  const EventCard = ({
    ev,
    compact = false,
  }: {
    ev: any;
    compact?: boolean;
  }) => {
    const evType = eventTypes[ev.type] ?? eventTypes.visita;
    const time = new Date(ev.scheduled_at).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (compact) {
      return (
        <div
          className={`px-1.5 py-1 rounded-md text-[10px] truncate ${evType.bg} ${evType.color} border ${evType.border} cursor-pointer hover:opacity-80 transition-opacity`}
        >
          <span className="font-medium">{time}</span>{" "}
          <span className="opacity-70">
            {ev.title ?? (ev.lead as any)?.name ?? evType.label}
          </span>
        </div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        className={`group relative flex items-start gap-4 p-4 rounded-xl border ${evType.border} ${evType.bg} hover:border-white/[0.1] transition-all duration-300 cursor-pointer`}
      >
        {/* Time column */}
        <div className="w-14 shrink-0 text-center pt-0.5">
          <p className="text-[18px] font-light tracking-tight text-white/80">
            {time.split(":")[0]}
          </p>
          <p className="text-[11px] text-white/55">:{time.split(":")[1]}</p>
        </div>

        {/* Divider */}
        <div
          className={`w-[2px] self-stretch rounded-full ${evType.dot} opacity-40`}
        />

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-normal text-white/80 truncate">
              {ev.title ?? (ev.lead as any)?.name ?? "--"}
            </span>
            <span
              className={`text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 rounded-full ${evType.bg} ${evType.color} border ${evType.border}`}
            >
              {evType.label}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-white/60">
            {(ev.vehicle as any) && (
              <span className="flex items-center gap-1.5">
                <Car className="w-3 h-3" />
                {(ev.vehicle as any).brand} {(ev.vehicle as any).model}
              </span>
            )}
            {(ev.vendor as any) && (
              <span className="flex items-center gap-1.5">
                <User className="w-3 h-3" />
                {(ev.vendor as any).full_name}
              </span>
            )}
          </div>
          {ev.notes && (
            <p className="text-[11px] text-white/45 truncate">{ev.notes}</p>
          )}
        </div>
      </motion.div>
    );
  };

  /* ══════════════════════════════════════════════════════ */
  /* ── RENDER ── */
  /* ══════════════════════════════════════════════════════ */

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-[22px] font-light tracking-tight text-white/90">
            Agenda
          </h1>
          <p className="text-[13px] text-white/60 mt-1">
            {todayEvents.length > 0
              ? `${todayEvents.length} evento${todayEvents.length > 1 ? "s" : ""} hoje`
              : "Sem eventos hoje"}
          </p>
        </div>
        <button
          onClick={() => setOpenModal(true)}
          className="flex items-center gap-2 px-5 h-10 rounded-lg text-[13px] tracking-wide text-white/70 bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] hover:text-white/90 hover:border-white/[0.15] transition-all duration-300 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Novo Evento
        </button>
      </motion.div>

      {/* ── Navigation bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.5 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        {/* Left: Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white/70 hover:bg-white/[0.04] transition-all duration-300 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate(1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white/70 hover:bg-white/[0.04] transition-all duration-300 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-[15px] font-normal text-white/70 capitalize">
            {headerLabel}
          </h2>

          {isNotToday && (
            <button
              onClick={goToday}
              className="text-[11px] text-white/55 hover:text-white/60 tracking-wider uppercase transition-colors duration-300 cursor-pointer ml-2"
            >
              Hoje
            </button>
          )}
        </div>

        {/* Right: View switcher */}
        <div className="flex items-center rounded-lg border border-white/[0.06] overflow-hidden">
          {(["day", "week", "month"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 text-[12px] tracking-wide transition-all duration-300 cursor-pointer ${
                view === v
                  ? "bg-white/[0.06] text-white/80"
                  : "text-white/55 hover:text-white/55 hover:bg-white/[0.02]"
              }`}
            >
              {v === "day" ? "Dia" : v === "week" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Legend ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-5"
      >
        {Object.entries(eventTypes).map(([key, { label, dot }]) => (
          <div
            key={key}
            className="flex items-center gap-2 text-[11px] text-white/60"
          >
            <div className={`w-2 h-2 rounded-full ${dot}`} />
            {label}
          </div>
        ))}
      </motion.div>

      {/* ── Calendar Views ── */}
      {isLoading ? (
        <Skeleton className="h-[500px] w-full bg-white/[0.02] rounded-xl" />
      ) : (
        <AnimatePresence mode="wait">
          {view === "month" && (
            <motion.div
              key="month"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="rounded-xl border border-white/[0.04] overflow-hidden"
            >
              {/* Weekday header */}
              <div className="grid grid-cols-7 border-b border-white/[0.04]">
                {daysOfWeek.map((d, i) => (
                  <div
                    key={d}
                    className={`py-3 text-center text-[10px] tracking-[0.12em] uppercase font-normal ${
                      i === 0 || i === 6
                        ? "text-white/45"
                        : "text-white/60"
                    }`}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {/* Previous month days */}
                {prevMonthDays.map((d, i) => (
                  <div
                    key={`prev-${i}`}
                    className="min-h-[100px] p-2 border-r border-b border-white/[0.03] last:border-r-0"
                  >
                    <span className="text-[12px] text-white/15 font-light">
                      {d.getDate()}
                    </span>
                  </div>
                ))}

                {/* Current month days */}
                {monthDays.map((d, i) => {
                  const isToday = d.toDateString() === today.toDateString();
                  const isSelected =
                    selectedDay &&
                    d.toDateString() === selectedDay.toDateString();
                  const dayEvs = getEventsForDay(d);
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                  return (
                    <div
                      key={i}
                      onClick={() => {
                        setSelectedDay(d);
                        setView("day");
                        setDayOffset(
                          Math.round(
                            (d.getTime() - today.getTime()) / 86400000
                          )
                        );
                      }}
                      className={`min-h-[100px] p-2 border-r border-b border-white/[0.03] last:border-r-0 transition-all duration-300 cursor-pointer group ${
                        isToday
                          ? "bg-white/[0.02]"
                          : isSelected
                            ? "bg-white/[0.015]"
                            : "hover:bg-white/[0.015]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`w-7 h-7 flex items-center justify-center rounded-full text-[12px] font-light transition-all duration-300 ${
                            isToday
                              ? "bg-primary text-white"
                              : isWeekend
                                ? "text-white/45 group-hover:text-white/60"
                                : "text-white/50 group-hover:text-white/70"
                          }`}
                        >
                          {d.getDate()}
                        </span>
                        {dayEvs.length > 0 && !isToday && (
                          <span className="text-[9px] text-white/45">
                            {dayEvs.length}
                          </span>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        {dayEvs.slice(0, 3).map((ev) => {
                          const evType =
                            eventTypes[ev.type] ?? eventTypes.visita;
                          return (
                            <EventCard key={ev.id} ev={ev} compact />
                          );
                        })}
                        {dayEvs.length > 3 && (
                          <p className="text-[9px] text-white/45 pl-1.5">
                            +{dayEvs.length - 3} mais
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Next month days */}
                {nextMonthDays.map((d, i) => (
                  <div
                    key={`next-${i}`}
                    className="min-h-[100px] p-2 border-r border-b border-white/[0.03] last:border-r-0"
                  >
                    <span className="text-[12px] text-white/15 font-light">
                      {d.getDate()}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {view === "week" && (
            <motion.div
              key="week"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="rounded-xl border border-white/[0.04] overflow-hidden"
            >
              {/* Week header */}
              <div className="grid grid-cols-7 border-b border-white/[0.04]">
                {weekDays.map((d, i) => {
                  const isToday = d.toDateString() === today.toDateString();
                  const dayEvs = getEventsForDay(d);
                  return (
                    <div
                      key={i}
                      className={`p-4 text-center border-r border-white/[0.03] last:border-r-0 transition-all duration-300 cursor-pointer hover:bg-white/[0.02] ${
                        isToday ? "bg-white/[0.02]" : ""
                      }`}
                      onClick={() => {
                        setView("day");
                        setDayOffset(
                          Math.round(
                            (d.getTime() - today.getTime()) / 86400000
                          )
                        );
                      }}
                    >
                      <p className="text-[10px] tracking-[0.1em] uppercase text-white/55">
                        {daysOfWeek[i]}
                      </p>
                      <p
                        className={`text-[20px] font-light mt-1 ${
                          isToday ? "text-primary" : "text-white/60"
                        }`}
                      >
                        {d.getDate()}
                      </p>
                      {dayEvs.length > 0 && (
                        <div className="flex items-center justify-center gap-1 mt-2">
                          {dayEvs.slice(0, 4).map((ev) => {
                            const evType =
                              eventTypes[ev.type] ?? eventTypes.visita;
                            return (
                              <div
                                key={ev.id}
                                className={`w-1.5 h-1.5 rounded-full ${evType.dot}`}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Week content */}
              <div className="grid grid-cols-7 min-h-[420px]">
                {weekDays.map((d, i) => {
                  const isToday = d.toDateString() === today.toDateString();
                  const dayEvents = getEventsForDay(d);
                  return (
                    <div
                      key={i}
                      className={`p-2 border-r border-white/[0.03] last:border-r-0 space-y-1.5 ${
                        isToday ? "bg-white/[0.01]" : ""
                      }`}
                    >
                      {dayEvents.map((ev) => {
                        const evType =
                          eventTypes[ev.type] ?? eventTypes.visita;
                        const time = new Date(
                          ev.scheduled_at
                        ).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        return (
                          <motion.div
                            key={ev.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`rounded-lg p-2.5 cursor-pointer transition-all duration-300 ${evType.bg} border ${evType.border} hover:border-white/[0.1]`}
                          >
                            <p
                              className={`text-[10px] font-medium truncate ${evType.color}`}
                            >
                              {ev.title ??
                                (ev.lead as any)?.name ??
                                evType.label}
                            </p>
                            <p className="text-[9px] text-white/55 flex items-center gap-1 mt-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {time}
                            </p>
                          </motion.div>
                        );
                      })}
                      {dayEvents.length === 0 && (
                        <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <Plus className="w-3.5 h-3.5 text-white/15" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {view === "day" && (
            <motion.div
              key="day"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Day header card */}
              <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-white/[0.04] flex items-center justify-center">
                    <span className="text-[22px] font-light text-white/70">
                      {currentDay.getDate()}
                    </span>
                  </div>
                  <div>
                    <p className="text-[14px] text-white/70 capitalize">
                      {daysOfWeekFull[currentDay.getDay()]}
                    </p>
                    <p className="text-[11px] text-white/55 capitalize mt-0.5">
                      {currentDay.toLocaleDateString("pt-BR", {
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-[28px] font-light text-white/80">
                      {getEventsForDay(currentDay).length}
                    </p>
                    <p className="text-[10px] text-white/55 tracking-[0.1em] uppercase">
                      Eventos
                    </p>
                  </div>
                </div>
              </div>

              {/* Events list */}
              {getEventsForDay(currentDay).length === 0 ? (
                <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-16 text-center">
                  <Calendar className="w-8 h-8 text-white/10 mx-auto mb-4" />
                  <p className="text-[13px] text-white/50">
                    Nenhum evento neste dia
                  </p>
                  <button
                    onClick={() => setOpenModal(true)}
                    className="mt-4 text-[12px] text-primary/60 hover:text-primary/80 transition-colors cursor-pointer"
                  >
                    Criar evento
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {getEventsForDay(currentDay).map((ev, i) => (
                    <motion.div
                      key={ev.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <EventCard ev={ev} />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ── Today's events (sidebar-style on non-day views) ── */}
      {view !== "day" && todayEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <h3 className="text-[13px] text-white/50 font-normal tracking-wide">
              Eventos de Hoje
            </h3>
            <span className="text-[11px] text-white/45">
              {todayEvents.length}
            </span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayEvents.map((ev, i) => (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.05 }}
              >
                <EventCard ev={ev} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Empty state (all views) ── */}
      {!isLoading && (appointments ?? []).length === 0 && view !== "day" && (
        <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-16 text-center">
          <Calendar className="w-8 h-8 text-white/10 mx-auto mb-4" />
          <p className="text-[13px] text-white/50">
            Nenhum agendamento neste periodo
          </p>
        </div>
      )}

      {/* ── Create Event Modal ── */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="bg-[#0c0c0e] border-white/[0.06] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-light text-white/90">
              Novo Evento
            </DialogTitle>
            <p className="text-[12px] text-white/55 mt-1">
              Preencha os dados do agendamento
            </p>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            <div className="space-y-2.5">
              <label className="text-[10px] font-normal text-white/60 tracking-[0.1em] uppercase block">
                Titulo
              </label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Ex: Visita Joao Silva"
                className={inputClass}
              />
            </div>

            <div className="space-y-2.5">
              <label className="text-[10px] font-normal text-white/60 tracking-[0.1em] uppercase block">
                Tipo *
              </label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, type: v as any }))
                }
              >
                <SelectTrigger className="bg-transparent border-0 border-b border-white/[0.06] rounded-none h-11 text-[13px] text-white/70 px-0 focus:ring-0 focus-visible:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0c0c0e] border-white/[0.06]">
                  {Object.entries(eventTypes).map(([key, { label, dot }]) => (
                    <SelectItem
                      key={key}
                      value={key}
                      className="text-[13px] text-white/70"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${dot}`} />
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2.5">
              <label className="text-[10px] font-normal text-white/60 tracking-[0.1em] uppercase block">
                Data e Hora *
              </label>
              <Input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) =>
                  setForm((p) => ({ ...p, scheduled_at: e.target.value }))
                }
                className={inputClass}
              />
            </div>

            <div className="space-y-2.5">
              <label className="text-[10px] font-normal text-white/60 tracking-[0.1em] uppercase block">
                Observacoes
              </label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
                }
                placeholder="Informacoes adicionais..."
                rows={3}
                className="bg-transparent border border-white/[0.06] rounded-lg text-[13px] text-white/70 placeholder:text-white/45 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={() => setOpenModal(false)}
              className="flex-1 h-11 rounded-lg text-[13px] text-white/60 hover:text-white/60 border border-white/[0.04] hover:border-white/[0.08] transition-all duration-300 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !form.scheduled_at}
              className="flex-1 h-11 rounded-lg text-[13px] text-white/80 bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] hover:text-white/90 hover:border-white/[0.15] transition-all duration-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {createMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Criar Evento
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarPage;
