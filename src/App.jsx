import { useState, useEffect, useRef } from "react";
import { ExploreView } from "./components/ExploreView";
import { DetailView } from "./components/DetailView";
import { INITIAL_IMAGES } from "./lib/mockData";
import { avatarSvg } from "./lib/svgGenerator";
import { useWindowWidth } from "./lib/useWindowWidth";
import { T } from "./lib/theme";
import { useAuth } from "./components/AuthContext";
import { supabase } from "./lib/supabase";

export default function App() {
    const [images, setImages] = useState([]);
    const [view, setView] = useState("explore");
    const [currentTab, setCurrentTab] = useState("Explore");
    const [savedImages, setSavedImages] = useState([]);
    const [hiddenImages, setHiddenImages] = useState([]);
    const [toastMsg, setToastMsg] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [comments, setComments] = useState([]);
    const [hovered, setHovered] = useState(null);
    const [loaded, setLoaded] = useState(false);
    const [animating, setAnimating] = useState(false);
    const [addingPin, setAddingPin] = useState(false);
    const [newPin, setNewPin] = useState(null);
    const [newText, setNewText] = useState("");
    const [hoveredPin, setHoveredPin] = useState(null);
    const [dragging, setDragging] = useState(null);
    const [dragOff, setDragOff] = useState({ x: 0, y: 0 });
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);
    const [gridPadding, setGridPadding] = useState(4);
    const [themeMode, setThemeMode] = useState("light");
    const [highlightedCommentId, setHighlightedCommentId] = useState(null);
    const canvasRef = useRef(null);

    const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();

    // Fetch workspaces on mount
    useEffect(() => {
        const fetchWorkspaces = async () => {
            const { data, error } = await supabase
                .from("workspaces")
                .select("*")
                .eq("status", "active")
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Error fetching workspaces:", error);
            } else if (data) {
                const mapped = data.map(d => ({
                    id: d.id,
                    src: d.src,
                    w: d.width || 440,
                    h: d.height || 440,
                }));
                setImages(mapped);
            }
            setLoaded(true);
        };
        fetchWorkspaces();

        // Subscribe to real-time workspaces so that everyone sees new images instantly without refreshing
        const channel = supabase.channel('public:workspaces')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'workspaces' },
                (payload) => {
                    const d = payload.new;
                    if (d.status === 'active') {
                        setImages(prev => {
                            if (prev.find(img => img.id === d.id)) return prev;
                            const newImg = { id: d.id, src: d.src, w: d.width || 440, h: d.height || 440 };
                            return [newImg, ...prev];
                        });
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'workspaces' },
                (payload) => {
                    const d = payload.new;
                    if (d.status === 'deleted') {
                        setImages(prev => prev.filter(img => img.id !== d.id));
                    }
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    // Fetch saved images when user changes
    useEffect(() => {
        if (!user) {
            setSavedImages([]);
            return;
        }
        const fetchSaved = async () => {
            const { data, error } = await supabase
                .from("saved_items")
                .select("workspace_id")
                .eq("user_id", user.id);
            if (!error && data) {
                setSavedImages(data.map(d => d.workspace_id));
            }
        };
        fetchSaved();
    }, [user?.id]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', themeMode);
    }, [themeMode]);

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
            } else if (view === "detail") {
                handleFilesDrop(syntheticEvent, "detail", window.innerWidth / 2, window.innerHeight / 2);
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, [view, scale, pan, selectedImage, images]);

    // Fetch and subscribe to comments when a workspace is opened
    useEffect(() => {
        if (view !== "detail" || !selectedImage) return;
        const activeWspId = selectedImage.workspaceId || selectedImage.id;

        const fetchComments = async () => {
            const { data, error } = await supabase
                .from("comments")
                .select("*")
                .eq("workspace_id", activeWspId)
                .order("created_at", { ascending: true }); // older first or newer first based on UI preference

            let userLikes = [];
            if (user && data && data.length > 0) {
                const commentIds = data.map(c => c.id);
                const { data: likesData } = await supabase
                    .from("comment_likes")
                    .select("comment_id")
                    .eq("user_id", user.id)
                    .in("comment_id", commentIds);
                if (likesData) userLikes = likesData.map(l => l.comment_id);
            }

            if (!error && data) {
                const mapped = data.map(c => ({
                    id: c.id,
                    workspaceId: c.workspace_id,
                    authorId: c.author_id,
                    author: c.author_name,
                    avatar: c.author_avatar,
                    text: c.text,
                    pinX: c.pin_x,
                    pinY: c.pin_y,
                    stars: c.stars,
                    starred: userLikes.includes(c.id), // Local state synced with user's likes 
                    time: "now", relativeTime: "" // Mocking time for now
                }));
                // Original app put newest first in the array `[new, ...prev]`
                setComments(mapped.reverse());
            }
        };

        fetchComments();

        // Subscribe to real-time changes
        const channel = supabase.channel(`comments_room_${activeWspId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'comments', filter: `workspace_id=eq.${activeWspId}` },
                (payload) => {
                    const c = payload.new;
                    // Dont duplicate if we inserted it ourselves optimistically
                    setComments(prev => {
                        if (prev.find(existing => existing.id === c.id)) return prev;
                        return [{
                            id: c.id,
                            workspaceId: c.workspace_id,
                            authorId: c.author_id,
                            author: c.author_name,
                            avatar: c.author_avatar,
                            text: c.text,
                            pinX: c.pin_x,
                            pinY: c.pin_y,
                            stars: c.stars,
                            starred: false,
                            time: "now", relativeTime: ""
                        }, ...prev];
                    });
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'comments', filter: `workspace_id=eq.${activeWspId}` },
                (payload) => {
                    setComments(prev => prev.map(c => c.id === payload.new.id ? { ...c, text: payload.new.text, stars: payload.new.stars } : c));
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'comments', filter: `workspace_id=eq.${activeWspId}` },
                (payload) => {
                    setComments(prev => prev.filter(c => c.id !== payload.old.id));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [view, selectedImage?.id]);

    const openDetail = (img) => {
        const latestImg = images.find(i => i.id === img.id) || img;

        setSelectedImage(latestImg);
        setAnimating(true);
        setView("detail");
        setCommentsOpen(false);
        setAddingPin(false);
        setNewPin(null);

        let panX = 0;
        let panY = 0;
        if (latestImg.x !== undefined) {
            panX = -(latestImg.x + (latestImg.width || 440) / 2);
            panY = -(latestImg.y + (latestImg.height || ((latestImg.h / latestImg.w) * 440)) / 2);
        }

        setPan({ x: panX, y: panY });
        setScale(1);
        setTimeout(() => setAnimating(false), 60);
    };

    const closeDetail = () => {
        setView("explore");
        setSelectedImage(null);
        setCommentsOpen(false);
        setAddingPin(false);
        setNewPin(null);
        setComments([]); // Clear comments on close so it doesn't leak to next image
    };

    const toggleStar = async (id) => {
        if (!user) {
            showToast("Você precisa estar logado para curtir.");
            return;
        }

        const c = comments.find(c => c.id === id);
        if (!c) return;

        const isStarred = c.starred;
        const newStars = isStarred ? c.stars - 1 : c.stars + 1;

        // Optimistic UI for instant feedback without delay
        setComments((p) =>
            p.map((c) => (c.id === id ? { ...c, starred: !isStarred, stars: newStars } : c))
        );

        if (isStarred) {
            const { error } = await supabase.from('comment_likes').delete().match({ user_id: user.id, comment_id: id });
            if (error) console.error("Toggle star failed", error);
        } else {
            const { error } = await supabase.from('comment_likes').insert([{ user_id: user.id, comment_id: id }]);
            if (error) console.error("Toggle star failed", error);
        }
    };

    const submitComment = async () => {
        if (!user) {
            showToast("You need to login to add a comment.");
            return;
        }
        if (!newText.trim() || !newPin || !selectedImage) return;
        const activeWspId = selectedImage.workspaceId || selectedImage.id;

        // optimistic ID for UX
        const tempId = Date.now();

        // Optimistic UI
        setComments((p) => [
            { id: tempId, workspaceId: activeWspId, authorId: user.id, author: user.name, avatar: user.avatar, time: "now", relativeTime: "", text: newText, stars: 0, starred: false, pinX: newPin.x, pinY: newPin.y },
            ...p,
        ]);

        const insertData = {
            workspace_id: activeWspId,
            author_id: user.id,
            author_name: user.name,
            author_avatar: user.avatar,
            text: newText,
            pin_x: newPin.x,
            pin_y: newPin.y
        };

        setNewText("");
        setNewPin(null);
        setAddingPin(false);
        setCommentsOpen(true);

        const { data, error } = await supabase
            .from('comments')
            .insert([insertData])
            .select()
            .single();

        if (error) {
            console.error(error);
            showToast("Failed to post thought");
            setComments(p => p.filter(c => c.id !== tempId)); // revert
        } else if (data) {
            // Update temp ID with real DB UUID
            setComments(p => p.map(c => c.id === tempId ? { ...c, id: data.id } : c));
        }
    };

    const editComment = async (id, updatedText) => {
        setComments((prev) => prev.map(c => c.id === id ? { ...c, text: updatedText } : c));
        const { error } = await supabase.from('comments').update({ text: updatedText }).eq('id', id);
        if (error) console.error("Failed to edit:", error);
    };

    const deleteComment = async (id) => {
        setComments((prev) => prev.filter(c => c.id !== id));
        const { error } = await supabase.from('comments').delete().eq('id', id);
        if (error) console.error("Failed to delete:", error);
    };

    const toggleSave = async (id) => {
        if (!user) {
            showToast("You need to login to save an image.");
            return;
        }
        const isSaved = savedImages.includes(id);

        // Optimistic UI
        setSavedImages(prev => isSaved ? prev.filter(sId => sId !== id) : [...prev, id]);

        if (isSaved) {
            const { error } = await supabase.from('saved_items').delete().match({ user_id: user.id, workspace_id: id });
            if (error) {
                console.error(error);
                setSavedImages(prev => [...prev, id]); // Revert on failure
            }
        } else {
            const { error } = await supabase.from('saved_items').insert([{ user_id: user.id, workspace_id: id }]);
            if (error) {
                console.error(error);
                setSavedImages(prev => prev.filter(sId => sId !== id)); // Revert on failure
            }
        }
    };

    const hideImage = (id) => {
        setHiddenImages(prev => [...prev, id]);
    };

    const deleteImage = async (id) => {
        // Optimistic UI
        setImages(prev => prev.filter(img => img.id !== id));
        if (selectedImage?.id === id) {
            closeDetail();
        }

        // Soft delete in DB
        const { error } = await supabase
            .from('workspaces')
            .update({ status: 'deleted' })
            .eq('id', id);

        if (error) {
            console.error("Failed to delete workspace:", error);
            showToast("Failed to delete image");
        }
    };

    const showToast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3000);
    };

    const handleFilesDrop = async (e, viewTarget, dropX, dropY) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user) {
            showToast("You need to login to add images.");
            return false;
        }

        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
        if (!files.length) return false;

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const src = ev.target.result;
                const img = new Image();
                img.onload = async () => {
                    let drawW = img.width;
                    let drawH = img.height;
                    let insertData = {
                        src,
                        width: drawW,
                        height: drawH,
                        created_by: user.id
                    };

                    // Define local state updates
                    let logicalX, logicalY;

                    if (viewTarget === "detail" && selectedImage && canvasRef.current) {
                        drawW = 300;
                        drawH = (img.height / img.width) * drawW;

                        const r = canvasRef.current.getBoundingClientRect();
                        const centerX = r.width / 2;
                        const centerY = r.height / 2;
                        logicalX = (dropX - centerX - pan.x) / scale;
                        logicalY = (dropY - centerY - pan.y) / scale;
                    }

                    // Insert into Supabase
                    const { data, error } = await supabase
                        .from('workspaces')
                        .insert([insertData])
                        .select()
                        .single();

                    if (!error && data) {
                        const newImg = {
                            id: data.id,
                            src: data.src,
                            w: data.width,
                            h: data.height,
                        };

                        if (viewTarget === "detail" && selectedImage && logicalX !== undefined) {
                            newImg.workspaceId = selectedImage.workspaceId || selectedImage.id;
                            newImg.x = logicalX - drawW / 2;
                            newImg.y = logicalY - drawH / 2;
                            newImg.width = drawW;
                            newImg.height = drawH;
                        }

                        // if dropped in detail view, we also need to update its local position in our state
                        setImages(prev => {
                            if (viewTarget === "detail" && selectedImage) {
                                // Important: We are appending it with its local coordinates
                                // so it renders properly in the DetailView context.
                                return [...prev, newImg]; // append to end so it renders on top
                            }
                            return [newImg, ...prev]; // explore view: newest first
                        });
                    }
                };
                img.src = src;
            };
            reader.readAsDataURL(file);
        });
        return true;
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const r = canvasRef.current.getBoundingClientRect();
            handleFilesDrop(e, "detail", e.clientX - r.left, e.clientY - r.top);
            return;
        }
        try {
            const rawData = e.dataTransfer.getData("text/plain");
            if (!rawData) return;
            const d = JSON.parse(rawData);

            const r = canvasRef.current.getBoundingClientRect();
            const centerX = r.width / 2;
            const centerY = r.height / 2;

            const localX = e.clientX - r.left;
            const localY = e.clientY - r.top;

            const logicalX = (localX - centerX - pan.x) / scale;
            const logicalY = (localY - centerY - pan.y) / scale;

            const dropDrawW = 300;
            const dropDrawH = (d.h / d.w) * dropDrawW;

            const updatedImgInfo = {
                workspaceId: selectedImage.workspaceId || selectedImage.id,
                x: logicalX - dropDrawW / 2,
                y: logicalY - dropDrawH / 2,
                width: dropDrawW,
                height: dropDrawH
            };

            setImages(prevImages => prevImages.map(img => {
                if (img.id === d.id) {
                    return { ...img, ...updatedImgInfo };
                }
                return img;
            }));
        } catch { }
    };

    const handleCMove = (e) => {
        if (!dragging) return;
        const r = canvasRef.current.getBoundingClientRect();
        const centerX = r.width / 2;
        const centerY = r.height / 2;

        const localX = e.clientX - r.left;
        const localY = e.clientY - r.top;

        const logicalX = (localX - centerX - pan.x) / scale;
        const logicalY = (localY - centerY - pan.y) / scale;

        setImages(prevImages => prevImages.map(img => {
            if (img.id === dragging.id) {
                return { ...img, x: logicalX - dragOff.x, y: logicalY - dragOff.y };
            }
            return img;
        }));
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
                } else if (view === "detail") {
                    handleDrop(e);
                }
            }}
        >
            {/* Toast Notification */}
            {toastMsg && (
                <div style={{ position: "fixed", bottom: 40, left: "50%", background: T.surface, color: T.text, padding: "12px 24px", borderRadius: T.rFull, fontSize: 14, fontWeight: 400, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", border: `1px solid ${T.surfaceBorder}`, zIndex: 9999, animation: "toastSlideUp 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
                    {toastMsg}
                </div>
            )}
            <style>{`
                @keyframes toastSlideUp {
                    from { opacity: 0; transform: translate(-50%, 20px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }
            `}</style>

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
                    showToast={showToast}
                    hovered={hovered}
                    setHovered={setHovered}
                    loaded={loaded}
                    gridPadding={gridPadding}
                    setGridPadding={setGridPadding}
                    themeMode={themeMode}
                    setThemeMode={setThemeMode}
                    user={user}
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
                    dragging={dragging}
                    setDragging={setDragging}
                    dragOff={dragOff}
                    setDragOff={setDragOff}
                    pan={pan}
                    setPan={setPan}
                    scale={scale}
                    setScale={setScale}
                    canvasRef={canvasRef}
                    handleDrop={handleDrop}
                    handleCMove={handleCMove}
                    submitComment={submitComment}
                    toggleStar={toggleStar}
                    editComment={editComment}
                    deleteComment={deleteComment}
                    animating={animating}
                    deleteImage={deleteImage}
                    highlightedCommentId={highlightedCommentId}
                    setHighlightedCommentId={setHighlightedCommentId}
                    currentUser={user}
                />
            )}
        </div>
    );
}
