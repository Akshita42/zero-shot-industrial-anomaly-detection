const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\akshi\\OneDrive\\Desktop\\zero-shot-industrial-anomaly-detection\\devops project report';
const files = fs.readdirSync(dir).filter(f => f.startsWith('media__') && f.endsWith('.png'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    console.log(`File: ${file}, Size: ${stats.size} bytes`);
});
