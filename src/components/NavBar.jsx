import { User, Bell } from "lucide-react";
import { useState } from "react";
import { T } from "../lib/theme";
import { useWindowWidth } from "../lib/useWindowWidth";

export const NavBar = ({ onLogoClick, onAddClick, onSettingsClick, currentTab, setCurrentTab, user, notifications = [] }) => {
    const ww = useWindowWidth();
    const [isHoveringBell, setIsHoveringBell] = useState(false);

    // Count unread
    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: ww < 640 ? "24px 15px 16px" : "28px 32px 20px",
            position: "fixed", top: 0, left: 0, right: 0,
            zIndex: 100,
            background: T.bgNav,
            backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)"
        }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: ww < 640 ? 24 : 48 }}>
                <span onClick={onLogoClick || (() => { })} style={{ fontSize: 16, fontWeight: 400, letterSpacing: "-0.16px", color: T.text, cursor: "pointer", fontFamily: T.font }}>Collavenue</span>
                <div style={{ display: "flex", gap: 32 }}>
                    {["Explore", "Saved"].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setCurrentTab && setCurrentTab(tab)}
                            style={{
                                fontSize: 16, fontWeight: 400, letterSpacing: "-0.16px",
                                color: T.text, opacity: currentTab === tab ? 1 : 0.4,
                                cursor: "pointer", background: "none", border: "none",
                                padding: "8px 12px", margin: "-8px -12px",
                                fontFamily: T.font, transition: "opacity 200ms ease"
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 24, position: "relative" }} id="settings-anchor">
                {user && (
                    <div
                        style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, cursor: "pointer" }}
                        onMouseEnter={() => setIsHoveringBell(true)}
                        onMouseLeave={() => setIsHoveringBell(false)}
                    >
                        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: T.rFull, transition: "background 200ms ease", background: isHoveringBell ? "rgba(255,255,255,0.05)" : "transparent" }}>
                            <Bell size={20} color={T.text} style={{ opacity: isHoveringBell ? 1 : 0.7, transition: "opacity 200ms ease" }} />
                            {unreadCount > 0 && (
                                <div style={{ position: "absolute", top: 10, right: 10, width: 8, height: 8, background: "#ef4444", borderRadius: "50%", border: `2px solid ${T.bgNav}` }} />
                            )}
                        </div>

                        {/* Dropdown via Portal or Fixed Position to avoid cutoff */}
                        {isHoveringBell && (
                            <div style={{ position: "absolute", top: 0, right: 0 }}>
                                {/* Safe area bridge */}
                                <div style={{ position: "absolute", top: 30, right: -10, height: 30, width: 260, background: "transparent" }} />
                                <div style={{
                                    position: "absolute", top: 52, right: -10, width: 320,
                                    background: T.surface, border: `1px solid ${T.surfaceBorder}`,
                                    borderRadius: 16, padding: "8px 0", boxShadow: "0 12px 48px rgba(0,0,0,0.25)",
                                    zIndex: 9999, animation: "fadeIn 200ms ease",
                                    maxHeight: 400, overflowY: "auto"
                                }}>
                                    <div style={{ padding: "8px 16px 12px", borderBottom: `1px solid ${T.surfaceBorder}`, marginBottom: 8 }}>
                                        <span style={{ fontSize: 14, fontWeight: 500, fontFamily: T.font, color: T.text }}>Notificações</span>
                                    </div>

                                    {notifications.length === 0 ? (
                                        <div style={{ padding: "24px 16px", textAlign: "center", color: T.textSec, fontSize: 14, fontFamily: T.font }}>
                                            Nenhuma notificação ainda.
                                        </div>
                                    ) : (
                                        notifications.map(n => (
                                            <div key={n.id} style={{
                                                display: "flex", alignItems: "flex-start", gap: 12,
                                                padding: "12px 16px", background: n.read ? "transparent" : "rgba(59, 130, 246, 0.05)",
                                                cursor: "pointer", transition: "background 150ms ease"
                                            }}
                                                onClick={() => { window.location.href = `/?i=${n.workspace_id}`; }}
                                                onMouseEnter={e => e.currentTarget.style.background = T.ghost}
                                                onMouseLeave={e => e.currentTarget.style.background = n.read ? "transparent" : "rgba(59, 130, 246, 0.05)"}
                                            >
                                                <div style={{ width: 36, height: 36, borderRadius: T.rFull, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", background: n.actor_avatar && n.actor_avatar.includes('http') ? "transparent" : "#FBBF24" }}>
                                                    {n.actor_avatar && n.actor_avatar.includes('http') ? (
                                                        <img src={n.actor_avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                    ) : (
                                                        <span style={{ fontSize: 16, fontWeight: 500, color: "#111827", margin: "auto" }}>{n.actor_name?.charAt(0).toUpperCase()}</span>
                                                    )}
                                                </div>
                                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                    <span style={{ fontSize: 15, fontFamily: T.font, color: T.text, lineHeight: 1.4, fontWeight: 400 }}>
                                                        <strong style={{ fontWeight: 500, color: T.text }}>{n.actor_name}</strong> {n.type === 'like' ? 'curtiu seu comentário' : n.type === 'reply' ? 'respondeu seu comentário' : 'mencionou você'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div style={{ width: 40, height: 40, borderRadius: T.rFull, overflow: "hidden", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: user ? "none" : T.surface }} onClick={onSettingsClick}>
                    {user ? (
                        <img src={user.avatar} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                        <User size={20} color={T.text} />
                    )}
                </div>
            </div>
        </div>
    );
};
