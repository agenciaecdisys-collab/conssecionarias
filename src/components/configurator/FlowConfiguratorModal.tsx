import { useState, useCallback } from "react";
import { RotateCcw, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AgentChat from "./AgentChat";

interface FlowConfiguratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealershipId: string | null;
  hasExistingFlow: boolean;
}

const FlowConfiguratorModal = ({
  open,
  onOpenChange,
  dealershipId,
  hasExistingFlow,
}: FlowConfiguratorModalProps) => {
  const [hasConversation, setHasConversation] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [showConfirmRestart, setShowConfirmRestart] = useState(false);
  const [chatKey, setChatKey] = useState(0);

  const handleOpenChange = (value: boolean) => {
    if (!value && hasConversation) {
      setShowConfirmClose(true);
      return;
    }
    onOpenChange(value);
  };

  const confirmClose = () => {
    setShowConfirmClose(false);
    setHasConversation(false);
    setChatKey(prev => prev + 1);
    onOpenChange(false);
  };

  const handleRestart = () => {
    if (hasConversation) {
      setShowConfirmRestart(true);
      return;
    }
    setChatKey(prev => prev + 1);
  };

  const confirmRestart = () => {
    setShowConfirmRestart(false);
    setHasConversation(false);
    setChatKey(prev => prev + 1);
  };

  const handleFlowSaved = () => {
    setHasConversation(false);
    setChatKey(prev => prev + 1);
    onOpenChange(false);
  };

  const handleConversationChange = useCallback((has: boolean) => {
    setHasConversation(has);
  }, []);

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b border-border/50 shrink-0">
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="text-lg font-semibold">
                Configurar Fluxo de Atendimento
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestart}
                className="text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                Recomeçar
              </Button>
            </div>
            {hasExistingFlow && (
              <p className="text-sm text-amber-400/80 flex items-center gap-1.5 mt-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Você já tem um fluxo configurado. Ao continuar, ele será substituído.
              </p>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <AgentChat
              key={chatKey}
              dealershipId={dealershipId}
              onFlowSaved={handleFlowSaved}
              onConversationChange={handleConversationChange}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de fechar */}
      <Dialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sair da configuração?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza? O progresso da conversa será perdido.
          </p>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" className="border-border" onClick={() => setShowConfirmClose(false)}>
              Continuar configurando
            </Button>
            <Button onClick={confirmClose} variant="destructive">
              Sair
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de recomeçar */}
      <Dialog open={showConfirmRestart} onOpenChange={setShowConfirmRestart}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Recomeçar configuração?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza? Todas as respostas da conversa atual serão perdidas.
          </p>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" className="border-border" onClick={() => setShowConfirmRestart(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmRestart} variant="destructive">
              Recomeçar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FlowConfiguratorModal;
