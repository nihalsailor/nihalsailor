const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PHP2SHELL_DIR = 'C:\\Developments\\PHP2SHELL';
const NIH_DIR = 'C:\\Developments\\Nihalsailor';
const DOWNLOADS_DIR = path.join(NIH_DIR, 'downloads');
const PHP2SHELL_WEB_DIR = path.join(NIH_DIR, 'php2shell');

if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
if (!fs.existsSync(PHP2SHELL_WEB_DIR)) fs.mkdirSync(PHP2SHELL_WEB_DIR, { recursive: true });

// 1. Copy individual files
fs.copyFileSync(path.join(PHP2SHELL_DIR, 'Windows', 'fix_php2shell.bat'), path.join(DOWNLOADS_DIR, 'fix_php2shell.bat'));
console.log('✓ Copied fix_php2shell.bat');

fs.copyFileSync(path.join(PHP2SHELL_DIR, 'php2shell_scanner.py'), path.join(DOWNLOADS_DIR, 'php2shell_scanner.py'));
console.log('✓ Copied php2shell_scanner.py');

fs.copyFileSync(path.join(PHP2SHELL_DIR, 'php2shell_scanner.ps1'), path.join(DOWNLOADS_DIR, 'php2shell_scanner.ps1'));
console.log('✓ Copied php2shell_scanner.ps1');

fs.copyFileSync(path.join(PHP2SHELL_DIR, 'web', 'index.php'), path.join(DOWNLOADS_DIR, 'php2shell-web.php'));
console.log('✓ Copied php2shell-web.php');

fs.copyFileSync(path.join(PHP2SHELL_DIR, 'web', 'index.php'), path.join(PHP2SHELL_WEB_DIR, 'index.php'));
console.log('✓ Copied live web app index.php');

// 2. Build php2shell-windows-fix.zip
const tempWin = path.join(process.env.TEMP || 'C:\\Windows\\Temp', 'php2shell-win-staging');
if (fs.existsSync(tempWin)) fs.rmSync(tempWin, { recursive: true, force: true });
fs.mkdirSync(tempWin, { recursive: true });
fs.copyFileSync(path.join(PHP2SHELL_DIR, 'Windows', 'fix_php2shell.bat'), path.join(tempWin, 'fix_php2shell.bat'));
fs.copyFileSync(path.join(PHP2SHELL_DIR, 'Windows', 'README_BAT.md'), path.join(tempWin, 'README_BAT.md'));

const winZipDest = path.join(DOWNLOADS_DIR, 'php2shell-windows-fix.zip');
if (fs.existsSync(winZipDest)) fs.unlinkSync(winZipDest);
execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${tempWin}\\*' -DestinationPath '${winZipDest}' -Force"`);
fs.rmSync(tempWin, { recursive: true, force: true });
console.log('✓ Created php2shell-windows-fix.zip');

// 3. Build php2shell-suite.zip
const tempSuite = path.join(process.env.TEMP || 'C:\\Windows\\Temp', 'php2shell-suite-staging');
if (fs.existsSync(tempSuite)) fs.rmSync(tempSuite, { recursive: true, force: true });
fs.mkdirSync(tempSuite, { recursive: true });

function copyRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '__pycache__' || entry.name.endsWith('.pyc')) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      copyRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}
copyRecursive(PHP2SHELL_DIR, tempSuite);

const suiteZipDest = path.join(DOWNLOADS_DIR, 'php2shell-suite.zip');
if (fs.existsSync(suiteZipDest)) fs.unlinkSync(suiteZipDest);
execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${tempSuite}\\*' -DestinationPath '${suiteZipDest}' -Force"`);
fs.rmSync(tempSuite, { recursive: true, force: true });
console.log('✓ Created php2shell-suite.zip');

console.log('\n--- Downloads Staging Summary ---');
fs.readdirSync(DOWNLOADS_DIR).forEach(f => {
  const stat = fs.statSync(path.join(DOWNLOADS_DIR, f));
  console.log(`- ${f} (${(stat.size / 1024).toFixed(1)} KB)`);
});
