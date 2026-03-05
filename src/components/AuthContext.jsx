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

        // Hard timeout: if getSession doesn't resolve in 3s, nuke stale tokens
        // directly from localStorage (bypassing the deadlocked Supabase client)
        const timeout = setTimeout(() => {
            if (!resolved) {
                console.warn("Auth timed out after 3s — clearing stale tokens from localStorage");
                resolved = true;

                // Supabase stores tokens under keys like sb-<ref>-auth-token
                // Remove ALL supabase auth keys from localStorage to break the deadlock
                try {
                    const keysToRemove = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
                            keysToRemove.push(key);
                        }
                    }
                    keysToRemove.forEach(k => localStorage.removeItem(k));
                    console.log("Cleared stale Supabase keys:", keysToRemove);
                } catch (_) { /* localStorage may be unavailable in some environments */ }

                setSession(null);
                setLoading(false);
            }
        }, 3000);

        // Try to get the current session
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

        // Listen for auth state changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setLoading(false);
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
