import { Plus, Search, Layers, Compass, ArrowRightSquare, User } from "lucide-react";
import { T } from "../lib/theme";
import { AVATAR_MAIN } from "../lib/mockData";
import { useWindowWidth } from "../lib/useWindowWidth";

export const NavBar = ({ onLogoClick, onAddClick, onSettingsClick, currentTab, setCurrentTab, user }) => {
    const ww = useWindowWidth();
    return (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: ww < 640 ? "24px 15px 16px" : "28px 32px 20px",
            position: "fixed", top: 0, left: 0, right: 0,
            zIndex: 100,
            background: T.bgNav,
            backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)"
        }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: ww < 640 ? 24 : 48 }}>
                <span onClick={onLogoClick || (() => { })} style={{ fontSize: 16, fontWeight: 400, letterSpacing: "-0.16px", color: T.text, cursor: "pointer", fontFamily: T.font }}>Collavenue</span>
                <div style={{ display: "flex", gap: 32 }}>
                    {["Explore", "Saved"].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setCurrentTab && setCurrentTab(tab)}
                            style={{
                                fontSize: 16, fontWeight: 400, letterSpacing: "-0.16px",
                                color: T.text, opacity: currentTab === tab ? 1 : 0.4,
                                cursor: "pointer", background: "none", border: "none", padding: 0,
                                fontFamily: T.font, transition: "opacity 200ms ease"
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }} id="settings-anchor">
                <div style={{ width: 40, height: 40, borderRadius: T.rFull, overflow: "hidden", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: user ? "none" : T.surface }} onClick={onSettingsClick}>
                    {user ? (
                        <img src={user.avatar} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                        <User size={20} color={T.text} />
                    )}
                </div>
            </div>
        </div>
    );
};
