const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const STAGING_DIR = path.join(ROOT_DIR, 'nihalsailor-hostinger-deploy');
const ZIP_OUTPUT = path.join(ROOT_DIR, 'nihalsailor-hostinger-deploy.zip');

console.log('⚓ Packaging Nihalsailor Fleet for Hostinger Deployment...');

// 1. Clean previous staging and zip
if (fs.existsSync(STAGING_DIR)) {
  fs.rmSync(STAGING_DIR, { recursive: true, force: true });
}
if (fs.existsSync(ZIP_OUTPUT)) {
  fs.unlinkSync(ZIP_OUTPUT);
}

fs.mkdirSync(STAGING_DIR, { recursive: true });

// 2. Root files to copy
const rootFiles = [
  'index.html',
  'projects.html',
  'sitemap.xml',
  'robots.txt',
  '.htaccess',
  'site.webmanifest',
  'favicon.ico',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'apple-touch-icon.png',
  'android-chrome-192x192.png',
  'android-chrome-512x512.png',
  'BackgroundLogo.png',
  'MainLogo.jpg'
];

rootFiles.forEach(file => {
  const src = path.join(ROOT_DIR, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(STAGING_DIR, file));
    console.log(`  ✓ Root: ${file}`);
  } else {
    console.warn(`  ⚠ Missing root file: ${file}`);
  }
});

// Helper for recursive folder copy
function copyFolderSync(from, to) {
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }
  const entries = fs.readdirSync(from, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyFolderSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 3. Core directories
const directories = ['css', 'js', 'data', 'projects'];
directories.forEach(dir => {
  const src = path.join(ROOT_DIR, dir);
  const dest = path.join(STAGING_DIR, dir);
  if (fs.existsSync(src)) {
    copyFolderSync(src, dest);
    const count = fs.readdirSync(dest).length;
    console.log(`  ✓ Directory: ${dir}/ (${count} items)`);
  }
});

// 4. ReachTube production app bundle (for https://nihalsailor.com/reachtube/index.html)
const reachSrc = 'c:\\Developments\\YoutubeGrow\\reachtube-production-build';
if (fs.existsSync(reachSrc)) {
  const reachDest = path.join(STAGING_DIR, 'reachtube');
  copyFolderSync(reachSrc, reachDest);

  // Update .htaccess in reachtube to use subfolder RewriteBase
  const reachHtaccess = path.join(reachDest, '.htaccess');
  if (fs.existsSync(reachHtaccess)) {
    let content = fs.readFileSync(reachHtaccess, 'utf8');
    content = content.replace(/RewriteBase \//g, 'RewriteBase /reachtube/');
    fs.writeFileSync(reachHtaccess, content, 'utf8');
  }
  console.log(`  ✓ ReachTube App Bundle: reachtube/ included for live link`);
}

// 5. Create ZIP using PowerShell Compress-Archive
console.log('\n📦 Creating production ZIP archive: nihalsailor-hostinger-deploy.zip...');
try {
  const psCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Compress-Archive -Path '${STAGING_DIR}\\*' -DestinationPath '${ZIP_OUTPUT}' -Force"`;
  execSync(psCmd, { stdio: 'inherit' });

  const stats = fs.statSync(ZIP_OUTPUT);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`\n🎉 Success! Clean Deploy ZIP generated: ${ZIP_OUTPUT} (${sizeMb} MB)`);
} catch (err) {
  console.error('Failed to create ZIP archive:', err);
  process.exit(1);
}
