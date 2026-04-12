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

async function renderGallery() {
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
    if (pushHistory) {
        const url = new URL(window.location);
        url.searchParams.set('id', id);
        window.history.pushState({}, '', url);
    }
    const latest = p.versions[0];
    const parsedMarkdown = marked.parse(p.long_desc || '*No description provided.*');
    const detailsContainer = document.getElementById('details-content');
    if (!detailsContainer) return;
    detailsContainer.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-6">
                <div class="bg-white border border-slate-200 p-8 rounded-2xl card-shadow">
                    <div class="flex items-center gap-4 mb-8">
                        <div id="detail-icon" class="bg-azure text-white p-1 rounded-2xl shadow-lg shadow-azure/20">${shortcutGlyphFallback("w-12 h-12")}</div>
                        <div>
                            <h1 class="text-3xl font-bold text-slate-900 leading-tight">${p.name}</h1>
                            <p class="text-sm font-mono text-slate-400">${p.id}</p>
                        </div>
                    </div>
                    <div class="prose prose-slate max-w-none">${parsedMarkdown}</div>
                </div>
            </div>
            <div class="space-y-4">
                <div class="bg-white border-2 border-azure p-6 rounded-2xl shadow-lg shadow-azure/5">
                    <h3 class="text-xs font-bold text-azure uppercase tracking-widest mb-4 text-center">Latest Release</h3>
                    <a href="${latest.link}" target="_blank" class="block w-full text-center bg-azure text-white py-3 rounded-xl font-bold hover:opacity-90 transition-all mb-3">Install Shortcut</a>
                    <p class="text-[10px] text-slate-400 text-center uppercase font-bold tracking-tighter">v${latest.version} • iCloud Link</p>
                </div>
                <div class="bg-white border border-slate-200 p-6 rounded-2xl card-shadow">
                    <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Releases</h3>
                    <div class="space-y-6">
                        ${p.versions.map((v, i) => `
                            <div class="relative pl-5 border-l-2 ${i === 0 ? 'border-azure' : 'border-slate-100'}">
                                <div class="absolute -left-[7px] top-1 w-3 h-3 rounded-full ${i === 0 ? 'bg-azure' : 'bg-slate-200'}"></div>
                                <div class="flex justify-between items-center mb-1">
                                    <span class="font-bold text-slate-800 text-sm">v${v.version}</span>
                                    <a href="${v.link}" class="text-[10px] font-bold text-azure hover:underline uppercase">Link</a>
                                </div>
                                <p class="text-xs text-slate-500 leading-relaxed">${v.notes || 'Initial release.'}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="grid grid-cols-1 gap-2">
                    <button onclick="prepareUpdate('${p.id}', 'update')" class="w-full py-3 text-azure font-bold text-xs uppercase tracking-widest transition-colors border border-azure/20 rounded-xl hover:bg-azure/5">
                        Push New Version
                    </button>
                    <button onclick="prepareUpdate('${p.id}', 'edit')" class="w-full py-3 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest transition-colors border border-dashed border-slate-200 rounded-xl hover:bg-slate-50">
                        Edit Info (No New Version)
                    </button>
                </div>
            </div>
        </div>
    `;
    const iconUrl = await getShortcutIcon(latest.link);
    if (iconUrl) {
        const iconDiv = document.getElementById('detail-icon');
        if (iconDiv) { iconDiv.innerHTML = `<img src="${iconUrl}" class="w-12 h-12 rounded-xl" alt="icon">`; iconDiv.classList.remove('p-1'); }
    }
    showPage('details', false);
}

function prepareUpdate(id, mode = 'update') {
    const p = allPackages.find(x => x.id === id);
    if (!p) return;
    currentAction = mode;
    showPage('create');
    document.getElementById('form-title').innerText = mode === 'edit' ? `Edit Metadata: ${p.name}` : `Push Update: ${p.name}`;
    const idField = document.getElementById('f-id');
    idField.value = p.id;
    idField.disabled = true;
    idField.classList.add('opacity-50', 'bg-slate-100');
    document.getElementById('f-name').value = p.name;
    document.getElementById('f-short').value = p.short_desc;
    document.getElementById('f-long').value = p.long_desc;
    
    // UI handling for edit vs update
    const versionRow = document.getElementById('f-version').closest('.grid');
    const notesField = document.getElementById('f-notes').closest('div');
    
    if (mode === 'edit') {
        versionRow.classList.add('hidden');
        notesField.classList.add('hidden');
        document.getElementById('f-version').required = false;
        document.getElementById('f-link').required = false;
        document.getElementById('btn-submit').innerText = "Save Changes";
    } else {
        versionRow.classList.remove('hidden');
        notesField.classList.remove('hidden');
        document.getElementById('f-version').required = true;
        document.getElementById('f-link').required = true;
        document.getElementById('f-version').value = '';
        document.getElementById('f-link').value = '';
        document.getElementById('f-notes').value = '';
        document.getElementById('btn-submit').innerText = "Push Update";
    }
}

async function submitData() {
    const btn = document.getElementById('btn-submit');
    const originalText = btn.innerText;
    btn.innerText = "Processing...";
    btn.disabled = true;
    const notesEl = document.getElementById('f-notes');
    const payload = {
        action: currentAction,
        id: document.getElementById('f-id').value,
        name: document.getElementById('f-name').value,
        secretKey: document.getElementById('f-key').value,
        short_desc: document.getElementById('f-short').value,
        long_desc: document.getElementById('f-long').value,
        version: document.getElementById('f-version').value,
        link: document.getElementById('f-link').value,
        notes: notesEl ? notesEl.value : ""
    };
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert("Success!");
            window.location.href = window.location.pathname;
        } else {
            alert("Error: " + await res.text());
        }
    } catch (e) { alert("Connection failed."); }
    finally { btn.innerText = originalText; btn.disabled = false; }
}

function showPage(pageId, pushHistory = true) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    const targetPage = document.getElementById('page-' + pageId);
    if (targetPage) targetPage.classList.remove('hidden');
    if (pageId === 'home') {
        currentAction = 'create';
        const form = document.getElementById('packageForm');
        if (form) form.reset();
        const idField = document.getElementById('f-id');
        if (idField) { idField.disabled = false; idField.classList.remove('opacity-50', 'bg-slate-100'); }
        // Ensure fields are visible again
        document.getElementById('f-version').closest('.grid').classList.remove('hidden');
        document.getElementById('f-notes').closest('div').classList.remove('hidden');
        document.getElementById('f-version').required = true;
        document.getElementById('f-link').required = true;
        document.getElementById('form-title').innerText = "Publish Package";
        document.getElementById('btn-submit').innerText = "Publish Package";
        if (pushHistory) {
            const url = new URL(window.location);
            url.searchParams.delete('id');
            window.history.pushState({}, '', url.pathname);
            renderGallery();
        }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
