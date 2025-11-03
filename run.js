const { spawn, exec } = require('child_process');
const os = require('os');
const fs = require('fs');
const util = require('util');
const execPromise = util.promisify(exec);

process.env.TZ = 'Asia/Jakarta';

const colors = {
  reset: '\x1b[0m', bright: '\x1b[1m', cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', white: '\x1b[37m', gray: '\x1b[90m', red: '\x1b[31m'
};

function formatBytes(bytes, decimals = 1) {
  if (bytes === 0 || isNaN(bytes)) return '0B';
  const k = 1024, dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'K', 'M', 'G', 'T'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + sizes[i];
}

function formatUptime(seconds) {
  seconds = Math.floor(seconds);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const result = [];
  if (days > 0) result.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) result.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes > 0) result.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  return result.join(' ') || '0 minutes';
}

async function getCPUUsage() {
  try {
    const { stdout } = await execPromise("top -bn1 | grep 'Cpu(s)' | awk '{print 100 - $8}'");
    const usage = parseFloat(stdout.trim());
    if (!isNaN(usage)) return usage.toFixed(1);
    const load = os.loadavg()[0] / os.cpus().length * 100;
    return load.toFixed(1);
  } catch {
    const load = os.loadavg()[0] / os.cpus().length * 100;
    return load.toFixed(1);
  }
}

function getMemoryInfo() {
  const total = os.totalmem(), free = os.freemem(), used = total - free;
  return { total: formatBytes(total), used: formatBytes(used), free: formatBytes(free) };
}

async function displaySystemInfo() {
  console.clear();
  console.log(`${colors.cyan}${colors.bright}\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║          🚀  SYSTEM INFORMATION - PTERODACTYL PANEL 🚀          ║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  const cpuUsage = await getCPUUsage();
  const memory = getMemoryInfo();
  const uptime = formatUptime(os.uptime());
  console.log(`${colors.green}▻ NodeJS version${colors.reset}: ${process.version.substring(1)}`);
  console.log(`${colors.cyan}▻ Memory${colors.reset}: ${memory.total} (${memory.used} Used)`);
  console.log(`${colors.yellow}▻ CPU Usage${colors.reset}: ${cpuUsage}%`);
  console.log(`${colors.magenta}▻ Uptime${colors.reset}: ${uptime}`);
  console.log(`${colors.cyan}\n════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}✓ System Ready - Checking Node Modules...${colors.reset}`);
  console.log(`${colors.cyan}════════════════════════════════════════════════════════════════${colors.reset}\n`);
}

async function ensureNodeModules() {
  const path = '/home/container/node_modules';
  const hasPackage = fs.existsSync('/home/container/package.json');

  if (!hasPackage) {
    console.log(`${colors.red}❌ Tidak dapat menemukan package.json. Melewati proses instalasi.${colors.reset}`);
    return false;
  }

  try {
    if (!fs.existsSync(path)) {
      console.log(`${colors.yellow}⚙️  node_modules tidak ditemukan, menjalankan npm install (disembunyikan)...${colors.reset}`);
      await execPromise('npm install --no-audit --silent --no-bin-links --legacy-peer-deps');
      console.log(`${colors.green}✅ Instalasi dependensi selesai.${colors.reset}`);
    } else {
      console.log(`${colors.green}✅ node_modules ditemukan.${colors.reset}`);
    }
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ Gagal menginstal dependensi.${colors.reset}`);
    return false;
  }
}

function startApp() {
  let startCmd = ['start'];
  const pkgPath = '/home/container/package.json';
  if (!fs.existsSync(pkgPath)) {
    const defaultFile = fs.existsSync('/home/container/index.js') ? 'index.js' : fs.readdirSync('/home/container').find(f => f.endsWith('.js')) || '';
    if (defaultFile) {
      console.log(`${colors.cyan}🚀 Menjalankan file default: ${defaultFile}${colors.reset}`);
      spawn('node', [defaultFile], { stdio: 'inherit' });
    } else {
      console.log(`${colors.red}❌ Tidak menemukan file .js untuk dijalankan.${colors.reset}`);
    }
    return;
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath));
  if (!pkg.scripts || !pkg.scripts.start) {
    console.log(`${colors.yellow}⚠️  Tidak ada script 'start'. Menjalankan 'node .'${colors.reset}`);
    spawn('node', ['.'], { stdio: 'inherit' });
  } else {
    console.log(`${colors.cyan}🚀 Menjalankan aplikasi dengan npm start...${colors.reset}`);
    spawn('npm', startCmd, { stdio: 'inherit' });
  }
}

(async () => {
  await displaySystemInfo();
  const canRun = await ensureNodeModules();
  startApp(canRun);
})();
