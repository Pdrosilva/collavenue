import { useState, useRef } from "react";

export const useToast = () => {
    const [toastState, setToastState] = useState({ content: null, visible: false });
    const toastTimeoutRef = useRef(null);

    const showToast = (text, duration = 3000, action = null) => {
        setToastState({ content: { text, action }, visible: true });

        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);

        toastTimeoutRef.current = setTimeout(() => {
            setToastState(prev => ({ ...prev, visible: false }));
        }, duration);
    };

    const hideToast = () => {
        setToastState(prev => ({ ...prev, visible: false }));
    };

    return { toastState, showToast, hideToast };
};
