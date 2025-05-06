const fs = require('fs');
const { createCanvas } = require('canvas');

// Create a 32x32 canvas
const canvas = createCanvas(32, 32);
const ctx = canvas.getContext('2d');

// Draw a blue circle (Antarctica)
ctx.fillStyle = '#0066cc';
ctx.beginPath();
ctx.arc(16, 16, 14, 0, Math.PI * 2);
ctx.fill();

// Draw a white circle (ice)
ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
ctx.beginPath();
ctx.arc(16, 16, 8, 0, Math.PI * 2);
ctx.fill();

// Draw a blue ring (visualization ring)
ctx.strokeStyle = '#00aaff';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.ellipse(16, 16, 12, 4, Math.PI / 6, 0, Math.PI * 2);
ctx.stroke();

// Save the image as PNG
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('./public/favicon.png', buffer);

console.log('Favicon created successfully!');
