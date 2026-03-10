import { useState, useEffect, useRef, useCallback } from "react";
import { customAlphabet } from 'nanoid';
import { supabase } from "../lib/supabase";

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 8);

const PAGE_SIZE = 30;

export const useImages = (user, showToast) => {
    const [images, setImages] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [savedImages, setSavedImages] = useState([]);
    const [hiddenImages, setHiddenImages] = useState([]);
    const [uploadingCount, setUploadingCount] = useState(0);
    const [pendingDeletions, setPendingDeletions] = useState(new Set());
    const deleteTimeouts = useRef({});
    const offsetRef = useRef(0);
    const broadcastThrottleRef = useRef(null);

    const mapWorkspace = (d) => ({
        id: d.id,
        aliasId: d.alias_id,
        src: d.src,
        w: d.width || 440,
        h: d.height || 440,
        createdBy: d.created_by,
        workspaceId: d.workspace_id,
        x: d.x_coord,
        y: d.y_coord
    });

    // Fetch first page of workspaces on mount
    useEffect(() => {
        const fetchWorkspaces = async () => {
            const { data, error } = await supabase
                .from("workspaces")
                .select("id, alias_id, src, width, height, created_by, workspace_id, x_coord, y_coord")
                .order("created_at", { ascending: false })
                .range(0, PAGE_SIZE - 1);

            if (error) {
                console.error("Error fetching workspaces:", error);
            } else if (data) {
                setImages(data.map(mapWorkspace));
                setHasMore(data.length === PAGE_SIZE);
                offsetRef.current = data.length;
            }
            setLoaded(true);
        };
        fetchWorkspaces();

        const channel = supabase.channel('public:workspaces')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'workspaces' },
                (payload) => {
                    const d = payload.new;
                    setImages(prev => {
                        if (prev.find(img => img.id === d.id)) return prev;
                        return [mapWorkspace(d), ...prev];
                    });
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
                const { id, x, y } = payload.payload;
                setImages(prev => prev.map(img => img.id === id ? { ...img, x, y } : img));
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    // Load more images (pagination)
    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);

        const { data, error } = await supabase
            .from("workspaces")
            .select("id, alias_id, src, width, height, created_by, workspace_id, x_coord, y_coord")
            .order("created_at", { ascending: false })
            .range(offsetRef.current, offsetRef.current + PAGE_SIZE - 1);

        if (!error && data) {
            setImages(prev => {
                const existingIds = new Set(prev.map(img => img.id));
                const newImages = data.filter(d => !existingIds.has(d.id)).map(mapWorkspace);
                return [...prev, ...newImages];
            });
            setHasMore(data.length === PAGE_SIZE);
            offsetRef.current += data.length;
        }
        setLoadingMore(false);
    }, [loadingMore, hasMore]);

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

    const toggleSave = async (id) => {
        if (!user) {
            showToast("You need to login to save an image.");
            return;
        }
        const isSaved = savedImages.includes(id);
        setSavedImages(prev => isSaved ? prev.filter(sId => sId !== id) : [...prev, id]);

        if (isSaved) {
            const { error } = await supabase.from('saved_items').delete().match({ user_id: user.id, workspace_id: id });
            if (error) {
                console.error(error);
                setSavedImages(prev => [...prev, id]);
            }
        } else {
            const { error } = await supabase.from('saved_items').insert([{ user_id: user.id, workspace_id: id }]);
            if (error) {
                console.error(error);
                setSavedImages(prev => prev.filter(sId => sId !== id));
            }
        }
    };

    const hideImage = (id) => {
        setHiddenImages(prev => [...prev, id]);
    };

    const deleteImage = async (id, closeDetailFn, setToastMsg) => {
        const imgToDelete = images.find(img => img.id === id);
        if (!imgToDelete) return;

        setImages(prev => prev.filter(img => img.id !== id));
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
                if (setToastMsg) setToastMsg(null);
            }
        });

        deleteTimeouts.current[id] = setTimeout(async () => {
            setPendingDeletions(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
            delete deleteTimeouts.current[id];

            // Also delete from Storage if it's a Storage URL
            if (imgToDelete.src && !imgToDelete.src.startsWith('data:')) {
                try {
                    const url = new URL(imgToDelete.src);
                    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/images\/(.+)/);
                    if (pathMatch) {
                        await supabase.storage.from('images').remove([pathMatch[1]]);
                    }
                } catch (e) { /* ignore parse errors for legacy URLs */ }
            }

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

    const handleFilesDrop = async (e, viewTarget, dropX, dropY, selectedImage) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user) {
            showToast("You need to login to add images.");
            return false;
        }

        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
        if (!files.length) return false;

        for (const file of files) {
            setUploadingCount(p => p + 1);

            try {
                // 1. Read file dimensions
                const dimensions = await getImageDimensions(file);
                let drawW = dimensions.width;
                let drawH = dimensions.height;

                // 2. Upload original to Supabase Storage
                const fileExt = file.name.split('.').pop() || 'png';
                const filePath = `${user.id}/${nanoid()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('images')
                    .upload(filePath, file, {
                        contentType: file.type,
                        upsert: false
                    });

                if (uploadError) {
                    console.error("Storage upload failed:", uploadError);
                    showToast("Failed to upload image");
                    setUploadingCount(p => Math.max(0, p - 1));
                    continue;
                }

                // 3. Get public URL
                const { data: urlData } = supabase.storage
                    .from('images')
                    .getPublicUrl(filePath);

                const publicUrl = urlData.publicUrl;

                // 4. Insert metadata into database (URL only, no base64)
                let insertData = {
                    alias_id: nanoid(),
                    src: publicUrl,
                    width: drawW,
                    height: drawH,
                    created_by: user.id
                };

                if (viewTarget === "detail" && selectedImage) {
                    const maxWidth = 300;
                    if (drawW > maxWidth) {
                        drawH = (dimensions.height / dimensions.width) * maxWidth;
                        drawW = maxWidth;
                    }
                    insertData.workspace_id = selectedImage.workspaceId || selectedImage.id;
                    insertData.x_coord = dropX - (drawW / 2);
                    insertData.y_coord = dropY - (drawH / 2);
                }

                const { data, error } = await supabase
                    .from('workspaces')
                    .insert([insertData])
                    .select()
                    .single();

                if (!error && data) {
                    setImages(prev => [mapWorkspace(data), ...prev]);
                }

            } catch (err) {
                console.error("Upload error:", err);
                showToast("Failed to process image");
            }

            setUploadingCount(p => Math.max(0, p - 1));
        }
        return true;
    };

    const onImageMoved = (id, x, y) => {
        // Immediate local update (no lag)
        setImages(prevImages => prevImages.map(img => {
            if (img.id === id) return { ...img, x, y };
            return img;
        }));

        // Throttled broadcast to other clients (max 20/sec instead of 60)
        if (!broadcastThrottleRef.current) {
            broadcastThrottleRef.current = setTimeout(() => {
                broadcastThrottleRef.current = null;
            }, 50);

            supabase.channel('public:workspaces').send({
                type: 'broadcast',
                event: 'image_move',
                payload: { id, x, y }
            });
        }
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

    const fetchImage = async (id) => {
        const { data, error } = await supabase
            .from("workspaces")
            .select("id, alias_id, src, width, height, created_by, workspace_id, x_coord, y_coord")
            .or(`id.eq.${id},alias_id.eq.${id}`)
            .single();

        if (!error && data) {
            const newImg = mapWorkspace(data);
            setImages(prev => {
                if (!prev.find(img => img.id === newImg.id)) {
                    return [...prev, newImg];
                }
                return prev;
            });
            return newImg;
        }
        return null;
    };

    return {
        images, setImages, loaded, savedImages, hiddenImages, uploadingCount,
        hasMore, loadingMore, loadMore, fetchImage,
        toggleSave, hideImage, deleteImage, handleFilesDrop, onImageMoved, saveImagePosition
    };
};

// Helper: get image dimensions from a File object
const getImageDimensions = (file) => {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve({ width: 440, height: 440 }); // Fallback
        };
        img.src = url;
    });
};
