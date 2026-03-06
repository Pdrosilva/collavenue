import { useState, useEffect } from "react";
import { useWindowWidth } from "../lib/useWindowWidth";
import { Bookmark, Layers, Moon, Sun, MoreHorizontal, ImagePlus } from "lucide-react";
import { T } from "../lib/theme";
import { NavBar } from "../components/NavBar";

import { ImageWithSkeleton } from "./ImageWithSkeleton";

export const ExploreView = ({ images, handleFilesDrop, openDetail, currentTab, setCurrentTab, savedImages, toggleSave, hovered, setHovered, loaded, gridPadding, setGridPadding, themeMode, setThemeMode, hideImage, showToast, user, notifications, signInWithGoogle, signOut, deleteImage }) => {
    const ww = useWindowWidth();
    const cols = ww < 640 ? 2 : ww < 1024 ? 3 : 4;
    const [tabLoaded, setTabLoaded] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [imageToDelete, setImageToDelete] = useState(null);

    useEffect(() => {
        setTabLoaded(false);
        const timer = setTimeout(() => setTabLoaded(true), 50);
        return () => clearTimeout(timer);
    }, [currentTab]);

    const columns = Array.from({ length: cols }, () => []);
    const heights = Array(cols).fill(0);

    const displayImages = currentTab === "Saved" ? images.filter(img => savedImages.includes(img.id)) : images;

    displayImages.forEach((img, i) => {
        const s = heights.indexOf(Math.min(...heights));
        columns[s].push({ ...img, index: i });
        heights[s] += img.h / img.w;
    });

    const isVisible = loaded && tabLoaded;

    return (
        <>
            <NavBar onSettingsClick={() => setIsSettingsOpen(!isSettingsOpen)} currentTab={currentTab} setCurrentTab={setCurrentTab} user={user} notifications={notifications} />

            {/* Settings Card Overlay */}
            {isSettingsOpen && (
                <div
                    style={{ position: "fixed", inset: 0, zIndex: 290 }}
                    onClick={() => setIsSettingsOpen(false)}
                />
            )}

            {/* Settings Popover Card */}
            <div style={{
                position: "fixed", top: ww < 640 ? 76 : 80, right: ww < 640 ? 15 : 32,
                background: T.surface, zIndex: 300,
                transform: isSettingsOpen ? "translateY(0) scale(1)" : "translateY(-10px) scale(0.95)",
                opacity: isSettingsOpen ? 1 : 0,
                pointerEvents: isSettingsOpen ? "auto" : "none",
                transition: "transform 300ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms ease",
                boxShadow: "0 12px 48px rgba(0,0,0,0.12)",
                padding: "24px",
                borderRadius: 24,
                width: 320,
                display: "flex", flexDirection: "column", gap: 24,
            }}>
                {user ? (
                    <>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={{ fontFamily: T.font, fontSize: 20, fontWeight: 400, color: "var(--text)" }}>{user.name}</span>
                            <span style={{ fontFamily: T.font, fontSize: 16, color: "var(--textTer)" }}>Logged in via Google</span>
                        </div>
                        <div style={{ width: "100%", height: 1, background: "rgba(0,0,0,0.06)" }} />
                    </>
                ) : (
                    <>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <span style={{ fontFamily: T.font, fontSize: 20, fontWeight: 400, color: "var(--text)" }}>Welcome</span>
                            <span style={{ fontFamily: T.font, fontSize: 14, color: "var(--textTer)", lineHeight: 1.4 }}>Sign in to save images, post pins, and comment.</span>
                            <button
                                onClick={signInWithGoogle}
                                style={{ marginTop: 8, padding: "12px 16px", borderRadius: 12, border: `1px solid ${T.surfaceBorder}`, background: T.surfaceHover, color: T.text, fontSize: 14, fontFamily: T.font, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 200ms ease" }}
                                onMouseEnter={(e) => e.currentTarget.style.background = T.ghost}
                                onMouseLeave={(e) => e.currentTarget.style.background = T.surfaceHover}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                Continue with Google
                            </button>
                        </div>
                        <div style={{ width: "100%", height: 1, background: "rgba(0,0,0,0.06)" }} />
                    </>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: 400, fontFamily: T.font, fontSize: 18, color: "var(--text)" }}>Theme</span>
                        <div style={{ display: "flex", gap: 16 }}>
                            <button
                                onClick={() => setThemeMode("light")}
                                style={{
                                    background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center",
                                    color: themeMode === "light" ? "var(--text)" : "var(--textTer)",
                                    cursor: "pointer", transition: "color 0.2s, transform 0.2s"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                            >
                                <Sun size={20} />
                            </button>
                            <button
                                onClick={() => setThemeMode("dark")}
                                style={{
                                    background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center",
                                    color: themeMode === "dark" ? "var(--text)" : "var(--textTer)",
                                    cursor: "pointer", transition: "color 0.2s, transform 0.2s"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                            >
                                <Moon size={20} />
                            </button>
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: 400, fontFamily: T.font, fontSize: 18, color: "var(--text)" }}>Grid</span>
                        <div style={{ display: "flex", gap: 16 }}>
                            {[{ v: 4, l: "I" }, { v: 16, l: "II" }, { v: 32, l: "III" }].map(opt => (
                                <button
                                    key={opt.v}
                                    onClick={() => setGridPadding(opt.v)}
                                    style={{
                                        background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center",
                                        color: gridPadding === opt.v ? "var(--text)" : "var(--textTer)",
                                        fontFamily: T.font, fontSize: 16, fontWeight: 400,
                                        cursor: "pointer", transition: "color 0.2s"
                                    }}
                                >
                                    {opt.l}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ width: "100%", height: 1, background: "rgba(0,0,0,0.06)", marginTop: 4 }} />

                {user && (
                    <span onClick={signOut} style={{ fontFamily: T.font, fontSize: 18, fontWeight: 400, color: "var(--text)", cursor: "pointer", marginTop: 4 }}>
                        Sign out
                    </span>
                )}
            </div>

            <div
                style={{ padding: ww < 640 ? "96px 15px 60px" : "104px 32px 60px", maxWidth: 1440, margin: "0 auto", minHeight: "calc(100vh - 80px)" }}
            >
                {!isVisible ? (
                    <div style={{ display: "flex", gap: gridPadding, transition: "gap 300ms ease" }}>
                        {Array.from({ length: cols }).map((_, ci) => (
                            <div key={`skel-col-${ci}`} style={{ flex: 1, display: "flex", flexDirection: "column", gap: gridPadding }}>
                                {Array.from({ length: 3 }).map((_, ri) => (
                                    <div
                                        key={`skel-item-${ci}-${ri}`}
                                        style={{
                                            borderRadius: T.rImg,
                                            background: "rgba(0,0,0,0.04)",
                                            aspectRatio: `${[1.2, 0.8, 1.4, 0.9, 1.3, 1.1][(ci * 3 + ri) % 6]}`,
                                            animation: "skeletonPulse 1.5s ease-in-out infinite",
                                        }}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                ) : displayImages.length === 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "15vh 32px", color: "var(--textTer)", fontFamily: T.font, textAlign: "center", animation: "fadeIn 300ms ease" }}>
                        {currentTab === "Saved" ? (
                            <Bookmark size={48} strokeWidth={1.5} style={{ marginBottom: 24, opacity: 0.3 }} />
                        ) : (
                            <ImagePlus size={48} strokeWidth={1.5} style={{ marginBottom: 24, opacity: 0.3 }} />
                        )}
                        <span style={{ fontSize: 22, fontWeight: 400, color: "var(--text)", letterSpacing: "-0.02em" }}>Nothing here yet</span>
                        <span style={{ fontSize: 16, marginTop: 12, lineHeight: 1.5, maxWidth: 320 }}>{currentTab === "Saved" ? "Save some references to see them here." : "Try adding a link or dropping an image."}</span>
                    </div>
                ) : (
                    <div style={{ display: "flex", gap: gridPadding, transition: "gap 300ms ease" }}>
                        {columns.map((col, ci) => (
                            <div key={ci} style={{ flex: 1, display: "flex", flexDirection: "column", gap: gridPadding, transition: "gap 300ms ease" }}>
                                {col.map((img, ri) => {
                                    const isH = hovered === img.id;

                                    return (
                                        <div
                                            key={img.id}
                                            onClick={() => openDetail(img)}
                                            onMouseEnter={() => setHovered(img.id)}
                                            onMouseLeave={() => setHovered(null)}
                                            style={{
                                                borderRadius: T.rImg,
                                                overflow: "hidden",
                                                cursor: "pointer",
                                                position: "relative",
                                                aspectRatio: `${img.w}/${img.h}`,
                                            }}
                                        >
                                            {img.link ? (
                                                <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: T.rImg, overflow: "hidden", pointerEvents: "none" }}>
                                                    <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,0.6)", color: "white", padding: "4px 8px", borderRadius: 4, fontSize: 12, fontWeight: 400, zIndex: 5, backdropFilter: "blur(4px)" }}>
                                                        Website
                                                    </div>
                                                    <iframe
                                                        src={img.link}
                                                        title="Website Preview"
                                                        style={{
                                                            width: "400%", height: "400%", transform: "scale(0.25)", transformOrigin: "0 0",
                                                            border: "none", background: "white", pointerEvents: "none"
                                                        }}
                                                        sandbox="allow-same-origin allow-scripts"
                                                    />
                                                </div>
                                            ) : (
                                                <ImageWithSkeleton
                                                    src={img.src}
                                                    alt=""
                                                    draggable={false}
                                                    style={{
                                                        width: "100%", height: "100%", objectFit: "cover", display: "block",
                                                    }}
                                                />
                                            )}
                                            <div
                                                style={{
                                                    position: "absolute", inset: 0,
                                                    background: "rgba(0,0,0,0.15)",
                                                    opacity: isH || openMenuId === img.id ? 1 : 0,
                                                    transition: "opacity 300ms ease",
                                                    pointerEvents: "none",
                                                }}
                                            />

                                            {/* Hover Overlay Icons */}
                                            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: isH || openMenuId === img.id ? 1 : 0, transition: "opacity 300ms ease", zIndex: 10 }}>
                                                {/* Save Button */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleSave(img.id); }}
                                                    style={{ position: "absolute", top: 12, right: 12, width: 36, height: 36, borderRadius: T.rFull, background: savedImages.includes(img.id) ? T.accent : T.surface, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", pointerEvents: "auto", boxShadow: "0 2px 12px rgba(0,0,0,0.1)", transition: "all 180ms ease" }}
                                                    onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                                                    onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                                                >
                                                    <Bookmark size={18} fill={savedImages.includes(img.id) ? T.accentText : "none"} color={savedImages.includes(img.id) ? T.accentText : T.text} />
                                                </button>

                                                {/* Connect Button Indicator */}
                                                {(images.some(other => other.workspaceId === img.id && other.id !== img.id) || img.workspaceId) && (
                                                    <div style={{ position: "absolute", bottom: 12, left: 12, width: 36, height: 36, borderRadius: T.rFull, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "auto", backdropFilter: "blur(12px)" }}>
                                                        <Layers size={18} color="white" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Options Menu Button & Popover */}
                                            <div style={{ position: "absolute", top: 12, left: 12, opacity: isH || openMenuId === img.id ? 1 : 0, transition: "opacity 300ms ease", zIndex: 20 }}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === img.id ? null : img.id); }}
                                                    style={{ width: 36, height: 36, background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", pointerEvents: "auto", transition: "transform 180ms ease" }}
                                                    onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                                                    onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                                                >
                                                    <MoreHorizontal size={24} color="white" style={{ opacity: 1 }} />
                                                </button>

                                                {openMenuId === img.id && (
                                                    <>
                                                        <div style={{ position: "fixed", inset: 0, zIndex: 190 }} onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }} />
                                                        <div style={{ position: "absolute", top: 44, left: 0, background: T.surface, borderRadius: 12, padding: 6, width: 160, zIndex: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", border: `1px solid ${T.surfaceBorder}`, display: "flex", flexDirection: "column", gap: 2, animation: "fadeIn 150ms ease" }}>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigator.clipboard.writeText(img.src);
                                                                    showToast("Link copied.");
                                                                    setOpenMenuId(null);
                                                                }}
                                                                style={{ width: "100%", background: "none", border: "none", textAlign: "left", padding: "8px 12px", borderRadius: 8, fontSize: 14, fontFamily: T.font, fontWeight: 400, color: T.textSec, cursor: "pointer", transition: "background 150ms ease" }}
                                                                onMouseEnter={(e) => e.currentTarget.style.background = T.surfaceHover}
                                                                onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                                                            >
                                                                Share
                                                            </button>
                                                            {user && user.id === img.createdBy && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setImageToDelete(img.id);
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    style={{ width: "100%", background: "none", border: "none", textAlign: "left", padding: "8px 12px", borderRadius: 8, fontSize: 14, fontFamily: T.font, fontWeight: 400, color: "#ef4444", cursor: "pointer", transition: "background 150ms ease" }}
                                                                    onMouseEnter={(e) => e.currentTarget.style.background = T.surfaceHover}
                                                                    onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                                                                >
                                                                    Remove
                                                                </button>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Remove Confirmation Modal */}
            {imageToDelete && (
                <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center" }}>
                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} onClick={() => setImageToDelete(null)} />
                    <div style={{ background: T.surface, padding: 24, borderRadius: 16, width: "100%", maxWidth: 320, position: "relative", zIndex: 1001, border: `1px solid ${T.surfaceBorder}`, boxShadow: "0 12px 48px rgba(0,0,0,0.12)", color: T.text, fontFamily: T.font }}>
                        <h3 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 600, letterSpacing: "-0.36px" }}>Remove Image?</h3>
                        <p style={{ margin: "0 0 24px", fontSize: 14, opacity: 0.7, lineHeight: 1.4 }}>Are you sure you want to permanently remove this image from the database? This action cannot be undone.</p>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            <button
                                onClick={() => setImageToDelete(null)}
                                style={{ padding: "8px 16px", borderRadius: T.rFull, border: "none", background: T.ghost, cursor: "pointer", fontSize: 13, fontFamily: T.font, fontWeight: 400, color: T.text }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    deleteImage(imageToDelete);
                                    setImageToDelete(null);
                                }}
                                style={{ padding: "8px 16px", borderRadius: T.rFull, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer", fontSize: 13, fontFamily: T.font, fontWeight: 500 }}
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
