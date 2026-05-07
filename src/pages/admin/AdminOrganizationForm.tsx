import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, Users, Bot, Loader2, Plug, Settings, Sparkles, Trash2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

/* ── Shared field component ── */
const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-2.5">
    <label className="text-[11px] font-normal text-white/45 tracking-[0.1em] uppercase block">
      {label}
    </label>
    {children}
  </div>
);

const inputClass =
  "bg-transparent border-0 border-b border-white/[0.06] rounded-none h-11 text-[13px] text-white/70 placeholder:text-white/25 px-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300";

/* ── Section wrapper ── */
const Section = ({
  icon: Icon,
  title,
  children,
  delay = 0,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-8 space-y-7"
  >
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-white/20" />
      <h2 className="text-[13px] text-white/40 tracking-[0.1em] uppercase font-normal">
        {title}
      </h2>
    </div>
    {children}
  </motion.div>
);

/* ══════════════════════════════════════════════════════════════ */

const AdminOrganizationForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [responsible, setResponsible] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [website, setWebsite] = useState("");
  const [plan, setPlan] = useState<string>("starter");
  const [status, setStatus] = useState(true);

  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [configuringWebhook, setConfiguringWebhook] = useState(false);
  const [creatingFlow, setCreatingFlow] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Sem ID");
      const { error } = await supabase.rpc("delete_dealership_complete", { p_dealership_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dealerships"] });
      toast({ title: "Concessionária removida com sucesso" });
      navigate("/admin/organizations");
    },
    onError: (err: any) => {
      toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
    },
  });

  const { data: dealership, isLoading: loadingDealership } = useQuery({
    queryKey: ["admin-dealership", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from("dealerships").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    enabled: isEdit,
  });

  const { data: users } = useQuery({
    queryKey: ["admin-dealership-users", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role, created_at")
        .eq("dealership_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: isEdit,
  });

  const { data: whatsappInstance } = useQuery({
    queryKey: ["admin-dealership-whatsapp", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("dealership_id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isEdit,
  });

  const { data: agentConfig } = useQuery({
    queryKey: ["admin-dealership-agent", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_configs")
        .select("assistant_name, tone, system_prompt, welcome_message, operating_hours_start, operating_hours_end")
        .eq("dealership_id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (dealership) {
      setName(dealership.name ?? "");
      setCnpj(dealership.cnpj ?? "");
      setResponsible(dealership.responsible ?? "");
      setPhone(dealership.phone ?? "");
      setEmail(dealership.email ?? "");
      setAddress(dealership.address ?? "");
      setCity(dealership.city ?? "");
      setState(dealership.state ?? "");
      setWebsite(dealership.website ?? "");
      setPlan(dealership.plan ?? "starter");
      setStatus(dealership.status === "ativo");
    }
  }, [dealership]);

  const getInstanceSlug = () => {
    const raw = dealership?.slug ?? dealership?.name ?? name;
    if (!raw) return "";
    return generateSlug(raw);
  };

  const handleConfigureWebhook = async () => {
    const slug = getInstanceSlug();
    if (!slug) {
      toast({ title: "Nome da concessionaria nao encontrado", variant: "destructive" });
      return;
    }
    setConfiguringWebhook(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_WEBHOOK_BASE_URL || "https://webhook.fgrsolutions.com.br/webhook"}/configurar-instancia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceName: slug, token: whatsappInstance?.token }),
      });
      if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
      toast({ title: "Webhook configurado com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao configurar webhook", description: err.message, variant: "destructive" });
    } finally {
      setConfiguringWebhook(false);
    }
  };

  const handleCreateFlow = async () => {
    const slug = getInstanceSlug();
    if (!slug) {
      toast({ title: "Nome da concessionaria nao encontrado", variant: "destructive" });
      return;
    }
    setCreatingFlow(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_WEBHOOK_BASE_URL || "https://webhook.fgrsolutions.com.br/webhook"}/criar-fluxo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceName: slug }),
      });
      if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
      toast({ title: "Fluxo criado com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao criar fluxo", description: err.message, variant: "destructive" });
    } finally {
      setCreatingFlow(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        const { error } = await supabase
          .from("dealerships")
          .update({
            name, cnpj, responsible, phone, email, address, city, state, website,
            plan: plan as "starter" | "pro" | "enterprise",
            status: status ? "ativo" : "inativo",
          })
          .eq("id", id!);
        if (error) throw error;
        toast({ title: "Concessionaria atualizada com sucesso" });
        queryClient.invalidateQueries({ queryKey: ["admin-dealerships"] });
      } else {
        if (!adminEmail || !adminPassword || !adminName) {
          toast({ title: "Preencha os dados do administrador", variant: "destructive" });
          setSaving(false);
          return;
        }
        const slug = generateSlug(name);
        const { error: rpcError } = await supabase.rpc("create_dealership_with_admin", {
          p_dealership_name: name,
          p_cnpj: cnpj || null,
          p_responsible: responsible || null,
          p_phone: phone || null,
          p_email: email || null,
          p_address: address || null,
          p_city: city || null,
          p_state: state || null,
          p_website: website || null,
          p_slug: slug,
          p_plan: plan,
          p_max_users: plan === "enterprise" ? 999 : plan === "pro" ? 10 : 3,
          p_admin_name: adminName,
          p_admin_email: adminEmail,
          p_admin_password: adminPassword,
        });
        if (rpcError) throw rpcError;
        toast({ title: "Concessionaria criada com sucesso!" });
        queryClient.invalidateQueries({ queryKey: ["admin-dealerships"] });
        navigate("/admin/organizations");
      }
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && loadingDealership) {
    return (
      <div className="space-y-8 max-w-4xl">
        <Skeleton className="h-7 w-64 bg-white/[0.03]" />
        <Skeleton className="h-64 w-full bg-white/[0.02] rounded-xl" />
        <Skeleton className="h-48 w-full bg-white/[0.02] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <button
          onClick={() => navigate("/admin/organizations")}
          className="text-white/35 hover:text-white/60 transition-colors duration-300 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-[22px] font-light tracking-tight text-white/90">
            {isEdit ? "Editar Concessionaria" : "Nova Concessionaria"}
          </h1>
          <p className="text-[13px] text-white/40 mt-0.5">
            {isEdit ? dealership?.name : "Preencha os dados abaixo"}
          </p>
        </div>
      </motion.div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Dealership Data */}
        <Section icon={Building2} title="Dados da Concessionaria" delay={0.05}>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
            <Field label="Nome">
              <Input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} placeholder="Nome da concessionaria" />
            </Field>
            <Field label="CNPJ">
              <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} className={inputClass} placeholder="00.000.000/0000-00" />
            </Field>
            <Field label="Responsavel">
              <Input value={responsible} onChange={(e) => setResponsible(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Telefone">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Website">
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Endereco">
              <Input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-6">
              <Field label="Cidade">
                <Input value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Estado">
                <Input value={state} onChange={(e) => setState(e.target.value)} className={inputClass} />
              </Field>
            </div>
            <Field label="Plano">
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full bg-transparent border-0 border-b border-white/[0.06] rounded-none h-11 text-[13px] text-white/70 px-0 focus:ring-0 focus:outline-none transition-all duration-300 cursor-pointer"
              >
                <option value="starter" className="bg-[#0c0c0e]">Starter</option>
                <option value="pro" className="bg-[#0c0c0e]">Pro</option>
                <option value="enterprise" className="bg-[#0c0c0e]">Enterprise</option>
              </select>
            </Field>
            {isEdit && (
              <div className="flex items-end gap-4 pb-1">
                <span className="text-[11px] text-white/45 tracking-[0.1em] uppercase">Status</span>
                <Switch checked={status} onCheckedChange={setStatus} />
                <span className={`text-[13px] ${status ? "text-emerald-400/60" : "text-white/100"}`}>
                  {status ? "Ativo" : "Inativo"}
                </span>
              </div>
            )}
          </div>
        </Section>

        {/* Admin User (create only) */}
        {!isEdit && (
          <Section icon={Users} title="Administrador da Concessionaria" delay={0.1}>
            <div className="grid sm:grid-cols-3 gap-x-8 gap-y-6">
              <Field label="Nome completo">
                <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} required className={inputClass} />
              </Field>
              <Field label="Email">
                <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required className={inputClass} />
              </Field>
              <Field label="Senha">
                <Input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required className={inputClass} placeholder="Min. 6 caracteres" />
              </Field>
            </div>
          </Section>
        )}

        {/* Edit-only sections */}
        {isEdit && (
          <>
            {/* WhatsApp Instance */}
            <Section icon={Plug} title="WhatsApp Instance" delay={0.1}>
              {whatsappInstance ? (
                <div className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4 text-[13px]">
                    <div className="space-y-1">
                      <span className="text-[10px] text-white/40 tracking-wider uppercase">Nome</span>
                      <p className="text-white/50">{whatsappInstance.instance_name ?? "--"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-white/40 tracking-wider uppercase">Telefone</span>
                      <p className="text-white/50">{whatsappInstance.phone ?? "--"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-white/40 tracking-wider uppercase">Status</span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] tracking-wider border ${
                          whatsappInstance.status === "connected"
                            ? "bg-emerald-500/10 text-emerald-400/70 border-emerald-500/20"
                            : "bg-white/[0.03] text-white/100 border-white/[0.06]"
                        }`}
                      >
                        {whatsappInstance.status}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-white/40 tracking-wider uppercase">Token</span>
                      <p className="font-mono text-[12px] text-white/100">
                        {whatsappInstance.token ? "***" + whatsappInstance.token.slice(-6) : "--"}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    disabled={configuringWebhook}
                    onClick={handleConfigureWebhook}
                    className="bg-white/[0.03] border border-white/[0.06] text-white/50 hover:bg-white/[0.06] hover:text-white/70 transition-all duration-300 text-[12px] tracking-wide cursor-pointer h-9"
                  >
                    {configuringWebhook ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                        Configurando...
                      </>
                    ) : (
                      <>
                        <Settings className="w-3.5 h-3.5 mr-2" />
                        Configurar Webhook
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <p className="text-[13px] text-white/100">Nenhuma instancia configurada</p>
              )}
            </Section>

            {/* Users */}
            {users && users.length > 0 && (
              <Section icon={Users} title={`Usuarios (${users.length})`} delay={0.15}>
                <div className="space-y-0">
                  {users.map((u, i) => (
                    <div
                      key={u.id}
                      className={`flex items-center justify-between py-3 ${
                        i < users.length - 1 ? "border-b border-white/[0.03]" : ""
                      }`}
                    >
                      <span className="text-[13px] text-white/50">{u.full_name}</span>
                      <span className="text-[10px] text-white/40 tracking-wider uppercase">{u.role}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Agent Config */}
            <Section icon={Bot} title="Agent IA" delay={0.2}>
              {agentConfig ? (
                <div className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4 text-[13px]">
                    <div className="space-y-1">
                      <span className="text-[10px] text-white/40 tracking-wider uppercase">Nome</span>
                      <p className="text-white/50">{agentConfig.assistant_name ?? "--"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-white/40 tracking-wider uppercase">Tom</span>
                      <p className="text-white/50 capitalize">{agentConfig.tone ?? "--"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-white/40 tracking-wider uppercase">Fluxo</span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] tracking-wider border ${
                          agentConfig.system_prompt
                            ? "bg-emerald-500/10 text-emerald-400/70 border-emerald-500/20"
                            : "bg-white/[0.03] text-white/100 border-white/[0.06]"
                        }`}
                      >
                        {agentConfig.system_prompt ? "Configurado" : "Nao configurado"}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    type="button"
                    disabled={creatingFlow}
                    onClick={handleCreateFlow}
                    className="bg-white/[0.03] border border-white/[0.06] text-white/50 hover:bg-white/[0.06] hover:text-white/70 transition-all duration-300 text-[12px] tracking-wide cursor-pointer h-9"
                  >
                    {creatingFlow ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                        Criando fluxo...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 mr-2" />
                        Criar Fluxo
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <p className="text-[13px] text-white/100">Nenhuma configuracao de agent encontrada</p>
              )}
            </Section>
          </>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-4 pt-2"
        >
          <Button
            type="submit"
            disabled={saving}
            className="bg-white/[0.05] border border-white/[0.08] text-white/70 hover:bg-white/[0.08] hover:text-white/90 hover:border-white/[0.15] transition-all duration-300 h-11 px-6 text-[13px] tracking-wide cursor-pointer group"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                {isEdit ? "Salvar Alteracoes" : "Criar Concessionaria"}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform duration-300" />
              </>
            )}
          </Button>

          <Button
            type="button"
            onClick={() => navigate("/admin/organizations")}
            className="bg-transparent border border-white/[0.04] text-white/100 hover:text-white/50 hover:border-white/[0.08] transition-all duration-300 h-11 px-6 text-[13px] tracking-wide cursor-pointer"
          >
            Cancelar
          </Button>

          {isEdit && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  disabled={deleteMutation.isPending}
                  className="ml-auto bg-transparent border border-red-500/10 text-red-400/40 hover:bg-red-500/10 hover:text-red-400/70 hover:border-red-500/20 transition-all duration-300 h-11 px-5 text-[13px] tracking-wide cursor-pointer"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#0c0c0e] border-white/[0.06]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white/90 font-light text-lg">
                    Excluir concessionária?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-white/100 text-[13px] leading-relaxed">
                    Esta ação não pode ser desfeita. Todos os dados da concessionária serão removidos
                    permanentemente, incluindo veículos, leads, conversas e usuários.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-white/[0.03] border-white/[0.06] text-white/50 hover:bg-white/[0.06] hover:text-white/70">
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate()}
                    className="bg-red-500/10 text-red-400/80 border border-red-500/20 hover:bg-red-500/20"
                  >
                    Sim, excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </motion.div>
      </form>
    </div>
  );
};

export default AdminOrganizationForm;
