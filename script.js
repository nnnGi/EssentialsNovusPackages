const API_URL = "https://essentialslibpackages.0xncubed.workers.dev";

let allPackages = [];
let currentAction = 'create';

// Initialization
window.onload = () => {
    fetchRegistry();
    
    document.getElementById('searchInput').addEventListener('input', renderGallery);
    document.getElementById('packageForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitData();
    });

    // Support browser Back/Forward navigation
    window.addEventListener('popstate', handleRouting);
};

async function fetchRegistry() {
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Registry Error");
        allPackages = await res.json();
        handleRouting();
    } catch (e) {
        document.getElementById('gallery').innerHTML = `
            <div class="col-span-full text-center py-20 bg-red-50 text-red-700 rounded-2xl border border-red-100">
                <p class="font-bold">Registry Connection Error</p>
                <p class="text-xs mt-1">Check your API_URL and Worker status.</p>
            </div>`;
    }
}

function handleRouting() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    
    if (id && allPackages.length > 0) {
        const pkg = allPackages.find(p => p.id === id);
        if (pkg) {
            viewPackage(id, false);
        } else {
            showPage('home', false);
        }
    } else {
        showPage('home', false);
        renderGallery();
    }
}

function renderGallery() {
    const container = document.getElementById('gallery');
    const query = document.getElementById('searchInput').value.toLowerCase();
    
    const filtered = allPackages.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.id.toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-20 text-slate-400 text-sm">No packages match your search.</div>`;
        return;
    }

    container.innerHTML = filtered.map(p => `
        <div class="bg-white border border-slate-200 p-6 rounded-2xl cursor-pointer card-hover transition-all group" onclick="viewPackage('${p.id}')">
            <div class="flex justify-between items-start mb-3">
                <h3 class="font-bold text-slate-900 group-hover:text-azure transition-colors">${p.name}</h3>
                <span class="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">v${p.versions[0].version}</span>
            </div>
            <p class="text-slate-500 text-sm mb-5 line-clamp-2 leading-relaxed">${p.short_desc}</p>
            <div class="flex items-center text-[11px] text-slate-400 font-mono">
                <svg class="w-3.5 h-3.5 mr-1.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16"></path></svg>
                ${p.id}
            </div>
        </div>
    `).join('');
}

function viewPackage(id, pushHistory = true) {
    const p = allPackages.find(x => x.id === id);
    if (!p) return;

    if (pushHistory) {
        const url = new URL(window.location);
        url.searchParams.set('id', id);
        window.history.pushState({}, '', url);
    }

    const latest = p.versions[0];
    const parsedMarkdown = marked.parse(p.long_desc || '*No description provided.*');
    
    document.getElementById('details-content').innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-6">
                <div class="bg-white border border-slate-200 p-8 rounded-2xl card-shadow">
                    <div class="flex items-center gap-3 mb-6">
                        <div class="bg-azure text-white p-2 rounded-xl">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                        </div>
                        <div>
                            <h1 class="text-3xl font-bold text-slate-900 leading-tight">${p.name}</h1>
                            <p class="text-sm font-mono text-slate-400">${p.id}</p>
                        </div>
                    </div>
                    
                    <div class="prose prose-slate max-w-none">
                        ${parsedMarkdown}
                    </div>
                </div>
            </div>

            <div class="space-y-6">
                <!-- Main Action -->
                <div class="bg-white border-2 border-azure p-6 rounded-2xl shadow-lg shadow-azure/5">
                    <h3 class="text-xs font-bold text-azure uppercase tracking-widest mb-4 text-center">Latest Release</h3>
                    <a href="${latest.link}" target="_blank" class="block w-full text-center bg-azure text-white py-3 rounded-xl font-bold hover:opacity-90 transition-all mb-3">
                        Install Shortcut
                    </a>
                    <p class="text-[10px] text-slate-400 text-center uppercase font-bold tracking-tighter">v${latest.version} • iCloud Link</p>
                </div>

                <!-- Versions -->
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

                <button onclick="prepareUpdate('${p.id}')" class="w-full py-3 text-slate-400 hover:text-azure font-bold text-xs uppercase tracking-widest transition-colors border border-dashed border-slate-200 rounded-xl hover:bg-azure/5">
                    Maintainer: Push Update
                </button>
            </div>
        </div>
    `;
    showPage('details', false);
}

function prepareUpdate(id) {
    const p = allPackages.find(x => x.id === id);
    currentAction = 'update';
    showPage('create');
    
    document.getElementById('form-title').innerText = `Update: ${p.name}`;
    const idField = document.getElementById('f-id');
    idField.value = p.id;
    idField.disabled = true;
    idField.classList.add('opacity-50', 'bg-slate-100');
    
    document.getElementById('f-name').value = p.name;
    document.getElementById('f-short').value = p.short_desc;
    document.getElementById('f-long').value = p.long_desc;
    
    document.getElementById('btn-submit').innerText = "Push Update";
}

async function submitData() {
    const btn = document.getElementById('btn-submit');
    const originalText = btn.innerText;
    
    btn.innerText = "Processing...";
    btn.disabled = true;

    const payload = {
        action: currentAction,
        id: document.getElementById('f-id').value,
        name: document.getElementById('f-name').value,
        secretKey: document.getElementById('f-key').value,
        short_desc: document.getElementById('f-short').value,
        long_desc: document.getElementById('f-long').value,
        version: document.getElementById('f-version').value,
        link: document.getElementById('f-link').value,
        notes: document.getElementById('f-notes').value
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
            const errText = await res.text();
            alert("Error: " + errText);
        }
    } catch (e) {
        alert("Connection failed.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

function showPage(pageId, pushHistory = true) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById('page-' + pageId).classList.remove('hidden');
    
    if (pageId === 'home') {
        currentAction = 'create';
        document.getElementById('packageForm').reset();
        const idField = document.getElementById('f-id');
        idField.disabled = false;
        idField.classList.remove('opacity-50', 'bg-slate-100');
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
