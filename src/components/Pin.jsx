import { T } from "../lib/theme";
import { avatarSvg } from "../lib/svgGenerator";

export const Pin = ({ c, hoveredPin, setHoveredPin, setCommentsOpen, scale = 1, setHighlightedCommentId }) => {
    const isH = hoveredPin === c.id;
    // Adjusted inverseScale to be less aggressive so it remains small
    const inverseScale = Math.max(0.6, Math.min(1.2 / scale, 1.8));

    return (
        <div
            onClick={(e) => { e.stopPropagation(); setCommentsOpen(true); setHighlightedCommentId(c.id); }}
            onMouseEnter={() => setHoveredPin(c.id)}
            onMouseLeave={() => setHoveredPin(null)}
            style={{
                position: "absolute", left: `calc(50% + ${c.pinX}px)`, top: `calc(50% + ${c.pinY}px)`,
                transform: `translate(-50%, -100%) scale(${inverseScale})`, transformOrigin: "bottom center",
                zIndex: isH ? 25 : 10, cursor: "pointer",
            }}
        >
            <div
                style={{
                    width: 28, height: 28, background: T.surface,
                    borderRadius: "50px 50px 50px 0",
                    transform: "rotate(-45deg)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: isH ? "0 4px 16px rgba(0,0,0,0.2)" : "0 2px 8px rgba(0,0,0,0.15)",
                    transition: "box-shadow 180ms ease",
                }}
            >
                <div style={{ width: 22, height: 22, borderRadius: T.rFull, overflow: "hidden", transform: "rotate(45deg)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                    <img src={c.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
            </div>
            <div
                style={{
                    position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
                    transform: "translateX(-50%)", background: T.surface, borderRadius: T.rFull,
                    padding: "8px 16px", boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                    whiteSpace: "nowrap", fontSize: 14, color: T.text, width: "max-content", maxWidth: 240,
                    opacity: isH ? 1 : 0, pointerEvents: isH ? "auto" : "none",
                    transition: "opacity 180ms ease", zIndex: 30,
                }}
            >
                <div style={{ opacity: 0.9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: 13, lineHeight: 1.4 }}>{c.text}</div>
            </div>
        </div>
    );
};
