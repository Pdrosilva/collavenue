const fs = require('fs');

const path = '/Users/pedro/Documents/collavenue-app/src/components/DetailView.jsx';

const badLines = `                        </div>
                            </div>
            </div>
            ) : (
            <span style={{ fontSize: 20, fontWeight: 400, letterSpacing: "-0.2px", fontFamily: T.font }}>Thoughts</span>
                    )}
            <button
                onClick={() => { setCommentsOpen(false); setActiveThreadId(null); }}
                style={{ width: 40, height: 40, borderRadius: T.rFull, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 180ms ease", marginRight: "-8px" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = T.ghost)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
                <X size={20} color={T.text} />
            </button>
        </div>
                
                {/* Scrollable Content */ }
    <div style={{ flex: 1, overflowY: "auto" }}>
        {commentsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ padding: "24px 31px", borderRadius: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: T.rFull, background: "rgba(0,0,0,0.05)", animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
                        <div style={{ width: 100, height: 14, borderRadius: 4, background: "rgba(0,0,0,0.05)", animation: "skeletonPulse 1.5s ease-in-out infinite" }} />`;

const goodLines = `                        </div>
                    ) : (
                        <span style={{ fontSize: 20, fontWeight: 400, letterSpacing: "-0.2px", fontFamily: T.font }}>Thoughts</span>
                    )}
                    <button
                        onClick={() => { setCommentsOpen(false); setActiveThreadId(null); }}
                        style={{ width: 40, height: 40, borderRadius: T.rFull, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 180ms ease", marginRight: "-8px" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = T.ghost)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                        <X size={20} color={T.text} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div style={{ flex: 1, overflowY: "auto" }}>
                    {commentsLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} style={{ padding: "24px 31px", borderRadius: 16 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: T.rFull, background: "rgba(0,0,0,0.05)", animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
                                    <div style={{ width: 100, height: 14, borderRadius: 4, background: "rgba(0,0,0,0.05)", animation: "skeletonPulse 1.5s ease-in-out infinite" }} />`;

fs.writeFileSync(path, fs.readFileSync(path, 'utf8').replace(badLines, goodLines));
console.log("Fixed DetailView syntax errors.");
