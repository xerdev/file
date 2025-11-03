const { spawn, exec } = require('child_process');
const os = require('os');
const fs = require('fs');
const util = require('util');
const execPromise = util.promisify(exec);

process.env.TZ = 'Asia/Jakarta';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  red: '\x1b[31m'
};

// Format bytes
function formatBytes(bytes, decimals = 1) {
  if (bytes === 0 || isNaN(bytes)) return '0B';
  const k = 1024, dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'K', 'M', 'G', 'T'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + sizes[i];
}

// Format uptime
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

// Get IP info
async function getPublicIPInfo() {
  try {
    const { stdout } = await execPromise('curl -s https://ipapi.co/json/', { timeout: 4000 });
    const data = JSON.parse(stdout);
    return {
      ip: data.ip || 'N/A',
      country: data.country_name || 'N/A',
      region: data.region || 'N/A',
      isp: data.org || 'N/A'
    };
  } catch {
    return { ip: 'N/A', country: 'N/A', region: 'N/A', isp: 'N/A' };
  }
}

// Get CPU usage (lebih akurat + fallback)
async function getCPUUsage() {
  try {
    const { stdout } = await execPromise("top -bn1 | grep 'Cpu(s)' | awk '{print 100 - $8}'");
    const usage = parseFloat(stdout.trim());
    if (!isNaN(usage) && usage >= 0 && usage <= 100) return usage.toFixed(1);

    // fallback ke load average
    const load = os.loadavg()[0] / os.cpus().length * 100;
    return load.toFixed(1);
  } catch {
    const load = os.loadavg()[0] / os.cpus().length * 100;
    return load.toFixed(1);
  }
}

// Get memory info
function getMemoryInfo() {
  const total = os.totalmem(), free = os.freemem(), used = total - free;
  return { total: formatBytes(total), used: formatBytes(used), free: formatBytes(free) };
}

// Get swap info
async function getSwapInfo() {
  try {
    const { stdout } = await execPromise("free -b | grep 'Swap:' | awk '{print $2,$3}'");
    const [total, used] = stdout.trim().split(' ').map(Number);
    return { total: formatBytes(total || 0), used: formatBytes(used || 0) };
  } catch {
    return { total: '0B', used: '0B' };
  }
}

// Get disk info
async function getDiskInfo() {
  try {
    const { stdout } = await execPromise("df -B1 / | tail -1 | awk '{print $2,$3}'");
    const [total, used] = stdout.trim().split(' ').map(Number);
    return { total: formatBytes(total), used: formatBytes(used) };
  } catch {
    return { total: 'N/A', used: 'N/A' };
  }
}

// CPU model
async function getCPUModel() {
  try {
    const { stdout } = await execPromise("cat /proc/cpuinfo | grep 'model name' | head -1 | cut -d':' -f2 | sed 's/^ *//'");
    return stdout.trim() || os.cpus()[0]?.model || 'N/A';
  } catch {
    return os.cpus()[0]?.model || 'N/A';
  }
}

// OS and kernel info
function getOSInfo() {
  return os.type();
}

async function getKernelVersion() {
  try {
    const { stdout } = await execPromise("uname -r");
    return stdout.trim();
  } catch {
    return 'N/A';
  }
}

// Display system info
async function displaySystemInfo() {
  console.clear();
  console.log('\n');
  console.log(`${colors.cyan}${colors.bright}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}║          🚀  SYSTEM INFORMATION - PTERODACTYL PANEL 🚀          ${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}╚════════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log('');

  const [ipInfo, cpuUsage, memory, swap, disk, cpuModel, kernel] = await Promise.all([
    getPublicIPInfo(),
    getCPUUsage(),
    getMemoryInfo(),
    getSwapInfo(),
    getDiskInfo(),
    getCPUModel(),
    getKernelVersion()
  ]);

  const uptime = formatUptime(os.uptime());
  const currentTime = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' });

  const print = (label, value, color = colors.white) =>
    console.log(`${colors.cyan}▻ ${colors.bright}${label.padEnd(16)}${colors.reset}: ${color}${value}${colors.reset}`);

  print('ISP', ipInfo.isp, colors.green);
  print('IPv4', `${ipInfo.ip} (Public IP)`, colors.yellow);
  print('Country', ipInfo.country, colors.blue);
  print('Region', ipInfo.region, colors.blue);
  print('OS', getOSInfo(), colors.magenta);
  print('Uptime', uptime, colors.green);
  print('NodeJS version', process.version.substring(1), colors.yellow);
  print('Memory', `${memory.total} (${memory.used} Used)`, colors.cyan);
  print('Swap', `${swap.total} (${swap.used} Used)`, colors.cyan);
  print('Disk', `${disk.total} (${disk.used} Used)`, colors.magenta);
  print('CPUs', os.cpus().length.toString(), colors.green);
  print('Processor', cpuModel, colors.white);
  print('Arch', os.arch(), colors.yellow);
  print('Kernel', kernel, colors.blue);
  print('CPU Usage', `${cpuUsage}%`, colors.red);
  print('Current Time', currentTime, colors.green);

  console.log('');
  console.log(`${colors.cyan}${colors.bright}════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}${colors.bright}  ✓ System Ready - Checking Node Modules...${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log('\n');
}

// Cek dan install node_modules
async function ensureNodeModules() {
  const path = '/home/container/node_modules';
  try {
    if (!fs.existsSync(path)) {
      console.log(`${colors.yellow}⚙️  node_modules not found, running npm install...${colors.reset}`);
      await execPromise('npm install --no-bin-links --legacy-peer-deps --unsafe-perm=true');
      console.log(`${colors.green}✅ npm install completed successfully.${colors.reset}`);
    } else {
      console.log(`${colors.green}✅ node_modules directory found.${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.red}❌ npm install failed: ${error.message}${colors.reset}`);
    console.log(`${colors.yellow}Trying to reinstall...${colors.reset}`);
    try {
      await execPromise('rm -rf node_modules && npm install --no-bin-links --legacy-peer-deps --unsafe-perm=true');
      console.log(`${colors.green}✅ npm reinstall success.${colors.reset}`);
    } catch (err) {
      console.error(`${colors.red}❌ Reinstall failed: ${err.message}${colors.reset}`);
    }
  }
}

// Jalankan npm start
function startApp() {
  console.log(`${colors.cyan}🚀 Starting application with npm start...${colors.reset}`);
  const child = spawn('npm', ['start'], { stdio: 'inherit' });
  child.on('exit', (code) => {
    console.log(`${colors.yellow}npm start exited with code ${code}${colors.reset}`);
  });
  child.on('error', (err) => {
    console.error(`${colors.red}Error starting npm: ${err.message}${colors.reset}`);
  });
}

// Main
(async () => {
  await displaySystemInfo();
  await ensureNodeModules();
  startApp();
})();
