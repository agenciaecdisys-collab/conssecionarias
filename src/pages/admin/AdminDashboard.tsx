import { motion } from "framer-motion";
import { Building2, Car, Users, CreditCard, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

/* ── Constants ── */
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const COLORS = {
  blue: "hsl(210, 100%, 55%)",
  teal: "hsl(175, 70%, 45%)",
  purple: "hsl(280, 70%, 55%)",
  amber: "hsl(40, 90%, 55%)",
  emerald: "hsl(160, 60%, 45%)",
  rose: "hsl(340, 75%, 55%)",
};

const tooltipStyle = {
  contentStyle: {
    background: "#0c0c0e",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px",
    color: "rgba(255,255,255,0.85)",
    fontSize: "12px",
    padding: "10px 14px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  },
  itemStyle: { color: "rgba(255,255,255,0.7)" },
  labelStyle: { color: "rgba(255,255,255,0.5)", marginBottom: "4px" },
};

const axisStyle = {
  stroke: "rgba(255,255,255,0.25)",
  fontSize: 11,
  fontFamily: "inherit",
  tickLine: false as const,
  axisLine: false as const,
};

/* ── Chart Card wrapper ── */
const ChartCard = ({
  title,
  subtitle,
  children,
  delay = 0,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className={`rounded-xl border border-white/[0.04] bg-white/[0.015] p-6 ${className}`}
  >
    <div className="flex items-baseline justify-between mb-6">
      <div>
        <h3 className="text-[13px] text-white/70 font-normal">{title}</h3>
        {subtitle && <p className="text-[11px] text-white/100 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {children}
  </motion.div>
);

/* ── Main ── */
const AdminDashboard = () => {
  /* ── KPI data ── */
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: async () => {
      const [dealershipsRes, vehiclesRes, profilesRes] = await Promise.all([
        supabase.from("dealerships").select("id, status, plan, created_at", { count: "exact" }),
        supabase.from("vehicles").select("id, status", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);

      const dealerships = dealershipsRes.data ?? [];
      const vehicles = vehiclesRes.data ?? [];
      const activeDealerships = dealerships.filter((d) => d.status === "ativo").length;

      const planPrices: Record<string, number> = { starter: 297, pro: 597, enterprise: 997 };
      const mrr = dealerships
        .filter((d) => d.status === "ativo")
        .reduce((sum, d) => sum + (planPrices[d.plan ?? "starter"] ?? 0), 0);

      return {
        activeDealerships,
        totalDealerships: dealerships.length,
        totalVehicles: vehiclesRes.count ?? vehicles.length,
        activeUsers: profilesRes.count ?? 0,
        mrr,
        dealerships,
        vehicles,
      };
    },
  });

  /* ── Dealerships growth (last 6 months) ── */
  const { data: growthData } = useQuery({
    queryKey: ["admin-growth-chart"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dealerships")
        .select("created_at, status")
        .order("created_at", { ascending: true });

      const now = new Date();
      const months: { month: string; total: number; ativas: number }[] = [];

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
        const key = MONTHS[d.getMonth()];

        const upToDate = (data ?? []).filter(
          (deal) => deal.created_at && new Date(deal.created_at) <= endOfMonth
        );

        months.push({
          month: key,
          total: upToDate.length,
          ativas: upToDate.filter((deal) => deal.status === "ativo").length,
        });
      }
      return months;
    },
  });

  /* ── MRR evolution (last 6 months) ── */
  const { data: mrrData } = useQuery({
    queryKey: ["admin-mrr-chart"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dealerships")
        .select("created_at, status, plan")
        .order("created_at", { ascending: true });

      const planPrices: Record<string, number> = { starter: 297, pro: 597, enterprise: 997 };
      const now = new Date();
      const months: { month: string; mrr: number }[] = [];

      for (let i = 5; i >= 0; i--) {
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);

        const activeAtDate = (data ?? []).filter(
          (deal) =>
            deal.created_at &&
            new Date(deal.created_at) <= endOfMonth &&
            deal.status === "ativo"
        );

        const mrr = activeAtDate.reduce(
          (sum, deal) => sum + (planPrices[deal.plan ?? "starter"] ?? 0),
          0
        );

        months.push({ month: MONTHS[d.getMonth()], mrr });
      }
      return months;
    },
  });

  /* ── Plan distribution ── */
  const planDistribution = (() => {
    if (!stats?.dealerships) return [];
    const active = stats.dealerships.filter((d) => d.status === "ativo");
    const plans = [
      { name: "Starter", value: active.filter((d) => d.plan === "starter").length, color: COLORS.blue },
      { name: "Pro", value: active.filter((d) => d.plan === "pro").length, color: COLORS.teal },
      { name: "Enterprise", value: active.filter((d) => d.plan === "enterprise").length, color: COLORS.purple },
    ].filter((p) => p.value > 0);
    return plans;
  })();

  /* ── Vehicles by status ── */
  const vehicleDistribution = (() => {
    if (!stats?.vehicles) return [];
    const vehicles = stats.vehicles;
    return [
      { name: "Disponivel", value: vehicles.filter((v) => v.status === "disponivel").length, color: COLORS.blue },
      { name: "Reservado", value: vehicles.filter((v) => v.status === "reservado").length, color: COLORS.amber },
      { name: "Vendido", value: vehicles.filter((v) => v.status === "vendido").length, color: COLORS.emerald },
    ].filter((s) => s.value > 0);
  })();

  /* ── Top dealerships ── */
  const { data: topDealerships } = useQuery({
    queryKey: ["admin-top-dealerships"],
    queryFn: async () => {
      const { data: dealerships } = await supabase
        .from("dealerships")
        .select("id, name, plan, status");

      if (!dealerships) return [];

      const results = await Promise.all(
        dealerships
          .filter((d) => d.status === "ativo")
          .slice(0, 20)
          .map(async (d) => {
            const [vehiclesRes, leadsRes] = await Promise.all([
              supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("dealership_id", d.id),
              supabase.from("leads").select("id", { count: "exact", head: true }).eq("dealership_id", d.id),
            ]);
            return {
              name: d.name,
              plan: d.plan,
              vehicles: vehiclesRes.count ?? 0,
              leads: leadsRes.count ?? 0,
            };
          })
      );

      return results.sort((a, b) => b.vehicles - a.vehicles).slice(0, 5);
    },
  });

  /* ── KPI cards config ── */
  const kpis = [
    {
      label: "Concessionarias Ativas",
      value: stats?.activeDealerships ?? 0,
      total: stats?.totalDealerships ?? 0,
      icon: Building2,
      trend: stats ? Math.round((stats.activeDealerships / Math.max(stats.totalDealerships, 1)) * 100) : 0,
      trendLabel: "do total",
      color: "primary",
    },
    {
      label: "Veiculos na Plataforma",
      value: stats?.totalVehicles ?? 0,
      icon: Car,
      color: "accent",
    },
    {
      label: "Usuarios Ativos",
      value: stats?.activeUsers ?? 0,
      icon: Users,
      color: "purple",
    },
    {
      label: "Receita Recorrente",
      value: stats ? `R$ ${stats.mrr.toLocaleString("pt-BR")}` : "—",
      icon: CreditCard,
      trendLabel: "/mes",
      color: "emerald",
    },
  ];

  const colorMap: Record<string, { icon: string; glow: string }> = {
    primary: { icon: "text-primary/60", glow: "bg-primary/[0.08]" },
    accent: { icon: "text-accent/60", glow: "bg-accent/[0.08]" },
    purple: { icon: "text-purple-400/60", glow: "bg-purple-500/[0.08]" },
    emerald: { icon: "text-emerald-400/60", glow: "bg-emerald-500/[0.08]" },
  };

  return (
    <div className="space-y-8 max-w-[1400px]">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-end justify-between"
      >
        <div>
          <h1 className="text-[22px] font-light tracking-tight text-white/90">Dashboard</h1>
          <p className="text-[13px] text-white/40 mt-1">Visao geral da plataforma</p>
        </div>
        <span className="text-[10px] text-white/25 tracking-wider uppercase">
          Atualizado agora
        </span>
      </motion.div>

      {/* ── KPIs ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] bg-white/[0.02] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, i) => {
            const colors = colorMap[kpi.color];
            return (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + i * 0.06, duration: 0.5 }}
                className="relative group rounded-xl border border-white/[0.04] bg-white/[0.015] p-5 hover:border-white/[0.08] transition-all duration-500 cursor-default overflow-hidden"
              >
                {/* Background glow on hover */}
                <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full ${colors.glow} blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />

                <div className="relative space-y-3">
                  <div className="flex items-center justify-between">
                    <kpi.icon className={`w-[18px] h-[18px] ${colors.icon}`} />
                    {kpi.trendLabel && (
                      <span className="text-[10px] text-white/35 tracking-wide">
                        {kpi.trend !== undefined && `${kpi.trend}% `}{kpi.trendLabel}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-[22px] font-light tracking-tight text-white/85">{kpi.value}</p>
                    <p className="text-[10px] text-white/40 tracking-[0.08em] uppercase mt-1">{kpi.label}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Charts Row 1: Growth + MRR ── */}
      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="Crescimento de Concessionarias" subtitle="Ultimos 6 meses" delay={0.3}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={growthData ?? []}>
              <defs>
                <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.blue} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={COLORS.blue} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="activeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.teal} stopOpacity={0.1} />
                  <stop offset="100%" stopColor={COLORS.teal} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="month" {...axisStyle} />
              <YAxis {...axisStyle} allowDecimals={false} width={30} />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="total" stroke={COLORS.blue} strokeWidth={1.5} fill="url(#growthFill)" name="Total" />
              <Area type="monotone" dataKey="ativas" stroke={COLORS.teal} strokeWidth={1.5} fill="url(#activeFill)" name="Ativas" />
            </AreaChart>
          </ResponsiveContainer>
          {/* Inline legend */}
          <div className="flex items-center justify-center gap-6 mt-4">
            {[
              { color: COLORS.blue, label: "Total" },
              { color: COLORS.teal, label: "Ativas" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-2 text-[10px] text-white/45">
                <div className="w-3 h-px" style={{ background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Evolucao do MRR" subtitle="Receita recorrente mensal" delay={0.35}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={mrrData ?? []}>
              <defs>
                <linearGradient id="mrrFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.emerald} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={COLORS.emerald} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="month" {...axisStyle} />
              <YAxis
                {...axisStyle}
                width={55}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, "MRR"]}
              />
              <Area type="monotone" dataKey="mrr" stroke={COLORS.emerald} strokeWidth={1.5} fill="url(#mrrFill)" name="MRR" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Charts Row 2: Plans + Vehicles + Top Dealerships ── */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Plan Distribution */}
        <ChartCard title="Distribuicao por Plano" delay={0.4}>
          {planDistribution.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={planDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    dataKey="value"
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {planDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-5 mt-3">
                {planDistribution.map((p) => (
                  <div key={p.name} className="flex items-center gap-2 text-[10px] text-white/45">
                    <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    {p.name} <span className="text-white/40">{p.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-[12px] text-white/25">
              Sem dados
            </div>
          )}
        </ChartCard>

        {/* Vehicle Distribution */}
        <ChartCard title="Veiculos por Status" delay={0.45}>
          {vehicleDistribution.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={vehicleDistribution} layout="vertical" barCategoryGap={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                  <XAxis type="number" {...axisStyle} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" {...axisStyle} width={70} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {vehicleDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.7} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-[12px] text-white/25">
              Sem dados
            </div>
          )}
        </ChartCard>

        {/* Top Dealerships */}
        <ChartCard title="Top Concessionarias" subtitle="Por veiculos cadastrados" delay={0.5}>
          {topDealerships && topDealerships.length > 0 ? (
            <div className="space-y-0">
              {topDealerships.map((d, i) => {
                const maxVehicles = topDealerships[0]?.vehicles || 1;
                const pct = (d.vehicles / maxVehicles) * 100;
                return (
                  <motion.div
                    key={d.name}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.06 }}
                    className="py-3 border-b border-white/[0.03] last:border-0"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] text-white/100 w-4 shrink-0">{i + 1}.</span>
                        <span className="text-[12px] text-white/60 truncate">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] text-white/35 tracking-wider uppercase">{d.plan}</span>
                        <span className="text-[12px] text-white/55 font-light tabular-nums">{d.vehicles}</span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-[2px] bg-white/[0.03] rounded-full overflow-hidden ml-6">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${COLORS.blue}, ${COLORS.teal})` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.8 + i * 0.06, duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-[12px] text-white/25">
              Sem dados
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
};

export default AdminDashboard;
