const API_URL = "https://essentialslibpackages.0xncubed.workers.dev";

let allPackages = [];
let currentAction = 'create'; // 'create', 'update', or 'edit'
const iconCache = new Map();

/**
 * Fallback Shortcut Glyph SVG Component
 */
const shortcutGlyphFallback = (classes = "w-6 h-6") => `
    <svg class="${classes}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="131" y="77" width="250" height="250" rx="60" fill="currentColor" fill-opacity="0.3"/>
        <rect x="131" y="185" width="250" height="250" rx="60" fill="currentColor"/>
    </svg>
`;

/**
 * Extracts the iCloud ID from a URL and fetches the icon download URL via the Worker proxy
 */
async function getShortcutIcon(url) {
    try {
        const idMatch = url.match(/shortcuts\/([a-f0-9]{32})/);
        if (!idMatch) return null;
        const id = idMatch[1];
        
        if (iconCache.has(id)) return iconCache.get(id);

        // We route the request through our own Worker to bypass CORS
        const response = await fetch(`${API_URL}/icon/${id}`);
        if (!response.ok) return null;
        
        const data = await response.json();
        const iconUrl = data.url;
        
        if (iconUrl) {
            iconCache.set(id, iconUrl);
            return iconUrl;
        }
    } catch (e) { 
        console.error("Icon fetch error:", e); 
    }
    return null;
}

// Initialization
window.onload = () => {
    fetchRegistry();
    document.getElementById('searchInput').addEventListener('input', renderGallery);
    document.getElementById('packageForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitData();
    });
    window.addEventListener('popstate', handleRouting);
};

async function fetchRegistry() {
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Registry Error");
        allPackages = await res.json();
        handleRouting();
    } catch (e) {
        const gallery = document.getElementById('gallery');
        if (gallery) {
            gallery.innerHTML = `<div class="col-span-full text-center py-20 bg-red-50 text-red-700 rounded-2xl border border-red-100"><p class="font-bold">Registry Connection Error</p></div>`;
        }
    }
}

function handleRouting() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id && allPackages.length > 0) {
        const pkg = allPackages.find(p => p.id === id);
        if (pkg) viewPackage(id, false);
        else showPage('home', false);
    } else {
        showPage('home', false);
        renderGallery();
    }
}

function renderGallery() {
    const container = document.getElementById('gallery');
    if (!container) return;
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allPackages.filter(p => p.name.toLowerCase().includes(query) || p.id.toLowerCase().includes(query));
    if (filtered.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-20 text-slate-400 text-sm">No packages match your search.</div>`;
        return;
    }
    container.innerHTML = filtered.map(p => `
        <div class="bg-white border border-slate-200 p-6 rounded-2xl cursor-pointer card-hover transition-all group" onclick="viewPackage('${p.id}')">
            <div class="flex justify-between items-start mb-4">
                <div id="icon-${p.id}" class="text-azure">${shortcutGlyphFallback("w-10 h-10")}</div>
                <span class="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">v${p.versions[0].version}</span>
            </div>
            <h3 class="font-bold text-slate-900 group-hover:text-azure transition-colors text-lg mb-1">${p.name}</h3>
            <p class="text-slate-500 text-sm mb-5 line-clamp-2 leading-relaxed">${p.short_desc}</p>
            <div class="flex items-center text-[11px] text-slate-400 font-mono">
                <svg class="w-3.5 h-3.5 mr-1.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16"></path></svg>
                ${p.id}
            </div>
        </div>
    `).join('');
    filtered.forEach(async (p) => {
        const iconUrl = await getShortcutIcon(p.versions[0].link);
        if (iconUrl) {
            const iconContainer = document.getElementById(`icon-${p.id}`);
            if (iconContainer) iconContainer.innerHTML = `<img src="${iconUrl}" class="w-10 h-10 rounded-xl shadow-sm" alt="icon">`;
        }
    });
}

async function viewPackage(id, pushHistory = true) {
    const p = allPackages.find(x => x.id === id);
    if (!p) return;
    if (pushHistory) history.pushState({}, '', `?id=${id}`);

    const latest = p.versions[0];
    const detailsContainer = document.getElementById('details-content');
    if (!detailsContainer) return;

    detailsContainer.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <div class="flex items-center gap-4 mb-6">
                    <div id="detail-icon" class="bg-azure/10 p-1 rounded-2xl">
                        ${shortcutGlyphFallback("w-12 h-12 text-azure")}
                    </div>
                    <div>
                        <h1 class="text-3xl font-bold text-slate-900">${p.name}</h1>
                        <p class="font-mono text-sm text-slate-400">${p.id}</p>
                    </div>
                </div>
                <div class="prose prose-slate max-w-none">
                    ${marked.parse(p.long_desc || '*No description provided.*')}
                </div>
            </div>
            
            <div class="space-y-4">
                <!-- Main CTA for latest version -->
                <div class="bg-white p-6 rounded-2xl border-2 border-azure text-center shadow-lg shadow-azure/5">
                    <a href="${latest.link}" target="_blank" class="block w-full bg-azure text-white py-3 rounded-xl font-bold mb-2 hover:bg-blue-600 transition-all">Install Latest</a>
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Version v${latest.version}</span>
                </div>

                <!-- Version History with individual links -->
                <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 class="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">Version History</h3>
                    <div class="flex flex-col gap-6">
                        ${p.versions.map(v => `
                            <div class="relative pl-4 border-l-2 border-slate-100 py-1 flex flex-col gap-2">
                                <div class="flex justify-between items-center w-full min-h-[32px]">
                                    <span class="text-sm font-bold text-slate-800">v${v.version}</span>
                                    
                                    <!-- Explicitly Styled Link Button -->
                                    <a href="${v.link}" target="_blank" 
                                       style="display: inline-flex !important; visibility: visible !important;"
                                       class="inline-flex items-center gap-2 bg-slate-100 hover:bg-azure hover:text-white text-slate-600 px-3 py-1.5 rounded-lg transition-all duration-200 border border-slate-200">
                                        <span class="text-[10px] font-bold uppercase tracking-tight">Get Link</span>
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                        </svg>
                                    </a>
                                </div>
                                ${v.notes ? `<p class="text-slate-500 text-xs leading-relaxed pr-2">${v.notes}</p>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-2 pt-2">
                    <button onclick="prepareUpdate('${p.id}', 'update')" class="w-full py-3 bg-azure/5 text-azure font-bold rounded-xl border border-azure/20 text-xs uppercase hover:bg-azure/10 transition-colors">Push New Version</button>
                    <button onclick="prepareUpdate('${p.id}', 'edit')" class="w-full py-3 text-slate-400 font-bold rounded-xl border border-dashed border-slate-200 text-xs uppercase hover:bg-slate-50 transition-colors">Edit Metadata</button>
                </div>
            </div>
        </div>
    `;
    
    // Attempt to load the high-res iCloud icon
    const icon = await getShortcutIcon(latest.link);
    if (icon) {
        const iconDiv = document.getElementById('detail-icon');
        if (iconDiv) {
            iconDiv.innerHTML = `<img src="${icon}" class="w-12 h-12 rounded-xl shadow-sm">`;
            iconDiv.classList.remove('p-1', 'bg-azure/10');
        }
    }
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
