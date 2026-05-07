import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useDealership } from "@/hooks/useDealership";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const UsersPage = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { dealershipId, dealership } = useDealership();
    const [showForm, setShowForm] = useState(false);
    const [newName, setNewName] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const { data: users, isLoading } = useQuery({
        queryKey: ["users", dealershipId],
        queryFn: async () => {
            if (!dealershipId) return [];
            const { data, error } = await supabase
                .from("profiles")
                .select("id, full_name, role, created_at")
                .eq("dealership_id", dealershipId)
                .order("created_at", { ascending: true });
            if (error) throw error;
            return data;
        },
        enabled: !!dealershipId,
    });

    const maxUsers = dealership?.max_users ?? 3;
    const canAddMore = (users?.length ?? 0) < maxUsers;

    const createUser = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.rpc("create_vendor_user", {
                p_email: newEmail,
                p_password: newPassword,
                p_full_name: newName,
            });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users", dealershipId] });
            toast({ title: "Vendedor criado com sucesso!" });
            setShowForm(false);
            setNewName("");
            setNewEmail("");
            setNewPassword("");
        },
        onError: (err: any) => {
            toast({
                title: "Erro ao criar usuário",
                description: err.message.includes("Limite")
                    ? "Limite de usuários atingido para o seu plano."
                    : err.message,
                variant: "destructive",
            });
        },
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newEmail || !newPassword) {
            toast({ title: "Preencha todos os campos", variant: "destructive" });
            return;
        }
        if (newPassword.length < 6) {
            toast({ title: "Senha deve ter pelo menos 6 caracteres", variant: "destructive" });
            return;
        }
        createUser.mutate();
    };

    if (isLoading) {
        return (
            <div className="space-y-6 max-w-3xl">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Usuários</h1>
                    <p className="text-sm text-muted-foreground">
                        {users?.length ?? 0} de {maxUsers} usuários
                        <Badge variant="secondary" className="ml-2 text-[10px] capitalize">
                            Plano {dealership?.plan ?? "--"}
                        </Badge>
                    </p>
                </div>
                {canAddMore ? (
                    <Button
                        onClick={() => setShowForm(!showForm)}
                        className="gradient-primary border-0 gradient-glow"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Novo Vendedor
                    </Button>
                ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <AlertCircle className="w-4 h-4" />
                        Limite de usuários atingido
                    </div>
                )}
            </div>

            {showForm && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-5"
                >
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" /> Novo Vendedor
                    </h3>
                    <form onSubmit={handleCreate} className="space-y-3">
                        <div>
                            <label className="text-sm text-muted-foreground mb-1 block">Nome completo</label>
                            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: João da Silva" className="bg-secondary/50 border-border" />
                        </div>
                        <div>
                            <label className="text-sm text-muted-foreground mb-1 block">Email</label>
                            <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="joao@concessionaria.com" className="bg-secondary/50 border-border" />
                        </div>
                        <div>
                            <label className="text-sm text-muted-foreground mb-1 block">Senha</label>
                            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="bg-secondary/50 border-border" />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button type="submit" disabled={createUser.isPending} className="gradient-primary border-0">
                                {createUser.isPending ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando...</>
                                ) : (
                                    "Criar Vendedor"
                                )}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-border">
                                Cancelar
                            </Button>
                        </div>
                    </form>
                </motion.div>
            )}

            <div className="glass-card overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border/50">
                            <th className="text-left p-3 text-muted-foreground font-medium">Nome</th>
                            <th className="text-left p-3 text-muted-foreground font-medium">Função</th>
                            <th className="text-left p-3 text-muted-foreground font-medium hidden sm:table-cell">Desde</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(users ?? []).map((u) => (
                            <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-border/30">
                                <td className="p-3 font-medium">{u.full_name}</td>
                                <td className="p-3">
                                    <Badge variant={u.role === "manager" ? "default" : "secondary"} className="text-[10px] capitalize">
                                        {u.role === "manager" ? "Gerente" : "Vendedor"}
                                    </Badge>
                                </td>
                                <td className="p-3 text-muted-foreground hidden sm:table-cell">
                                    {u.created_at ? new Date(u.created_at).toLocaleDateString("pt-BR") : "--"}
                                </td>
                            </motion.tr>
                        ))}
                        {(users ?? []).length === 0 && (
                            <tr>
                                <td colSpan={3} className="p-8 text-center text-muted-foreground text-sm">
                                    Nenhum usuário encontrado
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UsersPage;
