import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Key, Phone, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

const AdminSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openaiKey, setOpenaiKey] = useState("");
  const [supportWhatsapp, setSupportWhatsapp] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["global-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("global_settings")
        .select("*")
        .eq("id", SETTINGS_ID)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      setOpenaiKey(settings.openai_api_key ?? "");
      setSupportWhatsapp(settings.support_whatsapp ?? "");
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("global_settings")
        .update({
          openai_api_key: openaiKey,
          support_whatsapp: supportWhatsapp,
        })
        .eq("id", SETTINGS_ID);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global-settings"] });
      toast({ title: "Configuracoes salvas com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao salvar configuracoes", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-2xl">
        <Skeleton className="h-7 w-48 bg-white/[0.03]" />
        <Skeleton className="h-52 w-full bg-white/[0.02] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-2xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-[22px] font-light tracking-tight text-white/90">Configuracoes</h1>
        <p className="text-[13px] text-white/40 mt-1">Integracoes e configuracoes globais</p>
      </motion.div>

      {/* Settings card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-8 space-y-8"
      >
        <div>
          <h2 className="text-[13px] text-white/40 tracking-[0.1em] uppercase font-normal">Integracao</h2>
        </div>

        {/* OpenAI Key */}
        <div className="space-y-3">
          <label className="text-[11px] font-normal text-white/45 tracking-[0.1em] uppercase flex items-center gap-2">
            <Key className="w-3.5 h-3.5" />
            OpenAI API Key
          </label>
          <Input
            type="password"
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder="sk-..."
            className="bg-transparent border-0 border-b border-white/[0.06] rounded-none h-11 text-[13px] text-white/70 placeholder:text-white/25 px-0 font-mono focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300"
          />
        </div>

        {/* WhatsApp */}
        <div className="space-y-3">
          <label className="text-[11px] font-normal text-white/45 tracking-[0.1em] uppercase flex items-center gap-2">
            <Phone className="w-3.5 h-3.5" />
            WhatsApp de Suporte
          </label>
          <Input
            type="tel"
            value={supportWhatsapp}
            onChange={(e) => setSupportWhatsapp(e.target.value)}
            placeholder="5511999999999"
            className="bg-transparent border-0 border-b border-white/[0.06] rounded-none h-11 text-[13px] text-white/70 placeholder:text-white/25 px-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300"
          />
        </div>

        {/* Save button */}
        <div className="pt-2">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-white/[0.05] border border-white/[0.08] text-white/70 hover:bg-white/[0.08] hover:text-white/90 hover:border-white/[0.15] transition-all duration-300 h-11 px-6 text-[13px] tracking-wide cursor-pointer group"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                Salvar Configuracoes
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform duration-300" />
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminSettings;
