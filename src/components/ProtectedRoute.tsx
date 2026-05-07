import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: "admin" | "manager" | "vendor";
    allowedRoles?: ("admin" | "manager" | "vendor")[];
}

const ProtectedRoute = ({ children, requiredRole, allowedRoles }: ProtectedRouteProps) => {
    const { user, role, isAdmin, loading, dealership, profile } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-black relative overflow-hidden">
                {/* Ambient glow */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
                    style={{
                        background: "radial-gradient(circle, hsl(210,100%,55%,0.04) 0%, transparent 70%)",
                    }}
                />

                {/* Road line */}
                <div
                    className="absolute top-[58%] left-0 right-0 h-px"
                    style={{
                        background: "linear-gradient(90deg, transparent 5%, hsl(210,100%,55%,0.08) 30%, hsl(210,100%,55%,0.08) 70%, transparent 95%)",
                    }}
                />

                {/* Car animation */}
                <motion.div
                    className="absolute top-[52%] pointer-events-none"
                    initial={{ x: "-150px", opacity: 0 }}
                    animate={{ x: "calc(100vw + 150px)", opacity: [0, 1, 1, 1, 0] }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        repeatDelay: 2,
                        ease: "easeInOut",
                        opacity: { duration: 10, times: [0, 0.04, 0.5, 0.92, 1] },
                    }}
                >
                    {/* Light trail */}
                    <div
                        className="absolute top-1/2 right-[60%] -translate-y-1/2 w-[200px] h-[2px]"
                        style={{
                            background: "linear-gradient(90deg, transparent, hsl(210,100%,55%,0.15), hsl(210,100%,60%,0.3))",
                        }}
                    />
                    {/* Glow */}
                    <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[120px] rounded-full"
                        style={{
                            background: "radial-gradient(ellipse, hsl(210,100%,55%,0.08) 0%, transparent 70%)",
                        }}
                    />
                    {/* Car */}
                    <img
                        src="/logo.png"
                        alt=""
                        className="h-14 w-auto relative z-10 drop-shadow-[0_0_20px_hsl(210,100%,55%,0.3)]"
                    />
                </motion.div>

                {/* Brand + loading text */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="relative z-10 flex flex-col items-center gap-6"
                >
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="AutoGest" className="h-10 w-auto" />
                        <span className="text-[12px] font-medium tracking-[0.2em] text-white/40 uppercase">
                            AutoGest
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <motion.div
                            className="w-1 h-1 rounded-full bg-blue-500/60"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                        />
                        <motion.div
                            className="w-1 h-1 rounded-full bg-blue-500/60"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                        />
                        <motion.div
                            className="w-1 h-1 rounded-full bg-blue-500/60"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                        />
                    </div>
                    <span className="text-[10px] text-white/20 tracking-[0.15em] uppercase">
                        Carregando
                    </span>
                </motion.div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole === "admin" && !isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    // Non-admin users must have an active dealership
    if (!isAdmin && profile?.dealership_id && dealership !== null && dealership.status !== "ativo") {
        return <Navigate to="/login" replace />;
    }

    // Block vendor from manager-only pages → redirect to calendar (admins bypass)
    if (allowedRoles && role && !isAdmin && !allowedRoles.includes(role)) {
        return <Navigate to="/dashboard/calendar" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
