import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const timeAgo = (dateParam) => {
    if (!dateParam) return "agora";
    const date = typeof dateParam === 'object' ? dateParam : new Date(dateParam);
    const today = new Date();
    const seconds = Math.round((today - date) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) return "agora";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
};

export const useComments = (view, selectedImage, user, showToast) => {
    const [comments, setComments] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(false);

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
                .order("created_at", { ascending: true });

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
                    starred: userLikes.includes(c.id),
                    time: "agora", relativeTime: timeAgo(c.created_at)
                }));
                setComments(mapped);
            }
            setCommentsLoading(false);
        };

        fetchComments();

        const channel = supabase.channel(`comments_room_${activeWspId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'comments', filter: `workspace_id=eq.${activeWspId}` },
                (payload) => {
                    const c = payload.new;
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
                            time: "agora", relativeTime: timeAgo(c.created_at)
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

    const toggleStar = async (id) => {
        if (!user) {
            showToast("You need to be logged in to like.");
            return;
        }

        const c = comments.find(c => c.id === id);
        if (!c) return;

        const isStarred = c.starred;
        const newStars = isStarred ? c.stars - 1 : c.stars + 1;

        setComments((p) =>
            p.map((c) => (c.id === id ? { ...c, starred: !isStarred, stars: newStars } : c))
        );

        if (isStarred) {
            const { error } = await supabase.from('comment_likes').delete().match({ user_id: user.id, comment_id: id });
            if (error) console.error("Toggle star failed", error);
        } else {
            const { error } = await supabase.from('comment_likes').insert([{ user_id: user.id, comment_id: id }]);
            if (error) console.error("Toggle star failed", error);

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
            author_name: user.name,
            author_avatar: user.avatar,
            text: text,
            pin_x: pinX,
            pin_y: pinY,
            parent_id: parentId,
            stars: 0
        };

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
            time: "agora", relativeTime: "agora"
        }]);

        const { error } = await supabase.from('comments').insert([newComment]);

        if (error) {
            console.error(error);
            showToast("Failed: " + error.message + " " + (error.details || ""));
            setComments(p => p.filter(c => c.id !== newComment.id));
        } else {
            // Notify parent comment author about the reply
            if (parentComment && parentComment.authorId && parentComment.authorId !== user.id) {
                await supabase.from('notifications').insert([{
                    user_id: parentComment.authorId,
                    actor_id: user.id,
                    actor_name: user.name,
                    actor_avatar: user.avatar,
                    type: 'reply',
                    comment_id: newComment.id,
                    workspace_id: workspaceId,
                    read: false
                }]);
            }

            // Notify mentioned users
            if (mentionedUsers.length > 0) {
                const mentionNotifications = mentionedUsers
                    .filter(u => u.id !== user.id) // Don't notify yourself
                    .map(u => ({
                        user_id: u.id,
                        actor_id: user.id,
                        actor_name: user.name,
                        actor_avatar: user.avatar,
                        workspace_id: workspaceId,
                        comment_id: newComment.id,
                        type: 'mention',
                        read: false
                    }));
                if (mentionNotifications.length > 0) {
                    await supabase.from("notifications").insert(mentionNotifications);
                }
            }
        }
    };

    const submitComment = async (newText, newPin, selectedImage, setNewText, setNewPin, setAddingPin, setCommentsOpen) => {
        if (!user) {
            showToast("You need to login to add a comment.");
            return;
        }
        if (!newText.trim() || !newPin || !selectedImage) return;
        const activeWspId = selectedImage.workspaceId || selectedImage.id;

        const tempId = Date.now();

        setComments((p) => [
            ...p,
            { id: tempId, workspaceId: activeWspId, authorId: user.id, author: user.name, avatar: user.avatar, time: "agora", relativeTime: "agora", text: newText, stars: 0, starred: false, pinX: newPin.x, pinY: newPin.y }
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
            setComments(p => p.filter(c => c.id !== tempId));
        } else if (data) {
            setComments(p => p.map(c => c.id === tempId ? { ...c, id: data.id } : c));

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

    const clearComments = () => setComments([]);

    return {
        comments, commentsLoading, clearComments,
        toggleStar, submitReply, submitComment, editComment, deleteComment
    };
};
