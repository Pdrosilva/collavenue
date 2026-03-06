import { makeImg, avatarSvg } from "./svgGenerator";

export const palettes = [
    ["#1a1a2e", "#16213e", "#0f3460"],
    ["#2d6a4f", "#40916c", "#52b788"],
    ["#264653", "#2a9d8f", "#e9c46a"],
    ["#3d348b", "#7678ed", "#f7b801"],
    ["#22223b", "#4a4e69", "#9a8c98"],
    ["#2b2d42", "#8d99ae", "#edf2f4"],
    ["#6b705c", "#a5a58d", "#b7b7a4"],
    ["#003049", "#d62828", "#f77f00"],
    ["#0b132b", "#1c2541", "#3a506b"],
    ["#5f0f40", "#9a031e", "#fb8b24"],
    ["#283618", "#606c38", "#fefae0"],
    ["#3c096c", "#7b2cbf", "#c77dff"],
];

export const INITIAL_IMAGES = palettes.map((pal, i) => {
    const heights = [220, 340, 440, 300, 380, 420, 260, 350, 280, 480, 320, 240];
    const w = 400;
    const h = heights[i];
    const imgIds = [10, 11, 13, 14, 15, 16, 28, 29, 37, 48, 57, 58];
    return { id: i + 1, src: `https://picsum.photos/id/${imgIds[i]}/${w}/${h}`, w, h, palette: pal, workspaceImgs: [] };
});

export const AVATAR_MAIN = avatarSvg("#4a4e69", "Y");

