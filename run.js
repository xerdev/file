const { spawn, exec } = require('child_process');
const os = require('os');
const fs = require('fs');
const util = require('util');
const execPromise = util.promisify(exec);

process.env.TZ = 'Asia/Jakarta';

// ANSI Color Codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    white: '\x1b[37m',
    gray: '\x1b[90m'
};

/**
 * Format bytes to human readable
 */
function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'K', 'M', 'G', 'T'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + sizes[i];
}

/**
 * Format uptime to readable format
 */
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    let result = [];
    if (days > 0) result.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours > 0) result.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (minutes > 0) result.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    
    return result.join(' ') || '0 minutes';
}

/**
 * Get public IP and location info
 */
async function getPublicIPInfo() {
    try {
        const { stdout } = await execPromise('curl -s https://ipapi.co/json/', { timeout: 5000 });
        const data = JSON.parse(stdout);
        return {
            ip: data.ip || 'N/A',
            country: data.country_name || 'N/A',
            region: data.region || 'N/A',
            isp: data.org || 'N/A'
        };
    } catch (error) {
        return {
            ip: 'N/A',
            country: 'N/A',
            region: 'N/A',
            isp: 'N/A'
        };
    }
}

/**
 * Get CPU usage
 */
async function getCPUUsage() {
    try {
        const { stdout } = await execPromise("top -bn1 | grep 'Cpu(s)' | sed 's/.*, *\\([0-9.]*\\)%* id.*/\\1/' | awk '{print 100 - $1}'");
        return parseFloat(stdout.trim()).toFixed(1);
    } catch (error) {
        return 'N/A';
    }
}

/**
 * Get memory info
 */
function getMemoryInfo() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    return {
        total: formatBytes(totalMem),
        used: formatBytes(usedMem),
        free: formatBytes(freeMem)
    };
}

/**
 * Get swap info
 */
async function getSwapInfo() {
    try {
        const { stdout } = await execPromise("free -b | grep Swap | awk '{print $2,$3}'");
        const [total, used] = stdout.trim().split(' ').map(Number);
        return {
            total: formatBytes(total),
            used: formatBytes(used)
        };
    } catch (error) {
        return { total: 'N/A', used: 'N/A' };
    }
}

/**
 * Get disk info
 */
async function getDiskInfo() {
    try {
        const { stdout } = await execPromise("df -B1 / | tail -1 | awk '{print $2,$3}'");
        const [total, used] = stdout.trim().split(' ').map(Number);
        return {
            total: formatBytes(total),
            used: formatBytes(used)
        };
    } catch (error) {
        return { total: 'N/A', used: 'N/A' };
    }
}

/**
 * Get CPU model
 */
async function getCPUModel() {
    try {
        const { stdout } = await execPromise("cat /proc/cpuinfo | grep 'model name' | head -1 | cut -d':' -f2 | sed 's/^[ \\t]*//'");
        return stdout.trim() || os.cpus()[0]?.model || 'N/A';
    } catch (error) {
        return os.cpus()[0]?.model || 'N/A';
    }
}

/**
 * Get OS info
 */
function getOSInfo() {
    try {
        return `${os.type()}`;
    } catch (error) {
        return 'N/A';
    }
}

/**
 * Get kernel version
 */
async function getKernelVersion() {
    try {
        const { stdout } = await execPromise("uname -r");
        return stdout.trim();
    } catch (error) {
        return 'N/A';
    }
}

/**
 * Display system information
 */
async function displaySystemInfo() {
    console.log('\n');
    console.log(`${colors.cyan}${colors.bright}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}║          🚀 SYSTEM INFORMATION - PTERODACTYL PANEL 🚀          ║${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}╚════════════════════════════════════════════════════════════════╝${colors.reset}`);
    console.log('');

    // Get all system info
    const ipInfo = await getPublicIPInfo();
    const cpuUsage = await getCPUUsage();
    const memory = getMemoryInfo();
    const swap = await getSwapInfo();
    const disk = await getDiskInfo();
    const cpuModel = await getCPUModel();
    const kernel = await getKernelVersion();
    const uptime = formatUptime(os.uptime());
    const currentTime = new Date().toLocaleString('sv-SE', { 
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).replace(' ', ' ');

    // Display info with nice formatting
    const printInfo = (label, value, color = colors.white) => {
        console.log(`${colors.cyan}▻ ${colors.bright}${label.padEnd(16)}${colors.reset}: ${color}${value}${colors.reset}`);
    };

    printInfo('ISP', ipInfo.isp, colors.green);
    printInfo('IPv4', `${ipInfo.ip} (Public IP)`, colors.yellow);
    printInfo('Country', ipInfo.country, colors.blue);
    printInfo('Region', ipInfo.region, colors.blue);
    printInfo('OS', getOSInfo(), colors.magenta);
    printInfo('Uptime', uptime, colors.green);
    printInfo('NodeJS version', process.version.substring(1), colors.yellow);
    printInfo('Memory', `${memory.total} (${memory.used} Used)`, colors.cyan);
    printInfo('Swap', `${swap.total} (${swap.used} Used)`, colors.cyan);
    printInfo('Disk', `${disk.total} (${disk.used} Used)`, colors.magenta);
    printInfo('CPUs', os.cpus().length.toString(), colors.green);
    printInfo('Processor', cpuModel, colors.white);
    printInfo('Arch', os.arch(), colors.yellow);
    printInfo('Kernel', kernel, colors.blue);
    printInfo('CPU Usage', `${cpuUsage}%`, colors.red);
    printInfo('Current Time', currentTime, colors.green);

    console.log('');
    console.log(`${colors.cyan}${colors.bright}════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}${colors.bright}  ✓ System Ready - Starting Bash Shell...${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log('\n');
}

/**
 * Start bash with colored prompt
 */
function startBash() {
    try {
        const colorPrompt = '\\[\\033[1;36m\\]Premiumapps@users\\[\\033[0m\\]:\\w\\$ ';

        const childProcess = spawn('bash', ['-c', `
            export USER="XMPANEL";
            export HOME="/home/container";
            export PS1="${colorPrompt}";
            bash --noprofile --norc
        `], {
            stdio: 'inherit'
        });

        childProcess.on('error', (error) => {
            console.error(`${colors.red}Error starting process: ${error.message}${colors.reset}`);
        });

        childProcess.on('exit', (code) => {
            if (code !== 0) {
                console.log(`${colors.yellow}Process exited with code: ${code}${colors.reset}`);
            }
        });
    } catch (error) {
        console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    }
}

/**
 * Main function
 */
async function main() {
    await displaySystemInfo();
    startBash();
}

// Run the script
main().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
});
