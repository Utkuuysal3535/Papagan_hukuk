/**
 * NexTask Application Logic - Gelişmiş Bulut Senkronizasyonlu Versiyon
 */

// --- UTILS ---
const Utils = {
    generateId: () => Date.now().toString(36) + Math.random().toString(36).substr(2),

    seedData: () => {
        if (!localStorage.getItem('nex_users') || localStorage.getItem('nex_seed_version') !== '4') {
            const adminId = 'admin_1';
            const managerId = 'manager_1';
            const empId = 'emp_1';
            const empId2 = 'emp_2';

            const users = [
                { id: adminId, username: 'admin', password: '123', name: 'Yönetici', role: 'admin' },
                { id: managerId, username: 'mudur', password: '123', name: 'Müdür Ahmet', role: 'manager' },
                { id: empId, username: 'personel', password: '123', name: 'Personel Ali', role: 'employee' },
                { id: empId2, username: 'ayse', password: '123', name: 'Personel Ayşe', role: 'employee' }
            ];

            const tasks = [
                {
                    id: 'task_1',
                    title: 'İlk Görev',
                    description: 'Sisteme hoş geldiniz.',
                    assigneeId: empId,
                    creatorId: adminId,
                    status: 'pending',
                    dueDate: '2025-12-31',
                    createdAt: new Date().toISOString(),
                    isRecurring: false,
                    parentTaskId: null,
                    estimatedDuration: '120',
                    assignedAt: new Date().toISOString(),
                    notes: [{ userId: adminId, text: 'Hoşgeldin mesajı.', time: new Date().toISOString() }]
                }
            ];

            localStorage.setItem('nex_users', JSON.stringify(users));
            localStorage.setItem('nex_tasks', JSON.stringify(tasks));
            localStorage.setItem('nex_notifications', JSON.stringify([]));
            localStorage.setItem('nex_seed_version', '4');
        }
    },
    playSound: () => {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(440, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.5);
    }
};

// --- STORE ---
class Store {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('nex_currentUser')) || null;
    }
    getUsers() { return JSON.parse(localStorage.getItem('nex_users')) || []; }
    getTasks() { return JSON.parse(localStorage.getItem('nex_tasks')) || []; }
    getNotifications() { return JSON.parse(localStorage.getItem('nex_notifications')) || []; }
    saveNotifications(notes) { localStorage.setItem('nex_notifications', JSON.stringify(notes)); }
    saveTasks(tasks) { localStorage.setItem('nex_tasks', JSON.stringify(tasks)); }
    saveUsers(users) { localStorage.setItem('nex_users', JSON.stringify(users)); }
    login(username, password) {
        const users = this.getUsers();
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            this.currentUser = user;
            localStorage.setItem('nex_currentUser', JSON.stringify(user));
            return true;
        }
        return false;
    }
    logout() {
        this.currentUser = null;
        localStorage.removeItem('nex_currentUser');
    }
}

// --- VIEW MANAGER (TAM VERSİYON) ---
class ViewManager {
    constructor(appId) {
        this.appEl = document.getElementById(appId);
    }

    renderLogin() {
        const template = document.getElementById('login-template');
        this.appEl.innerHTML = '';
        this.appEl.appendChild(template.content.cloneNode(true));
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            window.App.handleLogin(e.target.username.value, e.target.password.value);
        });
    }

    renderDashboard(user) {
        this.appEl.innerHTML = `
            <div class="dashboard-layout">
                <nav class="sidebar glass-panel">
                    <div class="brand">
                        <div class="brand-icon"><i class="ph ph-hexagon-fill"></i></div>
                        <h3>İş Takibi</h3>
                    </div>
                    <ul class="nav-links">
                        <li class="active" onclick="App.navigate('home')"><i class="ph ph-squares-four"></i> <span>Genel Bakış</span></li>
                        <li onclick="App.navigate('tasks')"><i class="ph ph-check-square-offset"></i> <span>Görevler</span></li>
                        ${user.role === 'admin' ? `
                        <li onclick="App.navigate('team')"><i class="ph ph-users"></i> <span>Ekip</span></li>
                        <li onclick="App.navigate('reports')"><i class="ph ph-chart-line-up"></i> <span>Raporlar</span></li>
                        ` : ''}
                    </ul>
                    <div class="user-profile">
                        <div class="avatar">${user.name.charAt(0)}</div>
                        <div class="info">
                            <p class="name">${user.name}</p>
                            <p class="role" onclick="App.openChangePasswordModal('${user.id}')" style="cursor:pointer; font-size:0.7rem; text-decoration:underline;">Şifre Değiştir</p>
                        </div>
                        <button onclick="App.handleLogout()" class="btn-logout"><i class="ph ph-sign-out"></i></button>
                    </div>
                </nav>
                <main class="content-area">
                    <header class="top-bar glass-panel">
                        <h2 id="page-title">Genel Bakış</h2>
                        <div style="display:flex; gap:10px;">
                            <button onclick="App.syncWithCloud()" class="btn btn-outline"><i class="ph ph-arrows-clockwise"></i> Yenile</button>
                            <button onclick="App.openCreateTaskModal()" class="btn btn-primary"><i class="ph ph-plus"></i> Yeni Görev</button>
                        </div>
                    </header>
                    <div id="view-content" class="view-content"></div>
                </main>
            </div>
            <div id="modal-container"></div>
        `;
        this.updateView('home');
    }

    updateView(viewName) {
        const contentEl = document.getElementById('view-content');
        const titleEl = document.getElementById('page-title');
        if (!contentEl) return;

        if (viewName === 'home') {
            titleEl.textContent = 'Genel Bakış';
            contentEl.innerHTML = this.getHomeHTML();
        } else if (viewName === 'tasks') {
            titleEl.textContent = 'Görev Yönetimi';
            contentEl.innerHTML = this.getTasksHTML();
        }
    }

    getHomeHTML() {
        const stats = window.App.getStats();
        return `<div class="stats-grid">
            <div class="stat-card glass-panel"><h4>Toplam</h4><span>${stats.total}</span></div>
            <div class="stat-card glass-panel"><h4>Bekleyen</h4><span>${stats.pending}</span></div>
            <div class="stat-card glass-panel"><h4>Biten</h4><span>${stats.completed}</span></div>
        </div>`;
    }

    getTasksHTML() {
        const tasks = window.App.store.getTasks();
        const rows = tasks.map(t => `
            <tr>
                <td>${t.title}</td>
                <td><span class="badge ${t.status}">${t.status}</span></td>
                <td>${t.dueDate}</td>
                <td><button onclick="App.deleteTask('${t.id}')" class="btn-icon"><i class="ph ph-trash"></i></button></td>
            </tr>
        `).join('');
        return `<div class="data-table glass-panel"><table><thead><tr><th>Başlık</th><th>Durum</th><th>Bitiş</th><th>İşlem</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }

    renderModal(title, html) {
        const container = document.getElementById('modal-container');
        container.innerHTML = `<div class="modal-overlay"><div class="modal glass-panel"><div class="modal-header"><h3>${title}</h3><button onclick="document.getElementById('modal-container').innerHTML=''"><i class="ph ph-x"></i></button></div><div class="modal-body">${html}</div></div></div>`;
    }
}

// --- APP CONTROLLER (TAM VERSİYON) ---
class Application {
    constructor() {
        this.store = new Store();
        this.view = new ViewManager('app');
        this.CLOUD_URL = "https://script.google.com/macros/s/AKfycbyfB3PSj2ZLBlm3wofSJrjX2dSzAUudP-PlO7raAt3qQleP4yAvxyys2zku2eyNs9yT/exec";
        this.init();
    }

    async init() {
        Utils.seedData();
        await this.syncWithCloud(); // Açılışta buluttan çek
        this.checkAuth();
    }

    async syncWithCloud() {
        try {
            const res = await fetch(this.CLOUD_URL);
            const cloudData = await res.json();
            if (cloudData && Array.isArray(cloudData)) {
                this.store.saveTasks(cloudData);
                if (this.store.currentUser) this.navigate('tasks');
            }
        } catch (e) { console.log("Senkronizasyon atlandı."); }
    }

    async uploadToCloud() {
        try {
            const tasks = this.store.getTasks();
            await fetch(this.CLOUD_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify({ items: tasks })
            });
        } catch (e) { console.error("Buluta yüklenemedi."); }
    }

    checkAuth() {
        if (this.store.currentUser) this.view.renderDashboard(this.store.currentUser);
        else this.view.renderLogin();
    }

    handleLogin(u, p) {
        if (this.store.login(u, p)) this.checkAuth();
        else alert("Hatalı giriş!");
    }

    handleLogout() {
        this.store.logout();
        this.checkAuth();
    }

    navigate(v) { this.view.updateView(v); }

    getStats() {
        const t = this.store.getTasks();
        return { total: t.length, pending: t.filter(x => x.status === 'pending').length, completed: t.filter(x => x.status === 'completed').length };
    }

    openCreateTaskModal() {
        const html = `
            <div class="form-group">
                <label>Görev Başlığı</label>
                <input type="text" id="t-title" style="width:100%; padding:8px; margin-bottom:10px;">
                <label>Bitiş Tarihi</label>
                <input type="date" id="t-date" style="width:100%; padding:8px; margin-bottom:10px;">
                <button onclick="App.confirmCreateTask()" class="btn btn-primary btn-block">Görev Ekle</button>
            </div>
        `;
        this.view.renderModal("Yeni Görev Oluştur", html);
    }

    confirmCreateTask() {
        const title = document.getElementById('t-title').value;
        const date = document.getElementById('t-date').value;
        if (!title || !date) return alert("Eksik alan!");

        const tasks = this.store.getTasks();
        tasks.push({
            id: Utils.generateId(),
            title: title,
            dueDate: date,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
        
        this.store.saveTasks(tasks);
        this.uploadToCloud(); // Buluta gönder
        document.getElementById('modal-container').innerHTML = '';
        this.navigate('tasks');
    }

    deleteTask(id) {
        if (!confirm("Silmek istediğine emin misin?")) return;
        let tasks = this.store.getTasks();
        tasks = tasks.filter(t => t.id !== id);
        this.store.saveTasks(tasks);
        this.uploadToCloud(); // Buluta gönder
        this.navigate('tasks');
    }
}

window.App = new Application();
