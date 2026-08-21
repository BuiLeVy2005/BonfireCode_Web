const API_BASE_URL = 'https://bonfirecode-api.onrender.com/api';

function getFullImageUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return \https://bonfirecode-api.onrender.com\\;
}

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

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('bonfire_token');
    if (!token) {
        window.location.href = 'auth.html';
        return;
    }

    // Header Auth Logic
    const authButtons = document.getElementById('auth-buttons');
    const userButtons = document.getElementById('user-buttons');
    const btnAvatarDropdown = document.getElementById('btn-avatar-dropdown');
    const userDropdownMenu = document.getElementById('user-dropdown-menu');
    const navAvatar = document.querySelector('#btn-avatar-dropdown img');
    const dropdownUsername = document.getElementById('dropdown-username');
    const btnLogout = document.getElementById('btn-logout');

    if (token) {
        if(authButtons) authButtons.classList.add('hidden');
        if(userButtons) userButtons.classList.remove('hidden');
        
        if (btnAvatarDropdown && userDropdownMenu) {
            btnAvatarDropdown.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdownMenu.classList.toggle('hidden');
            });
            document.addEventListener('click', (e) => {
                if (!btnAvatarDropdown.contains(e.target) && !userDropdownMenu.contains(e.target)) {
                    userDropdownMenu.classList.add('hidden');
                }
            });
        }
        
        try {
            const payload = JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))));
            const username = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || payload.unique_name || payload.sub || 'Kẻ Khống Lửa';
            if(dropdownUsername) dropdownUsername.textContent = username;
        } catch(e) {}
        
        try {
            const res = await fetch(\\/Auth/me\, {
                headers: { 'Authorization': \Bearer \\ }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.avatarUrl && navAvatar) {
                    navAvatar.src = data.avatarUrl.startsWith('http') ? data.avatarUrl : getFullImageUrl(data.avatarUrl);
                }
            }
        } catch (e) {}

        if(btnLogout) {
            btnLogout.addEventListener('click', () => {
                localStorage.removeItem('bonfire_token');
                window.location.href = 'index.html';
            });
        }
    }

    // Load Notifications
    const listContainer = document.getElementById('full-notification-list');
    const btnReadAll = document.getElementById('btn-read-all-page');

    async function loadNotifications() {
        try {
            const res = await fetch(\\/notifications\, {
                headers: { 'Authorization': \Bearer \\ }
            });
            if (res.ok) {
                const notifs = await res.json();
                render(notifs);
            } else {
                listContainer.innerHTML = \<div class="flex items-center justify-center h-40 text-gray-500">Lỗi khi tải thông báo (Mã lỗi: \)</div>\;
            }
        } catch (err) {
            listContainer.innerHTML = \<div class="flex items-center justify-center h-40 text-red-400">Lỗi kết nối máy chủ</div>\;
        }
    }

    function render(notifs) {
        if (!notifs || notifs.length === 0) {
            listContainer.innerHTML = \
                <div class="flex flex-col items-center justify-center h-64 text-gray-500">
                    <i class="fa-regular fa-bell-slash text-4xl mb-4 opacity-50"></i>
                    <p>Bạn chưa có thông báo nào</p>
                </div>\;
            return;
        }

        listContainer.innerHTML = notifs.map(n => \
            <a href="\" onclick="markAsReadPage('\', event, this)" class="flex flex-col sm:flex-row gap-4 p-5 border-b border-[#30363d] hover:bg-[#161b22] transition duration-200 \">
                <div class="flex-shrink-0 mt-1">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center \">
                        <i class="fa-solid \"></i>
                    </div>
                </div>
                <div class="flex-1">
                    <div class="flex justify-between items-start mb-1">
                        <h3 class="text-base font-semibold \">\</h3>
                        <span class="text-xs text-gray-500 whitespace-nowrap ml-4">\</span>
                    </div>
                    <p class="text-sm \">\</p>
                </div>
            </a>
        \).join('');
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

    window.markAsReadPage = async function(id, event, element) {
        try {
            await fetch(\\/notifications/\/read\, {
                method: 'PUT',
                headers: { 'Authorization': \Bearer \\ }
            });
        } catch (err) { }
    };

    if (btnReadAll) {
        btnReadAll.addEventListener('click', async () => {
            try {
                const res = await fetch(\\/notifications/read-all\, {
                    method: 'PUT',
                    headers: { 'Authorization': \Bearer \\ }
                });
                if (res.ok) {
                    loadNotifications();
                }
            } catch (err) { }
        });
    }

    loadNotifications();
});