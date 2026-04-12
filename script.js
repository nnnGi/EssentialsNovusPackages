const API_URL = "https://essentialslibpackages.0xncubed.workers.dev";
let allPackages = [];
let currentAction = 'create';
const iconCache = new Map();

const shortcutGlyphFallback = (classes = "w-6 h-6") => `
    <svg class="${classes}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="131" y="77" width="250" height="250" rx="60" fill="currentColor" fill-opacity="0.3"/>
        <rect x="131" y="185" width="250" height="250" rx="60" fill="currentColor"/>
    </svg>
`;

async function getShortcutIcon(url) {
    try {
        const idMatch = url.match(/shortcuts\/([a-f0-9]{32})/);
        if (!idMatch) return null;
        const id = idMatch[1];
        if (iconCache.has(id)) return iconCache.get(id);
        const response = await fetch(`${API_URL}/icon/${id}`);
        if (!response.ok) return null;
        const data = await response.json();
        if (data.url) { iconCache.set(id, data.url); return data.url; }
    } catch (e) { console.error(e); }
    return null;
}

window.onload = () => {
    fetchRegistry();
    document.getElementById('searchInput').addEventListener('input', renderGallery);
    document.getElementById('packageForm').addEventListener('submit', (e) => { e.preventDefault(); submitData(); });
    window.addEventListener('popstate', handleRouting);
};

async function fetchRegistry() {
    try {
        const res = await fetch(API_URL);
        allPackages = await res.json();
        handleRouting();
    } catch (e) { document.getElementById('gallery').innerHTML = "Error loading registry."; }
}

function handleRouting() {
    const id = new URLSearchParams(window.location.search).get('id');
    if (id) viewPackage(id, false);
    else showPage('home', false);
}

function renderGallery() {
    const container = document.getElementById('gallery');
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allPackages.filter(p => p.name.toLowerCase().includes(query) || p.id.toLowerCase().includes(query));
    
    container.innerHTML = filtered.map(p => `
        <div class="bg-white border border-slate-200 p-6 rounded-2xl cursor-pointer card-hover" onclick="viewPackage('${p.id}')">
            <div class="flex justify-between items-start mb-4">
                <div id="icon-${p.id}">${shortcutGlyphFallback("w-10 h-10 text-azure")}</div>
                <span class="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold">v${p.versions[0].version}</span>
            </div>
            <h3 class="font-bold text-slate-900 text-lg">${p.name}</h3>
            <p class="text-slate-500 text-sm mb-4 line-clamp-2">${p.short_desc}</p>
            <div class="text-[10px] font-mono text-slate-400">${p.id}</div>
        </div>
    `).join('');

    filtered.forEach(async p => {
        const url = await getShortcutIcon(p.versions[0].link);
        if (url) document.getElementById(`icon-${p.id}`).innerHTML = `<img src="${url}" class="w-10 h-10 rounded-xl">`;
    });
}

async function viewPackage(id, pushHistory = true) {
    const p = allPackages.find(x => x.id === id);
    if (!p) return;
    if (pushHistory) history.pushState({}, '', `?id=${id}`);

    const latest = p.versions[0];
    document.getElementById('details-content').innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-200">
                <div class="flex items-center gap-4 mb-6">
                    <div id="detail-icon">${shortcutGlyphFallback("w-12 h-12 text-azure")}</div>
                    <div><h1 class="text-3xl font-bold">${p.name}</h1><p class="font-mono text-sm text-slate-400">${p.id}</p></div>
                </div>
                <div class="prose prose-slate max-w-none">${marked.parse(p.long_desc)}</div>
            </div>
            
            <div class="space-y-4">
                <div class="bg-white p-6 rounded-2xl border-2 border-azure text-center">
                    <a href="${latest.link}" target="_blank" class="block w-full bg-azure text-white py-3 rounded-xl font-bold mb-2 hover:opacity-90 transition-opacity">Install Latest</a>
                    <span class="text-xs font-bold text-slate-400 uppercase">Version v${latest.version}</span>
                </div>

                <div class="bg-white p-6 rounded-2xl border border-slate-200">
                    <h3 class="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">Version History</h3>
                    <div class="space-y-6">
                        ${p.versions.map(v => `
                            <div class="relative pl-4 border-l-2 border-slate-100 group">
                                <div class="flex justify-between items-start mb-1">
                                    <strong class="text-sm text-slate-900">v${v.version}</strong>
                                    <a href="${v.link}" target="_blank" title="Install v${v.version}" class="text-azure hover:text-blue-700 transition-colors">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                                        </svg>
                                    </a>
                                </div>
                                <p class="text-slate-500 text-xs leading-relaxed">${v.notes || 'No release notes.'}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-2 pt-2">
                    <button onclick="prepareUpdate('${p.id}', 'update')" class="w-full py-3 bg-azure/5 text-azure font-bold rounded-xl border border-azure/20 text-xs uppercase hover:bg-azure/10 transition-colors">New Version</button>
                    <button onclick="prepareUpdate('${p.id}', 'edit')" class="w-full py-3 text-slate-400 font-bold rounded-xl border border-dashed border-slate-200 text-xs uppercase hover:bg-slate-50 transition-colors">Edit Metadata</button>
                </div>
            </div>
        </div>
    `;
    
    // Icon loading logic remains the same
    const icon = await getShortcutIcon(latest.link);
    if (icon) document.getElementById('detail-icon').innerHTML = `<img src="${icon}" class="w-12 h-12 rounded-xl">`;
    showPage('details', false);
}

function prepareUpdate(id, mode) {
    const p = allPackages.find(x => x.id === id);
    currentAction = mode;
    showPage('create');
    
    // Header
    document.getElementById('form-title').innerText = mode === 'edit' ? "Edit Metadata" : "Push New Version";
    
    // Fields
    const idField = document.getElementById('f-id');
    idField.value = p.id;
    idField.disabled = true;

    // Toggle Groups
    const metaGroup = [document.getElementById('f-name'), document.getElementById('f-short'), document.getElementById('f-long')];
    const versionGroup = [document.getElementById('f-version'), document.getElementById('f-link'), document.getElementById('f-notes')];

    if (mode === 'edit') {
        metaGroup.forEach(el => el.closest('div').classList.remove('hidden'));
        versionGroup.forEach(el => el.closest('div')?.classList.add('hidden'));
        document.getElementById('f-version').closest('.grid').classList.add('hidden'); // Row for v/link
        
        document.getElementById('f-name').value = p.name;
        document.getElementById('f-short').value = p.short_desc;
        document.getElementById('f-long').value = p.long_desc;
        document.getElementById('btn-submit').innerText = "Save Changes";
    } else {
        metaGroup.forEach(el => el.closest('div').classList.add('hidden'));
        versionGroup.forEach(el => el.closest('div')?.classList.remove('hidden'));
        document.getElementById('f-version').closest('.grid').classList.remove('hidden');
        
        document.getElementById('f-version').value = "";
        document.getElementById('f-link').value = "";
        document.getElementById('f-notes').value = "";
        document.getElementById('btn-submit').innerText = "Push Version";
    }
}

async function submitData() {
    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    const payload = {
        action: currentAction,
        id: document.getElementById('f-id').value,
        secretKey: document.getElementById('f-key').value
    };

    if (currentAction === 'create' || currentAction === 'edit') {
        payload.name = document.getElementById('f-name').value;
        payload.short_desc = document.getElementById('f-short').value;
        payload.long_desc = document.getElementById('f-long').value;
    }
    
    if (currentAction === 'create' || currentAction === 'update') {
        payload.version = document.getElementById('f-version').value;
        payload.link = document.getElementById('f-link').value;
        payload.notes = document.getElementById('f-notes').value;
    }

    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        if (res.ok) { alert("Done!"); location.reload(); }
        else alert("Error: " + await res.text());
    } catch(e) { alert("Failed"); }
    finally { btn.disabled = false; }
}

function showPage(pageId, pushHistory = true) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById('page-' + pageId).classList.remove('hidden');
    if (pageId === 'home') {
        document.getElementById('packageForm').reset();
        document.getElementById('f-id').disabled = false;
        // Reset visibility
        document.querySelectorAll('#packageForm .hidden').forEach(el => el.classList.remove('hidden'));
        if (pushHistory) history.pushState({}, '', window.location.pathname);
        renderGallery();
    }
}
