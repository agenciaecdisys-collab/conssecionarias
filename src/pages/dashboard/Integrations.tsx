import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Plug,
  Phone,
  Loader2,
  Wifi,
  WifiOff,
  RefreshCw,
  Calendar,
  Tag,
  CircleDot,
  Copy,
  Check,
  MessageSquare,
  ArrowRight,
  Shield,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDealership } from "@/hooks/useDealership";
import { supabase } from "@/integrations/supabase/client";
import { generateSlug } from "@/lib/utils";
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

const API_BASE = import.meta.env.VITE_WEBHOOK_BASE_URL || "https://webhook.fgrsolutions.com.br/webhook";
const POLL_INTERVAL = 3000;
const POLL_TIMEOUT = 120000;

type ConnectionStatus = "sucesso" | "conectando" | "desconectado" | null;

interface InstanceDetails {
  profileName: string;
  profilePicUrl: string;
  owner: string;
  adminField01: string;
  created: string;
}

const inputClass =
  "bg-transparent border-0 border-b border-white/[0.06] rounded-none h-11 text-[13px] text-white placeholder:text-white/40 px-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300";

const Integrations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { dealershipId, dealership } = useDealership();

  const [phone, setPhone] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [instanceDetails, setInstanceDetails] =
    useState<InstanceDetails | null>(null);
  const [copied, setCopied] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingStartRef = useRef<number>(0);

  const instanceSlug = dealership?.name
    ? generateSlug(dealership.name)
    : "";

  const { data: instance, isLoading } = useQuery({
    queryKey: ["whatsapp-instance", dealershipId],
    queryFn: async () => {
      if (!dealershipId) return null;
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("dealership_id", dealershipId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!dealershipId,
  });

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setPolling(false);
    setPairCode(null);
  }, []);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const checkInstanceStatus = useCallback(
    async (instanceName: string, token: string) => {
      const res = await fetch(`${API_BASE}/verificar-instancia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceName, token }),
      });
      const json = await res.json();
      const item = Array.isArray(json) ? json[0] : json;
      return (item?.response ?? null) as ConnectionStatus;
    },
    []
  );

  const fetchInstanceDetails = useCallback(
    async (instanceName: string, token: string) => {
      const res = await fetch(`${API_BASE}/listar-instancia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceName, token }),
      });
      const json = await res.json();
      const item = Array.isArray(json) ? json[0] : json;
      setInstanceDetails(item);
      return item;
    },
    []
  );

  useEffect(() => {
    if (!instance?.instance_name || !instance?.token || polling) {
      if (!polling) setConnectionStatus(null);
      return;
    }
    const fetchStatus = async () => {
      setStatusLoading(true);
      try {
        const status = await checkInstanceStatus(
          instance.instance_name!,
          instance.token!
        );
        setConnectionStatus(status);

        const dbStatus =
          status === "sucesso"
            ? "connected"
            : status === "conectando"
              ? "connecting"
              : "disconnected";
        if (instance.status !== dbStatus) {
          await supabase
            .from("whatsapp_instances")
            .update({ status: dbStatus })
            .eq("id", instance.id);
          queryClient.invalidateQueries({
            queryKey: ["whatsapp-instance", dealershipId],
          });
        }

        await fetchInstanceDetails(
          instance.instance_name!,
          instance.token!
        );
      } catch {
        toast({
          title: "Erro ao verificar instancia",
          variant: "destructive",
        });
      } finally {
        setStatusLoading(false);
      }
    };
    fetchStatus();
  }, [
    instance,
    polling,
    toast,
    dealershipId,
    queryClient,
    checkInstanceStatus,
    fetchInstanceDetails,
  ]);

  const startPolling = useCallback(
    (slug: string, token: string) => {
      setPolling(true);
      pollingStartRef.current = Date.now();

      pollingRef.current = setInterval(async () => {
        const elapsed = Date.now() - pollingStartRef.current;
        if (elapsed >= POLL_TIMEOUT) {
          stopPolling();
          setConnecting(false);
          toast({
            title: "Tempo esgotado. Tente novamente.",
            variant: "destructive",
          });
          return;
        }

        try {
          const status = await checkInstanceStatus(slug, token);

          if (status === "sucesso") {
            stopPolling();

            if (!dealershipId) return;
            await supabase
              .from("whatsapp_instances")
              .update({ status: "connected" })
              .eq("dealership_id", dealershipId);

            await fetchInstanceDetails(slug, token);

            queryClient.invalidateQueries({
              queryKey: ["whatsapp-instance", dealershipId],
            });
            setConnecting(false);
            setPhone("");
            toast({ title: "WhatsApp conectado com sucesso!" });
          }
        } catch (err: any) {
          stopPolling();
          setConnecting(false);
          toast({
            title: "Erro na verificacao",
            description: err.message,
            variant: "destructive",
          });
        }
      }, POLL_INTERVAL);
    },
    [
      dealershipId,
      queryClient,
      stopPolling,
      toast,
      checkInstanceStatus,
      fetchInstanceDetails,
    ]
  );

  const handleConnect = async () => {
    if (!instanceSlug || !phone || !dealershipId) return;
    setConnecting(true);

    try {
      const createRes = await fetch(`${API_BASE}/criar-instancia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceName: instanceSlug,
          phoneNumber: phone,
        }),
      });
      const createJson = await createRes.json();
      const createItem = Array.isArray(createJson)
        ? createJson[0]
        : createJson;

      const inst = createItem?.instance;
      if (!inst?.id) {
        throw new Error(
          createItem?.response ?? "Erro ao criar instancia"
        );
      }

      const { error: insertError } = await supabase
        .from("whatsapp_instances")
        .insert({
          dealership_id: dealershipId,
          instance_name: inst.name ?? instanceSlug,
          instance_id: inst.id,
          token: inst.token ?? createItem?.token,
          phone,
          status: "disconnected",
        });
      if (insertError) throw insertError;

      queryClient.invalidateQueries({
        queryKey: ["whatsapp-instance", dealershipId],
      });

      const instanceToken = inst.token ?? createItem?.token;
      const connectRes = await fetch(`${API_BASE}/conectar-instancia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceName: instanceSlug,
          token: instanceToken,
          phoneNumber: phone,
        }),
      });
      const connectJson = await connectRes.json();
      const connectItem = Array.isArray(connectJson)
        ? connectJson[0]
        : connectJson;
      const pairingCode = connectItem?.paircode;

      if (!pairingCode) {
        throw new Error("Codigo de pareamento nao recebido");
      }

      setPairCode(pairingCode);
      startPolling(instanceSlug, instanceToken);
    } catch (err: any) {
      setConnecting(false);
      toast({
        title: "Erro ao conectar WhatsApp",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    if (!dealershipId) return;
    setDisconnecting(true);
    try {
      const { error } = await supabase
        .from("whatsapp_instances")
        .delete()
        .eq("dealership_id", dealershipId);
      if (error) throw error;
      queryClient.invalidateQueries({
        queryKey: ["whatsapp-instance", dealershipId],
      });
      setConnectionStatus(null);
      setInstanceDetails(null);
      toast({ title: "WhatsApp desconectado" });
    } catch (err: any) {
      toast({
        title: "Erro ao desconectar",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!instance?.instance_name || !instance?.token) return;
    setStatusLoading(true);
    try {
      const status = await checkInstanceStatus(
        instance.instance_name,
        instance.token
      );
      setConnectionStatus(status);
      await fetchInstanceDetails(
        instance.instance_name,
        instance.token
      );
      const labels: Record<string, string> = {
        sucesso: "Conectado",
        conectando: "Conectando",
        desconectado: "Desconectado",
      };
      toast({ title: `Status: ${labels[status!] ?? "Desconhecido"}` });
    } catch {
      toast({
        title: "Erro ao verificar status",
        variant: "destructive",
      });
    } finally {
      setStatusLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!pairCode) return;
    navigator.clipboard.writeText(pairCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="space-y-8 max-w-3xl">
        <div>
          <Skeleton className="h-6 w-32 bg-white/[0.03]" />
          <Skeleton className="h-4 w-48 mt-2 bg-white/[0.02]" />
        </div>
        <Skeleton className="h-[400px] w-full bg-white/[0.02] rounded-xl" />
      </div>
    );
  }

  /* ══════════════════════════════════════════════ */
  /* ── Pairing Code Screen ── */
  /* ══════════════════════════════════════════════ */
  if (pairCode && polling) {
    return (
      <div className="space-y-8 max-w-3xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-[22px] font-light tracking-tight text-white/90">
            Integracoes
          </h1>
          <p className="text-[13px] text-white/60 mt-1">
            Pareamento em andamento
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-white/[0.04] bg-white/[0.015] overflow-hidden"
        >
          {/* Top accent line */}
          <div
            className="h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, hsl(175,70%,45%,0.4), hsl(210,100%,55%,0.3), transparent)",
            }}
          />

          <div className="p-8 space-y-8">
            {/* Icon + title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/[0.08] border border-primary/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-[15px] font-normal text-white/90">
                  Codigo de Pareamento
                </h2>
                <p className="text-[11px] text-white/50 mt-0.5">
                  Digite o codigo no seu WhatsApp
                </p>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {[
                "Abra o WhatsApp no seu celular",
                "Toque em Configuracoes > Dispositivos conectados > Conectar dispositivo",
                "Toque em Conectar com numero de telefone",
                "Digite o codigo abaixo",
              ].map((step, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 text-[12px] text-white/70"
                >
                  <span className="w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center text-[10px] text-white/50 shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>

            {/* Pairing code display */}
            <div className="flex justify-center">
              <div className="relative group">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-10 py-6">
                  <p className="text-[36px] font-light tracking-[0.4em] text-center text-white/90 font-mono">
                    {pairCode}
                  </p>
                </div>
                {/* Copy button */}
                <button
                  onClick={handleCopyCode}
                  className="absolute -top-3 -right-3 w-8 h-8 rounded-lg bg-[#0c0c0e] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white/70 hover:border-white/[0.15] transition-all duration-300 cursor-pointer opacity-0 group-hover:opacity-100"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Polling indicator */}
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"
                  style={{ animationDelay: "0.3s" }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"
                  style={{ animationDelay: "0.6s" }}
                />
              </div>
              <span className="text-[12px] text-white/60">
                Aguardando conexao...
              </span>
            </div>

            {/* Cancel */}
            <div className="flex justify-center">
              <button
                onClick={() => {
                  stopPolling();
                  setConnecting(false);
                }}
                className="text-[12px] text-white/50 hover:text-white/80 transition-colors duration-300 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════ */
  /* ── Connected Instance ── */
  /* ══════════════════════════════════════════════ */
  if (instance) {
    const isConnected = connectionStatus === "sucesso";
    const isConnecting = connectionStatus === "conectando";
    const details = instanceDetails;

    return (
      <div className="space-y-8 max-w-3xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-end justify-between"
        >
          <div>
            <h1 className="text-[22px] font-light tracking-tight text-white/90">
              Integracoes
            </h1>
            <p className="text-[13px] text-white/60 mt-1">
              Gerencie suas conexoes
            </p>
          </div>
          <button
            onClick={handleRefreshStatus}
            disabled={statusLoading}
            className="flex items-center gap-2 px-4 h-9 rounded-lg text-[12px] tracking-wide text-white/60 hover:text-white/80 border border-white/[0.06] hover:border-white/[0.1] transition-all duration-300 cursor-pointer disabled:opacity-30"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${statusLoading ? "animate-spin" : ""}`}
            />
            Atualizar
          </button>
        </motion.div>

        {/* WhatsApp Connection Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-white/[0.04] overflow-hidden"
        >
          {/* Status accent line */}
          <div
            className="h-px"
            style={{
              background: isConnected
                ? "linear-gradient(90deg, transparent, hsl(175,70%,45%,0.5), hsl(160,60%,45%,0.3), transparent)"
                : isConnecting
                  ? "linear-gradient(90deg, transparent, hsl(40,90%,55%,0.4), transparent)"
                  : "linear-gradient(90deg, transparent, hsl(0,72%,50%,0.3), transparent)",
            }}
          />

          {statusLoading ? (
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-5">
                <Skeleton className="w-16 h-16 rounded-full bg-white/[0.03]" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-40 bg-white/[0.03]" />
                  <Skeleton className="h-3 w-28 bg-white/[0.02]" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-20 rounded-xl bg-white/[0.02]"
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Profile section */}
              <div className="p-8 pb-6">
                <div className="flex items-center gap-5">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {details?.profilePicUrl ? (
                      <img
                        src={details.profilePicUrl}
                        alt="Perfil WhatsApp"
                        className="w-16 h-16 rounded-full object-cover ring-2 ring-white/[0.06]"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-white/[0.04] ring-2 ring-white/[0.06] flex items-center justify-center">
                        <MessageSquare className="w-7 h-7 text-white/40" />
                      </div>
                    )}
                    {/* Online indicator */}
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-[3px] border-[#08080a] ${
                        isConnected
                          ? "bg-emerald-400"
                          : isConnecting
                            ? "bg-amber-400"
                            : "bg-red-400/60"
                      }`}
                    />
                  </div>

                  {/* Name & status */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[18px] font-light text-white truncate">
                      {details?.profileName ?? instance.instance_name ?? "--"}
                    </h2>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] tracking-[0.05em] uppercase font-normal border ${
                          isConnected
                            ? "bg-emerald-500/[0.08] text-emerald-400/80 border-emerald-500/15"
                            : isConnecting
                              ? "bg-amber-500/[0.08] text-amber-400/80 border-amber-500/15"
                              : "bg-red-500/[0.06] text-red-400/60 border-red-500/10"
                        }`}
                      >
                        <CircleDot className="w-2.5 h-2.5" />
                        {isConnected
                          ? "Conectado"
                          : isConnecting
                            ? "Conectando"
                            : "Desconectado"}
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp icon */}
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/10 flex items-center justify-center shrink-0">
                    <svg
                      viewBox="0 0 24 24"
                      className="w-5 h-5 text-emerald-400"
                      fill="currentColor"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Details grid */}
              <div className="px-8 pb-6">
                <div className="grid grid-cols-3 gap-3">
                  {/* Connection type */}
                  <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-4 hover:border-white/[0.08] transition-all duration-300 group">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-primary/[0.06] border border-primary/10 flex items-center justify-center">
                        <Tag className="w-3.5 h-3.5 text-primary/80" />
                      </div>
                    </div>
                    <p className="text-[10px] text-white/50 tracking-[0.08em] uppercase">
                      Conexao
                    </p>
                    <p className="text-[13px] text-white font-light mt-0.5 truncate">
                      {details?.adminField01 ?? "--"}
                    </p>
                  </div>

                  {/* Phone */}
                  <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-4 hover:border-white/[0.08] transition-all duration-300 group">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-accent/[0.06] border border-accent/10 flex items-center justify-center">
                        <Phone className="w-3.5 h-3.5 text-accent/80" />
                      </div>
                    </div>
                    <p className="text-[10px] text-white/50 tracking-[0.08em] uppercase">
                      Telefone
                    </p>
                    <p className="text-[13px] text-white font-light mt-0.5 truncate">
                      {details?.owner ?? instance.phone ?? "--"}
                    </p>
                  </div>

                  {/* Created */}
                  <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-4 hover:border-white/[0.08] transition-all duration-300 group">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/[0.06] border border-purple-500/10 flex items-center justify-center">
                        <Calendar className="w-3.5 h-3.5 text-purple-400/80" />
                      </div>
                    </div>
                    <p className="text-[10px] text-white/50 tracking-[0.08em] uppercase">
                      Criado em
                    </p>
                    <p className="text-[13px] text-white font-light mt-0.5">
                      {details?.created
                        ? new Date(details.created).toLocaleDateString(
                            "pt-BR",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          )
                        : "--"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="px-8 py-5 border-t border-white/[0.03] flex items-center">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      disabled={disconnecting}
                      className="flex items-center gap-2 text-[12px] text-red-400/60 hover:text-red-400 transition-colors duration-300 cursor-pointer disabled:opacity-30 ml-auto"
                    >
                      {disconnecting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <WifiOff className="w-3.5 h-3.5" />
                      )}
                      Desconectar
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-[#0c0c0e] border-white/[0.06]">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white/90 font-light text-lg">
                        Desconectar WhatsApp?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-white/60 text-[13px] leading-relaxed">
                        Ao desconectar, voce nao recebera mais mensagens
                        pelo AutoGest.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-white/[0.03] border-white/[0.06] text-white/50 hover:bg-white/[0.06] hover:text-white/70">
                        Cancelar
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDisconnect}
                        className="bg-red-500/10 text-red-400/80 border border-red-500/20 hover:bg-red-500/20"
                      >
                        Desconectar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════ */
  /* ── Connect Form (no instance) ── */
  /* ══════════════════════════════════════════════ */
  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-[22px] font-light tracking-tight text-white/90">
          Integracoes
        </h1>
        <p className="text-[13px] text-white/60 mt-1">
          Conecte seus servicos
        </p>
      </motion.div>

      {/* WhatsApp card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-xl border border-white/[0.04] bg-white/[0.015] overflow-hidden"
      >
        {/* Top accent line */}
        <div
          className="h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, hsl(210,100%,55%,0.3), hsl(175,70%,45%,0.2), transparent)",
          }}
        />

        <div className="p-8 space-y-8">
          {/* Header row */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/10 flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  className="w-6 h-6 text-emerald-400"
                  fill="currentColor"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div>
                <h2 className="text-[15px] font-normal text-white/90">
                  WhatsApp Business
                </h2>
                <p className="text-[11px] text-white/50 mt-0.5">
                  Receba e gerencie conversas pelo AutoGest
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] tracking-[0.05em] uppercase text-white/40 border border-white/[0.06]">
              <WifiOff className="w-2.5 h-2.5" />
              Desconectado
            </div>
          </div>

          {/* Separator */}
          <div className="h-px bg-white/[0.03]" />

          {/* Features preview */}
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                icon: MessageSquare,
                title: "Mensagens",
                desc: "Receba mensagens direto no painel",
              },
              {
                icon: Shield,
                title: "Agent IA",
                desc: "Respostas automaticas inteligentes",
              },
              {
                icon: Plug,
                title: "Integracao",
                desc: "Conexao segura e estavel",
              },
            ].map((feat, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0 mt-0.5">
                  <feat.icon className="w-4 h-4 text-white/40" />
                </div>
                <div>
                  <p className="text-[12px] text-white/80">{feat.title}</p>
                  <p className="text-[10px] text-white/45 mt-0.5">
                    {feat.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Separator */}
          <div className="h-px bg-white/[0.03]" />

          {/* Form */}
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-2.5">
              <label className="text-[10px] font-normal text-white/60 tracking-[0.1em] uppercase block">
                Nome da Empresa
              </label>
              <Input
                value={instanceSlug}
                readOnly
                className={`${inputClass} text-white/60 cursor-default`}
              />
            </div>
            <div className="space-y-2.5">
              <label className="text-[10px] font-normal text-white/60 tracking-[0.1em] uppercase block">
                Telefone
              </label>
              <Input
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, ""))
                }
                placeholder="DDI + DDD + Numero"
                className={inputClass}
              />
            </div>
          </div>

          {/* Connect button */}
          <button
            onClick={handleConnect}
            disabled={connecting || !instanceSlug || !phone}
            className="w-full h-12 rounded-xl text-[13px] tracking-wide text-white bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 group"
          >
            {connecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4" />
                Conectar WhatsApp
                <ArrowRight className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Integrations;
