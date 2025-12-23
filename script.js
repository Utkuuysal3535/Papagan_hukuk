/**
 * NexTask Application Logic
 * 
 * Architecture:
 * - Store: Manages persistent data (Users, Tasks) in localStorage.
 * - ViewManager: Handles DOM updates and screen transitions.
 * - App: Main controller.
 */

// --- UTILS ---
const Utils = {
    generateId: () => Date.now().toString(36) + Math.random().toString(36).substr(2),

    // Mock Data Generator for first run
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
                // Active Tasks
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
                    estimatedDuration: '120', // minutes
                    assignedAt: new Date().toISOString(), // Add assignedAt
                    notes: [{ userId: adminId, text: 'Hoşgeldin mesajı.', time: new Date().toISOString() }]
                },
                // Completed Historical Tasks for Reports
                {
                    id: 'task_h1',
                    title: 'Geçmiş Rapor 1',
                    assigneeId: empId,
                    creatorId: adminId,
                    status: 'completed',
                    dueDate: '2024-01-10',
                    createdAt: '2024-01-01T09:00:00.000Z',
                    estimatedDuration: '300', // 5 hours
                    workDuration: 270, // 4.5 hours
                    completedAt: '2024-01-10T14:00:00.000Z',
                    completionTime: '14:00'
                },
                {
                    id: 'task_h2',
                    title: 'Geçmiş Rapor 2',
                    assigneeId: empId,
                    creatorId: adminId,
                    status: 'completed',
                    dueDate: '2024-01-11',
                    createdAt: '2024-01-02T09:00:00.000Z',
                    estimatedDuration: '180', // 3 hours
                    workDuration: 240, // 4 hours
                    completedAt: '2024-01-11T16:00:00.000Z',
                    completionTime: '16:00'
                },
                {
                    id: 'task_h3',
                    title: 'Ayşe Görev 1',
                    assigneeId: empId2,
                    creatorId: managerId,
                    status: 'completed',
                    dueDate: '2024-01-12',
                    createdAt: '2024-01-03T09:00:00.000Z',
                    estimatedDuration: '480', // 8 hours
                    workDuration: 420,  // 7 hours
                    completedAt: '2024-01-12T10:00:00.000Z',
                    completionTime: '10:00'
                }
            ];

            localStorage.setItem('nex_users', JSON.stringify(users));
            localStorage.setItem('nex_tasks', JSON.stringify(tasks));
            localStorage.setItem('nex_notifications', JSON.stringify([]));
            localStorage.setItem('nex_seed_version', '4'); // Update version
        }
    },
    playSound: () => {
        // Louder, generated Beep using AudioContext
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = 'sawtooth'; // Sharper sound
        oscillator.frequency.setValueAtTime(440, ctx.currentTime); // A4
        oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.5);
    }
};

const CONSTANTS = {
    API_URL: 'https://script.google.com/macros/s/AKfycbyfB3PSj2ZLBlm3wofSJrjX2dSzAUudP-PlO7raAt3qQleP4yAvxyys2zku2eyNs9yT/exec'
};

const GoogleSheetService = {
    async load() {
        try {
            const statusEl = document.getElementById('connection-status');
            if (statusEl) statusEl.style.background = 'var(--warning)'; // Loading

            console.log('Fetching from Cloud...');

            // Timeout after 5 seconds
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            try {
                const response = await fetch(CONSTANTS.API_URL, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (!response.ok) throw new Error('Cloud response not ok');
                const data = await response.json();
                console.log('Cloud Data:', data);

                if (statusEl) {
                    statusEl.style.background = 'var(--success)';
                    statusEl.title = 'Çevrimiçi (Senkronize)';
                }
                return data;
            } catch (fetchErr) {
                if (fetchErr.name === 'AbortError') throw new Error('Request Timed Out');
                throw fetchErr;
            }

        } catch (error) {
            console.error('Cloud Load Failed:', error);
            const statusEl = document.getElementById('connection-status');
            if (statusEl) {
                statusEl.style.background = 'var(--danger)';
                statusEl.title = 'Çevrimdışı (Hata: ' + error.message + ')';
            }
            // Do not alert, just return null so app can start offline
            return null;
        }
    },

    async save(data) {
        try {
            const statusEl = document.getElementById('connection-status');
            if (statusEl) statusEl.style.background = 'var(--warning)'; // Saving

            console.log('Saving to Cloud...', data);
            await fetch(CONSTANTS.API_URL, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            console.log('Saved to Cloud');

            if (statusEl) {
                statusEl.style.background = 'var(--success)';
                statusEl.title = 'Kaydedildi';
            }
            return true;
        } catch (error) {
            console.error('Cloud Save Failed:', error);
            const statusEl = document.getElementById('connection-status');
            if (statusEl) {
                statusEl.style.background = 'var(--danger)';
                statusEl.title = 'Kaydedilemedi (Çevrimdışı)';
            }
            return false;
        }
    }
};

// --- STORE ---
class Store {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('nex_currentUser')) || null;
    }

    getUsers() {
        return JSON.parse(localStorage.getItem('nex_users')) || [];
    }

    getTasks() {
        return JSON.parse(localStorage.getItem('nex_tasks')) || [];
    }

    getNotifications() {
        return JSON.parse(localStorage.getItem('nex_notifications')) || [];
    }

    saveNotifications(notes) {
        localStorage.setItem('nex_notifications', JSON.stringify(notes));
    }

    saveTasks(tasks) {
        localStorage.setItem('nex_tasks', JSON.stringify(tasks));
        this.syncToCloud();
    }

    saveUsers(users) {
        localStorage.setItem('nex_users', JSON.stringify(users));
        this.syncToCloud();
    }

    async init() {
        const cloudData = await GoogleSheetService.load();
        if (cloudData && !Array.isArray(cloudData)) {
            // Assume object { users: [], tasks: [] }
            if (cloudData.users) localStorage.setItem('nex_users', JSON.stringify(cloudData.users));
            if (cloudData.tasks) localStorage.setItem('nex_tasks', JSON.stringify(cloudData.tasks));
            // We ignore notifications for cloud sync usually, or sync them too if needed.
        } else if (Array.isArray(cloudData) && cloudData.length === 0) {
            // First time or empty
            console.log('Cloud is empty, pushing local data...');
            this.syncToCloud();
        }
    }

    syncToCloud() {
        const data = {
            users: this.getUsers(),
            tasks: this.getTasks()
        };
        GoogleSheetService.save(data);
    }

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
        const isMin = user.role === 'admin';

        // Dashboard Shell
        this.appEl.innerHTML = `
            <div class="dashboard-layout">
                <nav class="sidebar glass-panel">
                    <div class="brand">
                        <div class="brand-icon"><i class="ph ph-hexagon-fill"></i></div>
                        <h3>İş Takibi</h3>
                    </div>
                    
                    <ul class="nav-links">
                        <li class="active" onclick="App.navigate('home')">
                            <i class="ph ph-squares-four"></i> <span>Genel Bakış</span>
                        </li>
                        <li onclick="App.navigate('tasks')">
                            <i class="ph ph-check-square-offset"></i> <span>Görevler</span>
                        </li>
                        ${user.role === 'admin' ? `
                        <li onclick="App.navigate('team')">
                            <i class="ph ph-users"></i> <span>Ekip Yönetimi</span>
                        </li>
                        <li onclick="App.navigate('reports')">
                            <i class="ph ph-chart-line-up"></i> <span>Raporlar</span>
                        </li>
                        ` : ''}
                    </ul>

                        <div class="user-profile">
                        <div class="avatar">${user.name.charAt(0)}</div>
                        <div class="info">
                            <p class="name">${user.name}</p>
                            <p class="role" style="font-size:0.75rem; cursor:pointer; text-decoration:underline;" onclick="App.openChangePasswordModal('${user.id}')">Şifre Değiştir</p>
                        </div>
                        <div style="position:relative; margin-left:auto;">
                             <button onclick="App.toggleNotifications()" class="btn-logout" style="position:relative;">
                                <i class="ph ph-bell"></i>
                                <span id="notif-badge" class="notif-badge" style="display:none"></span>
                             </button>
                             <div id="notif-dropdown" class="notif-dropdown glass-panel" style="display:none;">
                                 <!-- Notifications -->
                             </div>
                        </div>
                        <button onclick="App.handleLogout()" class="btn-logout"><i class="ph ph-sign-out"></i></button>
                    </div>
                </nav>

                <main class="content-area">
                    <header class="top-bar glass-panel">
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <h2 id="page-title">Genel Bakış</h2>
                            <span id="connection-status" title="Bağlantı Durumu" style="width:10px; height:10px; border-radius:50%; background:var(--text-muted); display:inline-block; transition: background 0.3s;"></span>
                        </div>
                        <button onclick="App.openCreateTaskModal()" class="btn btn-primary">
                            <i class="ph ph-plus"></i> Yeni Görev
                        </button>
                    </header>
                    
                    <div id="view-content" class="view-content">
                        <!-- Dynamic View Content -->
                    </div>
                </main>
            </div>
            
            <!-- Modals Container -->
            <div id="modal-container"></div>
        `;

        this.updateView('home');
    }

    updateView(viewName, params = {}) {
        const contentEl = document.getElementById('view-content');
        const titleEl = document.getElementById('page-title');

        // Update Nav Active State
        document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
        // Simple active check (can be improved)

        if (viewName === 'home') {
            titleEl.textContent = 'Genel Bakış';
            contentEl.innerHTML = this.getHomeViewHTML();
        } else if (viewName === 'tasks') {
            titleEl.textContent = 'Görev Yönetimi';
            contentEl.innerHTML = this.getTasksViewHTML();
        } else if (viewName === 'team') {
            titleEl.textContent = 'Ekip Yönetimi';
            contentEl.innerHTML = this.getTeamViewHTML();
        } else if (viewName === 'reports') {
            titleEl.textContent = 'Performans Raporları';
            contentEl.innerHTML = this.getReportsViewHTML(params);
        }
    }

    getHomeViewHTML() {
        const stats = window.App.getStats();
        return `
            <div class="stats-grid">
                <div class="stat-card glass-panel">
                    <div class="icon blue"><i class="ph ph-kanban"></i></div>
                    <div class="details">
                        <h4>Toplam Görev</h4>
                        <span>${stats.total}</span>
                    </div>
                </div>
                <div class="stat-card glass-panel">
                    <div class="icon orange"><i class="ph ph-clock"></i></div>
                    <div class="details">
                        <h4>Bekleyen</h4>
                        <span>${stats.pending}</span>
                    </div>
                </div>
                <div class="stat-card glass-panel">
                    <div class="icon green"><i class="ph ph-check-circle"></i></div>
                    <div class="details">
                        <h4>Tamamlanan</h4>
                        <span>${stats.completed}</span>
                    </div>
                </div>
            </div>
        `;
    }

    getTasksViewHTML() {
        const currentUser = window.App.store.currentUser;
        const isAdmin = ['admin', 'manager'].includes(currentUser.role);
        const activeTab = window.App.activeTaskTab || (isAdmin ? 'pending' : 'my_tasks');

        // Define Tabs based on Role
        let tabs = [];
        if (isAdmin) {
            tabs = [
                { id: 'pending', label: 'Bekleyen' },
                { id: 'postponed', label: 'Ertelendi' },
                { id: 'cancelled', label: 'İptal Edilen' },
                { id: 'completed', label: 'Tamamlanan' }
            ];
        } else {
            tabs = [
                { id: 'my_tasks', label: 'İşlerim' },
                { id: 'completed', label: 'Tamamlananlar' }
            ];
        }

        // Filter Logic
        let tasks = window.App.store.getTasks();

        // Role & Tab Filter
        if (isAdmin) {
            // Admin sees all, filtered by status tab
            tasks = tasks.filter(t => t.status === activeTab);
        } else {
            // Employee view
            if (activeTab === 'my_tasks') {
                // Pending OR Postponed assigned to me
                tasks = tasks.filter(t => t.assigneeId === currentUser.id && ['pending', 'postponed'].includes(t.status));
            } else if (activeTab === 'completed') {
                tasks = tasks.filter(t => t.assigneeId === currentUser.id && t.status === 'completed');
            }
        }

        const users = window.App.store.getUsers();

        // Helpers
        const getElapsed = (task) => {
            if (task.status === 'completed' || task.status === 'cancelled') return '-';
            const start = new Date(task.assignedAt || task.createdAt);
            const now = new Date();
            const diffMs = now - start;
            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            return `${diffHrs}s ${diffMins}dk`;
        };

        const rows = tasks.map(t => {
            const assignee = users.find(u => u.id === t.assigneeId)?.name || 'Bilinmiyor';
            const isCompleted = t.status === 'completed';
            const recurBadge = t.isRecurring ? '<i class="ph ph-arrows-clockwise" title="Tekrarlayan Görev" style="color:var(--warning); margin-right:4px;"></i>' : '';

            // Elapsed Time Badge
            let elapsedBadge = '';
            if (!isCompleted && t.status !== 'cancelled') {
                elapsedBadge = `<span class="badge" style="background:rgba(255,255,255,0.1); border:1px solid var(--glass-border);">Geçen: ${getElapsed(t)}</span>`;
            }

            return `
                <tr class="task-row" onclick="App.openTaskDetails('${t.id}')" style="cursor:pointer">
                    <td>
                        <div style="display:flex; align-items:center;">
                            ${recurBadge}
                            <span>${t.title}</span>
                        </div>
                    </td>
                    <td>${assignee}</td>
                    <td>
                        <span class="badge ${t.status}">
                            ${t.status === 'pending' ? 'Bekliyor' :
                    (t.status === 'postponed' ? 'Ertelendi' :
                        (t.status === 'cancelled' ? 'İptal' : 'Tamamlandı'))}
                        </span>
                    </td>
                    <td>${t.dueDate}</td>
                    <td>${elapsedBadge}</td>
                    <td onclick="event.stopPropagation()">
                        <button class="btn-icon" title="Durum Güncelle" onclick="App.openStatusUpdateModal('${t.id}')">
                            <i class="ph ph-pencil-simple"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Tab Buttons HTML
        const tabsHtml = tabs.map(tab => `
            <button onclick="App.switchTaskTab('${tab.id}')" 
                    class="btn ${activeTab === tab.id ? 'btn-primary' : 'btn-outline'}" 
                    style="border-radius:20px; padding:0.5rem 1.5rem; font-size:0.9rem;">
                ${tab.label}
            </button>
        `).join('');

        return `
            <div class="tabs-container" style="margin-bottom:1.5rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
                ${tabsHtml}
            </div>

            ${tasks.length === 0 ? `
            <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                <i class="ph ph-clipboard-text" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <p>Bu görünümde görev bulunmuyor.</p>
            </div>
            ` : `
            <div class="data-table glass-panel">
                <table>
                    <thead>
                        <tr>
                            <th>Başlık</th>
                            <th>Atanan</th>
                            <th>Durum</th>
                            <th>Bitiş Tarihi</th>
                            <th>Süreç</th>
                            <th>İşlem</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            `}
        `;
    }

    getTeamViewHTML() {
        const users = window.App.store.getUsers();
        const tasks = window.App.store.getTasks();
        const currentUser = window.App.store.currentUser;
        const isAdmin = currentUser.role === 'admin';

        const rows = users.map(u => {
            const userTasks = tasks.filter(t => t.assigneeId === u.id);
            const completed = userTasks.filter(t => t.status === 'completed').length;
            const total = userTasks.length;

            return `
            <div class="user-card glass-panel" style="position:relative;">
                <div class="avatar lg">${u.name.charAt(0)}</div>
                <h4>${u.name}</h4>
                <p>@${u.username}</p>
                <div style="margin: 1rem 0; display: flex; gap: 1rem; font-size: 0.9rem; color: var(--text-muted);">
                    <div><span style="color:white; font-weight:bold;">${completed}</span> Tamamlanan</div>
                    <div><span style="color:white; font-weight:bold;">${total}</span> Toplam</div>
                </div>
                <span class="role-badge">${u.role === 'admin' ? 'Yönetici' : (u.role === 'manager' ? 'Müdür' : 'Personel')}</span>
                
                ${isAdmin && u.id !== currentUser.id ? `
                <div style="margin-top:1rem; display:flex; gap:0.5rem; justify-content:center;">
                    <button class="btn-icon" title="Şifre Sıfırla" style="background:var(--warning); width:32px; height:32px;" onclick="App.openChangePasswordModal('${u.id}', true)"><i class="ph ph-key"></i></button>
                    <button class="btn-icon" title="Sil" style="background:var(--danger); width:32px; height:32px;" onclick="App.handleDeleteUser('${u.id}')"><i class="ph ph-trash"></i></button>
                </div>
                ` : ''}
            </div>
            `;
        }).join('');

        return `
            <div style="margin-bottom: 1rem; display: flex; justify-content: flex-end;">
                 <button onclick="App.openAddUserModal()" class="btn btn-primary"><i class="ph ph-user-plus"></i> Yeni Personel</button>
            </div>
            <div class="users-grid">
                ${rows}
            </div>
        `;
    }

    getReportsViewHTML(filter = {}) {
        const users = window.App.store.getUsers().filter(u => u.role === 'employee');
        const tasks = window.App.store.getTasks();

        let startDate = filter.start ? new Date(filter.start) : null;
        let endDate = filter.end ? new Date(filter.end) : null;
        const activeTab = filter.tab || 'custom';

        // Auto Date Logic for Tabs
        const today = new Date();
        if (activeTab === 'daily') {
            startDate = new Date(today.setHours(0, 0, 0, 0));
            endDate = new Date(today.setHours(23, 59, 59, 999));
        } else if (activeTab === 'weekly') {
            const first = today.getDate() - today.getDay() + 1; // Monday
            startDate = new Date(today.setDate(first));
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(); // To Now
        } else if (activeTab === 'monthly') {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }

        if (endDate) endDate.setHours(23, 59, 59, 999);

        const rows = users.map(u => {
            let userTasks = tasks.filter(t => t.assigneeId === u.id && t.status === 'completed');

            if (startDate || endDate) {
                userTasks = userTasks.filter(t => {
                    const d = new Date(t.completedAt || t.createdAt);
                    return (!startDate || d >= startDate) && (!endDate || d <= endDate);
                });
            }

            const totalTasks = userTasks.length;

            let totalEstimated = 0;
            let totalActual = 0;

            userTasks.forEach(t => {
                totalEstimated += parseFloat(t.estimatedDuration || 0);
                totalActual += parseFloat(t.workDuration || 0);
            });

            // Convert Minutes to Hours for Display
            const estHours = (totalEstimated / 60).toFixed(1);
            const actHours = (totalActual / 60).toFixed(1);
            const avgHours = totalTasks > 0 ? (totalActual / totalTasks / 60).toFixed(1) : '-';

            return `
                <tr>
                    <td>
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                             <div class="avatar" style="width:30px; height:30px; font-size:0.9rem;">${u.name.charAt(0)}</div>
                             <span>${u.name}</span>
                        </div>
                    </td>
                    <td>${totalTasks} Görev</td>
                    <td>${estHours} Saat <span style="font-size:0.8em; opacity:0.6">(${totalEstimated} dk)</span></td>
                    <td><span style="color:${totalActual > totalEstimated ? 'var(--warning)' : 'var(--success)'}">${actHours} Saat</span></td>
                    <td>${avgHours} Saat/Görev</td>
                </tr>
            `;
        }).join('');

        const startVal = startDate ? startDate.toISOString().split('T')[0] : '';
        const endVal = endDate ? endDate.toISOString().split('T')[0] : '';

        return `
             <div style="margin-bottom:1rem; display:flex; flex-direction:column; gap:1rem; background:var(--glass-bg); padding:1rem; border-radius:12px; border:1px solid var(--glass-border);">
                 <div class="tabs" style="display:flex; gap:0.5rem; border-bottom:1px solid var(--glass-border); padding-bottom:0.5rem;">
                     <button onclick="App.filterReports({tab:'daily'})" class="btn ${activeTab === 'daily' ? 'btn-primary' : 'btn-outline'}">Günlük</button>
                     <button onclick="App.filterReports({tab:'weekly'})" class="btn ${activeTab === 'weekly' ? 'btn-primary' : 'btn-outline'}">Haftalık</button>
                     <button onclick="App.filterReports({tab:'monthly'})" class="btn ${activeTab === 'monthly' ? 'btn-primary' : 'btn-outline'}">Aylık</button>
                     <button onclick="App.filterReports({tab:'custom'})" class="btn ${activeTab === 'custom' ? 'btn-primary' : 'btn-outline'}">Özel</button>
                 </div>
                 
                 <div style="display:flex; gap:1rem; align-items:end; ${activeTab !== 'custom' ? 'display:none;' : ''}">
                     <div class="form-group" style="margin:0;">
                        <label style="margin-bottom:0.25rem;">Başlangıç</label>
                        <input type="date" id="report-start" value="${startVal}">
                     </div>
                     <div class="form-group" style="margin:0;">
                        <label style="margin-bottom:0.25rem;">Bitiş</label>
                        <input type="date" id="report-end" value="${endVal}">
                     </div>
                     <button onclick="App.filterReports({tab:'custom'})" class="btn btn-primary" style="padding:0.75rem;"><i class="ph ph-funnel"></i> Uygula</button>
                 </div>
             </div>


            <div class="data-table glass-panel">
                <table style="width:100%">
                    <thead>
                        <tr>
                            <th>Personel</th>
                            <th>Tamamlanan</th>
                            <th>Tahmini Süre</th>
                            <th>Gerçekleşen Süre</th>
                            <th>Ort. Süre</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }

    renderModal(title, htmlContent) {
        const container = document.getElementById('modal-container');
        container.innerHTML = `
            <div class="modal-overlay">
                <div class="modal glass-panel">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button onclick="document.getElementById('modal-container').innerHTML = ''"><i class="ph ph-x"></i></button>
                    </div>
                    <div class="modal-body">
                        ${htmlContent}
                    </div>
                </div>
            </div>
            `;
    }
}

// --- APP CONTROLLER ---
class Application {
    constructor() {
        this.store = new Store();
        this.view = new ViewManager('app');
        this.activeTaskTab = null; // State for Task Tabs
    }

    async init() {
        Utils.seedData(); // Seed local first if needed

        // Show Loading
        const viewContent = document.getElementById('view-content');
        if (viewContent) viewContent.innerHTML = '<div style="text-align:center; padding:2rem;"><h3>Bulut Verisi Yükleniyor...</h3></div>';

        await this.store.init(); // Wait for Cloud

        this.checkRecurringTasks();
        this.checkAuth();

        // Real-time Sync Listener
        window.addEventListener('storage', (e) => this.handleStorageChange(e));
    }

    handleStorageChange(e) {
        if (e.key === 'nex_notifications' && this.store.currentUser) {
            const oldVal = JSON.parse(e.oldValue || '[]');
            const newVal = JSON.parse(e.newValue || '[]');

            // Allow time for parsing
            if (newVal.length > oldVal.length) {
                const latest = newVal[newVal.length - 1];
                if (latest.userId === this.store.currentUser.id && !latest.read) {
                    Utils.playSound();
                    this.view.renderModal('🔔 Yeni Bildirim', `
                        <div style="text-align:center; padding:2rem;">
                            <i class="ph ph-bell-ringing" style="font-size:3rem; color:var(--primary); margin-bottom:1rem;"></i>
                            <h3 style="margin-bottom:0.5rem;">${latest.title}</h3>
                            <p>${latest.message}</p>
                            <button onclick="document.getElementById('modal-container').innerHTML = ''; App.toggleNotifications();" class="btn btn-primary" style="margin-top:1.5rem;">Tamam</button>
                        </div>
                    `);

                    // Update Badge if hidden
                    const badge = document.getElementById('notif-badge');
                    if (badge) {
                        badge.style.display = 'block';
                    }
                }
            }
        }
    }

    checkRecurringTasks() {
        // Run daily Check
        const lastRun = localStorage.getItem('nex_last_recur_run');
        const today = new Date().toISOString().split('T')[0];

        if (lastRun === today) return;

        const tasks = this.store.getTasks();
        const recurringMasters = tasks.filter(t => t.isRecurring && !t.parentTaskId);

        let newTasks = [];
        recurringMasters.forEach(master => {
            // Check if already exists for today
            const exists = tasks.find(t => t.parentTaskId === master.id && t.createdAt.startsWith(today));
            if (!exists) {
                const clone = {
                    ...master,
                    id: Utils.generateId(),
                    parentTaskId: master.id,
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                    dueDate: today, // Recurring tasks usually for today
                    notes: [] // Don't copy notes
                };
                newTasks.push(clone);
            }
        });

        if (newTasks.length > 0) {
            this.store.saveTasks([...tasks, ...newTasks]);
            console.log('Recurring tasks generated:', newTasks.length);
        }

        localStorage.setItem('nex_last_recur_run', today);
    }

    checkAuth() {
        if (this.store.currentUser) {
            this.view.renderDashboard(this.store.currentUser);
        } else {
            this.view.renderLogin();
        }
    }

    handleLogin(username, password) {
        if (this.store.login(username, password)) {
            this.view.renderDashboard(this.store.currentUser);
        } else {
            alert('Hatalı kullanıcı adı veya şifre!');
        }
    }

    handleLogout() {
        this.store.logout();
        this.view.renderLogin();
    }

    navigate(viewName) {
        this.view.updateView(viewName);
    }

    switchTaskTab(tabId) {
        this.activeTaskTab = tabId;
        this.navigate('tasks');
    }

    getStats() {
        let tasks = this.store.getTasks();

        if (this.store.currentUser.role !== 'admin') {
            tasks = tasks.filter(t => t.assigneeId === this.store.currentUser.id);
        }

        return {
            total: tasks.length,
            pending: tasks.filter(t => t.status === 'pending').length,
            completed: tasks.filter(t => t.status === 'completed').length
        };
    }

    openStatusUpdateModal(taskId) {
        const tasks = this.store.getTasks();
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        // Permission check
        const canEdit = ['admin', 'manager'].includes(this.store.currentUser.role) || task.assigneeId === this.store.currentUser.id;
        if (!canEdit) {
            alert('Bu işlem için yetkiniz yok.');
            return;
        }

        const est = task.estimatedDuration || 0;
        const isCompleted = task.status === 'completed';
        const isNoteRequired = task.status === 'postponed' || task.status === 'cancelled';

        const content = `
            <div id="update-status-wrapper">
                <div class="form-group">
                    <label>Durum Güncelle</label>
                    <select id="status-select" onchange="App.handleStatusChangeInModal(this.value)" style="width:100%; padding:0.75rem; border-radius:8px; background:rgba(255,255,255,0.05); color:white; border:1px solid var(--glass-border);">
                        <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>Devam Ediyor (Beklemede)</option>
                        <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Tamamlandı</option>
                        <option value="postponed" ${task.status === 'postponed' ? 'selected' : ''}>Ertelendi</option>
                        <option value="cancelled" ${task.status === 'cancelled' ? 'selected' : ''}>İptal Edildi</option>
                    </select>
                </div>

                <div id="duration-group" class="form-group" style="${isCompleted ? 'display:block' : 'display:none'}">
                    <label>Harcanan Süre (Dakika)</label>
                    <input type="number" id="input-duration" placeholder="Örn: ${est}" value="${task.workDuration || est}">
                    <small style="color:var(--text-muted);">Tahmini: ${est} dk</small>
                </div>

                <div id="note-group" class="form-group" style="${(isCompleted || isNoteRequired) ? 'display:block' : 'display:none'}">
                    <label id="note-label">${isNoteRequired ? 'Açıklama (Zorunlu)' : 'Açıklama / Not (Opsiyonel)'}</label>
                    <textarea id="input-note" rows="3" placeholder="Lütfen bir açıklama giriniz..." style="width:100%; padding:0.75rem; border-radius:8px; background:rgba(255,255,255,0.05); color:white; border:1px solid var(--glass-border);"></textarea>
                </div>

                <button type="button" onclick="App.runStatusUpdate('${taskId}')" class="btn btn-primary btn-block">Güncelle</button>
            </div>
        `;
        this.view.renderModal('Görevi Güncelle', content);
    }

    handleStatusChangeInModal(status) {
        const durGroup = document.getElementById('duration-group');
        const noteGroup = document.getElementById('note-group');
        const noteLabel = document.getElementById('note-label');

        if (status === 'completed') {
            durGroup.style.display = 'block';
            noteGroup.style.display = 'block';
            noteLabel.textContent = 'Açıklama / Not (Opsiyonel)';
        } else if (status === 'postponed' || status === 'cancelled') {
            durGroup.style.display = 'none';
            noteGroup.style.display = 'block';
            noteLabel.textContent = 'Açıklama (Zorunlu)';
        } else {
            durGroup.style.display = 'none';
            noteGroup.style.display = 'none';
        }
    }

    runStatusUpdate(taskId) {
        try {
            const statusFn = document.getElementById('status-select');
            const durFn = document.getElementById('input-duration');
            const noteFn = document.getElementById('input-note');

            if (!statusFn) return; // Should not happen

            const status = statusFn.value;
            const duration = parseInt(durFn.value || '0');
            const note = (noteFn.value || '').trim();

            const tasks = this.store.getTasks();
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;

            // Validation Logic
            if (status === 'postponed' || status === 'cancelled') {
                if (!note) {
                    alert('Lütfen açıklama (sebep) giriniz.');
                    return;
                }
            }

            if (status === 'completed') {
                if (isNaN(duration) || duration <= 0) {
                    alert('Lütfen geçerli bir süre giriniz.');
                    return;
                }
                if (task.estimatedDuration && duration > task.estimatedDuration) {
                    if (!note) {
                        alert(`Tahmini süreyi (${task.estimatedDuration} dk) aştınız. Lütfen açıklama giriniz.`);
                        return;
                    }
                }
                task.completedAt = new Date().toISOString();
                task.workDuration = duration;
            } else {
                task.completedAt = null;
                task.workDuration = null;
            }

            // Save Status
            task.status = status;

            // Save Note if exists
            if (note) {
                if (!task.notes) task.notes = [];
                task.notes.push({
                    userId: this.store.currentUser.id,
                    text: `[DURUM: ${status.toUpperCase()}] ${note}`,
                    time: new Date().toISOString()
                });
            }

            this.store.saveTasks(tasks);
            document.getElementById('modal-container').innerHTML = '';
            this.navigate('tasks');

        } catch (err) {
            console.error(err);
            alert('Bir hata oluştu: ' + err.message);
        }
    }

    openTaskDetails(taskId) {
        const tasks = this.store.getTasks();
        const task = tasks.find(t => t.id === taskId);
        const users = this.store.getUsers();
        if (!task) return;

        const creator = users.find(u => u.id === task.creatorId)?.name || 'Bilinmiyor';
        const assignee = users.find(u => u.id === task.assigneeId)?.name || 'Bilinmiyor';

        const canEdit = ['admin', 'manager'].includes(this.store.currentUser.role);

        // Render Notes
        const notesHtml = (task.notes || []).map(n => {
            const user = users.find(u => u.id === n.userId);
            const isMe = user.id === this.store.currentUser.id;
            return `
                <div class="chat-bubble ${isMe ? 'me' : 'other'}">
                    <div class="meta">
                        <span class="user">${user.name}</span>
                        <span class="time">${new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p>${n.text}</p>
                </div>
            `;
        }).join('');

        const content = `
            <div class="task-details">
                <div class="detail-row">
                    <span class="label">Oluşturan:</span> <span class="val">${creator}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Atanan:</span> <span class="val">${assignee}</span>
                </div>
                
                <div class="detail-row">
                    <span class="label">Tahmini Süre:</span> 
                    ${canEdit ? `
                        <div style="display:flex; gap:0.5rem; align-items:center;">
                            <input type="number" id="edit-duration-${task.id}" value="${task.estimatedDuration}" style="width:60px; padding:0.25rem; border-radius:4px; border:1px solid var(--glass-border); background:rgba(255,255,255,0.1); color:white;">
                            <span style="font-size:0.8rem;">dk</span>
                            <button onclick="App.updateTaskDuration('${task.id}')" class="btn-icon" style="width:24px; height:24px; font-size:0.8rem;" title="Kaydet"><i class="ph ph-floppy-disk"></i></button>
                        </div>
                    ` : `<span class="val">${task.estimatedDuration || '-'} dk</span>`}
                </div>

                <div class="detail-row">
                    <span class="label">Açıklama:</span>
                    <p class="desc">${task.description || 'Yok'}</p>
                </div>
                
                <hr style="border-color:var(--glass-border); margin: 1.5rem 0;">
                
                <h4>Notlar / İşlemler</h4>
                <div class="chat-container">
                    ${notesHtml.length ? notesHtml : '<p style="color:var(--text-muted); font-size:0.9rem;">Henüz not yok.</p>'}
                </div>
                
                <form onsubmit="App.addNote(event, '${taskId}')" style="margin-top:1rem; display:flex; gap:0.5rem;">
                    <input type="text" name="note" required placeholder="Bir not yazın..." style="flex:1; padding:0.5rem; border-radius:8px; border:1px solid var(--glass-border); background:rgba(255,255,255,0.05); color:white;">
                    <button type="submit" class="btn btn-primary" style="padding:0.5rem 1rem;"><i class="ph ph-paper-plane-right"></i></button>
                </form>
            </div>
        `;

        this.view.renderModal(task.title, content);
    }

    addNote(e, taskId) {
        e.preventDefault();
        const input = e.target.note;
        const text = input.value;
        if (!text) return;

        const tasks = this.store.getTasks();
        const task = tasks.find(t => t.id === taskId);

        if (task) {
            if (!task.notes) task.notes = [];
            task.notes.push({
                userId: this.store.currentUser.id,
                text: text,
                time: new Date().toISOString()
            });
            this.store.saveTasks(tasks);

            // Re-render modal to show new note
            this.openTaskDetails(taskId);
        }
    }

    openCreateTaskModal() {
        const currentUser = this.store.currentUser;
        const canAssign = ['admin', 'manager'].includes(currentUser.role);
        const users = this.store.getUsers();

        let userOptions = '';
        if (canAssign) {
            userOptions = users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
        } else {
            userOptions = `<option value="${currentUser.id}">${currentUser.name} (Kendim)</option>`;
        }

        const content = `
            <form onsubmit="App.handleCreateTask(event)">
            <div class="form-group">
                <label>Görev Başlığı</label>
                <input type="text" name="title" required placeholder="Görev nedir?">
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                    <label>Adet (Toplu Oluştur)</label>
                    <input type="number" name="quantity" value="1" min="1" max="10" required>
                </div>
                <div class="form-group">
                    <label>Tahmini Süre (Dakika)</label>
                    <input type="number" name="estimatedDuration" step="1" placeholder="Örn: 45">
                </div>
            </div>

            <div class="form-group">
                <label>Açıklama</label>
                <input type="text" name="description" placeholder="Detaylar...">
            </div>
            <div class="form-group">
                <label>Kime Atanacak?</label>
                <select name="assigneeId" style="width: 100%; padding: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); color: white; border-radius: 8px;">
                    ${userOptions}
                </select>
            </div>
            
            ${canAssign ? `
            <div class="form-group" style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="checkbox" name="isRecurring" id="isRecurring" style="width: auto;">
                <label for="isRecurring" style="margin:0; cursor:pointer;">Her Gün Tekrarla</label>
            </div>
            ` : ''}
            
            <div class="form-group">
                <label>Bitiş Tarihi</label>
                <input type="date" name="dueDate" required value="${new Date().toISOString().split('T')[0]}">
            </div>
            <button type="submit" class="btn btn-primary btn-block">Oluştur</button>
        </form>
            `;

        this.view.renderModal('Yeni Görev Oluştur', content);
    }

    handleCreateTask(e) {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd.entries());

        const quantity = parseInt(data.quantity) || 1;
        const tasks = this.store.getTasks();

        for (let i = 0; i < quantity; i++) {
            const titleSuffix = quantity > 1 ? ` #${i + 1} ` : '';
            const newTask = {
                id: Utils.generateId(),
                title: data.title + titleSuffix,
                description: data.description,
                assigneeId: data.assigneeId,
                dueDate: data.dueDate,
                isRecurring: !!data.isRecurring,
                estimatedDuration: data.estimatedDuration,
                status: 'pending',
                creatorId: this.store.currentUser.id,
                createdAt: new Date().toISOString(),
                assignedAt: new Date().toISOString(), // Track assignment time
                parentTaskId: null,
                notes: []
            };
            tasks.push(newTask);
        }

        this.store.saveTasks(tasks);

        // Notify Assignee
        if (data.assigneeId !== this.store.currentUser.id) {
            const notifs = this.store.getNotifications();
            notifs.push({
                id: Utils.generateId(),
                userId: data.assigneeId,
                title: 'Yeni Görev',
                message: `${this.store.currentUser.name} size yeni bir görev atadı: ${data.title} `,
                read: false,
                createdAt: new Date().toISOString()
            });
            this.store.saveNotifications(notifs);
        }

        document.getElementById('modal-container').innerHTML = '';
        this.navigate('tasks');
    }

    updateTaskDuration(taskId) {
        const input = document.getElementById(`edit-duration-${taskId}`);
        const val = parseInt(input.value);
        if (val > 0) {
            const tasks = this.store.getTasks();
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                task.estimatedDuration = val;
                this.store.saveTasks(tasks);
                alert('Süre güncellendi.');
            }
        }
    }

    filterReports(params = {}) {
        let start = params.start;
        let end = params.end;

        if (!start && document.getElementById('report-start')) {
            start = document.getElementById('report-start').value;
            end = document.getElementById('report-end').value;
        }

        this.view.updateView('reports', { start, end, tab: params.tab || 'custom' });
    }

    // User Mgmt
    handleDeleteUser(userId) {
        if (!confirm('Bu personeli silmek istediğinize emin misiniz?')) return;

        const users = this.store.getUsers().filter(u => u.id !== userId);
        this.store.saveUsers(users);
        this.navigate('team');
    }

    openChangePasswordModal(userId, isAdminOverride = false) {
        const content = `
            <form onsubmit="App.handleSavePassword(event, '${userId}')">
                <div class="form-group">
                    <label>Yeni Şifre</label>
                    <input type="text" name="password" required minlength="3">
                </div>
                <button type="submit" class="btn btn-primary btn-block">Şifreyi Güncelle</button>
            </form>
            `;
        this.view.renderModal(isAdminOverride ? 'Şifre Sıfırla' : 'Şifre Değiştir', content);
    }

    handleSavePassword(e, userId) {
        e.preventDefault();
        const pwd = e.target.password.value;

        const users = this.store.getUsers();
        const user = users.find(u => u.id === userId);
        if (user) {
            user.password = pwd;
            this.store.saveUsers(users);

            // If self, update current user session
            if (this.store.currentUser.id === userId) {
                localStorage.setItem('nex_currentUser', JSON.stringify(user));
                this.store.currentUser = user;
            }

            alert('Şifre başarıyla güncellendi.');
            document.getElementById('modal-container').innerHTML = '';
        }
    }



    openAddUserModal() {
        const content = `
            <form onsubmit="App.handleAddUser(event)">
            <div class="form-group">
                <label>Ad Soyad</label>
                <input type="text" name="name" required placeholder="Ad Soyad">
            </div>
            <div class="form-group">
                <label>Kullanıcı Adı</label>
                <input type="text" name="username" required placeholder="Giriş için kullanılacak">
            </div>
            <div class="form-group">
                <label>Şifre</label>
                <input type="text" name="password" required value="123">
            </div>
            <div class="form-group">
                <label>Rol</label>
                <select name="role" style="width: 100%; padding: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); color: white; border-radius: 8px;">
                    <option value="employee">Personel</option>
                    <option value="manager">Müdür (Alt Yönetici)</option>
                    <option value="admin">Yönetici</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Personel Ekle</button>
        </form>
            `;
        this.view.renderModal('Yeni Personel Ekle', content);
    }

    toggleNotifications() {
        const dropdown = document.getElementById('notif-dropdown');
        const badge = document.getElementById('notif-badge');
        const isHidden = dropdown.style.display === 'none';

        if (isHidden) {
            // Show
            const notifs = this.store.getNotifications().filter(n => n.userId === this.store.currentUser.id);
            const unread = notifs.filter(n => !n.read);

            // Generate HTML
            if (notifs.length === 0) {
                dropdown.innerHTML = '<div style="padding:1rem; color:var(--text-muted); text-align:center;">Bildirim yok.</div>';
            } else {
                dropdown.innerHTML = notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(n => `
                    <div class="notif-item ${n.read ? 'read' : ''}">
                        <div class="title">${n.title}</div>
                        <div class="msg">${n.message}</div>
                        <div class="time">${new Date(n.createdAt).toLocaleTimeString()}</div>
                    </div>
            `).join('');

                // Mark displayed as read
                if (unread.length > 0) {
                    const allNotifs = this.store.getNotifications();
                    allNotifs.forEach(n => {
                        if (n.userId === this.store.currentUser.id && !n.read) n.read = true;
                    });
                    this.store.saveNotifications(allNotifs);
                    badge.style.display = 'none';
                }
            }
            dropdown.style.display = 'block';
        } else {
            dropdown.style.display = 'none';
        }
    }

    handleAddUser(e) {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd.entries());

        const newUser = {
            id: Utils.generateId(),
            ...data
        };

        const users = this.store.getUsers();
        if (users.find(u => u.username === data.username)) {
            alert('Bu kullanıcı adı zaten kullanılıyor.');
            return;
        }

        users.push(newUser);
        this.store.saveUsers(users);

        document.getElementById('modal-container').innerHTML = '';
        this.navigate('team');
    }
}

// Initialize
// Initialize
window.onerror = function (msg, url, line, col, error) {
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed; top:0; left:0; right:0; background:red; color:white; padding:20px; z-index:9999; font-family:sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
    div.innerHTML = '<strong>Hata Oluştu:</strong> ' + msg + '<br><small>' + url + ':' + line + '</small><br><button onclick="this.parentElement.remove()" style="margin-top:10px; padding:5px 10px; color:black;">Kapat</button>';
    document.body.appendChild(div);
    return false;
};

window.App = new Application();
window.App.init().catch(err => {
    console.error("Critical Init Error:", err);
    alert("Sistem başlatılırken kritik bir hata oluştu: " + err.message);
});
