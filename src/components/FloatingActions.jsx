import { Plus, MessageCircle } from "lucide-react";
import { T } from "../lib/theme";
import { useWindowWidth } from "../lib/useWindowWidth";

export const FloatingActions = ({ commentsOpen, addingPin, setAddingPin, setNewPin, setNewText, setCommentsOpen, commentsLength }) => {
    return (
        <div style={{ position: "absolute", bottom: 28, left: "50%", transform: `translateX(-50%)`, display: "flex", gap: 8, zIndex: 50, transition: "transform 500ms cubic-bezier(0,0,.2,1)" }}>
            {[
                { icon: <Plus size={16} />, label: addingPin ? "Cancel" : "Add thought", active: addingPin, onClick: () => { setAddingPin(!addingPin); if (addingPin) { setNewPin(null); setNewText(""); } } },
                { icon: <MessageCircle size={16} />, label: String(commentsLength), active: commentsOpen, onClick: () => setCommentsOpen(!commentsOpen) },
            ].map((btn, i) => (
                <button
                    key={i}
                    onClick={btn.onClick}
                    style={{
                        height: 44, padding: "0 20px", borderRadius: T.rFull,
                        background: btn.active ? T.accent : T.surface,
                        color: btn.active ? T.accentText : T.text,
                        border: btn.active ? "none" : `1px solid ${T.surfaceBorder}`,
                        fontSize: 14, fontWeight: 400, cursor: "pointer", fontFamily: T.font,
                        display: "flex", alignItems: "center", gap: 8,
                        boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
                        transition: "all 180ms ease",
                    }}
                    onMouseEnter={(e) => { if (!btn.active) e.currentTarget.style.background = T.surfaceHover; }}
                    onMouseLeave={(e) => { if (!btn.active) e.currentTarget.style.background = btn.active ? T.accent : T.surface; }}
                >
                    {btn.icon}{btn.label}
                </button>
            ))}
        </div>
    );
};
