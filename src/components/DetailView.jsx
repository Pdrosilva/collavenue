import { useState, useEffect, useRef } from "react";
import { X, ArrowLeft } from "lucide-react";
import { NavBar } from "./NavBar";
import { Pin } from "./Pin";
import { CommentItem } from "./CommentItem";
import { FloatingActions } from "./FloatingActions";
import { supabase } from "../lib/supabase";
import { T } from "../lib/theme";
import { useWindowWidth } from "../lib/useWindowWidth";
import { useCanvasCamera } from "../hooks/useCanvasCamera";
import { CommentInput } from "./CommentInput";

import { ImageWithSkeleton } from "./ImageWithSkeleton";

const ThreadReplyInput = ({ onSubmit, currentUser }) => {
    const [text, setText] = useState("");
    const [isFocused, setIsFocused] = useState(false);

    // Mentions logic
    const [mentionQuery, setMentionQuery] = useState(null);
    const [mentionResults, setMentionResults] = useState([]);
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (text === "") {
            setMentionQuery(null);
            return;
        }

        const cursorPosition = inputRef.current?.selectionStart || 0;
        const textBeforeCursor = text.slice(0, cursorPosition);
        const match = textBeforeCursor.match(/@([a-zA-ZÀ-ÿ0-9_]*)$/);

        if (match) {
            setMentionQuery(match[1]);
        } else {
            setMentionQuery(null);
        }
    }, [text]);

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

        const timer = setTimeout(fetchUsers, 300);
        return () => clearTimeout(timer);
    }, [mentionQuery, currentUser?.id]);

    const insertMention = (user) => {
        const cursorPosition = inputRef.current?.selectionStart || 0;
        const textBeforeCursor = text.slice(0, cursorPosition);
        const textAfterCursor = text.slice(cursorPosition);

        const match = textBeforeCursor.match(/@([a-zA-ZÀ-ÿ0-9_]*)$/);
        if (match) {
            const newTextBefore = textBeforeCursor.slice(0, match.index);
            const firstName = user.full_name.split(' ')[0];
            const insertedText = `@${firstName} `;
            setText(newTextBefore + insertedText + textAfterCursor);

            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    const newPos = newTextBefore.length + insertedText.length;
                    inputRef.current.setSelectionRange(newPos, newPos);
                }
            }, 0);
        }
        setMentionQuery(null);
    };

    return (
        <div style={{ position: "relative", width: "100%" }} onWheel={(e) => e.stopPropagation()}>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    background: T.surface,
                    borderRadius: 12,
                    border: isFocused ? `1px solid color-mix(in srgb, ${T.text} 15%, transparent)` : `1px solid ${T.surfaceBorder}`,
                    transition: "border 180ms ease, box-shadow 180ms ease",
                    boxShadow: isFocused ? "0 4px 12px rgba(0,0,0,0.05)" : "none",
                    overflow: "hidden"
                }}
            >
                <div style={{ position: "relative" }}>
                    <textarea
                        ref={inputRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Add a reply... (use @ to mention)"
                        style={{
                            width: "100%",
                            minHeight: 44,
                            maxHeight: 150,
                            padding: "12px 12px 8px 12px",
                            border: "none",
                            outline: "none",
                            background: "transparent",
                            color: T.text,
                            fontFamily: T.font,
                            fontSize: 14,
                            resize: "none", // Prevent native resize to keep button position stable, rely on auto-growth if needed (or scroll)
                            display: "block",
                            boxSizing: "border-box"
                        }}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        onWheel={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                if (text.trim()) { onSubmit(text); setText(""); }
                            }
                        }}
                    />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", padding: "4px 8px 8px 8px", background: "transparent" }}>
                    <button
                        onClick={() => { if (text.trim()) { onSubmit(text); setText(""); setIsFocused(false); } }}
                        disabled={!text.trim()}
                        style={{
                            padding: "6px 14px",
                            borderRadius: T.rFull,
                            border: "none",
                            background: text.trim() ? T.text : "rgba(0,0,0,0.05)",
                            color: text.trim() ? T.bg : T.textSec,
                            cursor: text.trim() ? "pointer" : "default",
                            fontSize: 13,
                            fontFamily: T.font,
                            fontWeight: 600,
                            transition: "all 150ms ease"
                        }}
                    >
                        Reply
                    </button>
                </div>
            </div>

            {/* Mention Dropdown */}
            {mentionQuery !== null && (
                <div style={{
                    position: "absolute", bottom: "100%", left: 0, marginBottom: 8,
                    width: "100%", boxSizing: "border-box", background: T.surface, border: `1px solid ${T.surfaceBorder}`,
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
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={(e) => {
                                        e.stopPropagation();
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

const LiveCursors = ({ cursors }) => {
    return (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 60 }}>
            {Object.entries(cursors).map(([userId, payload]) => {
                const { x, y, user } = payload;
                const initialColors = ['#FBBF24', '#3B82F6', '#8B5CF6', '#EF4444', '#10B981'];
                const bgColor = user?.name ? initialColors[user.name.length % initialColors.length] : '#3B82F6';

                return (
                    <div
                        key={userId}
                        style={{
                            position: "absolute",
                            left: x,
                            top: y,
                            transform: "translate(-2px, -2px)", // slightly shift to align cursor point
                            transition: "left 100ms linear, top 100ms linear", // Smooth cursor interpolation
                            zIndex: 100
                        }}
                    >
                        {/* Cursor SVG */}
                        <svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.2))" }}>
                            <path d="M5.65376 2.13812L20.596 21.0827L12.551 21.5658L10.3523 29.8327L2.94632 10.9576L5.65376 2.13812Z" fill={bgColor} stroke="white" strokeWidth="2" strokeLinejoin="round" />
                        </svg>

                        {/* User Name Pill */}
                        <div style={{
                            marginTop: 2,
                            marginLeft: 18,
                            background: bgColor,
                            color: "white",
                            padding: "4px 8px",
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 600,
                            fontFamily: T.font,
                            whiteSpace: "nowrap",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                            display: "flex",
                            alignItems: "center",
                            gap: 6
                        }}>
                            {user?.name || "Unknown"}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export const DetailView = ({
    images,
    selectedImage,
    loaded,
    closeDetail,
    comments,
    commentsOpen,
    setCommentsOpen,
    addingPin,
    setAddingPin,
    newPin,
    setNewPin,
    newText,
    setNewText,
    hoveredPin,
    setHoveredPin,
    initialPan,
    handleFilesDrop,
    onImageMoved,
    saveImagePosition,
    submitComment,
    toggleStar,
    editComment,
    deleteComment,
    animating,
    deleteImage,
    highlightedCommentId,
    setHighlightedCommentId,
    currentUser,
    commentsLoading,
    submitReply
}) => {
    const ww = useWindowWidth();

    // Show Skeleton if waiting for the image to load
    if (!selectedImage) {
        return (
            <div style={{ position: "fixed", inset: 0, background: T.bg, zIndex: 50, display: "flex", flexDirection: "column" }}>
                <button
                    onClick={(e) => { e.stopPropagation(); closeDetail(); }}
                    style={{ position: "absolute", top: 32, left: 32, width: 48, height: 48, borderRadius: 24, background: T.surface, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
                >
                    <ArrowLeft size={20} color={T.text} style={{ opacity: 0.7 }} />
                </button>

                <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: ww < 768 ? '80%' : 440, height: ww < 768 ? '80vw' : 440, borderRadius: 16, background: "rgba(0,0,0,0.03)", animation: "skeletonPulse 1.5s ease-in-out infinite", boxShadow: "0 4px 24px rgba(0,0,0,0.04)" }} />
                </div>

                <div style={{
                    position: "fixed", right: ww >= 768 ? 32 : 0, top: ww >= 768 ? 32 : 0, bottom: ww >= 768 ? 32 : 0, width: ww < 768 ? "100vw" : 440,
                    background: T.surface, borderRadius: ww >= 768 ? 24 : 0, boxShadow: ww >= 768 ? "0 24px 80px rgba(0,0,0,0.12)" : "none", zIndex: 200, display: "flex", flexDirection: "column"
                }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 31px" }}>
                        <div style={{ width: 100, height: 24, borderRadius: 6, background: "rgba(0,0,0,0.05)", animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
                        <div style={{ width: 40, height: 40, borderRadius: 20, background: "rgba(0,0,0,0.05)", animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
                    </div>
                    <div style={{ flex: 1, padding: "0 31px" }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{ marginBottom: 24 }}>
                                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 16, background: "rgba(0,0,0,0.05)", animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
                                    <div style={{ width: 120, height: 14, borderRadius: 4, background: "rgba(0,0,0,0.05)", animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
                                </div>
                                <div style={{ marginTop: 12, height: 14, background: "rgba(0,0,0,0.05)", borderRadius: 4, width: "100%", animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
                                <div style={{ marginTop: 8, height: 14, background: "rgba(0,0,0,0.05)", borderRadius: 4, width: "80%", animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
    const panelW = ww < 768 ? ww : 440;
    const imgShift = 0;

    const [activeThreadId, setActiveThreadId] = useState(null);

    const [dragging, setDragging] = useState(null);
    const [dragOff, setDragOff] = useState({ x: 0, y: 0 });
    const [contextMenu, setContextMenu] = useState(null);
    const canvasRef = useRef(null);

    const [cursors, setCursors] = useState({});

    // Clear inactive cursors after a few seconds
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setCursors(prev => {
                const next = { ...prev };
                let changed = false;
                for (const [uid, data] of Object.entries(next)) {
                    if (now - data.lastUpdate > 5000) {
                        delete next[uid];
                        changed = true;
                    }
                }
                return changed ? next : prev;
            });
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    // Derive active workspace ID for scoped channels
    const activeWspId = selectedImage?.workspaceId || selectedImage?.id;

    // Listen to cursor broadcasts scoped to this workspace
    useEffect(() => {
        if (!activeWspId) return;

        const channelName = `workspace:${activeWspId}:cursors`;
        const channel = supabase.channel(channelName)
            .on('broadcast', { event: 'cursor_move' }, (payload) => {
                const { userId, x, y, user: payloadUser } = payload.payload;
                if (currentUser && userId === currentUser.id) return;
                setCursors(prev => ({
                    ...prev,
                    [userId]: { x, y, user: payloadUser, lastUpdate: Date.now() }
                }));
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [currentUser?.id, activeWspId]);

    const broadcastCursorMove = (x, y) => {
        if (!currentUser || !activeWspId) return;
        const channelName = `workspace:${activeWspId}:cursors`;
        supabase.channel(channelName).send({
            type: 'broadcast',
            event: 'cursor_move',
            payload: { userId: currentUser.id, x, y, user: { name: currentUser.name, avatar: currentUser.avatar } }
        });
    };

    // Throttle cursor broadcasts to avoid spamming the websocket (e.g., 50ms)
    const lastBroadcastRef = useRef(0);

    const {
        pan, scale, isSpaceDown, isPanning,
        handleWheel, handleMouseDown, handleMouseMoveLocal, handleMouseUpOrLeave
    } = useCanvasCamera(initialPan, canvasRef, addingPin, setAddingPin, setNewPin, setNewText);

    // native paste listener mapped to logical coordinates
    useEffect(() => {
        const handlePaste = (e) => {
            const files = Array.from(e.clipboardData?.files || []).filter(f => f.type.startsWith("image/"));
            if (!files.length) return;
            e.preventDefault();

            const syntheticEvent = {
                preventDefault: () => { },
                stopPropagation: () => { },
                dataTransfer: { files }
            };

            // center the pasted image on current logical viewing center using the exact same math as the canvas pan bounds
            const r = canvasRef.current?.getBoundingClientRect();
            if (!r) return;
            // The logical center of the screen based on scale and pan
            const logicalX = (-pan.x) / scale;
            const logicalY = (-pan.y) / scale;

            handleFilesDrop(syntheticEvent, "detail", logicalX, logicalY, selectedImage);
        };
        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, [handleFilesDrop, pan, scale]);

    // Handle ESC key to cancel pin placement
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape" && addingPin) {
                setAddingPin(false);
                setNewPin(null);
                setNewText("");
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [addingPin, setAddingPin, setNewPin, setNewText]);

    const handleDropLocal = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const r = canvasRef.current.getBoundingClientRect();
            const centerX = r.width / 2;
            const centerY = r.height / 2;
            const logicalX = (e.clientX - r.left - centerX - pan.x) / scale;
            const logicalY = (e.clientY - r.top - centerY - pan.y) / scale;

            handleFilesDrop(e, "detail", logicalX, logicalY);
            return;
        }
        try {
            const rawData = e.dataTransfer.getData("text/plain");
            if (!rawData) return;
            const d = JSON.parse(rawData);

            const r = canvasRef.current.getBoundingClientRect();
            const centerX = r.width / 2;
            const centerY = r.height / 2;
            const logicalX = (e.clientX - r.left - centerX - pan.x) / scale;
            const logicalY = (e.clientY - r.top - centerY - pan.y) / scale;

            const dropDrawW = 300;
            const dropDrawH = (d.h / d.w) * dropDrawW;

            if (onImageMoved) onImageMoved(d.id, logicalX - dropDrawW / 2, logicalY - dropDrawH / 2);
        } catch { }
    };



    const cw = images.filter(img => (img.workspaceId || img.id) === activeWspId);
    const activeComments = comments.filter((c) => c.workspaceId === activeWspId);
    const rootComments = activeComments.filter(c => !c.parentId);
    const activeThreadComment = activeThreadId ? rootComments.find(c => c.id === activeThreadId) : null;
    const threadReplies = activeThreadId ? activeComments.filter(c => c.parentId === activeThreadId) : [];

    return (
        <div style={{ position: "fixed", inset: 0, background: T.bg, zIndex: 50, display: "flex", flexDirection: "column", opacity: animating ? 0 : 1, transition: "opacity 400ms cubic-bezier(0,0,.2,1)" }}>
            <button
                onClick={(e) => { e.stopPropagation(); closeDetail(); }}
                style={{ position: "absolute", top: 32, left: 32, width: 48, height: 48, borderRadius: T.rFull, background: T.surface, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer", zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.06)", transition: "all 180ms ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)"; }}
                aria-label="Voltar"
            >
                <ArrowLeft size={20} color={T.text} style={{ opacity: 0.7 }} />
            </button>

            <div
                ref={canvasRef}
                style={{ flex: 1, position: "relative", overflow: "hidden", userSelect: "none", WebkitUserSelect: "none", cursor: isSpaceDown ? (isPanning ? "grabbing" : "grab") : (addingPin ? "crosshair" : "default") }}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
                onDrop={handleDropLocal}
                onMouseDown={handleMouseDown}
                onMouseMove={(e) => {
                    handleMouseMoveLocal(e, dragging, dragOff, onImageMoved);

                    // Throttle broadcast
                    const now = Date.now();
                    if (now - lastBroadcastRef.current > 50 && broadcastCursorMove) {
                        const r = canvasRef.current.getBoundingClientRect();
                        const centerX = r.width / 2;
                        const centerY = r.height / 2;
                        const localX = e.clientX - r.left;
                        const localY = e.clientY - r.top;
                        const logicalX = (localX - centerX - pan.x) / scale;
                        const logicalY = (localY - centerY - pan.y) / scale;

                        broadcastCursorMove(logicalX, logicalY);
                        lastBroadcastRef.current = now;
                    }
                }}
                onMouseUp={() => {
                    if (dragging && dragging.id) {
                        const img = images.find(i => i.id === dragging.id);
                        if (img && saveImagePosition) {
                            saveImagePosition(img.id, img.x, img.y);
                        }
                    }
                    setDragging(null);
                    handleMouseUpOrLeave();
                }}
                onMouseLeave={() => {
                    if (dragging && dragging.id) {
                        const img = images.find(i => i.id === dragging.id);
                        if (img && saveImagePosition) {
                            saveImagePosition(img.id, img.x, img.y);
                        }
                    }
                    setDragging(null);
                    handleMouseUpOrLeave();
                }}
                onClick={(e) => {
                    setContextMenu(null);
                    if (isPanning || dragging || !addingPin) return;
                    if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") return;
                    if (newPin) {
                        // Se já tem um pino sendo adicionado e clicar fora dele no canvas, cancela a ação.
                        setNewPin(null);
                        setAddingPin(false);
                        setNewText("");
                        return;
                    }
                    const r = canvasRef.current.getBoundingClientRect();
                    const centerX = r.width / 2;
                    const centerY = r.height / 2;
                    const localX = e.clientX - r.left;
                    const localY = e.clientY - r.top;
                    const logicalX = (localX - centerX - pan.x) / scale;
                    const logicalY = (localY - centerY - pan.y) / scale;
                    setNewPin({ x: logicalX, y: logicalY });
                }}
                onWheel={handleWheel}
            >
                {/* Transform Wrapper for Pan and Zoom */}
                <div style={{ position: "absolute", inset: 0, transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: "center center", transition: isPanning ? "none" : "transform 100ms ease-out" }}>

                    {[...cw].reverse().map(img => {
                        const isSelected = img.id === selectedImage.id;

                        const defW = ww < 640 ? window.innerWidth * 0.85 : ww < 1024 ? 380 : 440;
                        const defH = (img.h / img.w) * defW;

                        const renderW = img.width || defW;
                        const renderH = img.height || defH;

                        const renderX = img.x !== undefined && img.x !== null ? img.x : -renderW / 2;
                        const renderY = img.y !== undefined && img.y !== null ? img.y : -renderH / 2;

                        return (
                            <div
                                key={img.id}
                                style={{
                                    position: "absolute",
                                    left: `calc(50% + ${renderX + (isSelected ? imgShift : 0)}px)`,
                                    top: `calc(50% + ${renderY}px)`,
                                    width: renderW,
                                    zIndex: isSelected ? 2 : (dragging?.id === img.id ? 30 : 5),
                                    transition: isSelected ? "left 500ms cubic-bezier(0,0,.2,1)" : "none"
                                }}
                            >
                                <div
                                    onMouseDown={(e) => {
                                        if (addingPin) return; // allow click to bubble to canvas
                                        if (e.button === 2) return; // ignore right click for drag
                                        if (isSpaceDown) return;
                                        e.stopPropagation();
                                        setContextMenu(null);
                                        const r = e.currentTarget.getBoundingClientRect();
                                        setDragging({ id: img.id });
                                        setDragOff({ x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale });
                                    }}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (!addingPin) {
                                            setContextMenu({ id: img.id, x: e.clientX, y: e.clientY });
                                        }
                                    }}
                                    style={{
                                        width: renderW, height: renderH,
                                        borderRadius: T.rImg, overflow: "visible", position: "relative",
                                        userSelect: "none", WebkitUserSelect: "none",
                                        cursor: addingPin ? "crosshair" : "grab",
                                        boxShadow: "none",
                                        transition: "box-shadow 300ms ease"
                                    }}
                                >
                                    {img.link ? (
                                        <div style={{ width: "100%", height: "100%", borderRadius: T.rImg, overflow: "hidden", position: "relative" }}>
                                            <div style={{ position: "absolute", zIndex: 20, inset: 0, pointerEvents: "none" }} />
                                            <iframe
                                                src={img.link}
                                                title="Website Detail"
                                                style={{
                                                    width: "100%", height: "100%", border: "none", background: "white", pointerEvents: isSelected ? "auto" : "none"
                                                }}
                                                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                                            />
                                        </div>
                                    ) : (
                                        <ImageWithSkeleton src={img.src} alt="" draggable={false} style={{ width: "100%", height: "100%", display: "block", borderRadius: T.rImg, objectFit: "cover", pointerEvents: "none" }} />
                                    )}

                                </div>
                            </div>
                        );
                    })}

                    {rootComments.map((c) => (
                        <Pin key={c.id} c={c} hoveredPin={hoveredPin} setHoveredPin={setHoveredPin} setCommentsOpen={setCommentsOpen} scale={scale} setHighlightedCommentId={setHighlightedCommentId} />
                    ))}

                    {addingPin && newPin && (
                        <CommentInput
                            newText={newText}
                            setNewText={setNewText}
                            newPin={newPin}
                            scale={scale}
                            currentUser={currentUser}
                            activeWspId={activeWspId}
                            submitComment={submitComment}
                        />
                    )}


                </div>

                {contextMenu && (
                    <div style={{ position: "fixed", left: contextMenu.x, top: contextMenu.y, background: T.surface, borderRadius: 12, padding: 8, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", border: `1px solid ${T.surfaceBorder}`, zIndex: 1000, minWidth: 160, animation: "fadeIn 150ms ease" }}>
                        <button
                            onClick={() => {
                                deleteImage(contextMenu.id);
                                setContextMenu(null);
                            }}
                            style={{ width: "100%", background: "none", border: "none", textAlign: "left", padding: "8px 12px", borderRadius: 8, fontSize: 14, fontFamily: T.font, fontWeight: 400, color: T.textSec, cursor: "pointer", transition: "background 150ms ease" }}
                            onMouseEnter={(e) => e.currentTarget.style.background = T.ghost}
                            onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                        >
                            Delete image
                        </button>
                    </div>
                )}

                <FloatingActions
                    commentsOpen={commentsOpen}
                    addingPin={addingPin}
                    setAddingPin={setAddingPin}
                    setNewPin={setNewPin}
                    setNewText={setNewText}
                    setCommentsOpen={setCommentsOpen}
                    commentsLength={rootComments.length}
                />
            </div>

            {/* Comments Drawer Backdrop */}
            <div
                onClick={() => setCommentsOpen(false)}
                style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)",
                    backdropFilter: "blur(4px)", zIndex: 190,
                    opacity: commentsOpen && ww < 768 ? 1 : 0,
                    pointerEvents: commentsOpen && ww < 768 ? "auto" : "none", // Fix: allow canvas clicks on desktop
                    transition: "opacity 400ms cubic-bezier(0.16, 1, 0.3, 1)"
                }}
            />

            {/* Comments Drawer */}
            <div style={{
                position: "fixed", right: ww >= 768 ? 32 : 0, top: ww >= 768 ? 32 : 0, bottom: ww >= 768 ? 32 : 0, width: ww < 768 ? "100vw" : panelW, maxWidth: "100vw",
                background: T.surface, borderRadius: ww >= 768 ? 24 : 0, boxShadow: ww >= 768 ? "0 24px 80px rgba(0,0,0,0.12)" : "none", zIndex: 200,
                display: "flex", flexDirection: "column", overflow: "hidden",
                transform: commentsOpen ? "translateX(0)" : "translateX(100%)",
                opacity: commentsOpen ? 1 : 0,
                pointerEvents: commentsOpen ? "auto" : "none",
                transition: "transform 500ms cubic-bezier(0.16, 1, 0.3, 1), opacity 500ms ease"
            }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 31px", flexShrink: 0 }}>
                    {activeThreadId ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <button
                                onClick={() => setActiveThreadId(null)}
                                style={{ width: 32, height: 32, borderRadius: T.rFull, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 180ms ease", marginRight: 8 }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = T.ghost)}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                            >
                                <ArrowLeft size={18} color={T.text} />
                            </button>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.2px", fontFamily: T.font, color: T.text }}>
                                    Thread
                                </span>
                                <span style={{ fontSize: 13, color: T.textSec, fontFamily: T.font }}>
                                    # {activeThreadComment?.author || "User"}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <span style={{ fontSize: 20, fontWeight: 400, letterSpacing: "-0.2px", fontFamily: T.font }}>Thoughts</span>
                    )}
                    <button
                        onClick={() => { setCommentsOpen(false); setActiveThreadId(null); }}
                        style={{ width: 40, height: 40, borderRadius: T.rFull, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 180ms ease", marginRight: "-8px" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = T.ghost)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                        <X size={20} color={T.text} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div style={{ flex: 1, overflowY: "auto", borderRight: "4px solid transparent" }}>
                    {commentsLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} style={{ padding: "24px 31px", borderRadius: 16 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: T.rFull, background: "rgba(0,0,0,0.05)", animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
                                    <div style={{ width: 100, height: 14, borderRadius: 4, background: "rgba(0,0,0,0.05)", animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
                                </div>
                                <div style={{ marginTop: 16, width: "100%", height: 14, borderRadius: 4, background: "rgba(0,0,0,0.05)", animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
                                <div style={{ marginTop: 8, width: "70%", height: 14, borderRadius: 4, background: "rgba(0,0,0,0.05)", animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
                                <div style={{ marginTop: 16, width: 64, height: 36, borderRadius: T.rFull, background: "rgba(0,0,0,0.05)", animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
                            </div>
                        ))
                    ) : activeThreadId && activeThreadComment ? (
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <div style={{ padding: "0 31px 8px 31px" }}>
                                <CommentItem
                                    key={activeThreadComment.id} c={activeThreadComment} i={0}
                                    toggleStar={toggleStar} editComment={editComment} deleteComment={deleteComment}
                                    currentUser={currentUser} isThreadView={true}
                                />
                            </div>

                            <div style={{ display: "flex", alignItems: "center", margin: "16px 15px 16px 15px", flexShrink: 0 }}>
                                {threadReplies.length > 0 && (
                                    <span style={{ fontSize: 13, fontWeight: 500, color: T.textSec, padding: "0 16px", whiteSpace: "nowrap", fontFamily: T.font }}>
                                        {threadReplies.length} {threadReplies.length === 1 ? "resposta" : "respostas"}
                                    </span>
                                )}
                                <div style={{ flex: 1, height: 1, background: T.surfaceBorder }} />
                            </div>

                            {/* Thread Replies */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "0 15px 31px 15px" }}>
                                {threadReplies.length > 0 ? (
                                    threadReplies.map((reply, i) => (
                                        <div key={reply.id} style={{ padding: "0 16px" }}>
                                            <CommentItem
                                                c={reply} i={i + 1}
                                                toggleStar={toggleStar} editComment={editComment} deleteComment={deleteComment}
                                                currentUser={currentUser} isThreadView={true}
                                            />
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ fontSize: 13, color: T.textSec, padding: "24px 0", textAlign: "center", fontFamily: T.font }}>No replies yet. Be the first!</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: "0 15px 31px 15px", display: "flex", flexDirection: "column", gap: 4 }}>
                            {rootComments.map((c, i) => (
                                <div key={c.id} style={{ padding: "0 16px" }}>
                                    <CommentItem
                                        c={c} i={i}
                                        toggleStar={toggleStar} editComment={editComment} deleteComment={deleteComment}
                                        commentsLength={rootComments.length} highlightedCommentId={highlightedCommentId}
                                        currentUser={currentUser}
                                        replies={activeComments.filter(r => r.parentId === c.id)}
                                        onOpenThread={() => setActiveThreadId(c.id)}
                                        isThreadView={false}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {activeThreadId && (
                    <div style={{ padding: "16px 31px 24px 31px", borderTop: `1px solid ${T.surfaceBorder}`, background: T.surface, flexShrink: 0, zIndex: 10 }}>
                        <ThreadReplyInput
                            onSubmit={(text) => submitReply(activeWspId, text, activeThreadId)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
