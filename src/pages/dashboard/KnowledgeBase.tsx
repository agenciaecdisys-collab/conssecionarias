import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Trash2, Plus, HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDealership } from "@/hooks/useDealership";
import { supabase } from "@/integrations/supabase/client";

const KnowledgeBase = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { dealershipId } = useDealership();
  const [showFaqForm, setShowFaqForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");

  const { data: files, isLoading: loadingFiles } = useQuery({
    queryKey: ["kb-files", dealershipId],
    queryFn: async () => {
      if (!dealershipId) return [];
      const { data, error } = await supabase
        .from("knowledge_base_files")
        .select("*")
        .eq("dealership_id", dealershipId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!dealershipId,
  });

  const { data: faqs, isLoading: loadingFaqs } = useQuery({
    queryKey: ["faqs", dealershipId],
    queryFn: async () => {
      if (!dealershipId) return [];
      const { data, error } = await supabase
        .from("faqs")
        .select("*")
        .eq("dealership_id", dealershipId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!dealershipId,
  });

  const deleteFile = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("knowledge_base_files").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-files", dealershipId] });
      toast({ title: "Arquivo removido" });
    },
  });

  const addFaq = useMutation({
    mutationFn: async () => {
      if (!dealershipId) throw new Error("Sem dealership");
      const { error } = await supabase.from("faqs").insert({
        dealership_id: dealershipId,
        question: newQuestion,
        answer: newAnswer,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqs", dealershipId] });
      toast({ title: "FAQ adicionada" });
      setNewQuestion("");
      setNewAnswer("");
      setShowFaqForm(false);
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const deleteFaq = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("faqs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqs", dealershipId] });
      toast({ title: "FAQ removida" });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !dealershipId) return;

    const path = `${dealershipId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("knowledge-base")
      .upload(path, file);

    if (uploadError) {
      toast({ title: "Erro ao enviar arquivo", variant: "destructive" });
      return;
    }

    const { data: urlData } = supabase.storage.from("knowledge-base").getPublicUrl(path);

    const { error } = await supabase.from("knowledge_base_files").insert({
      dealership_id: dealershipId,
      file_name: file.name,
      file_size: `${(file.size / 1024).toFixed(0)} KB`,
      file_url: urlData.publicUrl,
      status: "processando",
    });

    if (error) {
      toast({ title: "Erro ao salvar arquivo", variant: "destructive" });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["kb-files", dealershipId] });
    toast({ title: "Arquivo enviado com sucesso!" });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Base de Conhecimento</h1>
      </div>

      <Tabs defaultValue="files">
        <TabsList className="glass-card bg-transparent border border-border/50">
          <TabsTrigger value="files" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <FileText className="w-4 h-4 mr-2" /> Arquivos
          </TabsTrigger>
          <TabsTrigger value="faq" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <HelpCircle className="w-4 h-4 mr-2" /> FAQ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="space-y-4 mt-4">
          <motion.label
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-8 border-dashed border-2 border-border/50 text-center cursor-pointer glass-hover block"
          >
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Arraste arquivos aqui ou clique para upload</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, DOC, TXT (max. 10MB)</p>
            <input type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={handleFileUpload} />
          </motion.label>

          {loadingFiles ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (files ?? []).length === 0 ? (
            <div className="glass-card p-8 text-center text-muted-foreground text-sm">
              Nenhum arquivo enviado
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              {(files ?? []).map((f) => (
                <div key={f.id} className="flex items-center justify-between p-4 border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{f.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.file_size} {f.created_at ? `· ${new Date(f.created_at).toLocaleDateString("pt-BR")}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={f.status === "ativo" ? "default" : "secondary"} className="text-[10px]">
                      {f.status === "ativo" ? "Ativo" : f.status === "erro" ? "Erro" : "Processando..."}
                    </Badge>
                    <button
                      onClick={() => deleteFile.mutate(f.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="faq" className="space-y-4 mt-4">
          {loadingFaqs ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            (faqs ?? []).map((faq) => (
              <motion.div key={faq.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold mb-2">{faq.question}</p>
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </div>
                  <button
                    onClick={() => deleteFaq.mutate(faq.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors ml-3"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))
          )}

          {showFaqForm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 space-y-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Pergunta</label>
                <Input value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} className="bg-secondary/50 border-border" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Resposta</label>
                <Textarea value={newAnswer} onChange={(e) => setNewAnswer(e.target.value)} className="bg-secondary/50 border-border" />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => addFaq.mutate()} disabled={addFaq.isPending || !newQuestion || !newAnswer} className="gradient-primary border-0">
                  {addFaq.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Salvar
                </Button>
                <Button variant="outline" onClick={() => setShowFaqForm(false)} className="border-border">Cancelar</Button>
              </div>
            </motion.div>
          )}

          <Button variant="outline" className="border-border w-full" onClick={() => setShowFaqForm(true)}>
            <Plus className="w-4 h-4 mr-2" /> Adicionar Pergunta
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default KnowledgeBase;
