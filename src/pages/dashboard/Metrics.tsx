import { motion } from "framer-motion";
import { Car, CalendarCheck, TrendingUp, Users, Target, BarChart3, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useDealership } from "@/hooks/useDealership";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend, RadialBarChart, RadialBar,
} from "recharts";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

const tooltipStyle = {
  contentStyle: {
    background: "rgba(6,6,8,0.96)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "12px",
    color: "rgba(255,255,255,0.9)",
    fontSize: "12px",
    padding: "12px 16px",
    boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
    backdropFilter: "blur(20px)",
  },
};

const COLORS = {
  blue: "hsl(210, 100%, 55%)",
  teal: "hsl(175, 70%, 45%)",
  purple: "hsl(270, 70%, 60%)",
  amber: "hsl(40, 90%, 55%)",
  emerald: "hsl(155, 70%, 45%)",
  pink: "hsl(330, 70%, 55%)",
};

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const Metrics = () => {
  const { dealershipId } = useDealership();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["metrics", dealershipId],
    queryFn: async () => {
      if (!dealershipId) return null;
      const [vehiclesRes, appointmentsRes, leadsRes, conversationsRes] = await Promise.all([
        supabase.from("vehicles").select("id, status").eq("dealership_id", dealershipId),
        supabase.from("appointments").select("id").eq("dealership_id", dealershipId),
        supabase.from("leads").select("id, status").eq("dealership_id", dealershipId),
        supabase.from("conversations").select("id").eq("dealership_id", dealershipId),
      ]);
      const vehicles = vehiclesRes.data ?? [];
      const leads = leadsRes.data ?? [];
      const inStock = vehicles.filter((v) => v.status === "disponivel").length;
      const sold = vehicles.filter((v) => v.status === "vendido").length;
      const totalLeads = leads.length;
      const convertedLeads = leads.filter((l) => l.status === "convertido").length;
      const conversion = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
      return {
        inStock, sold, conversion, totalLeads,
        totalAppointments: appointmentsRes.data?.length ?? 0,
        totalVehicles: vehicles.length,
        totalConversations: conversationsRes.data?.length ?? 0,
      };
    },
    enabled: !!dealershipId,
  });

  const { data: salesChartData } = useQuery({
    queryKey: ["metrics-sales-chart", dealershipId],
    queryFn: async () => {
      if (!dealershipId) return [];
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      const { data } = await supabase
        .from("vehicles").select("sold_at" as any)
        .eq("dealership_id", dealershipId).eq("status", "vendido")
        .not("sold_at" as any, "is", null)
        .gte("sold_at" as any, sixMonthsAgo.toISOString());
      const now = new Date();
      const months: { month: string; vendas: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months.push({ month: MONTHS[d.getMonth()], vendas: (data ?? []).filter((v: any) => v.sold_at?.startsWith(key)).length });
      }
      return months;
    },
    enabled: !!dealershipId,
  });

  const { data: appointmentsChartData } = useQuery({
    queryKey: ["metrics-appointments-chart", dealershipId],
    queryFn: async () => {
      if (!dealershipId) return [];
      const { data } = await supabase.from("appointments").select("scheduled_at").eq("dealership_id", dealershipId);
      const counts = [0, 0, 0, 0, 0, 0, 0];
      (data ?? []).forEach((a) => { if (a.scheduled_at) counts[new Date(a.scheduled_at).getDay()]++; });
      return DAYS.map((day, i) => ({ day, total: counts[i] }));
    },
    enabled: !!dealershipId,
  });

  const { data: stockChartData } = useQuery({
    queryKey: ["metrics-stock-chart", dealershipId],
    queryFn: async () => {
      if (!dealershipId) return [];
      const { data } = await supabase.from("vehicles").select("status").eq("dealership_id", dealershipId);
      const vehicles = data ?? [];
      return [
        { name: "Disponível", value: vehicles.filter((v) => v.status === "disponivel").length, color: COLORS.blue },
        { name: "Reservado", value: vehicles.filter((v) => v.status === "reservado").length, color: COLORS.amber },
        { name: "Vendido", value: vehicles.filter((v) => v.status === "vendido").length, color: COLORS.teal },
      ].filter((s) => s.value > 0);
    },
    enabled: !!dealershipId,
  });

  const { data: leadsChartData } = useQuery({
    queryKey: ["metrics-leads-chart", dealershipId],
    queryFn: async () => {
      if (!dealershipId) return [];
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      const { data } = await supabase.from("leads").select("created_at, status")
        .eq("dealership_id", dealershipId).gte("created_at", sixMonthsAgo.toISOString());
      const now = new Date();
      const months: { month: string; gerados: number; convertidos: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const monthLeads = (data ?? []).filter((l) => l.created_at?.startsWith(key));
        months.push({ month: MONTHS[d.getMonth()], gerados: monthLeads.length, convertidos: monthLeads.filter((l) => l.status === "convertido").length });
      }
      return months;
    },
    enabled: !!dealershipId,
  });

  // Radial data for conversion gauge
  const conversionRadial = [{ name: "Conversão", value: stats?.conversion ?? 0, fill: COLORS.teal }];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-7 w-48 bg-white/[0.03]" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl bg-white/[0.02]" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl bg-white/[0.02]" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[340px] rounded-2xl bg-white/[0.02]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-[24px] font-light tracking-tight text-white/90">Métricas</h1>
        <p className="text-[13px] text-white/40 mt-1">Visão geral da operação</p>
      </motion.div>

      {/* ── Hero KPI Row — 3 big cards ── */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Veículos em Estoque */}
        <motion.div variants={fadeUp} className="group relative rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-blue-500/[0.06] blur-[60px] group-hover:bg-blue-500/[0.1] transition-all duration-700" />
          <div className="relative">
            <div className="flex items-center justify-between mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Car className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-[10px] text-white/100 tracking-[0.15em] uppercase">Estoque</span>
            </div>
            <p className="text-[40px] font-extralight tracking-tight text-white/90 leading-none">{stats?.inStock ?? 0}</p>
            <p className="text-[11px] text-white/35 mt-2">
              de {stats?.totalVehicles ?? 0} veículos totais
            </p>
          </div>
        </motion.div>

        {/* Vendidos */}
        <motion.div variants={fadeUp} className="group relative rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-emerald-500/[0.06] blur-[60px] group-hover:bg-emerald-500/[0.1] transition-all duration-700" />
          <div className="relative">
            <div className="flex items-center justify-between mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-[10px] text-white/100 tracking-[0.15em] uppercase">Vendidos</span>
            </div>
            <p className="text-[40px] font-extralight tracking-tight text-white/90 leading-none">{stats?.sold ?? 0}</p>
            <p className="text-[11px] text-white/35 mt-2">
              veículos vendidos
            </p>
          </div>
        </motion.div>

        {/* Taxa de Conversão — com gauge radial */}
        <motion.div variants={fadeUp} className="group relative rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-teal-500/[0.06] blur-[60px] group-hover:bg-teal-500/[0.1] transition-all duration-700" />
          <div className="relative flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-5">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-teal-400" />
                </div>
                <span className="text-[10px] text-white/100 tracking-[0.15em] uppercase">Conversão</span>
              </div>
              <p className="text-[40px] font-extralight tracking-tight text-white/90 leading-none">{stats?.conversion ?? 0}%</p>
              <p className="text-[11px] text-white/35 mt-2">
                {stats?.totalLeads ?? 0} leads totais
              </p>
            </div>
            <div className="w-20 h-20 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270} data={conversionRadial} barSize={6}>
                  <RadialBar dataKey="value" cornerRadius={10} background={{ fill: "rgba(255,255,255,0.04)" }} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Secondary KPI Row — 3 compact cards ── */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-3 gap-5">
        {[
          { label: "Agendamentos", value: stats?.totalAppointments ?? 0, icon: CalendarCheck, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
          { label: "Leads", value: stats?.totalLeads ?? 0, icon: Users, color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20" },
          { label: "Conversas", value: stats?.totalConversations ?? 0, icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
        ].map((kpi) => (
          <motion.div
            key={kpi.label}
            variants={fadeUp}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 flex items-center gap-4"
          >
            <div className={`w-10 h-10 rounded-xl ${kpi.bg} border ${kpi.border} flex items-center justify-center shrink-0`}>
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
            <div>
              <p className="text-[22px] font-light tracking-tight text-white/90 leading-none">{kpi.value}</p>
              <p className="text-[10px] text-white/35 tracking-[0.1em] uppercase mt-1">{kpi.label}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Charts ── */}
      <div className="grid lg:grid-cols-2 gap-5">

        {/* Vendas Mensais — Bar Chart vertical com gradiente */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[13px] text-white/50 tracking-[0.08em] uppercase font-medium">Vendas Mensais</h3>
            <BarChart3 className="w-4 h-4 text-white/20" />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={salesChartData ?? []} barCategoryGap="20%">
              <defs>
                <linearGradient id="barSalesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.blue} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={COLORS.blue} stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
              <Bar dataKey="vendas" fill="url(#barSalesGrad)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Agendamentos por Dia — Area chart suave */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[13px] text-white/50 tracking-[0.08em] uppercase font-medium">Agendamentos por Dia</h3>
            <CalendarCheck className="w-4 h-4 text-white/20" />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={appointmentsChartData ?? []}>
              <defs>
                <linearGradient id="appointGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.purple} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={COLORS.purple} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Area
                type="basis"
                dataKey="total"
                stroke={COLORS.purple}
                strokeWidth={2.5}
                fill="url(#appointGrad)"
                dot={{ fill: COLORS.purple, r: 4, strokeWidth: 2, stroke: "#08080a" }}
                activeDot={{ r: 6, stroke: COLORS.purple, strokeWidth: 2, fill: "#08080a" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Distribuição do Estoque — Donut com centro label */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[13px] text-white/50 tracking-[0.08em] uppercase font-medium">Distribuição do Estoque</h3>
            <Car className="w-4 h-4 text-white/20" />
          </div>
          {(stockChartData ?? []).length > 0 ? (
            <div className="flex items-center gap-6">
              <div className="relative flex-1">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={stockChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      dataKey="value"
                      paddingAngle={4}
                      strokeWidth={0}
                    >
                      {(stockChartData ?? []).map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[28px] font-extralight text-white/80">{stats?.totalVehicles ?? 0}</span>
                  <span className="text-[9px] text-white/100 tracking-[0.15em] uppercase">Total</span>
                </div>
              </div>
              <div className="flex flex-col gap-4 min-w-[110px]">
                {(stockChartData ?? []).map((s) => (
                  <div key={s.name} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                        <span className="text-[11px] text-white/50">{s.name}</span>
                      </div>
                      <span className="text-[13px] text-white/80 font-medium">{s.value}</span>
                    </div>
                    {/* Mini progress bar */}
                    <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: s.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(s.value / (stats?.totalVehicles || 1)) * 100}%` }}
                        transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-[13px] text-white/100">
              Nenhum veículo cadastrado
            </div>
          )}
        </motion.div>

        {/* Leads — Gerados vs Convertidos */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[13px] text-white/50 tracking-[0.08em] uppercase font-medium">Leads Gerados vs Convertidos</h3>
            <Users className="w-4 h-4 text-white/20" />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={leadsChartData ?? []} barGap={4} barCategoryGap="20%">
              <defs>
                <linearGradient id="leadsGenBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.blue} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={COLORS.blue} stopOpacity={0.35} />
                </linearGradient>
                <linearGradient id="leadsConvBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.teal} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={COLORS.teal} stopOpacity={0.35} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
              <Legend
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", paddingTop: "16px" }}
              />
              <Bar dataKey="gerados" name="Gerados" fill="url(#leadsGenBar)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="convertidos" name="Convertidos" fill="url(#leadsConvBar)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
};

export default Metrics;
