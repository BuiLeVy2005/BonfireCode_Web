document.addEventListener('DOMContentLoaded', () => {
    // ==== NOTIFICATION LOGIC ====
    const btnNotification = document.getElementById('btn-notification');
    const notifDropdown = document.getElementById('notification-dropdown');
    const badge = document.getElementById('notification-badge');
    const notifList = document.getElementById('notification-list');
    const btnReadAll = document.getElementById('btn-read-all-notifs');

    const API_BASE_URL = 'https://bonfirecode-api.onrender.com/api'; // Or your local if testing
    const token = localStorage.getItem('bonfire_token');

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

    // Mark all as read
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
                notifList.innerHTML = `<div class="p-4 text-center text-gray-500 text-xs">Chưa có thông báo nào (hoặc phiên đăng nhập hết hạn)</div>`;
            }
        } catch (err) {
            console.error("Error fetching notifications", err);
            notifList.innerHTML = `<div class="p-4 text-center text-red-400 text-xs">Lỗi tải thông báo</div>`;
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

        notifList.innerHTML = notifs.map(n => `
            <a href="${n.actionUrl || '#'}" onclick="markAsRead('${n.id}', event, this)" class="block px-4 py-3 border-b border-[#30363d] hover:bg-[#21262d] transition ${n.isRead ? 'opacity-60' : 'bg-[#1c2128]'}">
                <div class="flex justify-between items-start mb-1">
                    <h4 class="font-semibold text-sm ${n.isRead ? 'text-gray-400' : 'text-blue-400'}">${n.title}</h4>
                    <span class="text-[10px] text-gray-500">${timeAgo(new Date(n.createdAt))}</span>
                </div>
                <p class="text-xs text-gray-400 line-clamp-2">${n.content}</p>
            </a>
        `).join('');
    }

    // Exposed to global for inline onclick
    window.markAsRead = async function(id, event, element) {
        // Prevent default only if we just want to mark read and not navigate (but here we want to navigate)
        // event.preventDefault(); 
        if (!token) return;
        try {
            await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // It will navigate naturally because it's an <a> tag
        } catch (err) {
            console.error(err);
        }
    }

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
