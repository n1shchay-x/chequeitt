const fs = require('fs');
const { createCanvas } = require('canvas');

const canvas = createCanvas(256, 256);
const ctx = canvas.getContext('2d');

// Transparent background
ctx.clearRect(0, 0, 256, 256);

// Flame path from our SVG, but we need to draw it manually since canvas doesn't take raw path strings easily without Path2D polyfills.
// Actually, canvas in node DOES support Path2D!
const p = new Path2D('M128,24A104,104,0,0,0,36,155.6c0,42.7,33.4,84.4,92,84.4s92-41.7,92-84.4A104,104,0,0,0,128,24Z');
ctx.fillStyle = '#ffffff';
ctx.fill(p);

const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('badge.png', buffer);
console.log('badge.png created successfully!');
