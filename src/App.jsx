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
    const [selectedImage, setSelectedImage] = useState(null);
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [comments, setComments] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [hovered, setHovered] = useState(null);
    const [loaded, setLoaded] = useState(false);
    const [animating, setAnimating] = useState(false);
    const [addingPin, setAddingPin] = useState(false);
    const [newPin, setNewPin] = useState(null);
    const [newText, setNewText] = useState("");
    const [hoveredPin, setHoveredPin] = useState(null);
    const [initialPan, setInitialPan] = useState({ x: 0, y: 0 });
    const [gridPadding, setGridPadding] = useState(4);
    const [themeMode, setThemeMode] = useState("light");
    const [highlightedCommentId, setHighlightedCommentId] = useState(null);
    const [uploadingCount, setUploadingCount] = useState(0);
    const [pendingDeletions, setPendingDeletions] = useState(new Set());
    const [commentsLoading, setCommentsLoading] = useState(false);
    const deleteTimeouts = useRef({});
    const toastTimeoutRef = useRef(null);

    const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();

    // Fetch workspaces after auth resolves (avoids queuing behind stale token refresh)
    useEffect(() => {
        if (authLoading) return;

        const fetchWorkspaces = async () => {
            const { data, error } = await supabase
                .from("workspaces")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Error fetching workspaces:", error);
            } else if (data) {
                const mapped = data.map(d => ({
                    id: d.id,
                    src: d.src,
                    w: d.width || 440,
                    h: d.height || 440,
                    createdBy: d.created_by,
                    workspaceId: d.workspace_id,
                    x: d.x_coord,
                    y: d.y_coord
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
                    setImages(prev => {
                        if (prev.find(img => img.id === d.id)) return prev;
                        const newImg = {
                            id: d.id, src: d.src, w: d.width || 440, h: d.height || 440, createdBy: d.created_by,
                            workspaceId: d.workspace_id, x: d.x_coord, y: d.y_coord
                        };
                        return [newImg, ...prev];
                    });
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'workspaces' },
                (payload) => {
                    const d = payload.new;
                    setImages(prev => prev.map(img =>
                        img.id === d.id ? { ...img, x: d.x_coord, y: d.y_coord, w: d.width, h: d.height } : img
                    ));
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'workspaces' },
                (payload) => {
                    const d = payload.old;
                    setImages(prev => prev.filter(img => img.id !== d.id));
                }
            )
            .on('broadcast', { event: 'image_move' }, (payload) => {
                // Broadcast for real-time drag (bypassing DB)
                const { id, x, y } = payload.payload;
                setImages(prev => prev.map(img => img.id === id ? { ...img, x, y } : img));
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [authLoading]);

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

    // Fetch notifications
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
            }
            // DetailView will handle its own paste event natively using its local canvas state
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, [view, images]);

    // Fetch and subscribe to comments when a workspace is opened
    useEffect(() => {
        if (view !== "detail" || !selectedImage) return;
        const activeWspId = selectedImage.workspaceId || selectedImage.id;

        const fetchComments = async () => {
            setCommentsLoading(true);
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
                    parentId: c.parent_id,
                    stars: c.stars,
                    starred: userLikes.includes(c.id), // Local state synced with user's likes 
                    time: "now", relativeTime: "" // Mocking time for now
                }));
                // Keep chronological order (oldest first) as requested: "ordem por adição"
                setComments(mapped);
            }
            setCommentsLoading(false);
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
                        return [...prev, {
                            id: c.id,
                            workspaceId: c.workspace_id,
                            authorId: c.author_id,
                            author: c.author_name,
                            avatar: c.author_avatar,
                            text: c.text,
                            pinX: c.pin_x,
                            pinY: c.pin_y,
                            parentId: c.parent_id,
                            stars: c.stars,
                            starred: false,
                            time: "now", relativeTime: ""
                        }];
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

        // Center specifically on the selected image
        let panX = 0;
        let panY = 0;

        if (latestImg.x !== undefined && latestImg.x !== null) {
            panX = -(latestImg.x + (latestImg.width || 440) / 2);
            panY = -(latestImg.y + (latestImg.height || ((latestImg.h / latestImg.w) * 440)) / 2);
        }

        setInitialPan({ x: panX, y: panY });
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
            showToast("You need to be logged in to like.");
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

            // Create notification if we are liking someone else's comment
            if (c.authorId !== user.id) {
                await supabase.from('notifications').insert([{
                    user_id: c.authorId,
                    actor_id: user.id,
                    actor_name: user.name,
                    actor_avatar: user.avatar,
                    type: 'like',
                    comment_id: c.id,
                    workspace_id: c.workspaceId,
                    read: false
                }]);
            }
        }
    };

    const submitReply = async (workspaceId, text, parentId) => {
        if (!user) {
            showToast("You need to login to reply.");
            return;
        }
        if (!text.trim()) return;

        // Parse mentions for the reply
        const mentionsMatch = text.match(/(@[a-zA-ZÀ-ÿ0-9_]+)/g);
        let mentionedUsers = [];
        if (mentionsMatch) {
            const usernames = mentionsMatch.map(m => m.substring(1));
            const { data } = await supabase.from("profiles").select("id, name").in("name", usernames);
            if (data) mentionedUsers = data;
        }

        const parentComment = comments.find(c => c.id === parentId);
        const pinX = (parentComment && parentComment.pinX != null) ? parentComment.pinX : 0;
        const pinY = (parentComment && parentComment.pinY != null) ? parentComment.pinY : 0;

        const newComment = {
            id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).substring(2),
            workspace_id: workspaceId,
            author_id: user.id,
            author_name: user.name, // Fixed to use the mapped user object
            author_avatar: user.avatar,
            text: text,
            pin_x: pinX, // Replies inherit parent's pin location to satisfy NOT NULL constraints
            pin_y: pinY,
            parent_id: parentId,
            stars: 0
        };

        // Optimistic UI for immediate feedback
        setComments(prev => [...prev, {
            id: newComment.id,
            workspaceId: newComment.workspace_id,
            authorId: newComment.author_id,
            author: newComment.author_name,
            avatar: newComment.author_avatar,
            text: newComment.text,
            pinX: newComment.pin_x,
            pinY: newComment.pin_y,
            parentId: newComment.parent_id,
            stars: newComment.stars,
            starred: false,
            time: "now", relativeTime: ""
        }]);

        const { error } = await supabase.from('comments').insert([newComment]);

        if (error) {
            console.error(error);
            showToast("Failed: " + error.message + " " + (error.details || ""));
            setComments(p => p.filter(c => c.id !== newComment.id)); // Revert optimistic UI
        }
        else if (mentionedUsers.length > 0) {
            const mentionNotifications = mentionedUsers.map(u => ({
                user_id: u.id,
                actor_id: user.id,
                actor_name: user.name,
                actor_avatar: user.avatar,
                workspace_id: workspaceId,
                comment_id: newComment.id,
                type: 'mention',
                read: false
            }));
            await supabase.from("notifications").insert(mentionNotifications);
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

        // Optimistic UI - appending to the bottom to respect chronological order
        setComments((p) => [
            ...p,
            { id: tempId, workspaceId: activeWspId, authorId: user.id, author: user.name, avatar: user.avatar, time: "now", relativeTime: "", text: newText, stars: 0, starred: false, pinX: newPin.x, pinY: newPin.y }
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

        // Parse mentions for the comment
        const mentionsMatch = newText.match(/(@[a-zA-ZÀ-ÿ0-9_]+)/g);
        let mentionedUsers = [];
        if (mentionsMatch) {
            const usernames = mentionsMatch.map(m => m.substring(1));
            const { data } = await supabase.from("profiles").select("id, name").in("name", usernames);
            if (data) mentionedUsers = data;
        }

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

            // Insert mention notifications if any
            if (mentionedUsers.length > 0) {
                const mentionNotifications = mentionedUsers.map(u => ({
                    user_id: u.id,
                    actor_id: user.id,
                    actor_name: user.name,
                    actor_avatar: user.avatar,
                    workspace_id: activeWspId,
                    comment_id: data.id,
                    type: 'mention',
                    read: false
                }));
                await supabase.from("notifications").insert(mentionNotifications);
            }
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
        // Find the image
        const imgToDelete = images.find(img => img.id === id);
        if (!imgToDelete) return;

        // Optimistic UI hide
        setImages(prev => prev.filter(img => img.id !== id));
        if (selectedImage?.id === id) {
            closeDetail();
        }

        // Add to pending
        setPendingDeletions(prev => new Set(prev).add(id));

        showToast("Successfully removed", 4000, {
            label: "Undo",
            onClick: () => {
                if (deleteTimeouts.current[id]) {
                    clearTimeout(deleteTimeouts.current[id]);
                    delete deleteTimeouts.current[id];
                }
                setPendingDeletions(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(id);
                    return newSet;
                });
                setImages(prev => {
                    if (prev.find(img => img.id === id)) return prev;
                    return [imgToDelete, ...prev];
                });
                setToastMsg(null);
            }
        });

        // Schedule actual DB deletion
        deleteTimeouts.current[id] = setTimeout(async () => {
            setPendingDeletions(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
            delete deleteTimeouts.current[id];

            const { error, data } = await supabase
                .from('workspaces')
                .delete()
                .eq('id', id)
                .select();

            if (error) {
                console.error("Failed to delete workspace:", error);
                showToast("Failed to remove image");
                setImages(prev => [imgToDelete, ...prev]);
            } else if (data && data.length === 0) {
                showToast("You don't have permission to remove this image.");
                setImages(prev => [imgToDelete, ...prev]);
            }
        }, 4000);
    };

    const [toastState, setToastState] = useState({ content: null, visible: false });

    const showToast = (text, duration = 3000, action = null) => {
        setToastState({ content: { text, action }, visible: true });

        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);

        toastTimeoutRef.current = setTimeout(() => {
            setToastState(prev => ({ ...prev, visible: false }));
            // the content stays for a bit so it doesn't vanish while fading out
        }, duration);
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
            setUploadingCount(p => p + 1);
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

                    if (viewTarget === "detail" && selectedImage) {
                        // Max bounding box for the new workspace image object to be pasted
                        const maxWidth = 300;
                        if (drawW > maxWidth) {
                            drawH = (img.height / img.width) * maxWidth;
                            drawW = maxWidth;
                        }

                        insertData.workspace_id = selectedImage.workspaceId || selectedImage.id;
                        // For detail view, dropX and dropY are directly passed as logical coordinates representing the exact center-screen from DetailView.
                        // We must offset them by half the inserted image's dimensions so the image centers itself perfectly on the viewer's screen.
                        insertData.x_coord = dropX - (drawW / 2);
                        insertData.y_coord = dropY - (drawH / 2);
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
                            createdBy: data.created_by,
                            workspaceId: data.workspace_id,
                            x: data.x_coord,
                            y: data.y_coord
                        };

                        // Update the optimistic UI
                        setImages(prev => {
                            return [newImg, ...prev]; // always newest first for Explore view
                        });
                    }
                    setUploadingCount(p => Math.max(0, p - 1));
                };
                img.onerror = () => setUploadingCount(p => Math.max(0, p - 1));
                img.src = src;
            };
            reader.onerror = () => setUploadingCount(p => Math.max(0, p - 1));
            reader.readAsDataURL(file);
        });
        return true;
    };

    const onImageMoved = (id, x, y) => {
        // Optimistic UI updates locally
        setImages(prevImages => prevImages.map(img => {
            if (img.id === id) {
                return { ...img, x, y };
            }
            return img;
        }));

        // Broadcast to other clients
        supabase.channel('public:workspaces').send({
            type: 'broadcast',
            event: 'image_move',
            payload: { id, x, y }
        });
    };

    const saveImagePosition = async (id, x, y) => {
        const { error } = await supabase
            .from('workspaces')
            .update({ x_coord: x, y_coord: y })
            .eq('id', id);

        if (error) {
            console.error("Failed to save image position:", error);
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
                                    setToastState(prev => ({ ...prev, visible: false }));
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
