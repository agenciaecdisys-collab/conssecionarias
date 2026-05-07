import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bot, MessageSquareText, MapPin, Pause, Loader2, Pencil, CheckCircle2 } from "lucide-react";
import FlowConfiguratorModal from "@/components/configurator/FlowConfiguratorModal";
import AddressForm, { type AddressData } from "@/components/ui/AddressForm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDealership } from "@/hooks/useDealership";
import { supabase } from "@/integrations/supabase/client";

interface AgentConfigData {
  assistant_name: string;
  tone: string;
  addressData: AddressData;
  pause_duration_seconds: number;
}

const emptyAddress: AddressData = {
  address: '',
  number: '',
  latitude: null,
  longitude: null,
};

const defaultConfig: AgentConfigData = {
  assistant_name: "",
  tone: "amigavel",
  addressData: { ...emptyAddress },
  pause_duration_seconds: 60,
};

function parseStoredAddress(raw: string | null): { address: string; number: string } {
  if (!raw) return { address: '', number: '' };
  try {
    const parsed = JSON.parse(raw);
    if (parsed.address) {
      return { address: parsed.address, number: parsed.number || '' };
    }
    if (parsed.street) {
      const parts = [parsed.street, parsed.neighborhood, parsed.city, parsed.state].filter(Boolean);
      return { address: parts.join(', '), number: parsed.number || '' };
    }
    return { address: '', number: '' };
  } catch {
    return { address: raw, number: '' };
  }
}

const AgentConfig = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { dealershipId } = useDealership();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<AgentConfigData>(defaultConfig);
  const [flowModalOpen, setFlowModalOpen] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ["agent-config", dealershipId],
    queryFn: async () => {
      if (!dealershipId) return null;
      const { data, error } = await supabase
        .from("agent_configs")
        .select("*")
        .eq("dealership_id", dealershipId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!dealershipId,
  });

  useEffect(() => {
    if (config) {
      const parsed = parseStoredAddress(config.address);
      setForm({
        assistant_name: config.assistant_name ?? "",
        tone: config.tone ?? "amigavel",
        addressData: {
          address: parsed.address,
          number: parsed.number,
          latitude: config.latitude ?? null,
          longitude: config.longitude ?? null,
        },
        pause_duration_seconds: config.pause_duration_seconds ?? 60,
      });
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!dealershipId) throw new Error("Sem dealership");
      const addr = form.addressData;
      const hasAddress = !!addr.address.trim();
      const { error } = await supabase
        .from("agent_configs")
        .upsert(
          {
            dealership_id: dealershipId,
            assistant_name: form.assistant_name,
            tone: form.tone,
            address: hasAddress
              ? JSON.stringify({ address: addr.address, number: addr.number })
              : null,
            latitude: hasAddress ? addr.latitude : null,
            longitude: hasAddress ? addr.longitude : null,
            pause_duration_seconds: form.pause_duration_seconds,
          },
          { onConflict: "dealership_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-config", dealershipId] });
      toast({ title: "Configuração salva com sucesso!" });
      setEditing(false);
    },
    onError: (err: any) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    },
  });

  const set = (key: keyof AgentConfigData, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const pauseMinutes = Math.round(form.pause_duration_seconds / 60);
  const setPauseMinutes = (minutes: number) => set("pause_duration_seconds", minutes * 60);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-8 w-64" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full" />
        ))}
      </div>
    );
  }

  const ReadOnlyField = ({ label, value }: { label: string; value: string | number | null }) => (
    <div className="py-1">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm">{value || "--"}</p>
    </div>
  );

  const toneLabels: Record<string, string> = {
    formal: "Formal",
    amigavel: "Amigável",
    tecnico: "Técnico",
  };

  const addr = form.addressData ?? emptyAddress;
  const hasCoordinates = addr.latitude != null && addr.longitude != null;
  const displayAddress = [addr.address, addr.number ? `Nº ${addr.number}` : ''].filter(Boolean).join(' — ') || '--';

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Configuração do Agent IA</h1>
        {!editing ? (
          <Button onClick={() => setEditing(true)} variant="outline" className="border-border">
            <Pencil className="w-4 h-4 mr-2" /> Editar
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="gradient-primary border-0"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salvar
            </Button>
            <Button variant="outline" onClick={() => setEditing(false)} className="border-border">
              Cancelar
            </Button>
          </div>
        )}
      </div>

      {/* Fluxo de Atendimento */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquareText className="w-6 h-6 text-primary" />
            <div>
              <h2 className="font-semibold">Fluxo de Atendimento</h2>
              <p className="text-sm text-muted-foreground">
                {config?.system_prompt
                  ? "Fluxo configurado ✓ — clique para reconfigurar"
                  : "Configure como seu agente conduz a conversa de vendas"}
              </p>
            </div>
          </div>
          <Button onClick={() => setFlowModalOpen(true)} className="gradient-primary border-0">
            {config?.system_prompt ? "Reconfigurar" : "Configurar Fluxo"}
          </Button>
        </div>
      </motion.div>

      {/* Identidade */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Identidade</h2>
        </div>
        {editing ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nome do Assistente</label>
              <Input value={form.assistant_name} onChange={(e) => set("assistant_name", e.target.value)} className="bg-secondary/50 border-border" placeholder="Ex: Ana" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Tom de Voz</label>
              <select value={form.tone} onChange={(e) => set("tone", e.target.value)} className="w-full glass-card px-3 py-2 text-sm bg-transparent rounded-lg text-foreground">
                <option value="formal">Formal</option>
                <option value="amigavel">Amigável</option>
                <option value="tecnico">Técnico</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1">
            <ReadOnlyField label="Nome do Assistente" value={form.assistant_name} />
            <ReadOnlyField label="Tom de Voz" value={toneLabels[form.tone] ?? form.tone} />
          </div>
        )}
      </motion.div>

      {/* Endereço da Loja */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-6 space-y-4 overflow-visible">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-5 h-5 text-accent" />
          <h2 className="font-semibold">Endereço da Loja</h2>
        </div>
        {editing ? (
          <AddressForm
            value={form.addressData}
            onChange={(data) => set("addressData", data)}
          />
        ) : (
          <div className="space-y-2">
            <ReadOnlyField label="Endereço" value={displayAddress} />
            {hasCoordinates && (
              <div className="flex items-center gap-1.5 text-xs text-green-500">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Coordenadas: {addr.latitude!.toFixed(6)}, {addr.longitude!.toFixed(6)}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Pausa do Agent */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Pause className="w-5 h-5 text-chart-4" />
          <h2 className="font-semibold">Pausa do Agent</h2>
        </div>
        {editing ? (
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Duração da pausa (minutos)</label>
            <Input type="number" min={1} value={pauseMinutes} onChange={(e) => setPauseMinutes(Number(e.target.value) || 1)} className="bg-secondary/50 border-border w-40" />
            <p className="text-[10px] text-muted-foreground mt-1">Tempo que o agent aguarda antes de responder</p>
          </div>
        ) : (
          <ReadOnlyField label="Duração da pausa" value={`${pauseMinutes} min`} />
        )}
      </motion.div>

      <FlowConfiguratorModal
        open={flowModalOpen}
        onOpenChange={setFlowModalOpen}
        dealershipId={dealershipId}
        hasExistingFlow={!!config?.system_prompt}
      />
    </div>
  );
};

export default AgentConfig;
