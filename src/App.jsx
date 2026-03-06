import { useState, useEffect } from "react";
import { ExploreView } from "./components/ExploreView";
import { DetailView } from "./components/DetailView";
import { T } from "./lib/theme";
import { useAuth } from "./components/AuthContext";
import { useToast } from "./hooks/useToast";
import { useNotifications } from "./hooks/useNotifications";
import { useImages } from "./hooks/useImages";
import { useComments } from "./hooks/useComments";

export default function App() {
    const [view, setView] = useState("explore");
    const [currentTab, setCurrentTab] = useState("Explore");
    const [selectedImage, setSelectedImage] = useState(null);
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [hovered, setHovered] = useState(null);
    const [animating, setAnimating] = useState(false);
    const [addingPin, setAddingPin] = useState(false);
    const [newPin, setNewPin] = useState(null);
    const [newText, setNewText] = useState("");
    const [hoveredPin, setHoveredPin] = useState(null);
    const [initialPan, setInitialPan] = useState({ x: 0, y: 0 });
    const [gridPadding, setGridPadding] = useState(4);
    const [themeMode, setThemeMode] = useState("light");
    const [highlightedCommentId, setHighlightedCommentId] = useState(null);

    const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
    const { toastState, showToast, hideToast } = useToast();
    const { notifications } = useNotifications(user);
    const {
        images, loaded, savedImages, hiddenImages, uploadingCount,
        toggleSave, hideImage, deleteImage: deleteImageBase, handleFilesDrop: handleFilesDropBase,
        onImageMoved, saveImagePosition
    } = useImages(user, showToast);
    const {
        comments, commentsLoading, clearComments,
        toggleStar, submitReply, submitComment: submitCommentBase, editComment, deleteComment
    } = useComments(view, selectedImage, user, showToast);

    // Wrap deleteImage to also close detail if needed
    const deleteImage = (id) => {
        if (selectedImage?.id === id) {
            closeDetail();
        }
        deleteImageBase(id);
    };

    // Wrap handleFilesDrop to pass selectedImage
    const handleFilesDrop = (e, viewTarget, dropX, dropY) => {
        return handleFilesDropBase(e, viewTarget, dropX, dropY, selectedImage);
    };

    // Wrap submitComment to pass UI state setters
    const submitComment = () => {
        return submitCommentBase(newText, newPin, selectedImage, setNewText, setNewPin, setAddingPin, setCommentsOpen);
    };

    // Theme sync
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', themeMode);
    }, [themeMode]);

    // Paste handler for explore view
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

            if (view === "explore") {
                handleFilesDrop(syntheticEvent, "explore", 0, 0);
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, [view, images]);

    // URL Deep Linking — popstate
    useEffect(() => {
        const handlePopState = () => {
            const params = new URLSearchParams(window.location.search);
            const imageId = params.get("i");

            if (imageId && images.length > 0) {
                const img = images.find(i => i.aliasId === imageId || i.id === imageId);
                if (img) {
                    openDetail(img, false);
                }
            } else if (!imageId && view === "detail") {
                closeDetail(false);
            }
        };

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, [images, view]);

    // Initial load from URL
    useEffect(() => {
        if (loaded && images.length > 0 && view === "explore") {
            const params = new URLSearchParams(window.location.search);
            const imageId = params.get("i");
            if (imageId) {
                const img = images.find(i => i.aliasId === imageId || i.id === imageId);
                if (img) {
                    openDetail(img, false);
                }
            }
        }
    }, [loaded, images]);

    const openDetail = (img, updateUrl = true) => {
        const latestImg = images.find(i => i.id === img.id) || img;

        setSelectedImage(latestImg);
        setAnimating(true);
        setView("detail");
        setCommentsOpen(false);
        setAddingPin(false);
        setNewPin(null);

        if (updateUrl) {
            window.history.pushState({}, "", `/?i=${latestImg.aliasId || latestImg.id}`);
        }

        let panX = 0;
        let panY = 0;

        if (latestImg.x !== undefined && latestImg.x !== null) {
            panX = -(latestImg.x + (latestImg.width || 440) / 2);
            panY = -(latestImg.y + (latestImg.height || ((latestImg.h / latestImg.w) * 440)) / 2);
        }

        setInitialPan({ x: panX, y: panY });
        setTimeout(() => setAnimating(false), 60);
    };

    const closeDetail = (updateUrl = true) => {
        setView("explore");
        setSelectedImage(null);
        setCommentsOpen(false);
        setAddingPin(false);
        setNewPin(null);
        clearComments();

        if (updateUrl) {
            window.history.pushState({}, "", "/");
        }
    };

    if (authLoading) return <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", color: T.text, fontFamily: T.font }}>Loading session...</div>;

    return (
        <div
            style={{ fontFamily: T.font, background: T.bg, minHeight: "100vh", width: "100%", color: T.text, position: "relative", userSelect: "none", WebkitUserSelect: "none" }}
            onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(e) => {
                if (view === "explore") {
                    handleFilesDrop(e, "explore", 0, 0);
                }
            }}
        >
            {/* Toast Notification */}
            <div style={{
                position: "fixed", bottom: 40, left: "50%", background: T.surface, color: T.text, padding: "12px 24px", borderRadius: T.rFull, fontSize: 14, fontWeight: 400, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", border: `1px solid ${T.surfaceBorder}`, zIndex: 9999,
                display: "flex", alignItems: "center", gap: 16,
                transform: toastState.visible ? "translate(-50%, 0)" : "translate(-50%, 20px)",
                opacity: toastState.visible ? 1 : 0,
                pointerEvents: toastState.visible ? "auto" : "none",
                transition: "transform 300ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms ease"
            }}>
                {toastState.content && (
                    <>
                        <span>{toastState.content.text}</span>
                        {toastState.content.action && (
                            <button
                                onClick={() => {
                                    hideToast();
                                    toastState.content.action.onClick();
                                }}
                                style={{ background: "none", border: "none", color: "#3B82F6", fontWeight: 500, cursor: "pointer", padding: 0, fontSize: 14, marginLeft: "auto" }}
                            >
                                {toastState.content.action.label}
                            </button>
                        )}
                    </>
                )}
            </div>

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes starBurst {
                    0% { transform: scale(1); }
                    30% { transform: scale(1.35); }
                    60% { transform: scale(0.9); }
                    100% { transform: scale(1); }
                }
                @keyframes particleFly {
                    0% { transform: translate(0, 0) scale(0); opacity: 1; }
                    50% { opacity: 1; }
                    100% { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 0; }
                }
            `}</style>

            {/* Uploading Pill */}
            <div style={{
                position: "fixed", bottom: toastState.visible ? 96 : 40, left: "50%", background: T.surface, color: T.text, padding: "12px 24px", borderRadius: T.rFull, fontSize: 14, fontWeight: 500, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", border: `1px solid ${T.surfaceBorder}`, zIndex: 9999, display: "flex", alignItems: "center", gap: 12,
                transform: `translateX(-50%) ${uploadingCount > 0 ? 'translateY(0)' : 'translateY(20px)'}`,
                opacity: uploadingCount > 0 ? 1 : 0,
                pointerEvents: uploadingCount > 0 ? "auto" : "none",
                transition: "transform 300ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms ease, bottom 300ms cubic-bezier(0.16, 1, 0.3, 1)"
            }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${T.textTer}`, borderTopColor: T.text, animation: "spin 1s linear infinite" }} />
                Uploading...
            </div>

            {view === "explore" && (
                <ExploreView
                    images={images.filter(img => !hiddenImages.includes(img.id))}
                    handleFilesDrop={handleFilesDrop}
                    openDetail={openDetail}
                    currentTab={currentTab}
                    setCurrentTab={setCurrentTab}
                    savedImages={savedImages}
                    toggleSave={toggleSave}
                    hideImage={hideImage}
                    deleteImage={deleteImage}
                    showToast={showToast}
                    hovered={hovered}
                    setHovered={setHovered}
                    loaded={loaded}
                    gridPadding={gridPadding}
                    setGridPadding={setGridPadding}
                    themeMode={themeMode}
                    setThemeMode={setThemeMode}
                    user={user}
                    notifications={notifications}
                    signInWithGoogle={signInWithGoogle}
                    signOut={signOut}
                />
            )}
            {view === "detail" && (
                <DetailView
                    images={images}
                    selectedImage={images.find(img => img.id === selectedImage?.id) || selectedImage}
                    closeDetail={closeDetail}
                    comments={comments}
                    commentsOpen={commentsOpen}
                    setCommentsOpen={setCommentsOpen}
                    addingPin={addingPin}
                    setAddingPin={setAddingPin}
                    newPin={newPin}
                    setNewPin={setNewPin}
                    newText={newText}
                    setNewText={setNewText}
                    hoveredPin={hoveredPin}
                    setHoveredPin={setHoveredPin}
                    initialPan={initialPan}
                    handleFilesDrop={handleFilesDrop}
                    onImageMoved={onImageMoved}
                    saveImagePosition={saveImagePosition}
                    submitComment={submitComment}
                    toggleStar={toggleStar}
                    editComment={editComment}
                    deleteComment={deleteComment}
                    animating={animating}
                    deleteImage={deleteImage}
                    highlightedCommentId={highlightedCommentId}
                    setHighlightedCommentId={setHighlightedCommentId}
                    currentUser={user}
                    commentsLoading={commentsLoading}
                    submitReply={submitReply}
                />
            )}
        </div>
    );
}
