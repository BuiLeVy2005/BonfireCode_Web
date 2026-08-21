document.addEventListener('DOMContentLoaded', () => {
    // ==== NOTIFICATION LOGIC ====
    const btnNotification = document.getElementById('btn-notification');
    const notifDropdown = document.getElementById('notification-dropdown');
    const badge = document.getElementById('notification-badge');
    const notifList = document.getElementById('notification-list');
    const btnReadAll = document.getElementById('btn-read-all-notifs');

    const API_BASE_URL = 'https://bonfirecode-api.onrender.com/api'; // Or your local if testing
    const token = localStorage.getItem('bonfire_token');

    // === Inject Modal HTML ===
    const modalHtml = `
    <div id="notifications-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity">
        <div class="bg-[#0d1117] border border-[#30363d] rounded-xl shadow-2xl w-[90%] max-w-3xl flex flex-col max-h-[85vh] transform transition-transform scale-95 opacity-0" id="notif-modal-content">
            <!-- Header -->
            <div class="flex justify-between items-center p-6 border-b border-[#30363d] bg-[#161b22] rounded-t-xl">
                <h2 class="text-2xl font-bold fire-text flex items-center gap-2"><i class="fa-solid fa-bell"></i> Tất Cả Thông Báo</h2>
                <div class="flex items-center gap-4">
                    <button id="btn-read-all-modal" class="text-sm font-medium text-gray-300 hover:text-white px-3 py-1.5 rounded-md bg-[#21262d] border border-[#30363d] hover:bg-[#30363d] transition">
                        <i class="fa-solid fa-check-double mr-1"></i> Đánh dấu đã đọc
                    </button>
                    <button onclick="closeNotificationsModal()" class="text-gray-400 hover:text-white transition rounded-full p-1 hover:bg-[#30363d]">
                        <i class="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>
            </div>
            
            <!-- Body List -->
            <div id="modal-notif-list" class="flex-1 overflow-y-auto p-2">
                <div class="flex items-center justify-center h-40 text-gray-500">
                    <i class="fa-solid fa-spinner fa-spin mr-2"></i> Đang tải thông báo...
                </div>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const notifModal = document.getElementById('notifications-modal');
    const notifModalContent = document.getElementById('notif-modal-content');
    const modalNotifList = document.getElementById('modal-notif-list');
    const btnReadAllModal = document.getElementById('btn-read-all-modal');

    // Toggle Dropdown
    if (btnNotification) {
        btnNotification.addEventListener('click', (e) => {
            e.stopPropagation();
            notifDropdown.classList.toggle('hidden');
            if (!notifDropdown.classList.contains('hidden')) {
                fetchNotifications();
            }
        });
    }

    // Đóng dropdown khi click ra ngoài
    document.addEventListener('click', (e) => {
        if (notifDropdown && !notifDropdown.contains(e.target) && !btnNotification.contains(e.target)) {
            notifDropdown.classList.add('hidden');
        }
    });

    // Mark all as read (dropdown)
    if (btnReadAll) {
        btnReadAll.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!token) return;
            try {
                const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    badge.classList.add('hidden');
                    fetchNotifications();
                }
            } catch (err) {
                console.error("Error marking all as read", err);
            }
        });
    }

    // Mark all as read (modal)
    if (btnReadAllModal) {
        btnReadAllModal.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!token) return;
            try {
                const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    badge.classList.add('hidden');
                    fetchNotifications();
                    fetchModalNotifications(); // reload modal
                }
            } catch (err) {
                console.error("Error marking all as read", err);
            }
        });
    }

    async function fetchNotifications() {
        if (!token || !notifList) return;
        try {
            const res = await fetch(`${API_BASE_URL}/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const notifications = await res.json();
                renderNotifications(notifications);
            } else {
                notifList.innerHTML = `<div class="p-4 text-center text-gray-500 text-xs">Chưa có thông báo nào</div>`;
            }
        } catch (err) {
            console.error("Error fetching notifications", err);
            notifList.innerHTML = `<div class="p-4 text-center text-red-400 text-xs">Lỗi tải thông báo</div>`;
        }
    }

    async function fetchModalNotifications() {
        if (!token || !modalNotifList) return;
        modalNotifList.innerHTML = `<div class="flex items-center justify-center h-40 text-gray-500"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Đang tải thông báo...</div>`;
        try {
            const res = await fetch(`${API_BASE_URL}/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const notifications = await res.json();
                renderModalNotifications(notifications);
            } else {
                modalNotifList.innerHTML = `<div class="flex items-center justify-center h-40 text-gray-500">Chưa có thông báo nào</div>`;
            }
        } catch (err) {
            console.error("Error fetching notifications", err);
            modalNotifList.innerHTML = `<div class="flex items-center justify-center h-40 text-red-400">Lỗi kết nối máy chủ</div>`;
        }
    }

    function renderNotifications(notifs) {
        if (!notifs || notifs.length === 0) {
            badge.classList.add('hidden');
            notifList.innerHTML = `<div class="p-8 text-center text-gray-500 text-xs">Chưa có thông báo nào</div>`;
            return;
        }

        const unreadCount = notifs.filter(n => !n.isRead).length;
        if (unreadCount > 0) {
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }

        // Limit to 5 in dropdown
        const shortList = notifs.slice(0, 5);
        notifList.innerHTML = shortList.map(n => `
            <a href="${n.actionUrl || '#'}" onclick="markAsRead('${n.id}', event, this)" class="block px-4 py-3 border-b border-[#30363d] hover:bg-[#21262d] transition ${n.isRead ? 'opacity-60' : 'bg-[#1c2128]'}">
                <div class="flex justify-between items-start mb-1">
                    <h4 class="font-semibold text-sm ${n.isRead ? 'text-gray-400' : 'text-blue-400'}">${n.title}</h4>
                    <span class="text-[10px] text-gray-500">${timeAgo(new Date(n.createdAt))}</span>
                </div>
                <p class="text-xs text-gray-400 line-clamp-2">${n.content}</p>
            </a>
        `).join('');
    }

    function getIconForType(title) {
        if (!title) return 'fa-bell';
        const t = title.toLowerCase();
        if (t.includes('bình luận')) return 'fa-comment';
        if (t.includes('đánh giá') || t.includes('sao')) return 'fa-star';
        if (t.includes('tàn lửa') || t.includes('điểm')) return 'fa-fire';
        if (t.includes('thăng cấp') || t.includes('huy hiệu')) return 'fa-medal';
        if (t.includes('tải xuống')) return 'fa-download';
        return 'fa-bell';
    }

    function renderModalNotifications(notifs) {
        if (!notifs || notifs.length === 0) {
            modalNotifList.innerHTML = `
                <div class="flex flex-col items-center justify-center h-64 text-gray-500">
                    <i class="fa-regular fa-bell-slash text-4xl mb-4 opacity-50"></i>
                    <p>Bạn chưa có thông báo nào</p>
                </div>`;
            return;
        }

        modalNotifList.innerHTML = notifs.map(n => `
            <a href="${n.actionUrl || '#'}" onclick="markAsRead('${n.id}', event, this)" class="flex flex-col sm:flex-row gap-4 p-4 mx-2 my-2 border border-[#30363d] rounded-lg hover:bg-[#161b22] transition duration-200 ${n.isRead ? 'opacity-60 bg-[#0d1117]' : 'bg-[#1c2128]'}">
                <div class="flex-shrink-0 mt-1">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center ${n.isRead ? 'bg-gray-800 text-gray-500' : 'bg-purple-900/50 text-purple-400 border border-purple-700/50'}">
                        <i class="fa-solid ${getIconForType(n.title)}"></i>
                    </div>
                </div>
                <div class="flex-1">
                    <div class="flex justify-between items-start mb-1">
                        <h3 class="text-base font-semibold ${n.isRead ? 'text-gray-400' : 'text-gray-100'}">${n.title}</h3>
                        <span class="text-xs text-gray-500 whitespace-nowrap ml-4">${timeAgo(new Date(n.createdAt))}</span>
                    </div>
                    <p class="text-sm ${n.isRead ? 'text-gray-500' : 'text-gray-300'}">${n.content}</p>
                </div>
            </a>
        `).join('');
    }

    // Exposed to global
    window.markAsRead = async function(id, event, element) {
        if (!token) return;
        try {
            await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (err) {}
    }

    window.openNotificationsModal = function(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        // Hide dropdown
        if (notifDropdown) notifDropdown.classList.add('hidden');
        
        // Show modal
        notifModal.classList.remove('hidden');
        // trigger animation
        setTimeout(() => {
            notifModalContent.classList.remove('scale-95', 'opacity-0');
            notifModalContent.classList.add('scale-100', 'opacity-100');
        }, 10);
        
        fetchModalNotifications();
        document.body.style.overflow = 'hidden'; // prevent background scrolling
    }

    window.closeNotificationsModal = function() {
        notifModalContent.classList.remove('scale-100', 'opacity-100');
        notifModalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            notifModal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }, 200);
    }

    // Close modal when clicking outside
    notifModal.addEventListener('click', (e) => {
        if (e.target === notifModal) {
            closeNotificationsModal();
        }
    });

    // Helper timeAgo
    function timeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " năm trước";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " tháng trước";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " ngày trước";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " giờ trước";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " phút trước";
        return "Vừa xong";
    }

    // Initial fetch to check badge
    if (token && btnNotification) {
        fetchNotifications();
    }
});