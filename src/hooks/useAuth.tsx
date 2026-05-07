import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";

type UserRole = "admin" | "manager" | "vendor" | null;

export interface Profile {
    id: string;
    dealership_id: string | null;
    full_name: string | null;
    role: UserRole;
    avatar_url: string | null;
    is_super_admin: boolean | null;
    created_at: string | null;
}

export interface Dealership {
    id: string;
    name: string;
    cnpj: string | null;
    responsible: string | null;
    phone: string | null;
    email: string | null;
    plan: string | null;
    status: string | null;
    max_users: number | null;
    address: string | null;
    city: string | null;
    state: string | null;
    logo_url: string | null;
    website: string | null;
    slug: string | null;
    created_at: string | null;
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    dealership: Dealership | null;
    role: UserRole;
    isAdmin: boolean;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [dealership, setDealership] = useState<Dealership | null>(null);
    const [loading, setLoading] = useState(true);
    const role: UserRole = profile?.role ?? null;

    const loadUserData = async (userId: string) => {
        console.log("[useAuth] loadUserData called for:", userId);
        console.log("[useAuth] querying profiles table...");

        const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

        console.log("[useAuth] profile query returned:", { data: profileData, error: profileError });

        if (profileError) {
            console.error("[useAuth] error fetching profile:", profileError);
        }

        if (!profileData) {
            console.warn("[useAuth] profile not found for user:", userId);
            return;
        }

        const userRole = (profileData.role as UserRole) ?? null;
        const userProfile: Profile = {
            id: profileData.id,
            dealership_id: profileData.dealership_id,
            full_name: profileData.full_name,
            role: userRole,
            avatar_url: profileData.avatar_url,
            is_super_admin: profileData.is_super_admin,
            created_at: profileData.created_at,
        };

        setProfile(userProfile);

        // If user has a dealership, fetch it
        const userIsAdmin = profileData.is_super_admin === true || userRole === "admin";
        if (profileData.dealership_id && !userIsAdmin) {
            const { data: dealershipData } = await supabase
                .from("dealerships")
                .select("*")
                .eq("id", profileData.dealership_id)
                .single();

            if (dealershipData) {
                console.log("[useAuth] dealership loaded:", dealershipData.id, "status:", dealershipData.status);
                // Block access if dealership is inactive
                if (dealershipData.status !== "ativo") {
                    console.warn("[useAuth] dealership inactive, signing out");
                    toast.error("Sua concessionaria esta desativada. Entre em contato com o suporte.");
                    await supabase.auth.signOut();
                    setUser(null);
                    setSession(null);
                    setProfile(null);
                    setDealership(null);
                    return;
                }
                setDealership(dealershipData as unknown as Dealership);
            }
        } else {
            setDealership(null);
        }
    };

    const isAdmin = profile?.is_super_admin === true || role === "admin";

    useEffect(() => {
        let mounted = true;

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, s) => {
                if (!mounted) return;

                setSession(s);
                setUser(s?.user ?? null);

                if (s?.user) {
                    loadUserData(s.user.id).then(() => {
                        if (mounted) setLoading(false);
                    }).catch((err) => {
                        console.error("[useAuth] Erro ao carregar dados do usuário:", err);
                        if (mounted) setLoading(false);
                    });
                } else {
                    setProfile(null);
                    setDealership(null);
                    setLoading(false);
                }
            }
        );

        // Apenas checar se NÃO tem sessão para destravar loading
        supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
            if (!mounted) return;
            if (!existingSession) {
                setLoading(false);
            }
            // Se TEM sessão, o onAuthStateChange já vai cuidar
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        return { error: null };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setProfile(null);
        setDealership(null);
    };

    return (
        <AuthContext.Provider value={{ user, session, profile, dealership, role, isAdmin, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};
