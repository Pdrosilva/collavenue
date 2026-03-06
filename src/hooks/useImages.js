import { useState, useEffect, useRef } from "react";
import { customAlphabet } from 'nanoid';
import { supabase } from "../lib/supabase";

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 8);

export const useImages = (user, showToast) => {
    const [images, setImages] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [savedImages, setSavedImages] = useState([]);
    const [hiddenImages, setHiddenImages] = useState([]);
    const [uploadingCount, setUploadingCount] = useState(0);
    const [pendingDeletions, setPendingDeletions] = useState(new Set());
    const deleteTimeouts = useRef({});

    // Fetch workspaces on mount
    useEffect(() => {
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
                    aliasId: d.alias_id,
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

        const channel = supabase.channel('public:workspaces')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'workspaces' },
                (payload) => {
                    const d = payload.new;
                    setImages(prev => {
                        if (prev.find(img => img.id === d.id)) return prev;
                        const newImg = {
                            id: d.id, aliasId: d.alias_id, src: d.src, w: d.width || 440, h: d.height || 440, createdBy: d.created_by,
                            workspaceId: d.workspace_id, x: d.x_coord, y: d.y_coord
                        };
                        return [newImg, ...prev];
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
                        alias_id: nanoid(),
                        src,
                        width: drawW,
                        height: drawH,
                        created_by: user.id
                    };

                    if (viewTarget === "detail" && selectedImage) {
                        const maxWidth = 300;
                        if (drawW > maxWidth) {
                            drawH = (img.height / img.width) * maxWidth;
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
                        const newImg = {
                            id: data.id,
                            aliasId: data.alias_id,
                            src: data.src,
                            w: data.width,
                            h: data.height,
                            createdBy: data.created_by,
                            workspaceId: data.workspace_id,
                            x: data.x_coord,
                            y: data.y_coord
                        };
                        setImages(prev => [newImg, ...prev]);
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
        setImages(prevImages => prevImages.map(img => {
            if (img.id === id) return { ...img, x, y };
            return img;
        }));

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

    return {
        images, setImages, loaded, savedImages, hiddenImages, uploadingCount,
        toggleSave, hideImage, deleteImage, handleFilesDrop, onImageMoved, saveImagePosition
    };
};
