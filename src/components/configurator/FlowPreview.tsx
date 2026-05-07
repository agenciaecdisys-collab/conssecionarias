import { motion } from "framer-motion";
import { Sparkles, Save, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";

interface FlowPreviewProps {
  flow: string;
  onSave: () => void;
  onAdjust: () => void;
  isSaving: boolean;
}

const FlowPreview = ({ flow, onSave, onAdjust, isSaving }: FlowPreviewProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card border-primary/30 rounded-xl overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-primary/5">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm">Fluxo de Atendimento Gerado</span>
      </div>

      <ScrollArea className="h-[300px]">
        <div className="p-4 prose prose-sm prose-invert max-w-none">
          <ReactMarkdown>{flow}</ReactMarkdown>
        </div>
      </ScrollArea>

      <div className="flex items-center gap-2 px-4 py-3 border-t border-border/50">
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="gradient-primary border-0 flex-1"
        >
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar Fluxo
        </Button>
        <Button
          onClick={onAdjust}
          variant="outline"
          className="border-border"
          disabled={isSaving}
        >
          <Pencil className="w-4 h-4 mr-2" />
          Ajustar
        </Button>
      </div>
    </motion.div>
  );
};

export default FlowPreview;
