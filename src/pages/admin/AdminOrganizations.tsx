import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, Plus, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

const AdminOrganizations = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: dealerships, isLoading } = useQuery({
    queryKey: ["admin-dealerships"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealerships")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === "ativo" ? "inativo" : "ativo";
      const { error } = await supabase
        .from("dealerships")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dealerships"] });
      toast({ title: "Status atualizado com sucesso" });
    },
  });

  const deleteDealership = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("delete_dealership_complete", { p_dealership_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dealerships"] });
      toast({ title: "Concessionaria removida" });
    },
    onError: () => {
      toast({ title: "Erro ao remover", variant: "destructive" });
    },
  });

  const filtered = (dealerships ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between"
      >
        <div>
          <h1 className="text-[22px] font-light tracking-tight text-white/90">Concessionarias</h1>
          <p className="text-[13px] text-white/40 mt-1">
            {dealerships?.length ?? 0} cadastradas
          </p>
        </div>
        <Button
          onClick={() => navigate("/admin/organizations/new")}
          className="bg-white/[0.05] border border-white/[0.08] text-white/70 hover:bg-white/[0.08] hover:text-white/90 hover:border-white/[0.15] transition-all duration-300 h-10 px-5 text-[13px] tracking-wide cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Concessionaria
        </Button>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="relative"
      >
        <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
        <Input
          placeholder="Buscar concessionaria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-0 border-b border-white/[0.06] rounded-none pl-7 h-11 text-[13px] text-white/70 placeholder:text-white/25 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300"
        />
      </motion.div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full bg-white/[0.02] rounded-lg" />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-white/[0.04] overflow-hidden"
        >
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="text-left p-4 text-[10px] text-white/40 font-normal tracking-[0.12em] uppercase">Concessionaria</th>
                <th className="text-left p-4 text-[10px] text-white/40 font-normal tracking-[0.12em] uppercase hidden md:table-cell">CNPJ</th>
                <th className="text-left p-4 text-[10px] text-white/40 font-normal tracking-[0.12em] uppercase hidden md:table-cell">Responsavel</th>
                <th className="text-left p-4 text-[10px] text-white/40 font-normal tracking-[0.12em] uppercase">Plano</th>
                <th className="text-left p-4 text-[10px] text-white/40 font-normal tracking-[0.12em] uppercase">Status</th>
                <th className="text-left p-4 text-[10px] text-white/40 font-normal tracking-[0.12em] uppercase hidden sm:table-cell">Cadastro</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition-colors duration-300 group"
                  onClick={() => navigate(`/admin/organizations/${c.id}/edit`)}
                >
                  <td className="p-4">
                    <p className="font-normal text-white/70 group-hover:text-white/90 transition-colors duration-300">{c.name}</p>
                    <p className="text-[11px] text-white/35 mt-0.5">{c.email}</p>
                  </td>
                  <td className="p-4 text-white/100 hidden md:table-cell font-light">{c.cnpj}</td>
                  <td className="p-4 text-white/100 hidden md:table-cell font-light">{c.responsible}</td>
                  <td className="p-4">
                    <span className="text-[10px] text-white/40 tracking-wider uppercase font-normal">{c.plan}</span>
                  </td>
                  <td className="p-4">
                    <button
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStatus.mutate({ id: c.id, status: c.status ?? "" });
                      }}
                    >
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-normal tracking-wider border transition-colors duration-300 ${
                          c.status === "ativo"
                            ? "bg-emerald-500/10 text-emerald-400/70 border-emerald-500/20 hover:bg-emerald-500/15"
                            : "bg-white/[0.03] text-white/100 border-white/[0.06] hover:bg-white/[0.05]"
                        }`}
                      >
                        {c.status === "ativo" ? "Ativo" : "Inativo"}
                      </Badge>
                    </button>
                  </td>
                  <td className="p-4 text-white/35 hidden sm:table-cell text-[11px] font-light">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString("pt-BR") : "--"}
                  </td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="text-white/25 hover:text-red-400/60 transition-colors duration-300 cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-[#0c0c0e] border-white/[0.06]">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white/90 font-light text-lg">Remover concessionaria?</AlertDialogTitle>
                          <AlertDialogDescription className="text-white/100 text-[13px]">
                            Esta acao nao pode ser desfeita. Todos os dados da concessionaria serao removidos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-white/[0.03] border-white/[0.06] text-white/50 hover:bg-white/[0.06] hover:text-white/70">
                            Cancelar
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteDealership.mutate(c.id)}
                            className="bg-red-500/10 text-red-400/80 border border-red-500/20 hover:bg-red-500/20"
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-16 text-center">
                    <Building2 className="w-6 h-6 mx-auto mb-3 text-white/8" />
                    <p className="text-[13px] text-white/100">Nenhuma concessionaria encontrada</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
};

export default AdminOrganizations;
