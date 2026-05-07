import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

/* ═══════════════════════════════════════════════════════════════
   SPLASH INTRO — car drives across, then reveals login
   ═══════════════════════════════════════════════════════════════ */
const SplashIntro = ({ onComplete, label }: { onComplete: () => void; label?: string }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center overflow-hidden"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(210,100%,55%,0.04) 0%, transparent 70%)",
        }}
      />

      {/* Road line */}
      <div
        className="absolute top-[58%] left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent 5%, hsl(210,100%,55%,0.08) 25%, hsl(210,100%,55%,0.08) 75%, transparent 95%)",
        }}
      />

      {/* Car driving across */}
      <motion.div
        className="absolute top-[52%] pointer-events-none"
        initial={{ x: "-180px" }}
        animate={{ x: "calc(100vw + 180px)" }}
        transition={{ duration: 3, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {/* Light trail */}
        <div
          className="absolute top-1/2 right-[55%] -translate-y-1/2 w-[280px] h-[2px]"
          style={{
            background: "linear-gradient(90deg, transparent, hsl(210,100%,55%,0.12), hsl(210,100%,60%,0.35))",
          }}
        />
        {/* Glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[140px] rounded-full"
          style={{
            background: "radial-gradient(ellipse, hsl(210,100%,55%,0.08) 0%, transparent 70%)",
          }}
        />
        {/* Car */}
        <img
          src="/logo.png"
          alt=""
          className="h-16 w-auto relative z-10 drop-shadow-[0_0_25px_hsl(210,100%,55%,0.35)]"
        />
      </motion.div>

      {/* Brand — appears and stays */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative z-10 flex flex-col items-center gap-5"
      >
        <img src="/logo.png" alt="AutoGest" className="h-12 w-auto" />
        <span className="text-[12px] font-medium tracking-[0.25em] text-white/40 uppercase">
          AutoGest
        </span>
        {label && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-[10px] text-white/25 tracking-[0.15em] uppercase mt-1"
          >
            {label}
          </motion.span>
        )}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="flex items-center gap-2 mt-2"
        >
          <motion.div
            className="w-1 h-1 rounded-full bg-blue-500/60"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="w-1 h-1 rounded-full bg-blue-500/60"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div
            className="w-1 h-1 rounded-full bg-blue-500/60"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN LOGIN
   ═══════════════════════════════════════════════════════════════ */
const Login = () => {
  const navigate = useNavigate();
  const { signIn, user, role, isAdmin, loading } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const location = useLocation();
  const splashShownFor = useRef<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [showTransition, setShowTransition] = useState(false);
  const pendingRedirect = useRef<string | null>(null);

  // Show splash on every fresh navigation to /login
  useEffect(() => {
    const key = location.key ?? "default";
    if (splashShownFor.current !== key) {
      splashShownFor.current = key;
      setShowSplash(true);
    }
  }, [location.key]);

  // Redirect after auth — show transition splash first
  useEffect(() => {
    if (!loading && user) {
      let dest = "/dashboard";
      if (isAdmin) dest = "/admin";
      else if (role === "vendor") dest = "/dashboard/calendar";

      pendingRedirect.current = dest;
      setShowTransition(true);
    }
  }, [user, loading, isAdmin, role]);

  const handleTransitionComplete = () => {
    if (pendingRedirect.current) {
      navigate(pendingRedirect.current, { replace: true });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      setSubmitting(false);
      toast({
        title: "Erro ao entrar",
        description:
          error === "Invalid login credentials" ? "Email ou senha incorretos" : error,
        variant: "destructive",
      });
    }
    // Sucesso: onAuthStateChange vai disparar → loadUserData → loading false → redirect
  };

  return (
    <>
      {/* ── Splash Intro (ao abrir a página) ── */}
      <AnimatePresence>
        {showSplash && !showTransition && (
          <SplashIntro onComplete={() => setShowSplash(false)} />
        )}
      </AnimatePresence>

      {/* ── Transition Splash (após login bem-sucedido) ── */}
      <AnimatePresence>
        {showTransition && (
          <SplashIntro
            onComplete={handleTransitionComplete}
            label="Acessando painel..."
          />
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-black relative overflow-hidden selection:bg-blue-500/20">

        {/* ── Single ambient glow — barely visible, bottom-left ── */}
        <div
          className="absolute bottom-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(210,100%,55%,0.04) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(175,70%,45%,0.025) 0%, transparent 70%)",
          }}
        />

        {/* ── Full-screen grid layout ── */}
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 relative">

          {/* ════════════════════════════════════════════════════════
              LEFT — Giant Typography Panel
              ════════════════════════════════════════════════════════ */}
          <div className="hidden lg:flex flex-col justify-between p-10 xl:p-14 2xl:p-20 relative overflow-hidden">

            {/* Top wordmark */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="flex items-center gap-3"
            >
              <img src="/logo.png" alt="AutoGest" className="h-8 w-auto" />
              <span className="text-[11px] font-medium tracking-[0.2em] text-white/40 uppercase">
                AutoGest
              </span>
            </motion.div>

            {/* Center: The oversized statement */}
            <div className="flex-1 flex items-center">
              <div className="space-y-10">
                {/* Giant headline */}
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h1
                    className="font-extralight leading-[0.9] tracking-[-0.04em] text-white/[0.88]"
                    style={{ fontSize: "clamp(3.5rem, 7vw, 8rem)" }}
                  >
                    Gestão
                    <br />
                    <span className="font-light gradient-text">
                      automotiva.
                    </span>
                  </h1>
                </motion.div>

                {/* Thin separator line */}
                <motion.div
                  className="h-px w-20 origin-left"
                  style={{
                    background: "linear-gradient(90deg, hsl(210,100%,55%,0.6), hsl(175,70%,45%,0.4))",
                  }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ delay: 1.2, duration: 0.8, ease: "easeOut" }}
                />

                {/* Subline */}
                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1, duration: 0.8 }}
                  className="text-[15px] leading-[1.9] text-white/30 max-w-[420px] font-light"
                >
                  Estoque, vendas, leads e atendimento — tudo em uma plataforma
                  que transforma a operação da sua concessionária.
                </motion.p>

                {/* Metrics row */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.4, duration: 0.8 }}
                  className="flex gap-14 pt-4"
                >
                  {[
                    { value: "500+", label: "Concessionárias" },
                    { value: "99.9%", label: "Uptime" },
                    { value: "2x", label: "Conversões" },
                  ].map((item, i) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.6 + i * 0.1, duration: 0.6 }}
                    >
                      <div className="text-[28px] font-extralight tracking-tight text-white/75">
                        {item.value}
                      </div>
                      <div className="text-[10px] text-white/30 tracking-[0.12em] uppercase mt-1.5">
                        {item.label}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </div>

            {/* Bottom footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2, duration: 1 }}
              className="flex items-center gap-8"
            >
              <span className="text-[9px] text-white/20 tracking-[0.25em] uppercase">
                Plataforma Premium
              </span>
              <div className="flex-1 h-px bg-white/[0.04]" />
              <span className="text-[9px] text-white/20 tracking-[0.25em] uppercase">
                v2.0
              </span>
            </motion.div>

            {/* ── Animated car driving across ── */}
            <motion.div
              className="absolute bottom-[18%] pointer-events-none"
              initial={{ x: "-150px", opacity: 0 }}
              animate={{ x: "calc(100vw + 150px)", opacity: [0, 1, 1, 1, 0] }}
              transition={{
                duration: 14,
                delay: 2.5,
                repeat: Infinity,
                repeatDelay: 6,
                ease: "easeInOut",
                opacity: { duration: 14, times: [0, 0.04, 0.5, 0.92, 1] },
              }}
            >
              {/* Light trail behind the car */}
              <div
                className="absolute top-1/2 right-[55%] -translate-y-1/2 w-[280px] h-[2px]"
                style={{
                  background: "linear-gradient(90deg, transparent, hsl(210,100%,55%,0.15), hsl(210,100%,60%,0.3))",
                }}
              />
              {/* Ambient glow around the car */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[120px] rounded-full"
                style={{
                  background: "radial-gradient(ellipse, hsl(210,100%,55%,0.06) 0%, transparent 70%)",
                }}
              />
              {/* The car itself */}
              <img
                src="/logo.png"
                alt=""
                className="h-16 w-auto relative z-10 drop-shadow-[0_0_20px_hsl(210,100%,55%,0.3)]"
              />
            </motion.div>

            {/* Thin road line where the car drives */}
            <div
              className="absolute bottom-[17%] left-[5%] right-[5%] h-px"
              style={{
                background: "linear-gradient(90deg, transparent 0%, hsl(210,100%,55%,0.06) 20%, hsl(210,100%,55%,0.06) 80%, transparent 100%)",
              }}
            />

            {/* Vertical border */}
            <div className="absolute right-0 top-[10%] bottom-[10%] w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />
          </div>

          {/* ════════════════════════════════════════════════════════
              RIGHT — Login Form
              ════════════════════════════════════════════════════════ */}
          <div className="flex items-center justify-center px-6 sm:px-10 lg:px-16 xl:px-20 py-12 lg:py-0">
            <div className="w-full max-w-[400px]">

              {/* ── Mobile brand ── */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="flex flex-col items-center gap-8 mb-16 lg:hidden"
              >
                <div className="flex items-center gap-3">
                  <img src="/logo.png" alt="AutoGest" className="h-8 w-auto" />
                  <span className="text-[11px] font-medium tracking-[0.2em] text-white/40 uppercase">
                    AutoGest
                  </span>
                </div>
                <div className="text-center space-y-3">
                  <h1
                    className="font-extralight tracking-[-0.03em] text-white/90"
                    style={{ fontSize: "clamp(2.5rem, 8vw, 3.5rem)" }}
                  >
                    Gestão <span className="gradient-text font-light">automotiva.</span>
                  </h1>
                  <p className="text-[13px] text-white/30 font-light">
                    Plataforma de gestão para concessionárias
                  </p>
                </div>
              </motion.div>

              {/* ── Form header ── */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="mb-12"
              >
                <h2 className="text-[32px] font-extralight tracking-[-0.02em] text-white/90">
                  Entrar
                </h2>
                <p className="text-[13px] text-white/35 mt-2 font-light">
                  Acesse o painel da sua concessionária
                </p>
              </motion.div>

              {/* ── Form ── */}
              <form onSubmit={handleLogin} className="space-y-8">

                {/* Email */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className="space-y-3"
                >
                  <label className="text-[10px] font-medium text-white/40 tracking-[0.15em] uppercase block">
                    Email
                  </label>
                  <div className="relative">
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocused("email")}
                      onBlur={() => setFocused(null)}
                      className="bg-transparent border-0 border-b border-white/[0.08] rounded-none h-12 text-[15px] text-white/85 placeholder:text-white/20 px-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-500"
                      disabled={submitting}
                    />
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-[1.5px] origin-left"
                      style={{
                        background: "linear-gradient(90deg, hsl(210,100%,55%), hsl(175,70%,45%))",
                      }}
                      initial={false}
                      animate={{ scaleX: focused === "email" ? 1 : 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  </div>
                </motion.div>

                {/* Password */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-medium text-white/40 tracking-[0.15em] uppercase">
                      Senha
                    </label>
                    <button
                      type="button"
                      className="text-[10px] text-white/30 hover:text-white/50 transition-colors duration-300 cursor-pointer tracking-[0.05em]"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocused("password")}
                      onBlur={() => setFocused(null)}
                      className="bg-transparent border-0 border-b border-white/[0.08] rounded-none h-12 text-[15px] text-white/85 placeholder:text-white/20 px-0 pr-10 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-500"
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors duration-300 cursor-pointer p-1"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-[1.5px] origin-left"
                      style={{
                        background: "linear-gradient(90deg, hsl(210,100%,55%), hsl(175,70%,45%))",
                      }}
                      initial={false}
                      animate={{ scaleX: focused === "password" ? 1 : 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  </div>
                </motion.div>

                {/* Submit */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="pt-6"
                >
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-[54px] rounded-xl bg-gradient-to-r from-[hsl(210,100%,55%)] to-[hsl(195,90%,50%)] text-white font-medium text-[13px] tracking-[0.06em] uppercase cursor-pointer relative overflow-hidden group/btn transition-all duration-500 hover:shadow-[0_0_40px_hsl(210,100%,55%,0.2)] active:scale-[0.98] border-0"
                  >
                    {/* Shine sweep on hover */}
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-700 ease-in-out" />

                    <span className="relative flex items-center justify-center gap-3">
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Entrando...</span>
                        </>
                      ) : (
                        <>
                          <span>Acessar Painel</span>
                          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-300" />
                        </>
                      )}
                    </span>
                  </Button>
                </motion.div>
              </form>

              {/* Trust indicators */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.8 }}
                className="flex items-center justify-center gap-6 mt-12"
              >
                {[
                  { dot: true, label: "SSL Criptografado" },
                  { dot: true, label: "LGPD Compliant" },
                  { dot: true, label: "99.9% Uptime" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-emerald-500/50" />
                    <span className="text-[9px] text-white/25 tracking-[0.08em] uppercase">
                      {item.label}
                    </span>
                  </div>
                ))}
              </motion.div>

              {/* Bottom copyright - mobile only */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.3, duration: 0.8 }}
                className="mt-16 text-center lg:hidden"
              >
                <span className="text-[9px] text-white/15 tracking-[0.2em] uppercase">
                  AutoGest v2.0 — Plataforma Premium
                </span>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
