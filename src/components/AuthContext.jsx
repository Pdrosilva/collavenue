import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { avatarSvg } from '../lib/svgGenerator';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let resolved = false;

        // Hard timeout: if getSession doesn't resolve in 3s, force loading off
        // and sign out to clear any stale tokens that block the Supabase client
        const timeout = setTimeout(async () => {
            if (!resolved) {
                console.warn("Auth getSession timed out after 3s, clearing stale session");
                resolved = true;
                try {
                    // Force sign out to clear the stale refresh token from localStorage
                    // This unblocks the Supabase client's internal request queue
                    await supabase.auth.signOut({ scope: 'local' });
                } catch (_) { /* ignore */ }
                setSession(null);
                setLoading(false);
            }
        }, 3000);

        // Obter sessão atual
        (async () => {
            try {
                const { data, error } = await supabase.auth.getSession();
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    if (error) console.error("Supabase getSession error:", error);
                    setSession(data?.session ?? null);
                    setLoading(false);
                }
            } catch (err) {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    console.error("Supabase getSession exception:", err);
                    setLoading(false);
                }
            }
        })();

        // Escutar mudanças de autenticação (Login, Logout, etc)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (loading) setLoading(false);
        });

        return () => {
            clearTimeout(timeout);
            subscription.unsubscribe();
        };
    }, []);

    const signInWithGoogle = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    // Derived user object that matches the current mock format for easier migration
    const user = session?.user ? {
        id: session.user.id,
        name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "User",
        avatar: session.user.user_metadata?.avatar_url || avatarSvg("#3B82F6", (session.user.user_metadata?.full_name || session.user.email || "Y")[0].toUpperCase())
    } : null;

    return (
        <AuthContext.Provider value={{ session, user, loading, signInWithGoogle, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
