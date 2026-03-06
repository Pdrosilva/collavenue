import { useState, useEffect, useCallback } from "react";

export const useCanvasCamera = (initialPan = { x: 0, y: 0 }, canvasRef, addingPin, setAddingPin, setNewPin, setNewText) => {
    const [pan, setPan] = useState(initialPan);
    const [scale, setScale] = useState(1);
    const [isSpaceDown, setIsSpaceDown] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    // Sync initial pan on image change
    useEffect(() => {
        setPan(initialPan);
        setScale(1);
        setIsPanning(false);
    }, [initialPan.x, initialPan.y]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === "Escape") {
                if (setAddingPin) setAddingPin(false);
                if (setNewPin) setNewPin(null);
                if (setNewText) setNewText("");
                return;
            }

            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

            if (e.code === "Space") {
                e.preventDefault();
                setIsSpaceDown(true);
            } else if (e.code === "KeyC") {
                e.preventDefault();
                if (setAddingPin) setAddingPin(prev => !prev);
                if (setNewPin) setNewPin(null);
                if (setNewText) setNewText("");
            }
        };
        const handleKeyUp = (e) => {
            if (e.code === "Space") {
                setIsSpaceDown(false);
                setIsPanning(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [setAddingPin, setNewPin, setNewText]);

    // Prevent default browser zoom
    useEffect(() => {
        const handleNativeWheel = (e) => {
            if (e.ctrlKey || e.metaKey) e.preventDefault();
        };
        const canvas = canvasRef?.current;
        if (canvas) {
            canvas.addEventListener("wheel", handleNativeWheel, { passive: false });
        }
        return () => {
            if (canvas) canvas.removeEventListener("wheel", handleNativeWheel);
        };
    }, [canvasRef]);

    const handleWheel = useCallback((e) => {
        if (e.ctrlKey || e.metaKey) {
            const r = canvasRef.current.getBoundingClientRect();
            const pointerX = e.clientX - r.left;
            const pointerY = e.clientY - r.top;

            const logicalX = (pointerX - r.width / 2 - pan.x) / scale;
            const logicalY = (pointerY - r.height / 2 - pan.y) / scale;

            const delta = e.deltaY * -0.01;
            const newScale = Math.min(Math.max(0.2, scale + delta), 4);

            if (newScale !== scale) {
                setScale(newScale);
                setPan({
                    x: pointerX - r.width / 2 - logicalX * newScale,
                    y: pointerY - r.height / 2 - logicalY * newScale
                });
            }
        } else {
            setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
        }
    }, [pan, scale, canvasRef]);

    const handleMouseDown = useCallback((e) => {
        if (isSpaceDown || e.button === 1) { // Space + click or Middle click
            e.preventDefault();
            setIsPanning(true);
            setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            return true;
        }
        return false;
    }, [isSpaceDown, pan]);

    const handleMouseMoveLocal = useCallback((e, dragging, dragOff, onImageMoved) => {
        if (isPanning) {
            setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
            return true;
        } else if (dragging && onImageMoved) {
            const r = canvasRef.current.getBoundingClientRect();
            const centerX = r.width / 2;
            const centerY = r.height / 2;

            const localX = e.clientX - r.left;
            const localY = e.clientY - r.top;

            const logicalX = (localX - centerX - pan.x) / scale;
            const logicalY = (localY - centerY - pan.y) / scale;

            onImageMoved(dragging.id, logicalX - dragOff.x, logicalY - dragOff.y);
            return true;
        }
        return false;
    }, [isPanning, panStart, pan, scale, canvasRef]);

    const handleMouseUpOrLeave = useCallback(() => {
        setIsPanning(false);
    }, []);

    return {
        pan, scale, isSpaceDown, isPanning,
        handleWheel, handleMouseDown, handleMouseMoveLocal, handleMouseUpOrLeave
    };
};
