import { useState, useRef, useEffect } from "react";
import { MoreVertical, Star } from "lucide-react";
import { T } from "../lib/theme";

export const CommentItem = ({ c, i: idx, toggleStar, editComment, deleteComment, commentsLength, highlightedCommentId, currentUser }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(c.text);
    const [isHighlighted, setIsHighlighted] = useState(false);
    const itemRef = useRef(null);

    const [isLiking, setIsLiking] = useState(false);

    // Only actual owner can see menu
    const isOwn = currentUser ? (c.authorId === currentUser.id || c.author === currentUser.name) : c.author === "You";

    const handleStarClick = () => {
        if (!c.starred) {
            setIsLiking(true);
            setTimeout(() => setIsLiking(false), 400); // match animation duration
        }
        toggleStar(c.id);
    };

    useEffect(() => {
        if (highlightedCommentId === c.id) {
            setIsHighlighted(true);
            if (itemRef.current) {
                // scroll into view smoothly
                itemRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            const timer = setTimeout(() => setIsHighlighted(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [highlightedCommentId, c.id]);

    const handleSave = () => {
        if (editText.trim()) {
            editComment(c.id, editText);
        } else {
            setEditText(c.text); // revert if empty
        }
        setIsEditing(false);
    };

    return (
        <div
            ref={itemRef}
            style={{
                padding: "24px 16px",
                margin: "0 -16px",
                borderRadius: 16,
                borderBottom: idx < commentsLength - 1 ? "1px solid rgba(0,0,0,0.06)" : "none",
                opacity: 0, transform: "translateY(8px)",
                animation: `cSlide 350ms cubic-bezier(0,0,.2,1) ${idx * 60}ms forwards`,
                background: isHighlighted ? "rgba(59, 130, 246, 0.08)" : "transparent",
                transition: "background 500ms ease",
            }}
        >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: T.rFull, overflow: "hidden", flexShrink: 0 }}>
                        <img src={c.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <span style={{ fontSize: 14, opacity: 0.7, letterSpacing: "-0.14px", fontWeight: 400 }}>{c.author}</span>
                    <span style={{ fontSize: 14, opacity: 0.4, letterSpacing: "-0.14px" }}>{c.time}</span>
                </div>
                {isOwn ? (
                    <div style={{ position: "relative" }}>
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            style={{ width: 32, height: 32, borderRadius: T.rFull, border: "none", background: isMenuOpen ? "rgba(0,0,0,0.05)" : "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0, transition: "background 180ms ease" }}
                        >
                            <MoreVertical size={16} color={T.text} style={{ opacity: 0.6 }} />
                        </button>
                        {isMenuOpen && (
                            <>
                                <div style={{ position: "fixed", inset: 0, zIndex: 100 }} onClick={() => setIsMenuOpen(false)} />
                                <div style={{ position: "absolute", top: 36, right: 0, background: T.surface, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", padding: 6, zIndex: 101, display: "flex", flexDirection: "column", gap: 2, border: `1px solid ${T.surfaceBorder}`, minWidth: 120, animation: "fadeIn 200ms ease" }}>
                                    <button
                                        onClick={() => { setIsMenuOpen(false); setIsEditing(true); }}
                                        style={{ background: "none", border: "none", width: "100%", textAlign: "left", padding: "8px 12px", borderRadius: 6, cursor: "pointer", fontSize: 14, fontFamily: T.font, color: T.text, transition: "background 150ms ease" }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = T.ghost}
                                        onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                                    >
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => { setIsMenuOpen(false); deleteComment(c.id); }}
                                        style={{ background: "none", border: "none", width: "100%", textAlign: "left", padding: "8px 12px", borderRadius: 6, cursor: "pointer", fontSize: 14, fontFamily: T.font, color: "#ef4444", transition: "background 150ms ease" }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
                                        onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                                    >
                                        Excluir
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    c.relativeTime ? (
                        <span style={{ fontSize: 14, opacity: 0.4, letterSpacing: "-0.14px", flexShrink: 0 }}>{c.relativeTime}</span>
                    ) : (
                        <div style={{ width: 32, height: 32 }} /> // Empty placeholder to keep layout balanced
                    )
                )}
            </div>

            {isEditing ? (
                <div style={{ marginTop: 16 }}>
                    <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        autoFocus
                        style={{ width: "100%", minHeight: 80, padding: 12, borderRadius: 12, border: `1px solid ${T.surfaceBorder}`, outline: "none", background: T.surface, color: T.text, fontFamily: T.font, fontSize: 15, resize: "vertical", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", display: "block", boxSizing: "border-box", transition: "border 180ms ease" }}
                        onFocus={(e) => e.target.style.border = `1px solid ${T.textTer}`}
                        onBlur={(e) => e.target.style.border = `1px solid ${T.surfaceBorder}`}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                        <button onClick={() => { setIsEditing(false); setEditText(c.text); }} style={{ padding: "8px 16px", borderRadius: T.rFull, border: "none", background: T.ghost, cursor: "pointer", fontSize: 13, fontFamily: T.font, fontWeight: 400 }}>
                            Cancelar
                        </button>
                        <button onClick={handleSave} style={{ padding: "8px 16px", borderRadius: T.rFull, border: "none", background: T.accent, color: T.accentText, cursor: "pointer", fontSize: 13, fontFamily: T.font, fontWeight: 400 }}>
                            Salvar
                        </button>
                    </div>
                </div>
            ) : (
                <p style={{ fontSize: 18, fontWeight: 400, letterSpacing: "-0.18px", margin: "16px 0 0", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{c.text}</p>
            )}

            {!isEditing && (
                <button
                    onClick={handleStarClick}
                    style={{
                        marginTop: 16, display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 16px",
                        borderRadius: T.rFull, background: T.surfaceHover, border: "none", cursor: "pointer", fontSize: 14,
                        color: T.text, fontWeight: c.starred ? 500 : 400, opacity: c.starred ? 1 : 0.8, fontFamily: T.font, transition: "all 180ms ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = T.surfaceBorder; e.currentTarget.style.opacity = 1; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = T.surfaceHover; e.currentTarget.style.opacity = c.starred ? 1 : 0.8; }}
                >
                    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Star
                            size={16}
                            fill={c.starred ? T.text : "none"}
                            color={T.text}
                            style={{
                                transition: "all 180ms ease",
                                animation: isLiking ? "starBurst 400ms cubic-bezier(0.175, 0.885, 0.32, 1.275)" : "none"
                            }}
                        />
                        {isLiking && (
                            <div style={{ position: "absolute", top: "50%", left: "50%", pointerEvents: "none" }}>
                                {[...Array(12)].map((_, i) => {
                                    const angle = (i * 30) * (Math.PI / 180);
                                    const dist = 24;
                                    const tx = `${Math.cos(angle) * dist}px`;
                                    const ty = `${Math.sin(angle) * dist}px`;
                                    return (
                                        <div key={i} style={{
                                            position: "absolute",
                                            width: 3, height: 3, marginTop: -1.5, marginLeft: -1.5,
                                            borderRadius: "50%", background: T.text,
                                            "--tx": tx, "--ty": ty,
                                            animation: `particleFly 400ms cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards`
                                        }} />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    {c.stars !== undefined ? c.stars : 0}
                </button>
            )}
        </div>
    );
};
