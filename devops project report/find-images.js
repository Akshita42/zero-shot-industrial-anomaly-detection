const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\akshi\\.gemini\\antigravity\\brain\\d23c8283-4d34-49f1-ba46-22cf8f7500a6';
const destDir = 'C:\\Users\\akshi\\OneDrive\\Desktop\\zero-shot-industrial-anomaly-detection\\devops project report';

const files = fs.readdirSync(srcDir);
console.log("Files in conversation folder:", files);

files.forEach((file) => {
    if (file.endsWith('.png')) {
        const srcPath = path.join(srcDir, file);
        const destPath = path.join(destDir, file);
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied ${file} to ${destPath}`);
    }
});
