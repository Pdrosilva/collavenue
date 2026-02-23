import { useState, useEffect } from "react";
import { X, ArrowLeft } from "lucide-react";
import { NavBar } from "./NavBar";
import { Pin } from "./Pin";
import { CommentItem } from "./CommentItem";
import { FloatingActions } from "./FloatingActions";
import { T } from "../lib/theme";
import { useWindowWidth } from "../lib/useWindowWidth";

const ImageWithSkeleton = ({ src, style, ...props }) => {
    const [loaded, setLoaded] = useState(false);
    return (
        <>
            {!loaded && (
                <div style={{ ...style, position: "absolute", inset: 0, background: "rgba(0,0,0,0.05)", animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
            )}
            <img
                src={src}
                style={{ ...style, opacity: loaded ? 1 : 0, transition: "opacity 300ms ease" }}
                onLoad={() => setLoaded(true)}
                {...props}
            />
        </>
    );
};

export const DetailView = ({
    images,
    selectedImage,
    closeDetail,
    onAddClick,
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
    dragging,
    setDragging,
    dragOff,
    setDragOff,
    pan,
    setPan,
    scale,
    setScale,
    canvasRef,
    handleDrop,
    handleCMove,
    submitComment,
    toggleStar,
    editComment,
    deleteComment,
    animating,
    deleteImage,
    highlightedCommentId,
    setHighlightedCommentId,
    currentUser
}) => {
    const ww = useWindowWidth();
    if (!selectedImage) return null;
    const panelW = ww < 768 ? ww : 440;
    const imgShift = 0;

    const [isSpaceDown, setIsSpaceDown] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [contextMenu, setContextMenu] = useState(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === "Escape") {
                setAddingPin(false);
                setNewPin(null);
                setNewText("");
                // don't return here so we can also check for other things if needed, but returning is fine
                return;
            }

            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

            if (e.code === "Space") {
                e.preventDefault();
                setIsSpaceDown(true);
            } else if (e.code === "KeyC") {
                e.preventDefault();
                setAddingPin(prev => !prev);
                if (newPin) {
                    setNewPin(null);
                    setNewText("");
                }
            }
        };
        const handleKeyUp = (e) => {
            if (e.code === "Space") {
                setIsSpaceDown(false);
                setIsPanning(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);

    useEffect(() => {
        const handleNativeWheel = (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
            }
        };
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.addEventListener("wheel", handleNativeWheel, { passive: false });
        }
        return () => {
            if (canvas) {
                canvas.removeEventListener("wheel", handleNativeWheel);
            }
        };
    }, []);

    const handleWheel = (e) => {
        if (e.ctrlKey || e.metaKey) {
            const r = canvasRef.current.getBoundingClientRect();
            const pointerX = e.clientX - r.left;
            const pointerY = e.clientY - r.top;

            const logicalX = (pointerX - r.width / 2 - pan.x) / scale;
            const logicalY = (pointerY - r.height / 2 - pan.y) / scale;

            const delta = e.deltaY * -0.01;
            const newScale = Math.min(Math.max(0.2, scale + delta), 4);

            if (newScale !== scale) {
                setScale(newScale);
                setPan({
                    x: pointerX - r.width / 2 - logicalX * newScale,
                    y: pointerY - r.height / 2 - logicalY * newScale
                });
            }
        } else {
            setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
        }
    };

    const handleMouseDown = (e) => {
        if (isSpaceDown || e.button === 1) { // Space + click or Middle click
            e.preventDefault();
            setIsPanning(true);
            setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }
    };

    const handleMouseMoveLocal = (e) => {
        if (isPanning) {
            setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
        } else {
            handleCMove(e);
        }
    };



    const activeWspId = selectedImage.workspaceId || selectedImage.id;
    const cw = images.filter(img => (img.workspaceId || img.id) === activeWspId);
    const activeComments = comments.filter((c) => c.workspaceId === activeWspId);

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
                onDrop={handleDrop}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMoveLocal}
                onMouseUp={() => { setDragging(null); setIsPanning(false); }}
                onMouseLeave={() => { setDragging(null); setIsPanning(false); }}
                onClick={(e) => {
                    setContextMenu(null);
                    if (isPanning || dragging || !addingPin) return;
                    if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") return;
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

                    {cw.map(img => {
                        const isSelected = img.id === selectedImage.id;

                        const defW = ww < 640 ? window.innerWidth * 0.85 : ww < 1024 ? 380 : 440;
                        const defH = (img.h / img.w) * defW;

                        const renderW = img.width || defW;
                        const renderH = img.height || defH;

                        const renderX = img.x !== undefined ? img.x : -renderW / 2;
                        const renderY = img.y !== undefined ? img.y : -renderH / 2;

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
                                        boxShadow: isSelected ? "0 12px 48px rgba(0,0,0,0.08)" : "0 4px 20px rgba(0,0,0,0.1)",
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

                    {activeComments.map((c) => (
                        <Pin key={c.id} c={c} hoveredPin={hoveredPin} setHoveredPin={setHoveredPin} setCommentsOpen={setCommentsOpen} scale={scale} setHighlightedCommentId={setHighlightedCommentId} />
                    ))}

                    {addingPin && newPin && (
                        <div style={{ position: "absolute", left: `calc(50% + ${newPin.x}px)`, top: `calc(50% + ${newPin.y}px)`, transform: "translate(-50%, -50%)", zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, pointerEvents: "auto" }}>
                            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#3B82F6", border: "3px solid white", boxShadow: "0 2px 8px rgba(0,0,0,0.2)", animation: "pulse 1.5s infinite" }} />
                            <div style={{ animation: "slideUp 200ms cubic-bezier(0,0,.2,1)" }}>
                                <input
                                    type="text"
                                    placeholder="Add your thought..."
                                    value={newText}
                                    onChange={(e) => setNewText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && newText.trim()) {
                                            submitComment();
                                        }
                                    }}
                                    autoFocus
                                    style={{
                                        width: 280, maxWidth: "90vw",
                                        height: 44, borderRadius: T.rFull, border: `1px solid ${T.surfaceBorder}`,
                                        padding: "0 20px", fontSize: 14, fontFamily: T.font,
                                        background: T.surfaceHover, outline: "none", color: T.text,
                                        transition: "border 180ms ease, box-shadow 180ms ease",
                                        boxShadow: "0 8px 32px rgba(0,0,0,0.12)"
                                    }}
                                    onFocus={(e) => { e.target.style.borderColor = T.textTer; e.target.style.boxShadow = "0 8px 32px rgba(17,17,16,0.15)"; }}
                                    onBlur={(e) => { e.target.style.borderColor = T.surfaceBorder; e.target.style.boxShadow = "0 8px 32px rgba(0,0,0,0.12)"; }}
                                />
                            </div>
                        </div>
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
                    commentsLength={activeComments.length}
                />
            </div>

            {commentsOpen && (
                <>
                    {ww < 768 && <div onClick={() => setCommentsOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)", zIndex: 190, animation: "fadeIn 300ms ease" }} />}
                    <div style={{ position: "fixed", right: ww >= 768 ? 32 : 0, top: ww >= 768 ? 32 : 0, bottom: ww >= 768 ? 32 : 0, width: ww < 768 ? "100vw" : panelW, maxWidth: "100vw", background: T.surface, borderRadius: ww >= 768 ? 24 : 0, boxShadow: ww >= 768 ? "0 24px 80px rgba(0,0,0,0.12)" : "none", zIndex: 200, display: "flex", flexDirection: "column", overflow: "hidden", animation: "slideInRight 500ms cubic-bezier(0,0,.2,1)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 31px", flexShrink: 0 }}>
                            <span style={{ fontSize: 20, fontWeight: 400, letterSpacing: "-0.2px", fontFamily: T.font }}>Thoughts</span>
                            <button
                                onClick={() => setCommentsOpen(false)}
                                style={{ width: 40, height: 40, borderRadius: T.rFull, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 180ms ease" }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = T.ghost)}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                            >
                                <X size={20} color={T.text} />
                            </button>
                        </div>
                        <div style={{ flex: 1, overflowY: "auto", padding: "0 23px 31px 31px", marginRight: 8 }}>
                            {activeComments.map((c, i) => <CommentItem key={c.id} c={c} i={i} toggleStar={toggleStar} editComment={editComment} deleteComment={deleteComment} commentsLength={activeComments.length} highlightedCommentId={highlightedCommentId} currentUser={currentUser} />)}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
