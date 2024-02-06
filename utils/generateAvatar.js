const COLORS = [
    "#1E40AF",
    "#0369A1",
    "#5B21B6",
    "#86198F",
    "#9F1239",
    "#166534",
    "#115E59",
    "#C2410C",
];

export const generateAvatar = (name) => {
    const slicedNameArr = name
        .split(" ")
        .slice(0, 2)
        .map((el) => el[0])
        .join("");
    const refinedName = slicedNameArr.toUpperCase();
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const svg = `
        <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="49.5" cy="49.5" r="49.5" fill="${color}"/>
        <text x="50%" y="50%" fill="#fff" font-size="38" font-family="inter, sans-serif" stroke="#fff" text-anchor="middle" alignment-baseline="middle">${refinedName}</text>
        </svg>
        `;
    return [svg, color];
};
