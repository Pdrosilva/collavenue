export const avatarSvg = (color, initials) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
    <rect width="80" height="80" rx="40" fill="${color}"/>
    <text x="40" y="44" text-anchor="middle" font-size="28" font-family="sans-serif" fill="rgba(255,255,255,0.85)" dominant-baseline="middle">${initials || ""}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};
