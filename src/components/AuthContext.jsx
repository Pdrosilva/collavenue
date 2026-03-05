import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { avatarSvg } from '../lib/svgGenerator';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Obter sessão atual
        supabase.auth.getSession()
            .then(({ data: { session }, error }) => {
                if (error) console.error("Supabase getSession error:", error);
                setSession(session);
            })
            .catch(err => console.error("Supabase getSession exception:", err))
            .finally(() => setLoading(false));

        // Escutar mudanças de autenticação (Login, Logout, etc)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
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
