// Mirrors the tailwind.config in index.html, for building a local stand-in for the Tailwind CDN.
module.exports = {
  content: [require('path').join(__dirname, '..', 'index.html')],
  darkMode: 'class',
  theme: { extend: {
    fontFamily: { sans: ['Inter', 'sans-serif'], orbitron: ['Orbitron', 'sans-serif'], montserrat: ['Montserrat', 'sans-serif'], cinzel: ['Cinzel', 'serif'], space: ['Space Grotesk', 'sans-serif'] },
    colors: { brand: { 50: '#fdf2f8', 500: '#ec4899', 600: '#db2777', 700: '#be185d', neonCyan: '#06b6d4', neonPink: '#f43f5e', neonPurple: '#a855f7', neonGreen: '#10b981' } }
  } }
};
