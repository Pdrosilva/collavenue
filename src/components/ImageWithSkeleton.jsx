import { useState } from "react";

export const ImageWithSkeleton = ({ src, style, ...props }) => {
    const [loaded, setLoaded] = useState(false);
    return (
        <>
            {!loaded && (
                <div style={{ ...style, position: "absolute", inset: 0, background: "rgba(0,0,0,0.05)", animation: "skeletonPulse 1.5s ease-in-out infinite" }} />
            )}
            <img
                src={src}
                style={{ ...style, opacity: loaded ? 1 : 0, transition: "opacity 300ms ease" }}
                onLoad={() => setLoaded(true)}
                {...props}
            />
        </>
    );
};
