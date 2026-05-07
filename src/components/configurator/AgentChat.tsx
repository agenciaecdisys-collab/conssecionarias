import { useState, useRef, useEffect } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sendToAgent } from "@/services/configuratorAgent";
import { detectGeneratedFlow } from "@/utils/flowDetector";
import ChatBubble from "./ChatBubble";
import TypingIndicator from "./TypingIndicator";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: 'Olá! Vou te ajudar a configurar o fluxo de atendimento do seu agente de WhatsApp. São algumas perguntas rápidas sobre como funciona o processo de vendas da sua loja.\n\nVamos lá: quando um cliente chega no WhatsApp, qual a primeira coisa que você quer que o agente faça? Por exemplo: dar boas-vindas e perguntar o nome, já perguntar qual carro interessa, ou algo diferente?',
  timestamp: new Date(),
};

const MAX_INPUT_LENGTH = 2000;

interface AgentChatProps {
  dealershipId: string | null;
  onFlowSaved: () => void;
  onConversationChange: (hasConversation: boolean) => void;
}

const AgentChat = ({ dealershipId, onFlowSaved, onConversationChange }: AgentChatProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    onConversationChange(messages.length > 1);
  }, [messages.length, onConversationChange]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (flow: string) => {
      if (!dealershipId) throw new Error("Sem dealership");
      const { error } = await supabase
        .from("agent_configs")
        .upsert(
          { dealership_id: dealershipId, system_prompt: flow },
          { onConflict: "dealership_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-config", dealershipId] });
      setIsSaved(true);
    },
    onError: (err: any) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    },
  });

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: input.trim(), timestamp: new Date() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendToAgent(
        updated.map(m => ({ role: m.role, content: m.content }))
      );
      const assistantMsg: Message = { role: 'assistant', content: response, timestamp: new Date() };
      setMessages(prev => [...prev, assistantMsg]);

      const flow = detectGeneratedFlow(response);
      if (flow) {
        saveMutation.mutate(flow);
      }
    } catch {
      toast({ title: "Erro na comunicação", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isSaved) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center space-y-2"
        >
          <h2 className="text-xl font-bold">Agent Configurado com Sucesso</h2>
          <p className="text-sm text-muted-foreground">
            O fluxo de atendimento foi salvo. Seu agente já está atualizado e pronto para usar.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Button onClick={onFlowSaved} className="gradient-primary border-0">
            Fechar
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 pr-2">
        <div ref={scrollRef} className="flex flex-col gap-4 p-4">
          {messages.map((msg, i) => (
            <ChatBubble key={i} role={msg.role} content={msg.content} timestamp={msg.timestamp} />
          ))}
          {isLoading && <TypingIndicator />}
          {saveMutation.isPending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-sm text-muted-foreground px-4 py-2"
            >
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Salvando fluxo de atendimento...
            </motion.div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-border/50 p-4 shrink-0">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT_LENGTH))}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua resposta..."
              disabled={isLoading || saveMutation.isPending}
              rows={1}
              className="w-full resize-none bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 max-h-32 overflow-y-auto"
              style={{ minHeight: '44px' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 128) + 'px';
              }}
            />
            {input.length > MAX_INPUT_LENGTH * 0.9 && (
              <span className="absolute bottom-1 right-2 text-[10px] text-muted-foreground">
                {input.length}/{MAX_INPUT_LENGTH}
              </span>
            )}
          </div>
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading || saveMutation.isPending}
            size="icon"
            className="gradient-primary border-0 rounded-xl h-[44px] w-[44px] shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AgentChat;
