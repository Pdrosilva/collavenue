import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { T } from "../lib/theme";

export const CommentInput = ({
    newText, setNewText, newPin, scale,
    currentUser, activeWspId, submitComment, inputRef, isInline = false
}) => {
    // Mentions logic
    const [mentionQuery, setMentionQuery] = useState(null);
    const [mentionResults, setMentionResults] = useState([]);
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);

    // Fallback if no ref is provided
    const internalInputRef = useRef(null);
    const resolvedInputRef = inputRef || internalInputRef;

    // Auto-grow textarea to synchronize with highlight container natively
    useEffect(() => {
        if (resolvedInputRef.current) {
            resolvedInputRef.current.style.height = 'auto';
            resolvedInputRef.current.style.height = resolvedInputRef.current.scrollHeight + 'px';
        }
    }, [newText, resolvedInputRef]);

    useEffect(() => {
        if (newText === "") {
            setMentionQuery(null);
            return;
        }

        const cursorPosition = resolvedInputRef.current?.selectionStart || 0;
        const textBeforeCursor = newText.slice(0, cursorPosition);

        // Match @word right before cursor
        const match = textBeforeCursor.match(/@([a-zA-ZÀ-ÿ0-9_]*)$/);

        if (match) {
            setMentionQuery(match[1]);
        } else {
            setMentionQuery(null);
        }
    }, [newText, resolvedInputRef]);

    useEffect(() => {
        if (mentionQuery === null) {
            setMentionResults([]);
            return;
        }

        const fetchUsers = async () => {
            setIsSearchingUsers(true);
            const { data, error } = await supabase.rpc('search_users', { search_term: mentionQuery });
            if (!error && data) {
                setMentionResults(data);
            }
            setIsSearchingUsers(false);
        };

        const timer = setTimeout(fetchUsers, 300); // debounce
        return () => clearTimeout(timer);
    }, [mentionQuery, currentUser?.id]);

    const insertMention = (user) => {
        const cursorPosition = resolvedInputRef.current?.selectionStart || 0;
        const textBeforeCursor = newText.slice(0, cursorPosition);
        const textAfterCursor = newText.slice(cursorPosition);

        const match = textBeforeCursor.match(/@([a-zA-ZÀ-ÿ0-9_]*)$/);
        if (match) {
            const newTextBefore = textBeforeCursor.slice(0, match.index);
            const firstName = user.full_name.split(' ')[0];
            const insertedText = `@${firstName} `;
            setNewText(newTextBefore + insertedText + textAfterCursor);

            // Refocus input and set cursor
            setTimeout(() => {
                if (resolvedInputRef.current) {
                    resolvedInputRef.current.focus();
                    const newPos = newTextBefore.length + insertedText.length;
                    resolvedInputRef.current.setSelectionRange(newPos, newPos);
                }
            }, 0);
        }
        setMentionQuery(null);
    };

    const handleCommentSubmitWithMentions = async () => {
        if (!newText.trim() || !newPin) return;

        const mentionsMatches = newText.match(/@([a-zA-ZÀ-ÿ0-9_]+)/g);

        // Pass control back to parent component to submit comment normally
        submitComment();

        if (mentionsMatches && currentUser && activeWspId) {
            const mentionedNames = [...new Set(mentionsMatches.map(m => m.substring(1).trim()))];
            if (mentionedNames.length > 0) {
                for (const name of mentionedNames) {
                    const { data } = await supabase.rpc('search_users', { search_term: name });
                    if (data && data.length > 0) {
                        const mentionedUser = data.find(u => u.full_name === name);
                        if (mentionedUser && mentionedUser.id !== currentUser.id) {
                            await supabase.from('notifications').insert([{
                                user_id: mentionedUser.id,
                                actor_id: currentUser.id,
                                actor_name: currentUser.name,
                                actor_avatar: currentUser.avatar,
                                type: 'mention',
                                comment_id: null,
                                workspace_id: activeWspId,
                                read: false
                            }]);
                        }
                    }
                }
            }
        }
    };

    return (
        <div
            onWheel={(e) => e.stopPropagation()}
            style={
                isInline
                    ? { position: "relative", width: "100%", display: "flex", flexDirection: "column", gap: 8 }
                    : { position: "absolute", left: `calc(50% + ${newPin?.x || 0}px)`, top: `calc(50% + ${newPin?.y || 0}px)`, transform: `translate(-50%, -50%) scale(${1 / (scale || 1)})`, zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, pointerEvents: "auto" }
            }>
            {!isInline && (
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#3B82F6", border: "3px solid white", boxShadow: "0 2px 8px rgba(0,0,0,0.2)", animation: "pulse 1.5s infinite" }} />
            )}
            <div
                id="comment-wrapper"
                style={{
                    animation: "slideUp 200ms cubic-bezier(0,0,.2,1)",
                    position: "relative", width: isInline ? "100%" : 280, maxWidth: isInline ? "none" : "90vw",
                    background: T.surface, borderRadius: 12, border: `1px solid ${T.surfaceBorder}`,
                    transition: "border 180ms ease, box-shadow 180ms ease",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                    display: "flex", flexDirection: "column"
                }}
            >
                <div style={{ position: "relative", flex: 1, maxHeight: 150, overflowY: "auto", overflowX: "hidden" }}>
                    {/* Highlight Layer */}
                    <div
                        style={{
                            position: "absolute", top: 0, left: 0, width: "100%",
                            padding: "12px", display: "block",
                            fontSize: 14, fontFamily: T.font, letterSpacing: "normal", lineHeight: "1.4",
                            color: newText ? "transparent" : T.textSec, // Show placeholder if empty
                            pointerEvents: "none", zIndex: 1, whiteSpace: "pre-wrap", overflowWrap: "break-word", wordBreak: "break-word",
                            boxSizing: "border-box"
                        }}
                    >
                        {newText ? (
                            newText.split(/(@[a-zA-ZÀ-ÿ0-9_]+)/g).map((part, i) => (
                                <span key={i} style={{ color: part.startsWith('@') ? T.mention : T.text, fontWeight: part.startsWith('@') ? 500 : 400 }}>
                                    {part}
                                </span>
                            ))
                        ) : (
                            "Add your thought..."
                        )}
                        {/* Match textarea trailing line break behavior natively */}
                        {newText.endsWith('\n') ? <br /> : null}
                    </div>

                    {/* Actual Input */}
                    <textarea
                        value={newText}
                        onChange={(e) => setNewText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey && newText.trim()) {
                                e.preventDefault();
                                handleCommentSubmitWithMentions();
                            }
                        }}
                        ref={resolvedInputRef}
                        autoFocus
                        onWheel={(e) => e.stopPropagation()}
                        style={{
                            width: "100%", minHeight: 60, height: 60,
                            padding: "12px", fontSize: 14, fontFamily: T.font, letterSpacing: "normal", lineHeight: "1.4", margin: 0,
                            background: "transparent", outline: "none", resize: "none",
                            color: "transparent", caretColor: T.text, // Hide text, show cursor
                            position: "relative", zIndex: 2, border: "none", boxSizing: "border-box",
                            overflow: "hidden"
                        }}
                        onFocus={() => {
                            const c = document.getElementById("comment-wrapper");
                            if (c) { c.style.borderColor = `color-mix(in srgb, ${T.text} 15%, transparent)`; c.style.boxShadow = "0 8px 32px rgba(17,17,16,0.15)"; }
                        }}
                        onBlur={() => {
                            const c = document.getElementById("comment-wrapper");
                            if (c) { c.style.borderColor = T.surfaceBorder; c.style.boxShadow = "0 8px 32px rgba(0,0,0,0.12)"; }
                        }}
                    />
                </div>

                {/* Submit Action Area */}
                <div style={{ display: "flex", justifyContent: "flex-end", padding: "0px 6px 6px 6px", zIndex: 3 }}>
                    <button
                        onClick={() => { if (newText.trim()) { handleCommentSubmitWithMentions(); } }}
                        disabled={!newText.trim()}
                        style={{
                            padding: "6px 14px",
                            borderRadius: T.rFull,
                            border: "none",
                            background: newText.trim() ? T.text : "rgba(0,0,0,0.05)",
                            color: newText.trim() ? T.bg : T.textSec,
                            cursor: newText.trim() ? "pointer" : "default",
                            fontSize: 13,
                            fontFamily: T.font,
                            fontWeight: 600,
                            transition: "all 150ms ease"
                        }}
                    >
                        Share
                    </button>
                </div>
            </div>

            {/* Mention Dropdown */}
            {mentionQuery !== null && (
                <div style={{
                    position: "absolute", bottom: "100%", left: 0, marginBottom: 8,
                    width: "100%", boxSizing: "border-box",
                    background: T.surface, border: `1px solid ${T.surfaceBorder}`,
                    borderRadius: 20, padding: 8, boxShadow: "0 12px 48px rgba(0,0,0,0.12)",
                    zIndex: 110, animation: "fadeIn 150ms ease",
                    maxHeight: 280, overflowY: "auto",
                    borderRight: "8px solid transparent"
                }}>
                    {isSearchingUsers ? (
                        <div style={{ padding: "10px 16px", textAlign: "center", color: T.textSec, fontSize: 13, fontFamily: T.font }}>
                            Buscando...
                        </div>
                    ) : mentionResults.length === 0 ? (
                        <div style={{ padding: "10px 16px", textAlign: "center", color: T.textSec, fontSize: 13, fontFamily: T.font }}>
                            Nenhum usuário encontrado.
                        </div>
                    ) : (
                        mentionResults.map((u, idx) => {
                            const isYou = u.id === currentUser?.id || u.full_name === currentUser?.name;
                            const initialColors = ['#FBBF24', '#3B82F6', '#8B5CF6', '#EF4444', '#10B981'];
                            const bgColor = initialColors[u.full_name.length % initialColors.length];

                            return (
                                <div
                                    key={u.id}
                                    onMouseDown={(e) => {
                                        e.preventDefault(); // prevents input blur
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation(); // prevents canvas click
                                        insertMention(u);
                                    }}
                                    style={{
                                        display: "flex", alignItems: "center", gap: 12, padding: "8px 12px",
                                        cursor: "pointer", transition: "background 150ms ease",
                                        borderRadius: 12,
                                        background: idx === 0 ? T.surfaceHover : "transparent"
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = T.ghost}
                                    onMouseLeave={e => e.currentTarget.style.background = idx === 0 ? T.surfaceHover : "transparent"}
                                >
                                    <div style={{ width: 34, height: 34, borderRadius: T.rFull, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", background: u.avatar_url ? "transparent" : bgColor }}>
                                        {u.avatar_url ? (
                                            <img src={u.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        ) : (
                                            <span style={{ fontSize: 14, fontWeight: 500, color: "#FFFFFF", margin: "auto" }}>{u.full_name.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                        <span style={{ fontSize: 14, fontFamily: T.font, color: T.text, fontWeight: 400, letterSpacing: "-0.14px" }}>
                                            {u.full_name} {isYou && <span style={{ opacity: 0.6 }}>(You)</span>}
                                        </span>
                                        <span style={{ fontSize: 13, fontFamily: T.font, color: T.textSec, letterSpacing: "-0.13px" }}>
                                            {u.email}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};
