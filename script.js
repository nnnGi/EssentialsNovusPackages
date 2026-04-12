/**
 * CONFIGURATION
 * Replace this URL with your deployed Cloudflare Worker URL
 */
const API_URL = "https://essentialslibpackages.0xncubed.workers.dev";

let allPackages = [];
let currentAction = 'create';

// Initialize
window.onload = () => {
    fetchRegistry();
    
    // Add Search Listener
    document.getElementById('searchInput').addEventListener('input', renderGallery);

    // Handle Form Submission
    document.getElementById('packageForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitData();
    });
};

async function fetchRegistry() {
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Registry Error");
        allPackages = await res.json();
        renderGallery();
    } catch (e) {
        document.getElementById('gallery').innerHTML = `
            <div class="col-span-full text-center py-20 text-red-400">
                Failed to load registry. Check your API_URL in script.js
            </div>`;
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
        container.innerHTML = `<div class="col-span-full text-center py-10 text-slate-400">No packages found.</div>`;
        return;
    }

    container.innerHTML = filtered.map(p => `
        <div class="card bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer" onclick="viewPackage('${p.id}')">
            <div class="flex justify-between items-start mb-2">
                <h3 class="font-bold text-lg text-blue-600">${p.name}</h3>
                <span class="text-xs bg-slate-100 px-2 py-1 rounded font-mono font-bold">${p.versions[0].version}</span>
            </div>
            <p class="text-slate-500 text-sm mb-4 line-clamp-2">${p.short_desc}</p>
            <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                <span>id: ${p.id}</span>
                <span>${p.versions.length} release${p.versions.length > 1 ? 's' : ''}</span>
            </div>
        </div>
    `).join('');
}

function viewPackage(id) {
    const p = allPackages.find(x => x.id === id);
    const latest = p.versions[0];
    
    document.getElementById('details-content').innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
            <div>
                <h1 class="text-3xl font-extrabold text-slate-900">${p.name}</h1>
                <p class="text-slate-500 font-mono text-sm">Package ID: ${p.id}</p>
            </div>
            <a href="${latest.link}" target="_blank" class="w-full md:w-auto text-center bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-105 transition">Get Shortcut</a>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div class="lg:col-span-2">
                <h2 class="font-bold text-xl mb-4 border-b pb-2 text-slate-800">Project Description</h2>
                <div class="prose max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed">${p.long_desc}</div>
            </div>
            <div class="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h2 class="font-bold text-lg mb-4 text-slate-800">Version History</h2>
                <div class="space-y-6">
                    ${p.versions.map((v, i) => `
                        <div class="relative pl-6 border-l-2 ${i === 0 ? 'border-blue-500' : 'border-slate-300'}">
                            <div class="absolute -left-[9px] top-1 w-4 h-4 rounded-full ${i === 0 ? 'bg-blue-500' : 'bg-slate-300'}"></div>
                            <div class="font-bold text-slate-900">v${v.version}</div>
                            <div class="text-sm text-slate-600 mb-2">${v.notes || 'No release notes.'}</div>
                            <a href="${v.link}" class="text-xs font-bold text-blue-600 hover:underline">Download v${v.version}</a>
                        </div>
                    `).join('')}
                </div>
                <button onclick="prepareUpdate('${p.id}')" class="mt-8 w-full bg-white border border-slate-300 py-3 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-100 transition">
                    Push Update
                </button>
            </div>
        </div>
    `;
    showPage('details');
}

function prepareUpdate(id) {
    const p = allPackages.find(x => x.id === id);
    currentAction = 'update';
    showPage('create');
    
    document.getElementById('form-title').innerText = `Update ${p.name}`;
    document.getElementById('f-id').value = p.id;
    document.getElementById('f-id').disabled = true;
    document.getElementById('f-name').value = p.name;
    document.getElementById('f-short').value = p.short_desc;
    document.getElementById('f-long').value = p.long_desc;
    
    document.getElementById('btn-submit').innerText = "Submit Update";
    document.getElementById('btn-submit').classList.replace('bg-blue-600', 'bg-slate-800');
}

async function submitData() {
    const btn = document.getElementById('btn-submit');
    const originalText = btn.innerText;
    
    btn.innerText = "Processing Request...";
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
            alert("Success! Your shortcut has been registered.");
            location.reload();
        } else {
            const errorText = await res.text();
            alert("Error: " + errorText);
        }
    } catch (e) {
        alert("Failed to connect to the server. Check your internet or API URL.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

function showPage(pageId) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById('page-' + pageId).classList.remove('hidden');
    
    if (pageId === 'home') {
        currentAction = 'create';
        document.getElementById('packageForm').reset();
        document.getElementById('f-id').disabled = false;
        document.getElementById('form-title').innerText = "Publish New Package";
        document.getElementById('btn-submit').innerText = "Publish to Registry";
        document.getElementById('btn-submit').classList.replace('bg-slate-800', 'bg-blue-600');
    }
    window.scrollTo(0, 0);
}
