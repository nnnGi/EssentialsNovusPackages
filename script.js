
const API_URL = "https://essentialslibpackages.0xncubed.workers.dev";

let allPackages = [];
let currentAction = 'create';

// Initialize
window.onload = () => {
    fetchRegistry();
    
    document.getElementById('searchInput').addEventListener('input', renderGallery);
    document.getElementById('packageForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitData();
    });

    // Listen to browser Back/Forward navigation to handle routing
    window.addEventListener('popstate', handleRouting);
};

async function fetchRegistry() {
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Registry Error");
        allPackages = await res.json();
        
        // Let the router decide what to show based on the URL on first load
        handleRouting();
    } catch (e) {
        document.getElementById('gallery').innerHTML = `
            <div class="col-span-full text-center py-20 text-red-400/80 bg-red-400/10 rounded-xl border border-red-400/20">
                Failed to load registry. Have you set up your API_URL yet?
            </div>`;
    }
}

// Router to handle ?id= links
function handleRouting() {
    const urlParams = new URLSearchParams(window.location.search);
    const packageId = urlParams.get('id');
    
    if (packageId && allPackages.length > 0) {
        const exists = allPackages.find(p => p.id === packageId);
        if (exists) {
            viewPackage(packageId, false); // False means don't push history again
        } else {
            showPage('home', false);
        }
    } else {
        showPage('home', false);
        renderGallery();
    }
}

function renderGallery() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const container = document.getElementById('gallery');
    
    const filtered = allPackages.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.id.toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-20 text-zinc-500 text-sm">No packages match your search.</div>`;
        return;
    }

    container.innerHTML = filtered.map(p => `
        <div class="bg-[#18181b] border border-white/5 p-5 rounded-2xl cursor-pointer hover:border-indigo-500/50 hover:bg-[#1f1f22] transition-all group" onclick="viewPackage('${p.id}')">
            <div class="flex justify-between items-start mb-3">
                <h3 class="font-semibold text-zinc-100 group-hover:text-indigo-400 transition-colors">${p.name}</h3>
                <span class="text-[10px] bg-white/10 text-zinc-300 px-2 py-0.5 rounded-full font-mono border border-white/5">v${p.versions[0].version}</span>
            </div>
            <p class="text-zinc-400 text-sm mb-4 line-clamp-2 leading-relaxed">${p.short_desc}</p>
            <div class="flex items-center text-xs text-zinc-500 font-mono">
                <svg class="w-3.5 h-3.5 mr-1.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                ${p.id}
            </div>
        </div>
    `).join('');
}

function viewPackage(id, pushHistory = true) {
    const p = allPackages.find(x => x.id === id);
    if (!p) return;

    // Update the URL so it can be copied and shared
    if (pushHistory) {
        const url = new URL(window.location);
        url.searchParams.set('id', id);
        window.history.pushState({}, '', url);
    }

    const latest = p.versions[0];
    
    // Parse Markdown safely
    const parsedMarkdown = marked.parse(p.long_desc || 'No description provided.');
    
    document.getElementById('details-content').innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div class="lg:col-span-2 space-y-8">
                <div class="pb-6 border-b border-white/10">
                    <div class="flex items-center gap-3 mb-2">
                        <h1 class="text-3xl font-bold text-zinc-100">${p.name}</h1>
                        <span class="text-xs bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-full font-mono border border-indigo-500/20">v${latest.version}</span>
                    </div>
                    <p class="text-zinc-500 font-mono text-sm flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                        ${p.id}
                    </p>
                </div>
                
                <div>
                    <h2 class="text-sm font-semibold text-zinc-100 uppercase tracking-wider mb-4">Readme</h2>
                    <!-- Markdown styling is applied here via "prose" classes -->
                    <div class="prose prose-invert prose-indigo max-w-none text-zinc-300 leading-relaxed bg-[#18181b] p-6 sm:p-8 rounded-2xl border border-white/5 overflow-x-auto">
                        ${parsedMarkdown}
                    </div>
                </div>
            </div>

            <div class="space-y-6">
                <div class="bg-[#18181b] p-6 rounded-2xl border border-white/5">
                    <h2 class="text-sm font-semibold text-zinc-100 uppercase tracking-wider mb-4">Install</h2>
                    <a href="${latest.link}" target="_blank" class="block w-full text-center bg-zinc-100 text-zinc-950 py-2.5 rounded-lg font-semibold hover:bg-white transition-colors mb-3">
                        Get Shortcut
                    </a>
                    <p class="text-xs text-zinc-500 text-center">Requires Apple Shortcuts app</p>
                </div>

                <div class="bg-[#18181b] p-6 rounded-2xl border border-white/5">
                    <h2 class="text-sm font-semibold text-zinc-100 uppercase tracking-wider mb-4">Releases</h2>
                    <div class="space-y-4">
                        ${p.versions.map((v, i) => `
                            <div class="relative pl-5 border-l border-white/10">
                                <div class="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full ${i === 0 ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]' : 'bg-zinc-700'}"></div>
                                <div class="flex justify-between items-baseline mb-1">
                                    <div class="font-mono text-sm text-zinc-200">v${v.version}</div>
                                    <a href="${v.link}" class="text-xs text-indigo-400 hover:text-indigo-300">Link</a>
                                </div>
                                <div class="text-xs text-zinc-500">${v.notes || 'No release notes.'}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="pt-4 border-t border-white/5">
                    <button onclick="prepareUpdate('${p.id}')" class="w-full border border-white/10 text-zinc-400 py-2 rounded-lg text-sm font-medium hover:bg-white/5 hover:text-zinc-200 transition-colors">
                        Maintainer: Push Update
                    </button>
                </div>
            </div>
        </div>
    `;
    showPage('details', false); // Let viewPackage handle the history
}

function prepareUpdate(id) {
    const p = allPackages.find(x => x.id === id);
    currentAction = 'update';
    showPage('create');
    
    document.getElementById('form-title').innerText = `Update Package: ${p.name}`;
    
    document.getElementById('f-id').value = p.id;
    document.getElementById('f-id').disabled = true;
    document.getElementById('f-id').classList.add('opacity-50', 'cursor-not-allowed');
    
    document.getElementById('f-name').value = p.name;
    document.getElementById('f-short').value = p.short_desc;
    document.getElementById('f-long').value = p.long_desc;
    
    const btn = document.getElementById('btn-submit');
    btn.innerText = "Push Update";
}

async function submitData() {
    const btn = document.getElementById('btn-submit');
    const originalText = btn.innerText;
    
    btn.innerText = "Processing...";
    btn.disabled = true;
    btn.classList.add('opacity-75', 'cursor-not-allowed');

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
            alert("Success! Your package has been updated.");
            // Reload and clear ID param to return to home
            window.location.href = window.location.pathname;
        } else {
            const errorText = await res.text();
            alert("Error: " + errorText);
        }
    } catch (e) {
        alert("Failed to connect to the server. Check your internet or API URL.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
        btn.classList.remove('opacity-75', 'cursor-not-allowed');
    }
}

function showPage(pageId, pushHistory = true) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById('page-' + pageId).classList.remove('hidden');
    
    if (pageId === 'home') {
        currentAction = 'create';
        document.getElementById('packageForm').reset();
        document.getElementById('f-id').disabled = false;
        document.getElementById('f-id').classList.remove('opacity-50', 'cursor-not-allowed');
        document.getElementById('form-title').innerText = "Publish Package";
        document.getElementById('btn-submit').innerText = "Publish Package";
        
        // Clear the ?id= from URL when going back to home
        if (pushHistory) {
            const url = new URL(window.location);
            url.searchParams.delete('id');
            window.history.pushState({}, '', url.pathname);
            renderGallery();
        }
    }
    window.scrollTo(0, 0);
}
