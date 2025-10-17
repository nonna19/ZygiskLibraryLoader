import { exec, toast } from "./assets/kernelsu.js";

let packages = [];
let currentPackage = null;
let configs = {}; // NEW: stores all package configs

// Elements
const packageSelect = document.getElementById('package-select');
const addPkgBtn = document.getElementById('add-package');
const newPkgContainer = document.getElementById('new-package-container');
const newPkgInput = document.getElementById('new-package-input');
const enableLoadLibCheckbox = document.getElementById('enable-load-lib');
const confirmAddBtn = document.getElementById('confirm-add-package');
const reloadBtn = document.getElementById('reload-config');
const saveBtn = document.getElementById('save-config');
const defaultLibCheckbox = document.getElementById('default-lib');
const libPathInput = document.getElementById('lib-path');
const terminalContent = document.querySelector('.output-terminal-content');
const clearTerminalBtn = document.querySelector('.clear-terminal');
const removeConfBtn = document.getElementById('remove-config');
const backupBtn = document.getElementById('backup-config');
const restoreBtn = document.getElementById('restore-config');
const BACKUP_PATH = '/data/adb/nepmods_config_backup.json';

const CONFIG_FILE = '/data/adb/modules/nepmodslibloader/config.json';

// --- UTILS ---
function printToTerminal(msg) {
    const line = document.createElement('div');
    line.textContent = msg;
    terminalContent.appendChild(line);
    terminalContent.scrollTop = terminalContent.scrollHeight;
}

clearTerminalBtn.addEventListener('click', () => {
    terminalContent.innerHTML = '';
});

async function execAndLog(command) {
    printToTerminal(`$ ${command}`);
    const { errno, stdout, stderr } = await exec(command);
    if(stdout) printToTerminal(stdout.trim());
    if(stderr) printToTerminal(stderr.trim());
    return { errno, stdout, stderr };
}

// --- LOAD ALL CONFIGS ---
async function loadPackages() {
    const { errno, stdout } = await execAndLog(`cat ${CONFIG_FILE} || echo '{}'`);
    if(errno === 0) {
        try {
            configs = JSON.parse(stdout.trim());
            packages = Object.keys(configs);
        } catch(e) {
            configs = {};
            packages = [];
        }
    } else {
        configs = {};
        packages = [];
    }
    renderPackageDropdown();
}

function renderPackageDropdown() {
    packageSelect.innerHTML = '';
    packages.forEach(pkg => {
        const opt = document.createElement('option');
        opt.value = pkg;
        opt.textContent = pkg;
        packageSelect.appendChild(opt);
    });
    if(currentPackage && packages.includes(currentPackage)) {
        packageSelect.value = currentPackage;
    } else if(packages.length) {
        currentPackage = packages[0];
        packageSelect.value = currentPackage;
    }
    loadPackageConfig();
}

packageSelect.addEventListener('change', () => {
    currentPackage = packageSelect.value;
    loadPackageConfig();
});

// --- ADD PACKAGE ---
addPkgBtn.addEventListener('click', () => {
    newPkgContainer.style.display = 'flex';
    newPkgInput.focus();
});

confirmAddBtn.addEventListener('click', addPackageFromInput);
newPkgInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter') addPackageFromInput();
});

async function addPackageFromInput() {
    const pkgName = newPkgInput.value.trim();
    if(!pkgName) return toast('Package name cannot be empty');
    if(packages.includes(pkgName)) return toast('Package already exists');

    packages.push(pkgName);
    configs[pkgName] = { defaultLib: true, libPath: '', status: false };
    await execAndLog(`mkdir -p /data/user/0/${pkgName}`);
    await saveAllConfigs();
    renderPackageDropdown();
    newPkgInput.value = '';
    newPkgContainer.style.display = 'none';
    toast(`Added package ${pkgName}`);
}

async function saveAllConfigs() {
    await execAndLog(`echo '${JSON.stringify(configs, null, 2)}' > ${CONFIG_FILE}`);
}

// --- LOAD CONFIG FOR CURRENT PACKAGE ---
async function loadPackageConfig() {
    if(!currentPackage) return;
    const config = configs[currentPackage] || { defaultLib: true, libPath: '', status: false };

    defaultLibCheckbox.checked = config.defaultLib !== false;
    libPathInput.value = config.libPath || '';
    enableLoadLibCheckbox.checked = config.status === true;
}
// --- BACKUP CONFIG ---
backupBtn.addEventListener('click', async () => {
    const { errno, stderr } = await execAndLog(`cp -f '${CONFIG_FILE}' '${BACKUP_PATH}'`);
    if(errno === 0) {
        toast('Backup created successfully');
        printToTerminal(`Config backed up to ${BACKUP_PATH}`);
    } else {
        toast('Backup failed');
        printToTerminal(`Backup failed: ${stderr}`);
    }
});

// --- RESTORE CONFIG ---
restoreBtn.addEventListener('click', async () => {
    const { errno, stderr } = await execAndLog(`cp -f '${BACKUP_PATH}' '${CONFIG_FILE}'`);
    if(errno === 0) {
        toast('Config restored successfully');
        printToTerminal('Backup restored. Reloading config...');
        await loadPackages();
    } else {
        toast('Restore failed');
        printToTerminal(`Restore failed: ${stderr}`);
    }
});
// --- SAVE CONFIG ---
saveBtn.addEventListener('click', async () => {
    if(!currentPackage) return toast('No package selected');

    configs[currentPackage] = {
        defaultLib: defaultLibCheckbox.checked,
        libPath: libPathInput.value.trim(),
        status: enableLoadLibCheckbox.checked
    };

    await saveAllConfigs();
    toast('Config saved');

if(!defaultLibCheckbox.checked && libPathInput.value.trim()) {
    const dest = `/data/user/0/${currentPackage}/libmain.so`;

    // Force delete existing libmain.so
    await execAndLog(`rm -f '${dest}'`);

    // Copy new lib
    const { errno, stderr } = await execAndLog(`cp '${libPathInput.value.trim()}' '${dest}'`);
    const { errno2, stderr2 } = await execAndLog(`chmod 777 '${dest}'`);

    if(errno === 0 && errno2 === 0) toast('Library copied to libmain.so');
    else toast(`Failed to copy lib: ${stderr || stderr2}`);
}

});

// --- REMOVE CONFIG ---
removeConfBtn.addEventListener('click', async () => {
    if(!currentPackage) return toast('No package selected');

    delete configs[currentPackage];
    packages = packages.filter(pkg => pkg !== currentPackage);
    await saveAllConfigs();

    toast('Config removed');
    printToTerminal(`Config for ${currentPackage} removed successfully.`);
    currentPackage = packages.length ? packages[0] : null;
    renderPackageDropdown();
});

// --- INIT ---
document.addEventListener('DOMContentLoaded', async () => {
    await loadPackages();
});
