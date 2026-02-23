import { useState, useEffect } from "react";

export const useWindowWidth = () => {
    const [ww, setWw] = useState(typeof window !== "undefined" ? window.innerWidth : 1440);

    useEffect(() => {
        const fn = () => setWw(window.innerWidth);
        window.addEventListener("resize", fn);
        return () => window.removeEventListener("resize", fn);
    }, []);

    return ww;
};
