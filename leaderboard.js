const API_BASE_URL = 'https://bonfirecode-api.onrender.com/api';

function getFullImageUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `https://bonfirecode-api.onrender.com` + url;
}

document.addEventListener('DOMContentLoaded', async () => {
    // Basic Auth Check for UI
    const authButtons = document.getElementById('auth-buttons');
    const userButtons = document.getElementById('user-buttons');
    const btnAvatarDropdown = document.getElementById('btn-avatar-dropdown');
    const userDropdownMenu = document.getElementById('user-dropdown-menu');
    const navAvatar = document.getElementById('nav-avatar');
    const dropdownUsername = document.getElementById('dropdown-username');
    const btnLogout = document.getElementById('btn-logout');

    const token = localStorage.getItem('token');
    const currentUser = localStorage.getItem('username');

    if (token && currentUser) {
        if(authButtons) authButtons.classList.add('hidden');
        if(userButtons) userButtons.classList.remove('hidden');
        if(dropdownUsername) dropdownUsername.textContent = currentUser;
        
        // Setup dropdown
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
        
        // Fetch current user avatar
        try {
            const res = await fetch(`${API_BASE_URL}/users/${currentUser}/profile`);
            if (res.ok) {
                const data = await res.json();
                if (data.avatarUrl && navAvatar) {
                    navAvatar.src = data.avatarUrl.startsWith('http') ? data.avatarUrl : getFullImageUrl(data.avatarUrl);
                }
            }
        } catch (e) {
            console.error("Error fetching user avatar", e);
        }

        if(btnLogout) {
            btnLogout.addEventListener('click', () => {
                localStorage.removeItem('token');
                localStorage.removeItem('username');
                window.location.reload();
            });
        }
    }

    // Load Leaderboard
    await fetchLeaderboard();
});

async function fetchLeaderboard() {
    const tbody = document.getElementById('leaderboard-body');
    try {
        const res = await fetch(`${API_BASE_URL}/users/leaderboard`);
        if (!res.ok) throw new Error("Lỗi khi tải bảng xếp hạng");
        const users = await res.json();

        tbody.innerHTML = '';
        if (users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-gray-400">Chưa có ai lọt vào bảng phong thần.</td></tr>`;
            return;
        }

        users.forEach((u, index) => {
            const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : 'text-gray-400';
            const rankIcon = index < 3 ? '<i class="fa-solid fa-crown"></i>' : `#${index + 1}`;
            
            const avatarUrl = u.avatarUrl ? (u.avatarUrl.startsWith('http') ? u.avatarUrl : getFullImageUrl(u.avatarUrl)) : 'https://placehold.co/100x100/161b22/8b949e?text=U';
            
            const tr = document.createElement('tr');
            tr.className = 'border-b gh-border hover:bg-[#161b22] transition duration-200';
            tr.innerHTML = `
                <td class="py-4 px-6 text-center text-lg font-bold ${rankClass}">${rankIcon}</td>
                <td class="py-4 px-6">
                    <a href="profile.html?user=${u.username}" class="flex items-center gap-4 hover:opacity-80 transition cursor-pointer">
                        <img src="${avatarUrl}" alt="${u.username}" class="w-12 h-12 rounded-full object-cover border border-gray-700">
                        <div>
                            <div class="font-semibold text-gray-200 text-base">${u.fullName || u.username} ${u.username === 'LordAdmin' ? '<i class="fa-solid fa-fire text-fire ml-1" title="Admin"></i>' : ''}</div>
                            <div class="text-sm text-gray-500">@${u.username}</div>
                        </div>
                    </a>
                </td>
                <td class="py-4 px-6 text-center text-sm font-medium text-gray-300">
                    <span class="px-3 py-1 bg-[#21262d] rounded-full border border-[#30363d]">${u.rankName}</span>
                </td>
                <td class="py-4 px-6 text-right">
                    <div class="text-xl font-bold fire-text">${u.score}</div>
                    <div class="text-xs text-gray-500 mt-1">
                        <span title="Dự án"><i class="fa-solid fa-box-archive"></i> ${u.totalProjects}</span> &bull; 
                        <span title="Lượt Sao"><i class="fa-regular fa-star"></i> ${u.totalStars}</span> &bull; 
                        <span title="Bình luận"><i class="fa-regular fa-comment"></i> ${u.totalComments}</span>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-red-400">Lỗi: ${error.message}</td></tr>`;
    }
}
