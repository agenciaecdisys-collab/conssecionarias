import { motion } from "framer-motion";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "297",
    vehicles: 30,
    users: 3,
    features: ["Estoque basico", "Agenda", "1 usuario agent"],
  },
  {
    name: "Pro",
    price: "597",
    vehicles: 100,
    users: 10,
    features: ["Tudo do Starter", "Agent IA completo", "WhatsApp", "Base de conhecimento"],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "997",
    vehicles: "Ilimitado",
    users: "Ilimitado",
    features: ["Tudo do Pro", "Multi-filial", "API customizada", "Suporte prioritario"],
  },
];

const AdminPlans = () => (
  <div className="space-y-10 max-w-5xl">
    {/* Header */}
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h1 className="text-[22px] font-light tracking-tight text-white/90">Planos</h1>
      <p className="text-[13px] text-white/40 mt-1">Gerenciar planos disponíveis</p>
    </motion.div>

    {/* Plan cards */}
    <div className="grid md:grid-cols-3 gap-5">
      {plans.map((p, i) => (
        <motion.div
          key={p.name}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.1, duration: 0.5 }}
          className={`relative rounded-xl border p-7 transition-all duration-500 group hover:border-white/[0.1] ${
            p.popular
              ? "border-primary/20 bg-primary/[0.02]"
              : "border-white/[0.04] bg-white/[0.015]"
          }`}
        >
          {/* Popular indicator */}
          {p.popular && (
            <div
              className="absolute top-0 left-6 right-6 h-px"
              style={{
                background: "linear-gradient(90deg, transparent, hsl(210,100%,55%,0.4), hsl(175,70%,45%,0.3), transparent)",
              }}
            />
          )}

          <div className="space-y-6">
            {/* Plan name */}
            <div>
              <h3 className="text-[13px] text-white/40 tracking-[0.1em] uppercase font-normal">
                {p.name}
              </h3>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-1">
              <span className="text-[11px] text-white/100">R$</span>
              <span className={`text-3xl font-light tracking-tight ${p.popular ? "gradient-text" : "text-white/80"}`}>
                {p.price}
              </span>
              <span className="text-[11px] text-white/35">/mes</span>
            </div>

            {/* Separator */}
            <div className="h-px bg-white/[0.04]" />

            {/* Limits */}
            <div className="space-y-2 text-[12px] text-white/40">
              <p>Ate <span className="text-white/50">{p.vehicles}</span> veiculos</p>
              <p>Ate <span className="text-white/50">{p.users}</span> usuarios</p>
            </div>

            {/* Features */}
            <div className="space-y-2.5">
              {p.features.map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-[12px] text-white/40">
                  <Check className="w-3.5 h-3.5 text-accent/50 shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

export default AdminPlans;
