export const makeImg = (w, h, colors, seed = 0) => {
    const [c1, c2, c3] = colors;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="g${seed}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${c1}"/>
        <stop offset="50%" style="stop-color:${c2}"/>
        <stop offset="100%" style="stop-color:${c3}"/>
      </linearGradient>
      <radialGradient id="r${seed}" cx="${30 + (seed * 17) % 40}%" cy="${30 + (seed * 13) % 40}%" r="60%">
        <stop offset="0%" style="stop-color:rgba(255,255,255,0.15)"/>
        <stop offset="100%" style="stop-color:rgba(0,0,0,0.1)"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#g${seed})"/>
    <rect width="${w}" height="${h}" fill="url(#r${seed})"/>
    ${seed % 3 === 0 ? `<circle cx="${w * 0.7}" cy="${h * 0.3}" r="${Math.min(w, h) * 0.18}" fill="rgba(255,255,255,0.08)"/>` : ""}
    ${seed % 3 === 1 ? `<rect x="${w * 0.1}" y="${h * 0.6}" width="${w * 0.35}" height="${h * 0.25}" rx="8" fill="rgba(0,0,0,0.08)"/>` : ""}
    ${seed % 4 === 0 ? `<circle cx="${w * 0.25}" cy="${h * 0.7}" r="${Math.min(w, h) * 0.12}" fill="rgba(255,255,255,0.06)"/>` : ""}
  </svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

export const avatarSvg = (color, initials) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
    <rect width="80" height="80" rx="40" fill="${color}"/>
    <text x="40" y="44" text-anchor="middle" font-size="28" font-family="sans-serif" fill="rgba(255,255,255,0.85)" dominant-baseline="middle">${initials || ""}</text>
  </svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};
