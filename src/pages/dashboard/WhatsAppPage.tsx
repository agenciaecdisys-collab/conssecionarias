import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Bot, User, Send, Calendar, Phone, Car, ChevronLeft, Check, Fuel, Gauge, Play, Pause, Mic, FileText, ChevronDown, Square, AudioLines, ImagePlus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDealership } from "@/hooks/useDealership";
import { supabase } from "@/integrations/supabase/client";

// --- Types ---

interface ChatMessage {
  type: "human" | "ai" | "tool";
  content: string;
  name?: string;
  tool_calls?: Array<{ id: string; name: string; args: any; type: string }>;
  tool_call_id?: string;
  additional_kwargs: Record<string, any>;
  response_metadata: Record<string, any>;
  invalid_tool_calls?: any[];
}

interface ChatRow {
  id: number;
  session_id: string;
  message: ChatMessage;
  data_e_hora: string;
  media: string | null;
  agent: boolean | null;
}

interface Lead {
  id: string;
  dealership_id: string;
  name: string | null;
  phone: string | null;
  vehicle_of_interest: string | null;
  tags: string[] | null;
  session_id: string | null;
  created_at: string | null;
}

// --- Helpers ---

const formatRelativeTime = (dateStr: string | null): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return "ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

function isVisibleMessage(row: ChatRow): boolean {
  const { type, tool_calls } = row.message;
  if (type === "ai" && tool_calls && tool_calls.length > 0) return false;
  return type === "human" || type === "ai" || type === "tool";
}

function formatToolName(name: string): string {
  return name.replace(/\d+$/, '').replace(/_/g, ' ').trim();
}

function extractHumanText(content: string): string {
  const marker = "Mensagem do cliente: ";
  const idx = content.indexOf(marker);
  if (idx !== -1) return content.substring(idx + marker.length).trim();
  return content;
}

const isAudioUrl = (url: string): boolean =>
  /\.(ogg|mp3|wav|opus|m4a|aac)(\?|$)/i.test(url);

function parseMedia(media: string | null): { type: "image" | "audio"; url: string }[] {
  if (!media || !media.trim()) return [];
  return media.split(",").map(u => u.trim()).filter(Boolean).map(url => ({
    type: isAudioUrl(url) ? "audio" as const : "image" as const,
    url,
  }));
}

function cleanContent(text: string): string {
  return text
    .replace(/\[IMAGENS\][\s\S]*?\[\/IMAGENS\]/g, "")
    .replace(/\[AUDIO\][\s\S]*?\[\/AUDIO\]/g, "")
    .trim();
}

const formatPhone = (raw: string | null): string => {
  if (!raw) return "--";
  const clean = raw.replace("@s.whatsapp.net", "").replace(/^55/, "");
  if (clean.length === 11) return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  if (clean.length === 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  return raw.replace("@s.whatsapp.net", "");
};

const fixImageUrl = (url: string): string => {
  const driveMatch = url.match(/(?:drive\.google\.com\/.*[?&]id=|drive\.google\.com\/file\/d\/)([a-zA-Z0-9_-]+)/);
  if (driveMatch) return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  return url;
};

const formatPrice = (value: number) => {
  const parts = value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).split(",");
  return { integer: parts[0], decimals: parts[1] };
};

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  disponivel: { label: "Disponível", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  reservado: { label: "Reservado", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  vendido: { label: "Vendido", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
};

const appointmentTypeLabels: Record<string, string> = {
  visita: "Visita",
  test_drive: "Test Drive",
  retorno: "Retorno",
  entrega: "Entrega",
};

// --- Audio Player Component (WhatsApp-style) ---

const WAVEFORM_BARS = 28;

function AudioPlayer({ src, isHuman }: { src: string; isHuman: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [bars] = useState(() =>
    Array.from({ length: WAVEFORM_BARS }, () => 0.15 + Math.random() * 0.85)
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  }, [playing]);

  const cycleSpeed = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    audio.playbackRate = next;
    setPlaybackRate(next);
  }, [playbackRate]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => setDuration(audio.duration || 0);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => { setPlaying(false); setCurrentTime(0); };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const progress = duration > 0 ? currentTime / duration : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * duration;
    setCurrentTime(audio.currentTime);
  };

  const formatTime = (t: number) => {
    if (!t || !isFinite(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2.5 min-w-[220px] max-w-[280px]">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
          isHuman
            ? "bg-white/[0.08] hover:bg-white/[0.12] text-white/70"
            : "bg-primary/20 hover:bg-primary/30 text-primary"
        }`}
      >
        {playing ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>

      {/* Waveform + time */}
      <div className="flex-1 min-w-0">
        {/* Waveform bars */}
        <div
          className="flex items-center gap-[2px] h-7 cursor-pointer"
          onClick={handleSeek}
        >
          {bars.map((h, i) => {
            const barProgress = i / bars.length;
            const isPlayed = barProgress < progress;
            return (
              <div
                key={i}
                className="flex-1 rounded-full transition-colors duration-150"
                style={{
                  height: `${h * 100}%`,
                  minWidth: "2.5px",
                  backgroundColor: isPlayed
                    ? isHuman
                      ? "rgba(255,255,255,0.7)"
                      : "hsl(210,100%,55%)"
                    : isHuman
                      ? "rgba(255,255,255,0.2)"
                      : "rgba(59,130,246,0.25)",
                }}
              />
            );
          })}
        </div>

        {/* Time + speed + mic */}
        <div className="flex items-center justify-between mt-0.5">
          <span
            className={`text-[10px] ${
              isHuman ? "text-white/40" : "text-primary/50"
            }`}
          >
            {playing || currentTime > 0
              ? formatTime(currentTime)
              : formatTime(duration)}
          </span>

          <div className="flex items-center gap-2">
            {playing && (
              <button
                onClick={cycleSpeed}
                className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full cursor-pointer transition-colors ${
                  isHuman
                    ? "bg-white/[0.08] text-white/50 hover:text-white/70"
                    : "bg-primary/10 text-primary/50 hover:text-primary/70"
                }`}
              >
                {playbackRate}x
              </button>
            )}
            <Mic
              className={`w-3 h-3 ${
                isHuman ? "text-white/20" : "text-primary/25"
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Component ---

const WhatsAppPage = () => {
  const { dealershipId } = useDealership();
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [expandedTranscriptions, setExpandedTranscriptions] = useState<Record<number, boolean>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [showDevicePicker, setShowDevicePicker] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleType, setScheduleType] = useState<"visita" | "test_drive" | "retorno" | "entrega">("visita");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: slug } = useQuery({
    queryKey: ["dealership-slug", dealershipId],
    queryFn: async () => {
      if (!dealershipId) return null;
      const { data, error } = await supabase
        .from("dealerships")
        .select("slug")
        .eq("id", dealershipId)
        .single();
      if (error) throw error;
      return data?.slug ?? null;
    },
    enabled: !!dealershipId,
  });

  const { data: leads, isLoading: loadingLeads } = useQuery({
    queryKey: ["whatsapp-leads", dealershipId],
    queryFn: async () => {
      if (!dealershipId) return [];
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("dealership_id", dealershipId)
        .not("session_id", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!dealershipId,
    refetchInterval: 10000,
  });

  const { data: lastMessages } = useQuery({
    queryKey: ["whatsapp-last-messages", slug],
    queryFn: async () => {
      if (!slug) return {};
      const tableName = `${slug}_chats`;
      const { data, error } = await (supabase as any)
        .from(tableName)
        .select("session_id, data_e_hora, message")
        .order("id", { ascending: false });
      if (error) return {};
      const map: Record<string, { time: string; preview: string }> = {};
      for (const row of data) {
        if (map[row.session_id]) continue;
        const msg = row.message as ChatMessage;
        if (msg.type === "tool" || (msg.type === "ai" && msg.tool_calls && msg.tool_calls.length > 0)) continue;
        const text = msg.type === "human" ? extractHumanText(msg.content) : msg.content;
        map[row.session_id] = { time: row.data_e_hora, preview: text.slice(0, 50) };
      }
      return map;
    },
    enabled: !!slug,
    refetchInterval: 5000,
  });

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles-list", dealershipId],
    queryFn: async () => {
      if (!dealershipId) return [];
      const { data, error } = await supabase
        .from("vehicles")
        .select("brand, model, year, slug")
        .eq("dealership_id", dealershipId);
      if (error) throw error;
      return data;
    },
    enabled: !!dealershipId,
  });

  const { data: lastChats } = useQuery({
    queryKey: ["last-chats-agent", slug, leads?.length],
    queryFn: async () => {
      if (!slug || !leads?.length) return {};
      const sessionIds = leads.filter(l => l.session_id).map(l => l.session_id!);
      const { data, error } = await (supabase as any)
        .from(`${slug}_chats`)
        .select("session_id, agent")
        .in("session_id", sessionIds)
        .order("id", { ascending: false });
      if (error) return {};
      const map: Record<string, boolean> = {};
      for (const row of (data ?? [])) {
        if (!(row.session_id in map)) {
          map[row.session_id] = row.agent ?? true;
        }
      }
      return map;
    },
    enabled: !!slug && !!leads?.length,
    refetchInterval: 10000,
  });

  const conversations = (leads ?? [])
    .filter((l) => l.session_id)
    .map((l) => ({
      ...l,
      lastTime: lastMessages?.[l.session_id!]?.time ?? l.created_at,
      lastPreview: lastMessages?.[l.session_id!]?.preview ?? "",
    }))
    .sort((a, b) => new Date(b.lastTime ?? 0).getTime() - new Date(a.lastTime ?? 0).getTime());

  const selectedLead = conversations.find((c) => c.session_id === selectedSessionId) ?? conversations[0];
  const activeSessionId = selectedSessionId ?? selectedLead?.session_id ?? null;

  const { data: chatRows, isLoading: loadingMsgs } = useQuery({
    queryKey: ["whatsapp-chat", slug, activeSessionId],
    queryFn: async () => {
      if (!slug || !activeSessionId) return [];
      const tableName = `${slug}_chats`;
      const { data, error } = await (supabase as any)
        .from(tableName)
        .select("*")
        .eq("session_id", activeSessionId)
        .order("id", { ascending: true });
      if (error) throw error;
      return data as ChatRow[];
    },
    enabled: !!slug && !!activeSessionId,
    refetchInterval: 5000,
  });

  const { data: vehicle } = useQuery({
    queryKey: ["vehicle-interest", selectedLead?.vehicle_of_interest, dealershipId],
    queryFn: async () => {
      if (!selectedLead?.vehicle_of_interest || !dealershipId) return null;
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("dealership_id", dealershipId)
        .eq("slug", selectedLead.vehicle_of_interest)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedLead?.vehicle_of_interest && !!dealershipId,
  });

  const { data: appointments } = useQuery({
    queryKey: ["lead-appointments", selectedLead?.id],
    queryFn: async () => {
      if (!selectedLead?.id) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("lead_id", selectedLead.id)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedLead?.id,
  });

  const visibleMessages = (chatRows ?? []).filter(isVisibleMessage);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages.length]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop()));
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter(d => d.kind === "audioinput");
        setAudioDevices(inputs);
        if (!selectedDeviceId && inputs.length > 0) {
          const def = inputs.find(d => d.deviceId === "default") ?? inputs[0];
          setSelectedDeviceId(def.deviceId);
        }
      } catch (err) {
        console.error("Erro ao listar dispositivos:", err);
      }
    };
    loadDevices();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setShowDevicePicker(false);
    if (showDevicePicker) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showDevicePicker]);

  const sendToWebhook = async (payload: Record<string, any>) => {
    setIsSending(true);
    try {
      await fetch(`${import.meta.env.VITE_WEBHOOK_BASE_URL || "https://webhook.fgrsolutions.com.br/webhook"}/enviar-mensagem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setMessage("");
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendText = () => {
    if (!message.trim() || !activeSessionId || !selectedLead?.phone) return;
    sendToWebhook({
      session_id: activeSessionId,
      numero_cliente: selectedLead.phone,
      funcao: "text",
      texto: message.trim(),
      empresa: slug,
    });
  };

  const handleSendAudioTTS = () => {
    if (!message.trim() || !activeSessionId || !selectedLead?.phone) return;
    sendToWebhook({
      session_id: activeSessionId,
      numero_cliente: selectedLead.phone,
      funcao: "audio",
      texto: message.trim(),
      empresa: slug,
    });
  };

  const handleSendImage = (file: File) => {
    if (!activeSessionId || !selectedLead?.phone) return;
    const reader = new FileReader();
    reader.onload = () => {
      sendToWebhook({
        session_id: activeSessionId,
        numero_cliente: selectedLead.phone,
        funcao: "image",
        base64: reader.result as string,
        arquivo_nome: file.name,
        empresa: slug,
      });
    };
    reader.readAsDataURL(file);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true
      });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(chunks, { type: "audio/webm" });

        const reader = new FileReader();
        reader.onload = () => {
          if (!activeSessionId || !selectedLead?.phone) return;
          const base64 = reader.result as string;
          sendToWebhook({
            session_id: activeSessionId,
            numero_cliente: selectedLead.phone,
            funcao: "audio_record",
            texto: "",
            base64,
            arquivo_nome: `audio_${Date.now()}.webm`,
            empresa: slug,
          });
        };
        reader.readAsDataURL(audioBlob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    mediaRecorderRef.current = null;
  };

  const formatRecTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleScheduleSubmit = async () => {
    if (!scheduleDate || !scheduleTime || !selectedLead?.id || !dealershipId) return;
    setScheduleSaving(true);
    try {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      const { error } = await supabase.from("appointments").insert({
        dealership_id: dealershipId,
        lead_id: selectedLead.id,
        type: scheduleType,
        scheduled_at: scheduledAt,
        notes: scheduleNotes || null,
        vehicle_id: null,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["lead-appointments", selectedLead.id] });
      setShowScheduleModal(false);
      setScheduleDate("");
      setScheduleTime("");
      setScheduleNotes("");
      setScheduleType("visita");
    } catch (err) {
      console.error("Erro ao criar agendamento:", err);
    } finally {
      setScheduleSaving(false);
    }
  };

  const filteredConvs = conversations.filter((c) => {
    if (searchQuery && !(c.name ?? "").toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (loadingLeads) {
    return (
      <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] gap-0 glass-card overflow-hidden">
        <div className="w-80 p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
        <div className="flex-1 p-4">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <Bot className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">Nenhuma conversa encontrada</p>
      </div>
    );
  }

  const renderBubbleContent = (row: ChatRow) => {
    const { type, content } = row.message;
    const rawText = type === "human" ? extractHumanText(content) : content;
    const text = cleanContent(rawText);
    const mediaItems = parseMedia(row.media);
    const hasAudio = mediaItems.some((m) => m.type === "audio");

    const transcriptionText = hasAudio && text ? text.trim() : null;
    const showFullText = !transcriptionText;
    const isExpanded = !!expandedTranscriptions[row.id];

    return (
      <>
        {/* Regular text (no audio transcription detected) */}
        {showFullText && text && (
          <p className="text-sm whitespace-pre-wrap">{text}</p>
        )}

        {/* Audio player */}
        {mediaItems.length > 0 && (
          <div className={`${showFullText && text ? "mt-2" : ""} flex flex-col gap-1`}>
            {mediaItems.map((item, i) =>
              item.type === "audio" ? (
                <AudioPlayer
                  key={i}
                  src={item.url}
                  isHuman={row.message.type === "human"}
                />
              ) : (
                <img
                  key={i}
                  src={fixImageUrl(item.url)}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="rounded-lg max-w-[300px] cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(item.url, "_blank")}
                />
              )
            )}
          </div>
        )}

        {/* Transcription toggle (only when audio + transcription detected) */}
        {transcriptionText && (
          <div className="mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpandedTranscriptions((prev) => ({
                  ...prev,
                  [row.id]: !prev[row.id],
                }));
              }}
              className={`flex items-center gap-1.5 text-[11px] cursor-pointer transition-colors duration-200 ${
                type === "human"
                  ? "text-white/40 hover:text-white/65"
                  : "text-primary/45 hover:text-primary/70"
              }`}
            >
              <FileText className="w-3 h-3" />
              {isExpanded ? "Ocultar transcricao" : "Mostrar transcricao"}
              <ChevronDown
                className={`w-3 h-3 transition-transform duration-200 ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div
                    className={`mt-2 pt-2 text-[12px] whitespace-pre-wrap leading-relaxed ${
                      type === "human"
                        ? "border-t border-white/[0.06] text-white/60"
                        : "border-t border-primary/10 text-white/55"
                    }`}
                  >
                    {transcriptionText}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] gap-0 glass-card overflow-hidden">
      {/* Conversation List */}
      <div className={`border-r border-border/50 flex flex-col shrink-0 w-full md:w-80 ${mobileView === "list" ? "flex" : "hidden"} md:flex`}>
        <div className="p-3 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/50 border-border text-sm h-9"
            />
          </div>
          <div className="flex gap-1 mt-2">
            {[
              { key: "all", label: "Todas" },
              { key: "unread", label: "Não lidas" },
              { key: "agent", label: "Agent" },
              { key: "human", label: "Humano" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`text-[10px] px-2 py-1 rounded-full transition-colors ${
                  filter === f.key ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {filteredConvs.map((conv) => {
            const isSelected = conv.session_id === activeSessionId;
            const vInfo = vehicles?.find(v => v.slug === conv.vehicle_of_interest);
            const vLabel = vInfo
              ? `${vInfo.brand} ${vInfo.model} ${vInfo.year ?? ""}`.trim()
              : conv.vehicle_of_interest;
            const isAgent = lastChats?.[conv.session_id!] ?? true;
            return (
              <div
                key={conv.session_id}
                onClick={() => { setSelectedSessionId(conv.session_id); setMobileView("chat"); }}
                className={`p-3 cursor-pointer border-b border-border/20 transition-colors ${
                  isSelected ? "bg-primary/5" : "hover:bg-secondary/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{conv.name ?? "Desconhecido"}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                    {formatRelativeTime(conv.lastTime)}
                  </span>
                </div>
                {vLabel && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    🚗 {vLabel}
                  </p>
                )}
                <p className={`text-[10px] mt-0.5 ${isAgent ? "text-green-400" : "text-muted-foreground"}`}>
                  {isAgent ? "🤖 Agent Ativo" : "👤 Atendente Humano"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col min-w-0 ${mobileView === "chat" ? "flex" : "hidden"} md:flex`}>
        <div className="p-3 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileView("list")}
              className="md:hidden mr-2 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-sm font-semibold">{selectedLead?.name ?? "Conversa"}</p>
              {(() => {
                const isAgent = activeSessionId ? (lastChats?.[activeSessionId] ?? true) : true;
                return (
                  <p className={`text-[10px] flex items-center gap-1 ${isAgent ? "text-green-400" : "text-muted-foreground"}`}>
                    {isAgent ? (
                      <><Bot className="w-3 h-3" /> Agent Ativo</>
                    ) : (
                      <><User className="w-3 h-3" /> Atendente Humano</>
                    )}
                  </p>
                );
              })()}
            </div>
          </div>
          <Button size="sm" variant="outline" className="text-xs border-border h-7" onClick={() => setShowScheduleModal(true)}>
            <Calendar className="w-3 h-3 mr-1" /> Agendar
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3">
          {loadingMsgs ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-2/3" />
              ))}
            </div>
          ) : (
            visibleMessages.map((row) => {
              if (row.message.type === "tool") {
                return (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-center"
                  >
                    <div className="flex items-center gap-2 bg-secondary/30 border border-border/30 rounded-lg px-3 py-1.5">
                      <Bot className="w-3.5 h-3.5 text-accent shrink-0" />
                      <span className="text-xs text-muted-foreground">
                        Acionamento de ferramenta: <span className="font-medium text-foreground/70">{formatToolName(row.message.name ?? "Ferramenta")}</span>
                      </span>
                      <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    </div>
                  </motion.div>
                );
              }

              const isHuman = row.message.type === "human";
              return (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isHuman ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                      isHuman
                        ? "bg-secondary/80 rounded-bl-sm"
                        : "bg-primary/20 rounded-br-sm"
                    }`}
                  >
                    {renderBubbleContent(row)}
                    <div className="flex items-center gap-1 justify-end mt-1">
                      {!isHuman && (
                        row.agent === false
                          ? <User className="w-2.5 h-2.5 text-muted-foreground" />
                          : <Bot className="w-2.5 h-2.5 text-accent" />
                      )}
                      <span className="text-[9px] text-muted-foreground">
                        {row.data_e_hora
                          ? new Date(row.data_e_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                          : ""}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className={`p-3 border-t transition-colors ${isRecording ? "border-red-500/20 bg-red-500/5" : "border-border/50"}`}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleSendImage(file);
              e.target.value = "";
            }}
          />

          {isRecording ? (
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-sm text-red-400 font-mono flex-1">
                {formatRecTime(recordingTime)} gravando...
              </span>
              <button
                onClick={stopRecording}
                className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors cursor-pointer"
              >
                <Square className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors cursor-pointer shrink-0"
                title="Enviar imagem"
              >
                <ImagePlus className="w-5 h-5" />
              </button>

              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite uma mensagem..."
                className="bg-secondary/50 border-border"
                disabled={isSending}
              />

              {message.trim() ? (
                <>
                  <button
                    onClick={handleSendAudioTTS}
                    disabled={isSending}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                    title="Enviar como áudio (TTS)"
                  >
                    <AudioLines className="w-5 h-5" />
                  </button>
                  <Button
                    onClick={handleSendText}
                    disabled={isSending}
                    className="gradient-primary border-0 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <div className="relative shrink-0">
                  <div className="flex items-center">
                    <button
                      onClick={startRecording}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors cursor-pointer"
                      title="Gravar áudio"
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowDevicePicker(!showDevicePicker); }}
                      className="p-1 -ml-1 rounded text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer"
                      title="Escolher microfone"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>

                  {showDevicePicker && (
                    <div className="absolute bottom-full right-0 mb-2 w-64 bg-[#0a0a0c] border border-border/50 rounded-lg shadow-xl z-50 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                      <div className="p-2 border-b border-border/30">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Selecionar microfone</p>
                      </div>
                      {audioDevices.map((device) => (
                        <button
                          key={device.deviceId}
                          onClick={() => {
                            setSelectedDeviceId(device.deviceId);
                            setShowDevicePicker(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer flex items-center gap-2 ${
                            selectedDeviceId === device.deviceId
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                          }`}
                        >
                          <Mic className="w-3 h-3 shrink-0" />
                          <span className="truncate">{device.label || `Microfone ${device.deviceId.slice(0, 8)}`}</span>
                          {selectedDeviceId === device.deviceId && (
                            <Check className="w-3 h-3 shrink-0 ml-auto" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Contact Details Sidebar */}
      <div className="w-72 border-l border-border/50 hidden xl:flex flex-col overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Nome */}
          <div className="text-center">
            <p className="font-semibold text-sm">{selectedLead?.name ?? "--"}</p>
          </div>

          {/* Telefone */}
          <div className="glass-card p-3">
            <p className="text-[10px] text-muted-foreground mb-1">Telefone</p>
            <p className="text-sm flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-muted-foreground" />
              {formatPhone(selectedLead?.phone ?? null)}
            </p>
          </div>

          {/* Veículo de Interesse */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-2">Veículo de Interesse</p>
            {vehicle ? (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                {vehicle.images && (vehicle.images as string[]).length > 0 ? (
                  <img
                    src={fixImageUrl((vehicle.images as string[])[0])}
                    alt={`${vehicle.brand} ${vehicle.model}`}
                    className="h-32 w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-32 w-full bg-secondary/30 flex items-center justify-center">
                    <Car className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
                <div className="p-3 space-y-1.5">
                  <p className="text-sm font-semibold truncate">{vehicle.brand} {vehicle.model}</p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {vehicle.year && <span>{vehicle.year}</span>}
                    {vehicle.color && <><span className="text-border">•</span><span>{vehicle.color}</span></>}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    {vehicle.km != null && (
                      <span className="flex items-center gap-1"><Gauge className="w-3 h-3" />{Number(vehicle.km).toLocaleString("pt-BR")} km</span>
                    )}
                    {vehicle.fuel && (
                      <span className="flex items-center gap-1"><Fuel className="w-3 h-3" />{vehicle.fuel}</span>
                    )}
                  </div>
                  {vehicle.price != null && (
                    <p className="text-sm font-bold text-primary">
                      R$ {formatPrice(Number(vehicle.price)).integer}
                      <span className="text-[10px] font-normal text-muted-foreground">,{formatPrice(Number(vehicle.price)).decimals}</span>
                    </p>
                  )}
                  {vehicle.status && statusConfig[vehicle.status] && (
                    <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border ${statusConfig[vehicle.status].bg} ${statusConfig[vehicle.status].border} ${statusConfig[vehicle.status].color}`}>
                      {statusConfig[vehicle.status].label}
                    </span>
                  )}
                </div>
              </div>
            ) : selectedLead?.vehicle_of_interest ? (
              <div className="glass-card p-3 flex items-center gap-2">
                <Car className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{selectedLead.vehicle_of_interest}</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/60">Sem veículo de interesse</p>
            )}
          </div>

          {/* Primeiro contato */}
          <div className="glass-card p-3">
            <p className="text-[10px] text-muted-foreground mb-1">Primeiro contato</p>
            <p className="text-sm">
              {selectedLead?.created_at
                ? new Date(selectedLead.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
                : "--"}
            </p>
          </div>

          {/* Agendamentos */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-2">Agendamentos</p>
            {appointments && appointments.length > 0 ? (
              <div className="space-y-2">
                {appointments.map((apt) => (
                  <div key={apt.id} className="glass-card p-2.5 flex items-start gap-2">
                    <Calendar className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium">
                        {appointmentTypeLabels[apt.type] ?? apt.type}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {apt.scheduled_at
                          ? new Date(apt.scheduled_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                          : "--"}
                      </p>
                      {apt.notes && (
                        <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">{apt.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/60">Nenhum agendamento</p>
            )}
          </div>

          {/* Tags */}
          {selectedLead?.tags && selectedLead.tags.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-2">Tags</p>
              <div className="flex gap-1 flex-wrap">
                {selectedLead.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Modal */}
      <AnimatePresence>
        {showScheduleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowScheduleModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="bg-[#0a0a0c] border border-border/50 rounded-xl w-full max-w-md mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-border/30">
                <h3 className="text-sm font-semibold">Novo Agendamento</h3>
                <button onClick={() => setShowScheduleModal(false)} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {selectedLead?.name && (
                  <p className="text-xs text-muted-foreground">
                    Lead: <span className="text-foreground font-medium">{selectedLead.name}</span>
                  </p>
                )}

                <div>
                  <label className="text-[11px] text-muted-foreground mb-1.5 block">Tipo</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["visita", "test_drive", "retorno", "entrega"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setScheduleType(t)}
                        className={`text-xs px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                          scheduleType === t
                            ? "bg-primary/15 border-primary/30 text-primary"
                            : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                        }`}
                      >
                        {appointmentTypeLabels[t]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1.5 block">Data</label>
                    <Input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="bg-secondary/50 border-border text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-1.5 block">Horário</label>
                    <Input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="bg-secondary/50 border-border text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground mb-1.5 block">Observações (opcional)</label>
                  <Input
                    value={scheduleNotes}
                    onChange={(e) => setScheduleNotes(e.target.value)}
                    placeholder="Ex: Cliente prefere período da tarde"
                    className="bg-secondary/50 border-border text-sm"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-border/30 flex gap-2 justify-end">
                <Button variant="outline" size="sm" className="text-xs border-border" onClick={() => setShowScheduleModal(false)}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="text-xs gradient-primary border-0"
                  disabled={!scheduleDate || !scheduleTime || scheduleSaving}
                  onClick={handleScheduleSubmit}
                >
                  {scheduleSaving ? "Salvando..." : "Agendar"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WhatsAppPage;
