import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export const useNotifications = (user, showToast) => {
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            return;
        }

        const fetchNotifications = async () => {
            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (!error && data) {
                setNotifications(data);
            }
        };

        fetchNotifications();

        const channel = supabase.channel(`notifications_${user.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                (payload) => {
                    setNotifications(prev => [payload.new, ...prev]);
                    if (showToast) {
                        const actor = payload.new.actor_name || "Alguém";
                        let msg = "Nova notificação";
                        if (payload.new.type === "like") msg = `${actor} curtiu seu comentário!`;
                        if (payload.new.type === "reply") msg = `${actor} respondeu seu comentário!`;
                        if (payload.new.type === "mention") msg = `${actor} mencionou você!`;

                        showToast(msg, 5000); // 5 seconds toast
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                (payload) => {
                    setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [user?.id]);

    return { notifications };
};
