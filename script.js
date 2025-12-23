/**
 * NexTask Application Logic - ENTEGRE BULUT VERSİYONU
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
                    title: 'Sistem Kurulumu',
                    description: 'Bulut senkronizasyonu aktif edildi.',
                    assigneeId: empId,
                    creatorId: adminId,
                    status: 'pending',
                    dueDate: '2025-12-31',
                    createdAt: new Date().toISOString(),
                    isRecurring: false,
                    parentTaskId: null,
                    estimatedDuration: '120',
                    assignedAt: new Date().toISOString(),
                    notes: []
                }
            ];

            localStorage.setItem('nex_users', JSON.stringify(users));
            localStorage.setItem('nex_tasks', JSON.stringify(tasks));
            localStorage.setItem('nex_notifications', JSON.stringify([]));
            localStorage.setItem('nex_seed_version', '4');
        }
    },
    playSound: () => {
        try {
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
        } catch(e) {}
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

// --- VIEW MANAGER ---
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
        const template = document.getElementById('dashboard-template');
        this.appEl.innerHTML = '';
        this.appEl.appendChild(template.content.cloneNode(true));

        const sidebar = this.appEl.querySelector('.sidebar');
        sidebar.querySelector('.avatar').textContent = user.name.charAt(0);
        sidebar.querySelector('.name').textContent = user.name;
        sidebar.querySelector('.role').textContent = user.role.toUpperCase();

        // Role based menu
        if (user.role !== 'admin') {
            const adminLinks = sidebar.querySelectorAll('li[onclick*="team"], li[onclick*="reports"]');
            adminLinks.forEach(l => l.remove());
        }

        this.updateView('home');
    }

    updateView(viewName) {
        const contentEl = document.getElementById('view-content');
        const titleEl = document.getElementById('page-title');
        if (!contentEl) return;

        // Nav active state
        document.querySelectorAll('.nav-links li').forEach(li => {
            li.classList.toggle('active', li.getAttribute('onclick')?.includes(viewName));
        });

        if (viewName === 'home') {
            titleEl.textContent = 'Genel Bakış';
            contentEl.innerHTML = window.App.getHomeHTML();
        } else if (viewName === 'tasks') {
            titleEl.textContent = 'Görev Yönetimi';
            contentEl.innerHTML = window.App.getTasksHTML();
        } else if (viewName === 'team') {
            titleEl.textContent = 'Ekip Yönetimi';
            contentEl.innerHTML = window.App.getTeamHTML();
        } else if (viewName === 'reports') {
            titleEl.textContent = 'Performans Raporları';
            contentEl.innerHTML = window.App.getReportsHTML();
        }
    }

    renderModal(title, contentHTML) {
        const container = document.getElementById('modal-container');
        const template = document.getElementById('modal-template');
        container.innerHTML = '';
        container.appendChild(template.content.cloneNode(true));
        
        container.querySelector('h3').textContent = title;
        container.querySelector('.modal-body').innerHTML = contentHTML;
        
        const closeBtn = container.querySelector('.modal-header button');
        closeBtn.onclick = () => container.innerHTML = '';
    }
}

// --- APP CONTROLLER ---
class Application {
    constructor() {
        this.store = new Store();
        this.view = new ViewManager('app');
        this.CLOUD_URL = "https://script.google.com/macros/s/AKfycbyfB3PSj2ZLBlm3wofSJrjX2dSzAUudP-PlO7raAt3qQleP4yAvxyys2zku2eyNs9yT/exec";
        this.init();
    }

    async init() {
        Utils.seedData();
        await this.syncWithCloud(); // Açılışta buluttan veriyi çek
        if (this.store.currentUser) {
            this.view.renderDashboard(this.store.currentUser);
        } else {
            this.view.renderLogin();
        }
    }

    async syncWithCloud() {
        console.log("Bulut verileri senkronize ediliyor...");
        try {
            const response = await fetch(this.CLOUD_URL);
            const data = await response.json();
            if (data && Array.isArray(data)) {
                this.store.saveTasks(data);
                if (this.store.currentUser) this.view.updateView('tasks');
            }
        } catch (e) { console.warn("Senkronizasyon hatası:", e); }
    }

    async uploadToCloud() {
        try {
            const tasks = this.store.getTasks();
            await fetch(this.CLOUD_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify({ items: tasks })
            });
        } catch (e) { console.error("Veri gönderilemedi:", e); }
    }

    // --- Business Logic ---
    handleLogin(u, p) {
        if (this.store.login(u, p)) {
            this.view.renderDashboard(this.store.currentUser);
        } else {
            alert('Geçersiz kullanıcı adı veya şifre.');
        }
    }

    handleLogout() {
        this.store.logout();
        this.view.renderLogin();
    }

    navigate(v) { this.view.updateView(v); }

    // --- Content Generators (HTML) ---
    getHomeHTML() {
        const tasks = this.store.getTasks();
        const userTasks = this.store.currentUser.role === 'admin' ? tasks : tasks.filter(t => t.assigneeId === this.store.currentUser.id);
        
        const stats = {
            total: userTasks.length,
            pending: userTasks.filter(t => t.status === 'pending').length,
            inProgress: userTasks.filter(t => t.status === 'in-progress').length,
            completed: userTasks.filter(t => t.status === 'completed').length
        };

        return `
            <div class="stats-grid">
                <div class="stat-card glass-panel">
                    <div class="icon" style="background: var(--primary)"><i class="ph ph-list-checks"></i></div>
                    <div class="info"><h4>Toplam</h4><span>${stats.total}</span></div>
                </div>
                <div class="stat-card glass-panel">
                    <div class="icon" style="background: var(--warning)"><i class="ph ph-clock"></i></div>
                    <div class="info"><h4>Bekleyen</h4><span>${stats.pending}</span></div>
                </div>
                <div class="stat-card glass-panel">
                    <div class="icon" style="background: var(--success)"><i class="ph ph-check-circle"></i></div>
                    <div class="info"><h4>Tamamlanan</h4><span>${stats.completed}</span></div>
                </div>
            </div>
            <div class="recent-tasks glass-panel" style="margin-top: 2rem; padding: 1.5rem;">
                <h3 style="margin-bottom: 1rem;">Son Görevler</h3>
                ${this.getTasksTableHTML(userTasks.slice(-5))}
            </div>
        `;
    }

    getTasksHTML() {
        const tasks = this.store.getTasks();
        const userTasks = this.store.currentUser.role === 'admin' ? tasks : tasks.filter(t => t.assigneeId === this.store.currentUser.id);
        return `
            <div class="glass-panel" style="padding: 1rem; margin-bottom: 2rem; display: flex; gap: 1rem; align-items: center;">
                <div style="flex:1"><input type="text" placeholder="Görevlerde ara..." style="width:100%; padding:0.8rem; background: rgba(255,255,255,0.05); border:1px solid var(--glass-border); color:white; border-radius:8px;"></div>
                <button onclick="App.syncWithCloud()" class="btn btn-outline"><i class="ph ph-arrows-clockwise"></i> Yenile</button>
                <button onclick="App.openCreateTaskModal()" class="btn btn-primary"><i class="ph ph-plus"></i> Yeni Görev</button>
            </div>
            <div class="data-table glass-panel">
                ${this.getTasksTableHTML(userTasks)}
            </div>
        `;
    }

    getTasksTableHTML(tasks) {
        const users = this.store.getUsers();
        if (tasks.length === 0) return `<div style="padding:2rem; text-align:center; color:var(--text-muted);">Görev bulunamadı.</div>`;
        
        return `
            <table>
                <thead>
                    <tr>
                        <th>Görev Adı</th>
                        <th>Sorumlu</th>
                        <th>Durum</th>
                        <th>Bitiş</th>
                        <th>İşlem</th>
                    </tr>
                </thead>
                <tbody>
                    ${tasks.reverse().map(t => {
                        const assignee = users.find(u => u.id === t.assigneeId);
                        return `
                            <tr>
                                <td><div style="font-weight:600">${t.title}</div><div style="font-size:0.8rem; color:var(--text-muted)">#${t.id.substr(0,5)}</div></td>
                                <td><div style="display:flex; align-items:center; gap:8px;"><div class="avatar" style="width:24px; height:24px; font-size:0.6rem;">${assignee?.name.charAt(0)}</div> ${assignee?.name}</div></td>
                                <td><span class="badge ${t.status}">${t.status}</span></td>
                                <td>${new Date(t.dueDate).toLocaleDateString('tr-TR')}</td>
                                <td>
                                    <button class="btn-icon" onclick="App.openTaskDetail('${t.id}')"><i class="ph ph-eye"></i></button>
                                    ${this.store.currentUser.role === 'admin' ? `<button class="btn-icon" style="color:var(--danger)" onclick="App.deleteTask('${t.id}')"><i class="ph ph-trash"></i></button>` : ''}
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    // --- Modals & Actions ---
    openCreateTaskModal() {
        const users = this.store.getUsers();
        const html = `
            <form id="create-task-form">
                <div class="form-group">
                    <label>Görev Başlığı</label>
                    <input type="text" name="title" required placeholder="Nelerin yapılması gerekiyor?">
                </div>
                <div class="form-group">
                    <label>Açıklama</label>
                    <textarea name="description" rows="3" placeholder="Detayları girin..."></textarea>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                    <div class="form-group">
                        <label>Atanan Kişi</label>
                        <select name="assigneeId">
                            ${users.map(u => `<option value="${u.id}">${u.name} (${u.role})</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Bitiş Tarihi</label>
                        <input type="date" name="dueDate" required>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary btn-block">Görevi Oluştur</button>
            </form>
        `;
        this.view.renderModal('Yeni Görev', html);
        
        document.getElementById('create-task-form').onsubmit = (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const data = Object.fromEntries(fd.entries());
            
            const tasks = this.store.getTasks();
            tasks.push({
                ...data,
                id: Utils.generateId(),
                creatorId: this.store.currentUser.id,
                status: 'pending',
                createdAt: new Date().toISOString(),
                notes: []
            });
            
            this.store.saveTasks(tasks);
            this.uploadToCloud();
            document.getElementById('modal-container').innerHTML = '';
            this.view.updateView('tasks');
            Utils.playSound();
        };
    }

    openTaskDetail(id) {
        const task = this.store.getTasks().find(t => t.id === id);
        if(!task) return;
        const assignee = this.store.getUsers().find(u => u.id === task.assigneeId);

        const html = `
            <div class="task-detail">
                <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
                    <span class="badge ${task.status}">${task.status}</span>
                    <span style="font-size:0.8rem; color:var(--text-muted)">${new Date(task.createdAt).toLocaleString()}</span>
                </div>
                <p style="margin-bottom:1.5rem; color:var(--text-muted);">${task.description || 'Açıklama yok.'}</p>
                
                <div class="form-group">
                    <label>Durumu Güncelle</label>
                    <select onchange="App.updateTaskStatus('${task.id}', this.value)" style="margin-top:5px;">
                        <option value="pending" ${task.status==='pending'?'selected':''}>Bekliyor</option>
                        <option value="in-progress" ${task.status==='in-progress'?'selected':''}>Devam Ediyor</option>
                        <option value="completed" ${task.status==='completed'?'selected':''}>Tamamlandı</option>
                    </select>
                </div>
            </div>
        `;
        this.view.renderModal(task.title, html);
    }

    updateTaskStatus(id, newStatus) {
        const tasks = this.store.getTasks();
        const idx = tasks.findIndex(t => t.id === id);
        if(idx !== -1) {
            tasks[idx].status = newStatus;
            this.store.saveTasks(tasks);
            this.uploadToCloud();
            this.view.updateView('tasks');
        }
    }

    deleteTask(id) {
        if(!confirm('Bu görevi silmek istediğinize emin misiniz?')) return;
        let tasks = this.store.getTasks();
        tasks = tasks.filter(t => t.id !== id);
        this.store.saveTasks(tasks);
        this.uploadToCloud();
        this.view.updateView('tasks');
    }

    // Ekip ve Rapor fonksiyonlarını da koruyalım
    getTeamHTML() {
        const users = this.store.getUsers();
        return `<div class="users-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(250px, 1fr)); gap:1rem;">
            ${users.map(u => `
                <div class="glass-panel" style="padding:1.5rem; text-align:center;">
                    <div class="avatar" style="width:60px; height:60px; margin:0 auto 1rem;">${u.name.charAt(0)}</div>
                    <h4>${u.name}</h4>
                    <p style="color:var(--text-muted); font-size:0.8rem;">@${u.username} • ${u.role}</p>
                </div>
            `).join('')}
        </div>`;
    }
}

// Uygulamayı Başlat
window.App = new Application();
