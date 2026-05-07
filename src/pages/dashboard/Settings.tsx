import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, Loader2, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDealership } from "@/hooks/useDealership";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { dealershipId } = useDealership();

  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [responsible, setResponsible] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [website, setWebsite] = useState("");
  const [adminPhone, setAdminPhone] = useState("");

  const { data: dealership, isLoading } = useQuery({
    queryKey: ["dealership-settings", dealershipId],
    queryFn: async () => {
      if (!dealershipId) return null;
      const { data, error } = await supabase
        .from("dealerships")
        .select("*")
        .eq("id", dealershipId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!dealershipId,
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
      setAdminPhone(dealership.admin_phone ?? "");
    }
  }, [dealership]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!dealershipId) throw new Error("Sem dealership");
      const { error } = await supabase
        .from("dealerships")
        .update({
          name,
          cnpj,
          responsible,
          phone,
          email,
          address,
          city,
          state,
          website,
          admin_phone: adminPhone,
        })
        .eq("id", dealershipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dealership-settings", dealershipId] });
      toast({ title: "Configurações salvas com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !dealershipId) return;

    const ext = file.name.split(".").pop();
    const path = `${dealershipId}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("dealership-logos")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Erro ao enviar logo", variant: "destructive" });
      return;
    }

    const { data: urlData } = supabase.storage
      .from("dealership-logos")
      .getPublicUrl(path);

    await supabase
      .from("dealerships")
      .update({ logo_url: urlData.publicUrl })
      .eq("id", dealershipId);

    queryClient.invalidateQueries({ queryKey: ["dealership-settings", dealershipId] });
    toast({ title: "Logo atualizado!" });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <SettingsIcon className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Dados da Concessionária</h2>
        </div>

        {/* Logo */}
        <div className="flex items-center gap-4">
          {dealership?.logo_url ? (
            <img src={dealership.logo_url} alt="Logo" className="w-16 h-16 rounded-lg object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-secondary/50 flex items-center justify-center">
              <Upload className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div>
            <label className="cursor-pointer text-sm text-primary hover:underline">
              {dealership?.logo_url ? "Alterar logo" : "Enviar logo"}
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
            <p className="text-[10px] text-muted-foreground">PNG ou JPG, max 2MB</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Nome</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary/50 border-border" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">CNPJ</label>
            <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} className="bg-secondary/50 border-border" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Responsável</label>
            <Input value={responsible} onChange={(e) => setResponsible(e.target.value)} className="bg-secondary/50 border-border" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Telefone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-secondary/50 border-border" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-secondary/50 border-border" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Website</label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} className="bg-secondary/50 border-border" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Endereço</label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} className="bg-secondary/50 border-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Cidade</label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} className="bg-secondary/50 border-border" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Estado</label>
              <Input value={state} onChange={(e) => setState(e.target.value)} className="bg-secondary/50 border-border" />
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-5 mt-2">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Número Admin</label>
            <Input
              value={adminPhone}
              onChange={(e) => setAdminPhone(e.target.value)}
              placeholder="Ex: 5511999999999"
              className="bg-secondary/50 border-border max-w-sm"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Número do administrador responsável por enviar veículos para o estoque via WhatsApp.
            </p>
          </div>
        </div>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gradient-primary border-0 gradient-glow"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar Configurações"
          )}
        </Button>
      </motion.div>
    </div>
  );
};

export default Settings;
