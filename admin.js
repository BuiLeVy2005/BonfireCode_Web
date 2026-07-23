const API_BASE_URL = 'https://bonfirecode-api.onrender.com/api';
function getFullImageUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return 'https://bonfirecode-api.onrender.com' + url;
}


const showToast = (msg, type = 'success') => {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-red-600' : (type === 'warning' ? 'bg-orange-500' : 'bg-green-600');
    toast.className = `${bgColor} text-white px-4 py-3 rounded shadow-lg flex items-center space-x-3 transform transition-all translate-y-10 opacity-0`;
    toast.innerHTML = `
        <i class="fa-solid ${type === 'error' ? 'fa-circle-xmark' : (type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-check')}"></i>
        <span>${msg}</span>
    `;
    container.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    }, 10);
    
    // Animate out
    setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Auth Guard
    const token = localStorage.getItem('bonfire_token');
    if (!token) {
        window.location.href = 'auth.html';
        return;
    }

    try {
        const payload = JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))));
        const role = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.role;
        
        if (role !== 'Admin') {
            window.location.href = 'index.html';
            return;
        }
    } catch (err) {
        console.error('Lỗi giải mã token', err);
        window.location.href = 'index.html';
        return;
    }

    // 2. Fetch Stats
    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/Admin/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                document.getElementById('stat-users').textContent = data.totalUsers;
                document.getElementById('stat-projects').textContent = data.totalProjects;
                document.getElementById('stat-comments').textContent = data.totalComments;
                document.getElementById('stat-downloads').textContent = data.totalDownloads;
            }
        } catch (err) {
            console.error('Lỗi lấy thống kê', err);
        }
    };

    // 3. Fetch Users
    let allUsers = [];
    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/Admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                allUsers = await res.json();
                renderUsers(allUsers);
            }
        } catch (err) {
            console.error('Lỗi lấy danh sách user', err);
        }
    };

    const usersTableBody = document.getElementById('users-table-body');
    const renderUsers = (users) => {
        usersTableBody.innerHTML = '';
        if (users.length === 0) {
            usersTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Không có dữ liệu.</td></tr>`;
            return;
        }

        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-[#161b22] transition";
            tr.innerHTML = `
                <td class="px-6 py-4 flex items-center">
                    <img src="https://ui-avatars.com/api/?name=${u.username}&background=random" class="w-8 h-8 rounded-full mr-3 border border-[#30363d]">
                    <span class="font-medium text-white">${u.username}</span>
                    ${u.role === 'Admin' ? '<i class="fa-solid fa-crown text-fire ml-2 text-xs" title="Admin"></i>' : ''}
                </td>
                <td class="px-6 py-4">${u.email}</td>
                <td class="px-6 py-4">
                    <span class="bg-[#161b22] border border-[#30363d] px-2 py-1 rounded text-xs text-fire font-bold">${u.rankName}</span>
                </td>
                <td class="px-6 py-4 text-orange-400 font-bold">${u.totalEmbers} <i class="fa-solid fa-fire text-xs"></i></td>
                <td class="px-6 py-4 text-right space-x-2">
                    <button class="btn-grant px-3 py-1 bg-[#d4af37] hover:bg-[#b5952f] text-black rounded font-medium text-xs transition" data-id="${u.id}" data-username="${u.username}">
                        Bơm Điểm
                    </button>
                    ${u.role !== 'Admin' ? `
                    <button class="btn-delete px-3 py-1 bg-[#da3633] hover:bg-[#b32a28] text-white rounded font-medium text-xs transition" data-id="${u.id}" data-username="${u.username}">
                        Thanh Trừng
                    </button>` : ''}
                </td>
            `;
            usersTableBody.appendChild(tr);
        });

        // Gắn sự kiện cho các nút
        document.querySelectorAll('.btn-grant').forEach(btn => {
            btn.addEventListener('click', (e) => openGrantModal(e.target.dataset.id, e.target.dataset.username));
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => openDeleteModal(e.target.dataset.id, e.target.dataset.username));
        });
    };

    // 4. Tìm kiếm
    const searchInput = document.getElementById('search-user');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const kw = e.target.value.toLowerCase();
            const filtered = allUsers.filter(u => u.username.toLowerCase().includes(kw) || u.email.toLowerCase().includes(kw));
            renderUsers(filtered);
        });
    }

    // 5. Delete User Modal & Logic
    const deleteModal = document.getElementById('delete-modal');
    const deleteModalDesc = document.getElementById('delete-modal-desc');
    const btnCancelDelete = document.getElementById('btn-cancel-delete');
    const btnConfirmDelete = document.getElementById('btn-confirm-delete');
    let currentDeleteUserId = null;
    let currentDeleteUsername = null;

    const openDeleteModal = (id, username) => {
        currentDeleteUserId = id;
        currentDeleteUsername = username;
        if(deleteModalDesc) deleteModalDesc.textContent = `Bạn có chắc chắn muốn xóa vĩnh viễn user [${username}]? Hành động này không thể hoàn tác.`;
        deleteModal.classList.remove('hidden');
    };

    const closeDeleteModal = () => {
        currentDeleteUserId = null;
        currentDeleteUsername = null;
        deleteModal.classList.add('hidden');
    };

    if (btnCancelDelete) btnCancelDelete.addEventListener('click', closeDeleteModal);

    if (btnConfirmDelete) {
        btnConfirmDelete.addEventListener('click', async () => {
            if (!currentDeleteUserId) return;
            try {
                const res = await fetch(`${API_BASE_URL}/Admin/users/${currentDeleteUserId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    showToast(`Đã thanh trừng [${currentDeleteUsername}] thành công!`, 'success');
                    fetchUsers();
                    fetchStats();
                    closeDeleteModal();
                } else {
                    const data = await res.json();
                    showToast(data.message || 'Lỗi khi xóa.', 'error');
                }
            } catch (err) {
                showToast('Lỗi kết nối.', 'error');
            }
        });
    }

    // 6. Grant Embers Modal
    const grantModal = document.getElementById('grant-modal');
    const btnCancelGrant = document.getElementById('btn-cancel-grant');
    const btnConfirmGrant = document.getElementById('btn-confirm-grant');
    const grantPointsInput = document.getElementById('grant-points');
    const grantModalDesc = document.getElementById('grant-modal-desc');
    let currentGrantUserId = null;

    const openGrantModal = (id, username) => {
        currentGrantUserId = id;
        grantModalDesc.textContent = `Ban phước Embers cho user: ${username}`;
        grantPointsInput.value = 100;
        grantModal.classList.remove('hidden');
    };

    const closeGrantModal = () => {
        currentGrantUserId = null;
        grantModal.classList.add('hidden');
    };

    if (btnCancelGrant) btnCancelGrant.addEventListener('click', closeGrantModal);
    
    if (btnConfirmGrant) {
        btnConfirmGrant.addEventListener('click', async () => {
            if (!currentGrantUserId) return;
            const points = parseInt(grantPointsInput.value);
            if (isNaN(points)) {
                showToast('Vui lòng nhập số hợp lệ.', 'error');
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/Admin/users/${currentGrantUserId}/grant-embers`, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ points: points })
                });

                if (res.ok) {
                    closeGrantModal();
                    showToast(`Đã ban phước ${points} điểm thành công!`, 'success');
                    fetchUsers();
                } else {
                    const data = await res.json();
                    showToast(data.message || 'Lỗi cấp điểm.', 'error');
                }
            } catch (err) {
                showToast('Lỗi kết nối.', 'error');
            }
        });
    }

    // 7. Chart.js Initialization
    const initChart = () => {
        const ctx = document.getElementById('activityChart');
        if (!ctx) return;
        
        // Mock data for 7 days
        const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
        const usersData = [2, 3, 3, 5, 5, 5, 5];
        const projectsData = [1, 2, 4, 6, 8, 9, 10];
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Lượng Users',
                        data: usersData,
                        borderColor: '#ff4500', // Cam lửa
                        backgroundColor: 'rgba(255, 69, 0, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Lượng Dự Án',
                        data: projectsData,
                        borderColor: '#9333ea', // Tím
                        backgroundColor: 'rgba(147, 51, 234, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#c9d1d9' } }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#8b949e' }
                    },
                    y: {
                        grid: { color: '#30363d', borderDash: [5, 5] },
                        ticks: { color: '#8b949e', stepSize: 2 }
                    }
                }
            }
        });
    };

    // 8. Tab Switching Logic
    const tabUsers = document.getElementById('tab-users');
    const tabProjects = document.getElementById('tab-projects');
    const tabLinks = document.querySelectorAll('.sidebar-tab-link');

    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const tabName = e.currentTarget.getAttribute('data-tab');
            if (!tabName) return;
            e.preventDefault();
            
            // Cập nhật giao diện nút Tab
            tabLinks.forEach(t => {
                if(t.hasAttribute('data-tab')){
                    t.className = "sidebar-tab-link flex items-center space-x-3 px-4 py-3 text-gray-400 hover:bg-[#161b22] hover:text-white rounded-lg transition";
                }
            });
            e.currentTarget.className = "sidebar-tab-link flex items-center space-x-3 px-4 py-3 bg-[#161b22] text-white rounded-lg border border-[#30363d] shadow-sm transition";
            
            // Switch content
            if (tabName === 'users') {
                tabUsers.classList.remove('hidden');
                tabProjects.classList.add('hidden');
            } else if (tabName === 'projects') {
                tabUsers.classList.add('hidden');
                tabProjects.classList.remove('hidden');
                fetchProjects();
            }
        });
    });

    // 9. Fetch and Render Projects
    let allProjects = [];
    const fetchProjects = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/Projects`);
            if (res.ok) {
                allProjects = await res.json();
                renderProjects(allProjects);
            }
        } catch (err) {
            console.error('Lỗi lấy danh sách dự án', err);
        }
    };

    const projectsGrid = document.getElementById('projects-grid');
    const renderProjects = (projects) => {
        if (!projectsGrid) return;
        projectsGrid.innerHTML = '';
        
        if (projects.length === 0) {
            projectsGrid.innerHTML = `<div class="col-span-full text-center text-gray-500 py-10">Không có dự án nào.</div>`;
            return;
        }

        projects.forEach(p => {
            const imgUrl = p.thumbnailUrl 
                            ? (p.thumbnailUrl.startsWith('http') ? p.thumbnailUrl : `${getFullImageUrl(p.thumbnailUrl)}`) 
                            : 'https://placehold.co/600x400/222/ea580c?text=No+Image';
                            
            const authorAvatar = p.authorAvatarUrl ? `${getFullImageUrl(p.authorAvatarUrl)}` : `https://ui-avatars.com/api/?name=${p.authorName}&background=random`;

            const card = document.createElement('div');
            card.className = "card rounded-lg overflow-hidden shadow flex flex-col group transition-transform hover:-translate-y-1";
            card.innerHTML = `
                <!-- Thumbnail -->
                <div class="relative h-28 overflow-hidden">
                    <img src="${imgUrl}" alt="Project cover" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">
                    <div class="absolute inset-0 bg-gradient-to-t from-[#161b22] to-transparent opacity-80"></div>
                </div>
                <!-- Content -->
                <div class="p-3 flex-1 flex flex-col">
                    <h4 class="text-sm font-bold text-white mb-2 line-clamp-1" title="${p.title}">${p.title}</h4>
                    <div class="flex items-center space-x-2 mt-auto">
                        <img src="${authorAvatar}" class="w-6 h-6 rounded-full border border-[#30363d]">
                        <span class="text-xs font-medium text-gray-400 line-clamp-1">${p.authorName}</span>
                    </div>
                </div>
                <!-- Footer Actions -->
                <div class="flex border-t border-[#30363d]">
                    <a href="detail.html?id=${p.id}" target="_blank" class="flex-1 py-2 text-center text-xs font-bold text-green-500 hover:bg-green-500/10 transition">
                        <i class="fa-solid fa-code mr-1"></i>Xem Code
                    </a>
                    <div class="w-px bg-[#30363d]"></div>
                    <button class="btn-delete-project flex-1 py-2 text-center text-xs font-bold text-red-500 hover:bg-red-500/10 transition" data-id="${p.id}" data-title="${p.title}">
                        <i class="fa-solid fa-skull mr-1"></i>Hủy Diệt
                    </button>
                </div>
            `;
            projectsGrid.appendChild(card);
        });

        // Gắn sự kiện Delete Project
        document.querySelectorAll('.btn-delete-project').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const title = e.currentTarget.getAttribute('data-title');
                openDeleteProjectModal(id, title);
            });
        });
    };

    // 10. Delete Project Modal & Logic
    const deleteProjectModal = document.getElementById('delete-project-modal');
    const deleteProjectModalDesc = document.getElementById('delete-project-modal-desc');
    const btnCancelDeleteProject = document.getElementById('btn-cancel-delete-project');
    const btnConfirmDeleteProject = document.getElementById('btn-confirm-delete-project');
    let currentDeleteProjectId = null;
    let currentDeleteProjectTitle = null;

    const openDeleteProjectModal = (id, title) => {
        currentDeleteProjectId = id;
        currentDeleteProjectTitle = title;
        if(deleteProjectModalDesc) deleteProjectModalDesc.textContent = `Bạn có chắc chắn muốn hủy diệt dự án [${title}]? Code và hình ảnh sẽ biến mất vĩnh viễn.`;
        deleteProjectModal.classList.remove('hidden');
    };

    const closeDeleteProjectModal = () => {
        currentDeleteProjectId = null;
        currentDeleteProjectTitle = null;
        deleteProjectModal.classList.add('hidden');
    };

    if (btnCancelDeleteProject) btnCancelDeleteProject.addEventListener('click', closeDeleteProjectModal);

    if (btnConfirmDeleteProject) {
        btnConfirmDeleteProject.addEventListener('click', async () => {
            if (!currentDeleteProjectId) return;
            try {
                const res = await fetch(`${API_BASE_URL}/Admin/projects/${currentDeleteProjectId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    showToast(`Đã hủy diệt dự án [${currentDeleteProjectTitle}] thành công!`, 'success');
                    fetchProjects();
                    fetchStats();
                    closeDeleteProjectModal();
                } else {
                    const data = await res.json();
                    showToast(data.message || 'Lỗi khi xóa dự án.', 'error');
                }
            } catch (err) {
                showToast('Lỗi kết nối.', 'error');
            }
        });
    }

    // 11. Search Projects
    const searchProjectInput = document.getElementById('search-project');
    if (searchProjectInput) {
        searchProjectInput.addEventListener('input', (e) => {
            const kw = e.target.value.toLowerCase();
            const filtered = allProjects.filter(p => p.title.toLowerCase().includes(kw) || p.authorName.toLowerCase().includes(kw));
            renderProjects(filtered);
        });
    }

    // Init Data
    initChart();
    fetchStats();
    fetchUsers();
});
