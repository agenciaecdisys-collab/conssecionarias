import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Grid3X3, List, Car, Fuel, Gauge, Loader2, Filter, Pencil, Trash2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDealership } from "@/hooks/useDealership";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const formatPrice = (value: number) => {
  const parts = value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).split(",");
  return { integer: parts[0], decimals: parts[1] };
};

const fixImageUrl = (url: string): string => {
  const driveMatch = url.match(/(?:drive\.google\.com\/.*[?&]id=|drive\.google\.com\/file\/d\/)([a-zA-Z0-9_-]+)/);
  if (driveMatch) return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  return url;
};

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  disponivel: { label: "Disponível", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  reservado: { label: "Reservado", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  vendido: { label: "Vendido", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
};

const inputClass = "bg-transparent border-0 border-b border-white/[0.08] rounded-none h-10 text-[13px] text-white/80 placeholder:text-white/20 px-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300";

const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };

const Stock = () => {
  const { dealershipId } = useDealership();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    brand: "", model: "", year: "", color: "",
    fuel: "", km: "", price: "", images: "",
    status: "disponivel",
  });

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriceMin, setFilterPriceMin] = useState("");
  const [filterPriceMax, setFilterPriceMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [editingVehicle, setEditingVehicle] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [cardImageIndex, setCardImageIndex] = useState<Record<string, number>>({});
  const [drawerImageIndex, setDrawerImageIndex] = useState(0);

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["vehicles", dealershipId],
    queryFn: async () => {
      if (!dealershipId) return [];
      const { data, error } = await supabase
        .from("vehicles").select("*")
        .eq("dealership_id", dealershipId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!dealershipId,
  });

  const invalidateMetrics = () => {
    queryClient.invalidateQueries({ queryKey: ["metrics", dealershipId] });
    queryClient.invalidateQueries({ queryKey: ["metrics-sales-chart", dealershipId] });
    queryClient.invalidateQueries({ queryKey: ["metrics-stock-chart", dealershipId] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!dealershipId) throw new Error("Sem dealership");
      const { error } = await supabase.from("vehicles").insert({
        dealership_id: dealershipId,
        brand: form.brand, model: form.model,
        year: form.year || null, color: form.color || null,
        fuel: (form.fuel as any) || null,
        km: form.km ? Number(form.km) : null,
        price: form.price ? Number(form.price) : null,
        images: form.images ? form.images.split(",").map((s: string) => s.trim()).filter(Boolean) : null,
        status: form.status as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles", dealershipId] });
      invalidateMetrics();
      toast({ title: "Veículo adicionado com sucesso!" });
      setOpenModal(false);
      setForm({ brand: "", model: "", year: "", color: "", fuel: "", km: "", price: "", images: "", status: "disponivel" });
    },
    onError: (err: any) => toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedVehicle) throw new Error("Nenhum veículo selecionado");
      const updateData: any = {
        brand: editForm.brand, model: editForm.model,
        year: editForm.year || null, color: editForm.color || null,
        fuel: editForm.fuel || null,
        km: editForm.km ? Number(editForm.km) : null,
        price: editForm.price ? Number(editForm.price) : null,
        images: editForm.images ? editForm.images.split(",").map((s: string) => s.trim()).filter(Boolean) : null,
        status: editForm.status,
      };
      if (editForm.status === "vendido" && selectedVehicle.status !== "vendido") {
        updateData.sold_at = new Date().toISOString();
      } else if (editForm.status !== "vendido") {
        updateData.sold_at = null;
      }
      const { error } = await supabase.from("vehicles").update(updateData).eq("id", selectedVehicle.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles", dealershipId] });
      invalidateMetrics();
      toast({ title: "Veículo atualizado!" });
      setEditingVehicle(false);
      setSelectedVehicle(null);
    },
    onError: (err: any) => toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedVehicle) throw new Error("Nenhum veículo selecionado");
      const { error } = await supabase.from("vehicles").delete().eq("id", selectedVehicle.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles", dealershipId] });
      invalidateMetrics();
      toast({ title: "Veículo removido!" });
      setSelectedVehicle(null);
    },
    onError: (err: any) => toast({ title: "Erro ao remover", description: err.message, variant: "destructive" }),
  });

  const markAsSoldMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicles").update({ status: "vendido", sold_at: new Date().toISOString() } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles", dealershipId] });
      invalidateMetrics();
      toast({ title: "Veículo marcado como vendido!" });
    },
    onError: (err: any) => toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" }),
  });

  const openVehicleDrawer = (v: any) => {
    setSelectedVehicle(v);
    setEditingVehicle(false);
    setDrawerImageIndex(0);
    setEditForm({
      brand: v.brand ?? "", model: v.model ?? "", year: v.year ?? "",
      color: v.color ?? "", fuel: v.fuel ?? "", km: v.km?.toString() ?? "",
      price: v.price?.toString() ?? "", images: v.images?.join(", ") ?? "",
      status: v.status ?? "disponivel",
    });
  };

  const filtered = (vehicles ?? []).filter((v) => {
    const searchLower = search.toLowerCase();
    const matchesSearch = !search || `${v.brand} ${v.model} ${v.year ?? ""} ${v.color ?? ""}`.toLowerCase().includes(searchLower);
    if (!matchesSearch) return false;
    if (filterStatus === "disponivel" && v.status !== "disponivel" && v.status !== "reservado") return false;
    if (filterStatus === "vendido" && v.status !== "vendido") return false;
    if (filterPriceMin && (v.price ?? 0) < Number(filterPriceMin)) return false;
    if (filterPriceMax && (v.price ?? 0) > Number(filterPriceMax)) return false;
    return true;
  });

  const StatusBadge = ({ status }: { status: string }) => {
    const cfg = statusConfig[status] ?? statusConfig.disponivel;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] tracking-[0.05em] uppercase font-medium ${cfg.color} ${cfg.bg} border ${cfg.border}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-[24px] font-light tracking-tight text-white/90">Estoque</h1>
          <p className="text-[13px] text-white/40 mt-1">{filtered.length} veículo{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <Button
            onClick={() => setOpenModal(true)}
            className="h-11 px-6 rounded-xl bg-gradient-to-r from-[hsl(210,100%,55%)] to-[hsl(195,90%,50%)] text-white font-medium text-[13px] tracking-wide border-0 cursor-pointer hover:shadow-[0_0_30px_hsl(210,100%,55%,0.2)] transition-all duration-500"
          >
            <Plus className="w-4 h-4 mr-2" /> Novo Veículo
          </Button>
        </motion.div>
      </div>

      {/* Search + View Toggle */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <Input
            placeholder="Buscar por marca, modelo, ano ou cor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-0 border-b border-white/[0.08] rounded-none h-11 text-[13px] text-white/70 placeholder:text-white/20 pl-6 pr-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300"
          />
        </div>
        <div className="flex gap-2 items-end">
          <div className="flex rounded-lg border border-white/[0.06] overflow-hidden">
            <button
              onClick={() => setView("grid")}
              className={`px-3 py-2.5 transition-all duration-300 cursor-pointer ${view === "grid" ? "bg-white/[0.08] text-white/80" : "text-white/25 hover:text-white/50"}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-2.5 transition-all duration-300 cursor-pointer ${view === "list" ? "bg-white/[0.08] text-white/80" : "text-white/25 hover:text-white/50"}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Quick Filters */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="flex items-center gap-2 flex-wrap">
        {[
          { key: "all", label: "Todos", count: vehicles?.length ?? 0 },
          { key: "disponivel", label: "Ativos", count: vehicles?.filter((v) => v.status === "disponivel" || v.status === "reservado").length ?? 0 },
          { key: "vendido", label: "Vendidos", count: vehicles?.filter((v) => v.status === "vendido").length ?? 0 },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={`px-4 py-2 rounded-lg text-[12px] tracking-[0.04em] font-medium transition-all duration-300 cursor-pointer ${
              filterStatus === f.key
                ? "bg-white/[0.08] text-white/80 border border-white/[0.1]"
                : "text-white/100 hover:text-white/50 border border-transparent hover:border-white/[0.06]"
            }`}
          >
            {f.label}
            <span className="ml-2 text-[10px] opacity-50">{f.count}</span>
          </button>
        ))}

        <div className="h-4 w-px bg-white/[0.06] mx-1 hidden sm:block" />

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] tracking-[0.04em] transition-all duration-300 cursor-pointer border ${
            showFilters ? "text-white/70 border-white/[0.1] bg-white/[0.05]" : "text-white/100 border-transparent hover:text-white/50 hover:border-white/[0.06]"
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Filtros
          {(filterPriceMin || filterPriceMax) && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
        </button>

        {(filterStatus !== "all" || filterPriceMin || filterPriceMax) && (
          <button
            onClick={() => { setFilterStatus("all"); setFilterPriceMin(""); setFilterPriceMax(""); }}
            className="text-[11px] text-white/25 hover:text-white/50 transition-colors cursor-pointer flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Limpar
          </button>
        )}
      </motion.div>

      {/* Expanded Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-wrap gap-6 items-end"
        >
          <div className="space-y-2">
            <label className="text-[10px] text-white/40 tracking-[0.12em] uppercase">Status</label>
            <div className="flex gap-1.5">
              {[
                { key: "all", label: "Todos" },
                { key: "disponivel", label: "Disponível" },
                { key: "reservado", label: "Reservado" },
                { key: "vendido", label: "Vendido" },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setFilterStatus(s.key)}
                  className={`px-3 py-1.5 rounded-full text-[11px] transition-all duration-300 cursor-pointer ${
                    filterStatus === s.key ? "bg-blue-500/15 text-blue-400 border border-blue-500/20" : "text-white/100 hover:text-white/50 border border-white/[0.06]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-white/40 tracking-[0.12em] uppercase">Preço mínimo</label>
            <Input
              type="number"
              value={filterPriceMin}
              onChange={(e) => setFilterPriceMin(e.target.value)}
              placeholder="R$ 0"
              className={`${inputClass} w-32`}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-white/40 tracking-[0.12em] uppercase">Preço máximo</label>
            <Input
              type="number"
              value={filterPriceMax}
              onChange={(e) => setFilterPriceMax(e.target.value)}
              placeholder="Sem limite"
              className={`${inputClass} w-32`}
            />
          </div>
        </motion.div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl bg-white/[0.02]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-16 text-center">
          <Car className="w-14 h-14 text-white/10 mx-auto mb-4" />
          <p className="text-[15px] text-white/100 font-light">Nenhum veículo encontrado</p>
          <p className="text-[12px] text-white/20 mt-1">Tente ajustar os filtros ou adicione um novo veículo</p>
        </div>
      ) : view === "grid" ? (
        <motion.div variants={stagger} initial="hidden" animate="show" className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((v) => {
            const st = statusConfig[v.status ?? "disponivel"] ?? statusConfig.disponivel;
            return (
              <motion.div
                key={v.id}
                variants={fadeUp}
                onClick={() => openVehicleDrawer(v)}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden cursor-pointer transition-all duration-500 hover:border-white/[0.1] hover:bg-white/[0.03]"
              >
                {/* Image */}
                {v.images?.length ? (
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={fixImageUrl(v.images[cardImageIndex[v.id] ?? 0] ?? v.images[0])}
                      alt={v.model}
                      referrerPolicy="no-referrer"
                      className={`h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 ${v.status === "vendido" ? "grayscale" : ""}`}
                    />
                    {/* Gradient overlay bottom */}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
                    {/* Carousel arrows */}
                    {v.images.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCardImageIndex((prev) => ({ ...prev, [v.id]: ((prev[v.id] ?? 0) - 1 + v.images!.length) % v.images!.length }));
                          }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5 text-white" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCardImageIndex((prev) => ({ ...prev, [v.id]: ((prev[v.id] ?? 0) + 1) % v.images!.length }));
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer"
                        >
                          <ChevronRight className="w-3.5 h-3.5 text-white" />
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                          {v.images.map((_: string, idx: number) => (
                            <span key={idx} className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === (cardImageIndex[v.id] ?? 0) ? "bg-white" : "bg-white/30"}`} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="h-44 bg-white/[0.02] flex items-center justify-center">
                    <Car className="w-14 h-14 text-white/[0.06]" />
                  </div>
                )}

                {/* Info */}
                <div className="p-5 space-y-3">
                  <div className={v.status === "vendido" ? "opacity-50" : ""}>
                    <p className="text-[15px] font-medium text-white/85 tracking-tight">{v.brand} {v.model}</p>
                    <p className="text-[11px] text-white/100 mt-0.5">{v.year}{v.color ? ` · ${v.color}` : ""}</p>
                  </div>

                  <div className={`flex items-center gap-4 text-[11px] text-white/100 ${v.status === "vendido" ? "opacity-50" : ""}`}>
                    <span className="flex items-center gap-1"><Gauge className="w-3 h-3" />{(v.km ?? 0).toLocaleString("pt-BR")} km</span>
                    <span className="flex items-center gap-1"><Fuel className="w-3 h-3" />{v.fuel ?? "—"}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                    <p className={`text-[18px] font-light tracking-tight text-white/90 ${v.status === "vendido" ? "opacity-50" : ""}`}>
                      <span className="text-[11px] text-white/50 mr-0.5">R$</span>
                      {formatPrice(v.price ?? 0).integer}
                      <span className="text-[11px] text-white/35">,{formatPrice(v.price ?? 0).decimals}</span>
                    </p>
                    {v.status === "vendido" ? (
                      <StatusBadge status="vendido" />
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); markAsSoldMutation.mutate(v.id); }}
                        disabled={markAsSoldMutation.isPending}
                        className="text-[10px] px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/40 font-medium hover:bg-blue-500/15 hover:border-blue-500/25 hover:text-blue-400 transition-all duration-300 disabled:opacity-50 cursor-pointer tracking-[0.04em]"
                      >
                        Marcar venda
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        /* List View */
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left p-4 text-[10px] text-white/40 tracking-[0.12em] uppercase font-medium">Veículo</th>
                <th className="text-left p-4 text-[10px] text-white/40 tracking-[0.12em] uppercase font-medium hidden md:table-cell">Ano</th>
                <th className="text-left p-4 text-[10px] text-white/40 tracking-[0.12em] uppercase font-medium hidden lg:table-cell">Km</th>
                <th className="text-left p-4 text-[10px] text-white/40 tracking-[0.12em] uppercase font-medium">Preço</th>
                <th className="text-left p-4 text-[10px] text-white/40 tracking-[0.12em] uppercase font-medium">Status</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => openVehicleDrawer(v)}
                  className={`border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition-colors duration-300 ${v.status === "vendido" ? "opacity-50" : ""}`}
                >
                  <td className="p-4 text-white/80 font-medium">{v.brand} {v.model}</td>
                  <td className="p-4 hidden md:table-cell text-white/40">{v.year}</td>
                  <td className="p-4 hidden lg:table-cell text-white/40">{(v.km ?? 0).toLocaleString("pt-BR")} km</td>
                  <td className="p-4 text-white/80 font-medium"><span className="text-white/50">R$ </span>{formatPrice(v.price ?? 0).integer}<span className="text-[11px] text-white/35">,{formatPrice(v.price ?? 0).decimals}</span></td>
                  <td className="p-4"><StatusBadge status={v.status ?? "disponivel"} /></td>
                  <td className="p-4 text-right">
                    {v.status !== "vendido" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markAsSoldMutation.mutate(v.id); }}
                        disabled={markAsSoldMutation.isPending}
                        className="text-[10px] px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 font-medium hover:bg-teal-500/20 transition-all duration-300 disabled:opacity-50 cursor-pointer"
                      >
                        Vendido
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Vehicle Detail Sheet */}
      <Sheet open={!!selectedVehicle} onOpenChange={(open) => { if (!open) { setSelectedVehicle(null); setEditingVehicle(false); } }}>
        <SheetContent className="bg-[#08080a] border-white/[0.06] w-full sm:max-w-md overflow-y-auto">
          {selectedVehicle && (
            <>
              <SheetHeader className="mb-5">
                <SheetTitle className="text-[18px] font-light text-white/90 tracking-tight">
                  {selectedVehicle.brand} {selectedVehicle.model}
                </SheetTitle>
              </SheetHeader>

              {/* Image Gallery */}
              {selectedVehicle.images?.length ? (
                <div className="mb-5 space-y-2">
                  <div className="relative rounded-xl overflow-hidden">
                    <img
                      src={fixImageUrl(selectedVehicle.images[drawerImageIndex] ?? selectedVehicle.images[0])}
                      alt={selectedVehicle.model}
                      referrerPolicy="no-referrer"
                      className="w-full h-56 object-cover"
                    />
                    {selectedVehicle.images.length > 1 && (
                      <>
                        <button onClick={() => setDrawerImageIndex((prev) => (prev - 1 + selectedVehicle.images.length) % selectedVehicle.images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 flex items-center justify-center transition-colors cursor-pointer">
                          <ChevronLeft className="w-4 h-4 text-white" />
                        </button>
                        <button onClick={() => setDrawerImageIndex((prev) => (prev + 1) % selectedVehicle.images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 flex items-center justify-center transition-colors cursor-pointer">
                          <ChevronRight className="w-4 h-4 text-white" />
                        </button>
                        <span className="absolute top-2 right-2 text-[10px] bg-black/40 backdrop-blur-sm text-white/70 px-2 py-0.5 rounded-full">
                          {drawerImageIndex + 1}/{selectedVehicle.images.length}
                        </span>
                      </>
                    )}
                  </div>
                  {selectedVehicle.images.length > 1 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {selectedVehicle.images.map((img: string, idx: number) => (
                        <button key={idx} onClick={() => setDrawerImageIndex(idx)} className={`shrink-0 w-14 h-10 rounded-lg overflow-hidden border-2 transition-all duration-300 cursor-pointer ${idx === drawerImageIndex ? "border-blue-500/50 opacity-100" : "border-transparent opacity-40 hover:opacity-70"}`}>
                          <img src={fixImageUrl(img)} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-56 bg-white/[0.02] rounded-xl border border-white/[0.04] flex items-center justify-center mb-5">
                  <Car className="w-16 h-16 text-white/[0.06]" />
                </div>
              )}

              {!editingVehicle ? (
                <div className="space-y-5">
                  {/* Specs grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Marca", value: selectedVehicle.brand },
                      { label: "Modelo", value: selectedVehicle.model },
                      { label: "Ano", value: selectedVehicle.year },
                      { label: "Cor", value: selectedVehicle.color },
                      { label: "Combustível", value: selectedVehicle.fuel },
                      { label: "Quilometragem", value: selectedVehicle.km ? `${selectedVehicle.km.toLocaleString("pt-BR")} km` : null },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3.5">
                        <p className="text-[10px] text-white/100 tracking-[0.1em] uppercase">{label}</p>
                        <p className="text-[13px] text-white/75 font-medium mt-1">{value ?? "—"}</p>
                      </div>
                    ))}
                  </div>

                  {/* Price + status */}
                  <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-white/100 tracking-[0.1em] uppercase">Preço</p>
                      <p className="text-[22px] font-light tracking-tight text-white/90 mt-0.5">
                        <span className="text-[12px] text-white/50 mr-1">R$</span>
                        {formatPrice(selectedVehicle.price ?? 0).integer}<span className="text-[13px] text-white/35">,{formatPrice(selectedVehicle.price ?? 0).decimals}</span>
                      </p>
                    </div>
                    <StatusBadge status={selectedVehicle.status ?? "disponivel"} />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={() => setEditingVehicle(true)}
                      className="flex-1 h-11 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/70 hover:bg-white/[0.08] hover:text-white/90 transition-all duration-300 cursor-pointer"
                    >
                      <Pencil className="w-4 h-4 mr-2" /> Editar
                    </Button>
                    <Button
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                      className="h-11 w-11 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all duration-300 cursor-pointer p-0"
                    >
                      {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              ) : (
                /* Edit Mode */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Marca", key: "brand", required: true },
                      { label: "Modelo", key: "model", required: true },
                      { label: "Ano", key: "year" },
                      { label: "Cor", key: "color" },
                    ].map((field) => (
                      <div key={field.key} className="space-y-2">
                        <label className="text-[10px] text-white/40 tracking-[0.12em] uppercase">{field.label}{field.required ? " *" : ""}</label>
                        <Input
                          value={editForm[field.key]}
                          onChange={(e) => setEditForm((p: any) => ({ ...p, [field.key]: e.target.value }))}
                          className={inputClass}
                        />
                      </div>
                    ))}
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 tracking-[0.12em] uppercase">Combustível</label>
                      <Select value={editForm.fuel} onValueChange={(v) => setEditForm((p: any) => ({ ...p, fuel: v }))}>
                        <SelectTrigger className="bg-transparent border-0 border-b border-white/[0.08] rounded-none h-10 text-[13px] text-white/70 focus:ring-0"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent className="bg-[#0a0a0c] border-white/[0.08]">
                          <SelectItem value="flex">Flex</SelectItem>
                          <SelectItem value="gasolina">Gasolina</SelectItem>
                          <SelectItem value="diesel">Diesel</SelectItem>
                          <SelectItem value="eletrico">Elétrico</SelectItem>
                          <SelectItem value="hibrido">Híbrido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 tracking-[0.12em] uppercase">Status</label>
                      <Select value={editForm.status} onValueChange={(v) => setEditForm((p: any) => ({ ...p, status: v }))}>
                        <SelectTrigger className="bg-transparent border-0 border-b border-white/[0.08] rounded-none h-10 text-[13px] text-white/70 focus:ring-0"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[#0a0a0c] border-white/[0.08]">
                          <SelectItem value="disponivel">Disponível</SelectItem>
                          <SelectItem value="reservado">Reservado</SelectItem>
                          <SelectItem value="vendido">Vendido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 tracking-[0.12em] uppercase">Km</label>
                      <Input type="number" value={editForm.km} onChange={(e) => setEditForm((p: any) => ({ ...p, km: e.target.value }))} className={inputClass} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 tracking-[0.12em] uppercase">Preço (R$)</label>
                      <Input type="number" value={editForm.price} onChange={(e) => setEditForm((p: any) => ({ ...p, price: e.target.value }))} className={inputClass} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 tracking-[0.12em] uppercase">Imagens (URLs)</label>
                    <Input value={editForm.images} onChange={(e) => setEditForm((p: any) => ({ ...p, images: e.target.value }))} placeholder="URLs separadas por vírgula" className={inputClass} />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => updateMutation.mutate()}
                      disabled={updateMutation.isPending || !editForm.brand || !editForm.model}
                      className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[hsl(210,100%,55%)] to-[hsl(195,90%,50%)] text-white font-medium text-[13px] border-0 cursor-pointer hover:shadow-[0_0_30px_hsl(210,100%,55%,0.2)] transition-all duration-500"
                    >
                      {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Salvar
                    </Button>
                    <Button
                      onClick={() => setEditingVehicle(false)}
                      className="h-11 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/50 hover:text-white/70 transition-all duration-300 cursor-pointer"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* New Vehicle Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="bg-[#08080a] border-white/[0.06] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-light text-white/90 tracking-tight">Novo Veículo</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {[
              { label: "Marca *", key: "brand", placeholder: "Ex: Toyota" },
              { label: "Modelo *", key: "model", placeholder: "Ex: Corolla" },
              { label: "Ano", key: "year", placeholder: "Ex: 2023" },
              { label: "Cor", key: "color", placeholder: "Ex: Prata" },
            ].map((field) => (
              <div key={field.key} className="space-y-2">
                <label className="text-[10px] text-white/40 tracking-[0.12em] uppercase">{field.label}</label>
                <Input
                  value={(form as any)[field.key]}
                  onChange={(e) => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className={inputClass}
                />
              </div>
            ))}
            <div className="space-y-2">
              <label className="text-[10px] text-white/40 tracking-[0.12em] uppercase">Combustível</label>
              <Select value={form.fuel} onValueChange={(v) => setForm(p => ({ ...p, fuel: v }))}>
                <SelectTrigger className="bg-transparent border-0 border-b border-white/[0.08] rounded-none h-10 text-[13px] text-white/70 focus:ring-0"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent className="bg-[#0a0a0c] border-white/[0.08]">
                  <SelectItem value="flex">Flex</SelectItem>
                  <SelectItem value="gasolina">Gasolina</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="eletrico">Elétrico</SelectItem>
                  <SelectItem value="hibrido">Híbrido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-white/40 tracking-[0.12em] uppercase">Status</label>
              <Select value={form.status} onValueChange={(v) => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger className="bg-transparent border-0 border-b border-white/[0.08] rounded-none h-10 text-[13px] text-white/70 focus:ring-0"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0a0a0c] border-white/[0.08]">
                  <SelectItem value="disponivel">Disponível</SelectItem>
                  <SelectItem value="reservado">Reservado</SelectItem>
                  <SelectItem value="vendido">Vendido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-white/40 tracking-[0.12em] uppercase">Km</label>
              <Input type="number" value={form.km} onChange={(e) => setForm(p => ({ ...p, km: e.target.value }))} placeholder="Ex: 45000" className={inputClass} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-white/40 tracking-[0.12em] uppercase">Preço (R$)</label>
              <Input type="number" value={form.price} onChange={(e) => setForm(p => ({ ...p, price: e.target.value }))} placeholder="Ex: 85000" className={inputClass} />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-[10px] text-white/40 tracking-[0.12em] uppercase">Imagens (URLs)</label>
              <Input value={form.images} onChange={(e) => setForm(p => ({ ...p, images: e.target.value }))} placeholder="URLs separadas por vírgula" className={inputClass} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setOpenModal(false)} className="h-11 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/50 hover:text-white/70 transition-all duration-300 cursor-pointer">
              Cancelar
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !form.brand || !form.model}
              className="h-11 px-6 rounded-xl bg-gradient-to-r from-[hsl(210,100%,55%)] to-[hsl(195,90%,50%)] text-white font-medium text-[13px] border-0 cursor-pointer hover:shadow-[0_0_30px_hsl(210,100%,55%,0.2)] transition-all duration-500"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Stock;
