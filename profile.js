const API_BASE_URL = 'https://bonfirecode-api.onrender.com/api';
let userProjects = []; // Add global scope for userProjects
let userRankId = 1;

const rankIcons = {
    'rank1': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-full h-full"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`, // Kẻ Lưu Đày
    'rank2': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-full h-full"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path stroke-linecap="round" stroke-linejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>`, // Kẻ Nhóm Lửa
    'rank3': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-full h-full"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`, // Kỵ Sĩ Thuật Toán
    'rank4': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-full h-full"><path stroke-linecap="round" stroke-linejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>`, // Ma Tôn Dữ Liệu
    'rank5': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-full h-full"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>`  // Lãnh Chúa Tro Tàn
};

function applyBanner(targetElement, bannerUrl) {
    if (!targetElement) return;
    
    const existing = targetElement.querySelectorAll('.injected-css-banner');
    existing.forEach(el => el.remove());

    if (!bannerUrl) {
        targetElement.style.backgroundImage = "url('assets/images/BG.jpg')";
        return;
    }

    if (bannerUrl.includes('.')) {
        targetElement.style.backgroundImage = `url('https://bonfirecode-api.onrender.com${bannerUrl}')`;
    } else {
        targetElement.style.backgroundImage = 'none';
        const bannerItem = document.querySelector(`.id-item-banner[data-url="${bannerUrl}"]`);
        if (bannerItem) {
            Array.from(bannerItem.children).forEach(child => {
                if (!child.classList.contains('z-20')) {
                    const clone = child.cloneNode(true);
                    clone.classList.add('injected-css-banner');
                    targetElement.appendChild(clone);
                }
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Khởi tạo & Xác thực
    const token = localStorage.getItem('bonfire_token');
    if (!token) {
        window.location.href = 'auth.html';
        return;
    }

    let loggedInUsername = null;
    let username = 'Kẻ Khống Lửa';
    let isMyProfile = false;

    try {
        const payload = JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))));
        loggedInUsername = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || payload.unique_name || payload.sub;
        username = loggedInUsername || username;
        
        const role = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.role;

        // Cập nhật nav dropdown
        const dropdownUsername = document.getElementById('dropdown-username');
        if (dropdownUsername) dropdownUsername.textContent = loggedInUsername;

        if (role === 'Admin') {
            const dropdownMenu = document.querySelector('#user-dropdown-menu .py-1:nth-of-type(2)');
            if (dropdownMenu && !document.getElementById('admin-link')) {
                dropdownMenu.insertAdjacentHTML('afterbegin', '<a id="admin-link" href="admin.html" class="block px-4 py-1.5 text-[#ff4500] font-bold hover:bg-[#0366d6] hover:text-white transition"><i class="fa-solid fa-gavel mr-1"></i> Tòa Án Tối Cao</a>');
            }
        }
        
        const urlParams = new URLSearchParams(window.location.search);
        const urlUsername = urlParams.get('username');
        
        if (urlUsername) {
            username = urlUsername;
        }

        isMyProfile = (loggedInUsername === username);

        if (!isMyProfile) {
            const btnEditProfile = document.getElementById('btn-edit-profile');
            if (btnEditProfile) btnEditProfile.style.display = 'none';

            const btnOpenIdentity = document.getElementById('btn-open-identity-modal');
            if (btnOpenIdentity) btnOpenIdentity.style.display = 'none';

            const tabMyProjects = document.getElementById('tab-my-projects');
            if (tabMyProjects) tabMyProjects.style.display = 'none';

            const tabLiked = document.getElementById('tab-liked');
            if (tabLiked) tabLiked.style.display = 'none';
        }

        // Cập nhật UI cơ bản
        const profileUsername = document.getElementById('profile-username');
        if (profileUsername) profileUsername.textContent = username;
        
        const profileId = document.getElementById('profile-id');
        if (profileId) profileId.textContent = "@" + username.toLowerCase();

        // Lấy thông tin thực tế từ Database
        try {
            const meRes = await fetch(`${API_BASE_URL}/Auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (meRes.ok) {
                const me = await meRes.json();
                if (isMyProfile) {
                    if (me.fullName && profileUsername) profileUsername.textContent = me.fullName;
                    if (me.bio) {
                        const profileBio = document.getElementById('profile-bio');
                        if (profileBio) profileBio.textContent = me.bio;
                    }
                    if (me.avatarUrl) {
                        const profileAvatar = document.getElementById('profile-avatar');
                        if (profileAvatar) profileAvatar.src = `https://bonfirecode-api.onrender.com${me.avatarUrl}`;
                    }
                    if (me.coverUrl) {
                        const profileCover = document.getElementById('profile-cover');
                        if (profileCover) profileCover.src = `https://bonfirecode-api.onrender.com${me.coverUrl}`;
                    }
                }
                
                // Luôn cập nhật Avatar trên thanh điều hướng cho user đang đăng nhập
                const btnAvatarDropdown = document.getElementById('btn-avatar-dropdown');
                if (btnAvatarDropdown) {
                    btnAvatarDropdown.classList.add('relative');
                    const navAvatar = btnAvatarDropdown.querySelector('img');
                    if (navAvatar && me.avatarUrl) {
                        navAvatar.src = `https://bonfirecode-api.onrender.com${me.avatarUrl}`;
                        navAvatar.classList.add('relative', 'z-10');
                    }

                    const existingNavSvg = btnAvatarDropdown.querySelector('.injected-svg-border');
                    if (existingNavSvg) existingNavSvg.remove();

                    if (me.selectedBorderUrl) {
                        const gamificationItem = document.querySelector(`.id-item-border[data-url="${me.selectedBorderUrl}"]`);
                        const svgElement = gamificationItem ? gamificationItem.querySelector('svg') : null;
                        
                        if (svgElement) {
                            const clonedSvg = svgElement.cloneNode(true);
                            clonedSvg.setAttribute('class', 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] z-20 pointer-events-none transition-all duration-300 injected-svg-border');
                            btnAvatarDropdown.appendChild(clonedSvg);
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Lỗi load profile thật:", err);
        }

        setupDropdown();

    } catch (e) {
        console.error("Lỗi giải mã token:", e);
        window.location.href = 'auth.html';
        return;
    }

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('bonfire_token');
            window.location.href = 'index.html';
        });
    }

    // 2. Fetch Dữ liệu Đồ án
    try {
        const response = await fetch(`${API_BASE_URL}/projects`);
        if (!response.ok) throw new Error("Không thể tải danh sách dự án");
        
        const allProjects = await response.json();
        
        // Lọc dự án của user hiện tại (match theo authorName)
        userProjects = allProjects.filter(p => p.authorName === username);

        // Fetch user profile stats (followers, following)
        try {
            const profileRes = await fetch(`${API_BASE_URL}/users/${username}/profile`);
            if (profileRes.ok) {
                const profileData = await profileRes.json();
                document.getElementById('profile-followers-count').textContent = profileData.followersCount || 0;
                document.getElementById('profile-following-count').textContent = profileData.followingCount || 0;
                
                // Update profile header
                const fullnameEl = document.getElementById('profile-username'); // In HTML this is h1
                if (fullnameEl) fullnameEl.textContent = profileData.fullName || profileData.username;
                
                const usernameEl = document.getElementById('profile-id'); // In HTML this is p
                if (usernameEl) usernameEl.textContent = `@${profileData.username}`;
                
                const bioEl = document.getElementById('profile-bio');
                if (bioEl) bioEl.textContent = profileData.bio || 'Chưa có tiểu sử.';
                
                const avatarEl = document.getElementById('profile-avatar');
                if (avatarEl) {
                    avatarEl.src = profileData.avatarUrl ? `${API_BASE_URL.replace('/api', '')}${profileData.avatarUrl}` : 'assets/images/avata.jpg';
                }
                
                const coverEl = document.getElementById('profile-cover');
                if (coverEl && profileData.coverUrl) {
                    coverEl.src = `${API_BASE_URL.replace('/api', '')}${profileData.coverUrl}`;
                }

                // Gamification Identity
                const bannerEl = document.getElementById('profile-banner');
                if (bannerEl) {
                    bannerEl.dataset.url = profileData.selectedBannerUrl || '';
                    applyBanner(bannerEl, profileData.selectedBannerUrl);
                }
                
                const borderEl = document.getElementById('profile-border');
                if (borderEl) {
                    // Remove previously injected SVG if any
                    const existingSvg = borderEl.parentElement.querySelector('.injected-svg-border');
                    if (existingSvg) existingSvg.remove();

                    if (profileData.selectedBorderUrl) {
                        // Check if the gamification modal has this border as an SVG
                        const gamificationItem = document.querySelector(`.id-item-border[data-url="${profileData.selectedBorderUrl}"]`);
                        const svgElement = gamificationItem ? gamificationItem.querySelector('svg') : null;

                        if (svgElement) {
                            borderEl.classList.add('hidden');
                            borderEl.src = '';
                            const clonedSvg = svgElement.cloneNode(true);
                            // Override all classes to perfectly match profile-border element
                            clonedSvg.setAttribute('class', 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-44 h-44 z-20 pointer-events-none transition-all duration-300 injected-svg-border');
                            borderEl.parentElement.appendChild(clonedSvg);
                        } else {
                            borderEl.src = `${API_BASE_URL.replace('/api', '')}${profileData.selectedBorderUrl}`;
                            borderEl.classList.remove('hidden');
                        }
                    } else {
                        borderEl.classList.add('hidden');
                        borderEl.src = '';
                    }
                    
                    fetchUserRank(profileData);
                }
            }
        } catch (e) {
            console.error("Lỗi lấy thông tin followers:", e);
        }

        // 3. Xử lý Logic Thống Kê
        await calculateAndRenderStats(userProjects);

        // 4. Render Đồ án Nổi Bật (Pinned)
        renderPinnedProjects(userProjects, isMyProfile);
        
    } catch (error) {
        console.error("Lỗi khi fetch dữ liệu đồ án:", error);
    }

    setupEditModal(token);
});

function fetchUserRank(profileData) {
    const totalEmbers = profileData.totalEmbers || 0;
    const rank = profileData.rank;
    userRankId = rank ? rank.id : 1;

    const rankIconEl = document.getElementById('user-rank-icon');
    const rankNameEl = document.getElementById('user-rank-name');
    const embersEl = document.getElementById('user-embers');
    const requiredEmbersEl = document.getElementById('user-required-embers');
    const progressBar = document.getElementById('ember-progress-bar');

    if (rank) {
        rankNameEl.textContent = rank.name;
        if (rankIcons[rank.svgIcon]) {
            rankIconEl.innerHTML = rankIcons[rank.svgIcon];
        } else {
            rankIconEl.innerHTML = rankIcons['rank1']; // Default fallback
        }
    } else {
        rankNameEl.textContent = "Chưa xếp hạng";
        rankIconEl.innerHTML = rankIcons['rank1'];
    }

    embersEl.textContent = totalEmbers;
    
    // Calculate Next Rank Required Embers (mock logic based on 5 ranks)
    let nextRequired = 50;
    if (totalEmbers >= 500) nextRequired = totalEmbers; // Max rank reached
    else if (totalEmbers >= 250) nextRequired = 500;
    else if (totalEmbers >= 120) nextRequired = 250;
    else if (totalEmbers >= 50) nextRequired = 120;
    else nextRequired = 50;

    requiredEmbersEl.textContent = `/ ${nextRequired} Tàn Lửa`;

    // Calculate percentage
    let percentage = 100;
    if (nextRequired > totalEmbers) {
        // Base calculation on the current tier to show progress WITHIN the tier
        let currentTierBase = 0;
        if (totalEmbers >= 250) currentTierBase = 250;
        else if (totalEmbers >= 120) currentTierBase = 120;
        else if (totalEmbers >= 50) currentTierBase = 50;
        else currentTierBase = 0;
        
        let progressInTier = totalEmbers - currentTierBase;
        let tierSize = nextRequired - currentTierBase;
        percentage = (progressInTier / tierSize) * 100;
    }
    
    // Add a slight delay to allow CSS animation to trigger from 0%
    setTimeout(() => {
        if (progressBar) {
            let finalPercentage = Math.min(Math.max(percentage, 5), 100); // Min 5% so it's visible
            progressBar.style.width = `${finalPercentage}%`; 
            
            // 1. Reset toàn bộ class cũ, giữ lại các class cấu trúc cơ bản
            progressBar.className = 'h-full transition-all duration-1000 ease-out rounded-full relative overflow-hidden';
            
            // 2. Kiểm tra điều kiện để gán màu sắc động
            if (percentage === 0) {
                // 0%: Xám tro lạnh lẽo
                progressBar.classList.add('bg-gray-600');
            } else if (percentage < 40) {
                // Dưới 40%: Xám trắng có chút sáng
                progressBar.classList.add('bg-gradient-to-r', 'from-gray-500', 'to-gray-300');
            } else if (percentage < 60) {
                // 40% - 59%: Bắt đầu có hơi ấm (Cam nhạt)
                progressBar.classList.add('bg-gradient-to-r', 'from-gray-300', 'to-orange-400');
            } else if (percentage < 80) {
                // 60% - 79%: Rực rỡ (Đỏ Cam)
                progressBar.classList.add('bg-gradient-to-r', 'from-orange-500', 'to-red-600', 'shadow-[0_0_10px_#ff4500]');
            } else {
                // >= 80%: Thức tỉnh - Hiệu ứng Sấm sét (Đỏ tía sang Lục lam điện)
                progressBar.classList.add('bg-gradient-to-r', 'from-red-600', 'via-purple-500', 'to-cyan-400', 'bar-lightning');
            }
        }
    }, 100);
}

function setupEditModal(token) {
    const btnEditProfile = document.getElementById('btn-edit-profile');
    const editModal = document.getElementById('editProfileModal');
    const btnCancelEdit = document.getElementById('btn-cancel-edit');
    const btnSaveEdit = document.getElementById('btn-save-edit');
    const editError = document.getElementById('edit-error');
    
    // Inputs
    const inputFullName = document.getElementById('editFullName');
    const inputBio = document.getElementById('editBio');
    const inputAvatarFile = document.getElementById('editAvatarFile');
    const inputCoverFile = document.getElementById('editCoverFile');

    // DOM Elements
    const profileUsernameEl = document.getElementById('profile-username');
    const profileBioEl = document.getElementById('profile-bio');
    const profileAvatarEl = document.getElementById('profile-avatar');
    const profileCoverEl = document.getElementById('profile-cover');

    if (btnEditProfile && editModal) {
        btnEditProfile.addEventListener('click', () => {
            // Pre-fill dữ liệu hiện tại
            inputFullName.value = profileUsernameEl.textContent.trim();
            inputBio.value = profileBioEl.textContent.trim();
            if(inputAvatarFile) inputAvatarFile.value = ''; // Reset file input
            if(inputCoverFile) inputCoverFile.value = ''; // Reset cover input
            
            editError.classList.add('hidden');
            editModal.classList.remove('hidden');
        });

        const closeModal = () => {
            editModal.classList.add('hidden');
        };

        btnCancelEdit.addEventListener('click', closeModal);
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) closeModal();
        });

        btnSaveEdit.addEventListener('click', async () => {
            const newFullName = inputFullName.value.trim();
            const newBio = inputBio.value.trim();

            if (!newFullName) {
                editError.textContent = "Tên hiển thị không được để trống!";
                editError.classList.remove('hidden');
                return;
            }

            btnSaveEdit.disabled = true;
            btnSaveEdit.textContent = "Đang lưu...";
            editError.classList.add('hidden');

            try {
                // Giải mã token để lấy UserId
                const payload = JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))));
                const userId = payload.sub || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.id;
                
                const endpoint = `${API_BASE_URL}/Auth/me`;

                const formData = new FormData();
                formData.append('FullName', newFullName);
                formData.append('Bio', newBio);
                
                if (inputAvatarFile && inputAvatarFile.files.length > 0) {
                    formData.append('AvatarFile', inputAvatarFile.files[0]);
                }

                if (inputCoverFile && inputCoverFile.files.length > 0) {
                    formData.append('CoverFile', inputCoverFile.files[0]);
                }

                // Gọi API cập nhật
                const res = await fetch(endpoint, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`
                        // Bỏ Content-Type để trình duyệt tự set multipart/form-data
                    },
                    body: formData
                });

                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error(errorText || "API từ chối cập nhật hồ sơ. Vui lòng kiểm tra lại quyền hoặc Backend.");
                }

                // Cập nhật DOM trực tiếp (No-reload UI)
                profileUsernameEl.textContent = newFullName;
                if (newBio) {
                    profileBioEl.textContent = newBio;
                }
                
                const responseData = await res.json();
                if (responseData.avatarUrl) {
                    const newAvatarSrc = `https://bonfirecode-api.onrender.com${responseData.avatarUrl}`;
                    if (profileAvatarEl) profileAvatarEl.src = newAvatarSrc;
                    
                    const navAvatar = document.querySelector('#btn-avatar-dropdown img');
                    if (navAvatar) navAvatar.src = newAvatarSrc;
                }

                if (responseData.coverUrl) {
                    const newCoverSrc = `https://bonfirecode-api.onrender.com${responseData.coverUrl}`;
                    if (profileCoverEl) profileCoverEl.src = newCoverSrc;
                }

                btnSaveEdit.textContent = "Thành công!";                   
                // Nếu không có json trả về, fallback bằng file API FileReader nếu cần
                if (inputAvatarFile && inputAvatarFile.files.length > 0) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        profileAvatarEl.src = e.target.result;
                        const navAvatar = document.querySelector('#btn-avatar-dropdown img');
                        if (navAvatar) navAvatar.src = e.target.result;
                    };
                    reader.readAsDataURL(inputAvatarFile.files[0]);
                }
                if (inputCoverFile && inputCoverFile.files.length > 0) {
                    const reader2 = new FileReader();
                    reader2.onload = function(e) {
                        if (profileCoverEl) profileCoverEl.src = e.target.result;
                    };
                    reader2.readAsDataURL(inputCoverFile.files[0]);
                }
                const dropdownUsername = document.getElementById('dropdown-username');
                if (dropdownUsername) dropdownUsername.textContent = newFullName;

                closeModal();
                
                // Hiển thị Toast (Tạm dùng alert, có thể tùy biến sau)
                alert("Cập nhật hồ sơ thành công!");

            } catch (error) {
                console.error("Lỗi cập nhật hồ sơ:", error);
                editError.textContent = error.message;
                editError.classList.remove('hidden');
            } finally {
                btnSaveEdit.disabled = false;
                btnSaveEdit.textContent = "Lưu thay đổi";
            }
        });
    }
}

function setupDropdown() {
    const authButtons = document.getElementById('auth-buttons');
    const userButtons = document.getElementById('user-buttons');
    
    if(authButtons) authButtons.classList.add('hidden');
    if(userButtons) userButtons.classList.remove('hidden');

    const btnAvatar = document.getElementById('btn-avatar-dropdown');
    const dropdownMenu = document.getElementById('user-dropdown-menu');
    
    if (btnAvatar && dropdownMenu) {
        btnAvatar.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('hidden');
        });
        
        document.addEventListener('click', (e) => {
            if (!btnAvatar.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownMenu.classList.add('hidden');
            }
        });
    }
}

async function calculateAndRenderStats(projects) {
    const totalProjects = projects.length;
    let totalStars = 0;
    let totalComments = 0;
    let totalDownloads = projects.reduce((sum, p) => sum + (p.downloadCount || 0), 0);
    
    // Cộng dồn điểm đánh giá và các chỉ số từ API
    await Promise.all(projects.map(async (p) => {
        try {
            // Fetch Comments
            const cRes = await fetch(`${API_BASE_URL}/comments/${p.id}`);
            if (cRes.ok) {
                const comments = await cRes.json();
                p.commentCount = comments.length;
                totalComments += p.commentCount;
            }
            
            // Fetch Ratings
            const rRes = await fetch(`${API_BASE_URL}/ratings/${p.id}`);
            if (rRes.ok) {
                const ratingData = await rRes.json();
                p.totalRatings = ratingData.totalRatings || 0;
                p.averageRating = ratingData.average || 0;
                totalStars += p.totalRatings; // Lượt sao = tổng số lượt đánh giá
            }
        } catch (e) {
            console.error("Lỗi lấy thông số project:", p.id, e);
        }
    }));

    const statsHTML = `
        <div class="bg-[#161b22] border border-[#30363d] rounded-md p-4 text-center">
            <p class="text-xs text-gray-400 mb-1">Tổng dự án</p>
            <p class="text-2xl font-bold text-blue-400">${totalProjects}</p>
        </div>
        <div class="bg-[#161b22] border border-[#30363d] rounded-md p-4 text-center">
            <p class="text-xs text-gray-400 mb-1">Lượt sao</p>
            <p class="text-2xl font-bold text-yellow-400">${totalStars}</p>
        </div>
        <div class="bg-[#161b22] border border-[#30363d] rounded-md p-4 text-center">
            <p class="text-xs text-gray-400 mb-1">Tải xuống</p>
            <p class="text-2xl font-bold text-green-400">${totalDownloads}</p>
        </div>
        <div class="bg-[#161b22] border border-[#30363d] rounded-md p-4 text-center">
            <p class="text-xs text-gray-400 mb-1">Bình luận</p>
            <p class="text-2xl font-bold text-purple-400">${totalComments}</p>
        </div>
    `;

    const statsContainer = document.getElementById('stats-container');
    if (statsContainer) {
        statsContainer.innerHTML = statsHTML;
    }

    // Cập nhật Hoạt động đóng góp (Activity)
    const activityContainer = document.getElementById('user-activity-list');
    if (activityContainer && projects.length > 0) {
        // Sắp xếp giảm dần theo ngày tạo
        const sortedByDate = [...projects].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const recent = sortedByDate.slice(0, 3);
        
        let actHtml = '';
        recent.forEach(p => {
            const dateObj = new Date(p.createdAt);
            const dateStr = dateObj.toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' });
            
            // Nếu có lượt tải hoặc comment/rating thì coi như là project cũ, ngược lại là "tạo mới"
            const isNew = p.commentCount === 0 && p.totalRatings === 0 && (p.downloadCount || 0) === 0;
            
            actHtml += `
            <div class="flex gap-4 relative">
                <div class="flex flex-col items-center">
                    <div class="w-8 h-8 rounded-full bg-[#161b22] border border-[#30363d] flex items-center justify-center shrink-0 z-10">
                        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${isNew ? 'M12 4v16m8-8H4' : 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12'}"></path>
                        </svg>
                    </div>
                    <div class="w-0.5 h-full bg-[#30363d] absolute top-8 bottom-0 -z-0"></div>
                </div>
                <div class="pb-6">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-xs text-gray-500">${dateStr}</span>
                    </div>
                    <p class="text-sm text-gray-300">
                        ${isNew ? 'Đã tạo kho lưu trữ mới' : 'Đã tải lên đồ án'} 
                        <a href="detail.html?id=${p.id}" class="text-blue-400 font-semibold hover:underline">${p.title}</a>
                    </p>
                    <p class="text-xs text-gray-500 mt-1 line-clamp-2">${p.description || 'Không có mô tả'}</p>
                </div>
            </div>
            `;
        });
        
        // Nút xem thêm nếu còn nhiều hoạt động
        if (projects.length > 3) {
            actHtml += `
            <div class="mt-4 text-center">
                <a href="#" class="text-blue-400 hover:underline text-sm font-semibold">Xem thêm hoạt động...</a>
            </div>`;
        }

        activityContainer.innerHTML = actHtml;
    } else if (activityContainer) {
        activityContainer.innerHTML = `<p class="text-sm text-gray-500">Chưa có hoạt động nào.</p>`;
    }
}

function renderPinnedProjects(projects, isMyProfile = false) {
    const pinnedContainer = document.getElementById('pinned-projects-container');
    if (!pinnedContainer) return;

    if (projects.length === 0) {
        pinnedContainer.innerHTML = `<p class="text-sm text-gray-500 col-span-2">Chưa có đồ án nào được chia sẻ.</p>`;
        return;
    }

    // Sắp xếp theo tổng (lượt sao + lượt bình luận) giảm dần để lấy các đồ án nổi bật
    const sorted = [...projects].sort((a, b) => {
        const scoreA = (a.totalRatings || 0) + (a.commentCount || 0);
        const scoreB = (b.totalRatings || 0) + (b.commentCount || 0);
        return scoreB - scoreA;
    });
    const pinned = sorted.slice(0, 2); // Lấy tối đa 2 đồ án nổi bật

    let html = '';
    pinned.forEach(p => {
        // Mock language colors based on first category
        let color = 'bg-purple-500'; // Default PHP
        const cat = (p.categoryNames && p.categoryNames.length > 0 && p.categoryNames[0]) ? String(p.categoryNames[0]) : 'Unknown';
        
        if (cat.toLowerCase().includes('c#') || cat.toLowerCase().includes('unity') || cat.toLowerCase().includes('.net')) {
            color = 'bg-green-500';
        } else if (cat.toLowerCase().includes('java') || cat.toLowerCase().includes('js') || cat.toLowerCase().includes('node')) {
            color = 'bg-yellow-500';
        } else if (cat.toLowerCase().includes('python')) {
            color = 'bg-blue-500';
        } else if (cat.toLowerCase().includes('react') || cat.toLowerCase().includes('vue')) {
            color = 'bg-cyan-500';
        }

        let optionsHtml = '';
        if (isMyProfile) {
            optionsHtml = `
            <!-- Nút 3 chấm -->
            <button class="btn-proj-options absolute top-4 right-4 text-gray-500 hover:text-white focus:outline-none bg-[#0d1117]/80 rounded p-1">
                <svg class="w-5 h-5 pointer-events-none" fill="currentColor" viewBox="0 0 16 16"><path d="M8 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM8 4a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM8 14a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"></path></svg>
            </button>`;
        }

        const thumbnailUrl = p.thumbnailUrl ? (p.thumbnailUrl.startsWith('http') ? p.thumbnailUrl : `${API_BASE_URL.replace('/api', '')}${p.thumbnailUrl}`) : 'https://placehold.co/400x200/161b22/8b949e?text=No+Image';

        html += `
        <div class="relative border border-[#30363d] rounded-md bg-[#0d1117] flex flex-col group hover:border-purple-500 transition duration-300 overflow-hidden" data-project-id="${p.id}">
            <img src="${thumbnailUrl}" class="w-full h-32 object-cover opacity-80 group-hover:opacity-100 transition" onerror="this.src='https://placehold.co/400x200/161b22/8b949e?text=No+Image'">
            ${optionsHtml}
            
            <!-- Dropdown Menu -->
            <div class="proj-dropdown-menu hidden absolute right-4 top-10 w-32 bg-[#161b22] border border-[#30363d] rounded-md shadow-lg z-10">
                <button class="btn-edit-proj block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#0366d6] transition" data-id="${p.id}" data-title="${p.title}" data-desc="${p.description}">Chỉnh sửa</button>
                <button class="btn-delete-proj block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-600 hover:text-white transition rounded-b-md" data-id="${p.id}">Xóa</button>
            </div>

            <div class="p-4 flex-grow flex flex-col justify-between">
                <div>
                    <div class="flex items-center justify-between mb-2 pr-6">
                        <a href="detail.html?id=${p.id}" class="text-blue-400 font-semibold text-sm hover:underline group-hover:text-purple-400 transition line-clamp-1">${p.title}</a>
                        <span class="text-xs text-gray-400 border border-[#30363d] px-2 py-0.5 rounded-full min-w-max">Công cộng</span>
                    </div>
                    <p class="text-xs text-gray-400 mb-4 h-10 line-clamp-2">${p.description || 'Chưa có mô tả'}</p>
                </div>
                <div class="flex items-center gap-4 text-xs text-gray-400 mt-auto">
                    <span class="flex items-center gap-1">
                        <span class="w-3 h-3 rounded-full ${color} inline-block shadow-sm"></span> ${cat}
                    </span>
                    <span class="flex items-center gap-1 ${p.totalRatings > 0 ? 'text-yellow-500' : ''}">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
                        ${p.totalRatings > 0 ? `${p.averageRating} (${p.totalRatings})` : '0'}
                    </span>
                </div>
            </div>
        </div>
        `;
    });

    pinnedContainer.innerHTML = html;
}

// 6. Xử lý Global Click cho Dropdown, Delete, Quick Edit
document.addEventListener('click', async (e) => {
    // Đóng tất cả dropdown nếu click ra ngoài
    if (!e.target.closest('.btn-proj-options') && !e.target.closest('.proj-dropdown-menu')) {
        document.querySelectorAll('.proj-dropdown-menu').forEach(menu => {
            menu.classList.add('hidden');
        });
    }

    // Toggle dropdown
    if (e.target.closest('.btn-proj-options')) {
        e.preventDefault();
        const btn = e.target.closest('.btn-proj-options');
        const menu = btn.nextElementSibling;
        
        // Đóng các menu khác
        document.querySelectorAll('.proj-dropdown-menu').forEach(m => {
            if (m !== menu) m.classList.add('hidden');
        });
        
        menu.classList.toggle('hidden');
    }

    // Nút Xóa Đồ Án
    if (e.target.closest('.btn-delete-proj')) {
        e.preventDefault();
        const btn = e.target.closest('.btn-delete-proj');
        const id = btn.getAttribute('data-id');
        
        if(!confirm('Bạn có chắc chắn muốn hiến tế (xóa) bảo vật này không? Hành động này không thể hoàn tác!')) return;
        
        const token = localStorage.getItem('bonfire_token');
        try {
            const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) throw new Error("API từ chối xóa");
            
            // Xóa DOM trực tiếp
            const card = document.querySelector(`div[data-project-id="${id}"]`);
            if (card) card.remove();
            
            // Giảm tổng số dự án
            const statsContainer = document.getElementById('stats-container');
            if (statsContainer) {
                const totalProjElem = statsContainer.querySelector('div:first-child p:nth-child(2)');
                if (totalProjElem) {
                    let total = parseInt(totalProjElem.textContent);
                    if (!isNaN(total) && total > 0) totalProjElem.textContent = total - 1;
                }
            }
            
            alert('Đã xóa thành công!');
        } catch(error) {
            alert('Lỗi: ' + error.message);
        }
    }

    // Nút Sửa Đồ Án
    if (e.target.closest('.btn-edit-proj')) {
        e.preventDefault();
        const btn = e.target.closest('.btn-edit-proj');
        const id = btn.getAttribute('data-id');
        const title = btn.getAttribute('data-title');
        const desc = btn.getAttribute('data-desc');
        
        // Đóng dropdown menu
        const menu = btn.closest('.proj-dropdown-menu');
        if(menu) menu.classList.add('hidden');
        
        openQuickEditModal(id, title, desc);
    }
});

// Setup logic Quick Edit Project Modal
let categoriesLoaded = false;
async function openQuickEditModal(id, title, desc) {
    const modal = document.getElementById('quickEditProjectModal');
    if (!modal) return;
    
    document.getElementById('editProjId').value = id;
    document.getElementById('editProjTitle').value = title || '';
    document.getElementById('editProjDesc').value = desc || '';
    document.getElementById('edit-proj-error').classList.add('hidden');
    
    // Load category checkboxes if not loaded
    if (!categoriesLoaded) {
        try {
            const res = await fetch(`${API_BASE_URL}/categories`);
            if (res.ok) {
                const cats = await res.json();
                const container = document.getElementById('edit-proj-categories');
                let html = '';
                cats.forEach(c => {
                    html += `
                        <label class="flex items-center space-x-2 text-sm text-gray-300">
                            <input type="checkbox" name="editProjCategories" value="${c.id}" class="form-checkbox text-purple-600 bg-[#0d1117] border-[#30363d] rounded">
                            <span>${c.name}</span>
                        </label>
                    `;
                });
                container.innerHTML = html;
                categoriesLoaded = true;
            }
        } catch(e) {
            console.error("Could not fetch categories", e);
        }
    } else {
        // Reset checkboxes (if we had fetched current categories we would check them here, but for quick edit we might skip pre-check or just reset)
        document.querySelectorAll('input[name="editProjCategories"]').forEach(cb => cb.checked = false);
    }

    modal.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    // Bind save/cancel cho Quick Edit Modal
    const modal = document.getElementById('quickEditProjectModal');
    const btnCancel = document.getElementById('btn-cancel-edit-proj');
    const btnSave = document.getElementById('btn-save-edit-proj');
    const errorBox = document.getElementById('edit-proj-error');
    
    if (modal && btnCancel && btnSave) {
        btnCancel.addEventListener('click', () => modal.classList.add('hidden'));
        
        btnSave.addEventListener('click', async () => {
            const id = document.getElementById('editProjId').value;
            const title = document.getElementById('editProjTitle').value.trim();
            const desc = document.getElementById('editProjDesc').value.trim();
            const token = localStorage.getItem('bonfire_token');
            
            if (!title) {
                errorBox.textContent = "Tên dự án là bắt buộc.";
                errorBox.classList.remove('hidden');
                return;
            }
            
            btnSave.disabled = true;
            btnSave.textContent = "Đang lưu...";
            errorBox.classList.add('hidden');
            
            try {
                // Thu thập danh mục được chọn
                const catIds = [];
                document.querySelectorAll('input[name="editProjCategories"]:checked').forEach(cb => catIds.push(cb.value));
                
                // Ở đây API update project dùng JSON (PUT)
                // Nếu backend cần FormData cho update project, ta có thể đổi thành FormData. Ở đây dùng JSON tạm theo mẫu.
                const updateData = {
                    title: title,
                    description: desc,
                    categoryIds: catIds
                };
                
                const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updateData)
                });
                
                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(text || "Lỗi cập nhật dự án");
                }
                
                alert("Cập nhật dự án thành công!");
                modal.classList.add('hidden');
                
                // Reload danh sách project bằng cách F5 hoặc fetch lại (F5 cho chắc)
                window.location.reload();
                
            } catch (err) {
                errorBox.textContent = err.message;
                errorBox.classList.remove('hidden');
            } finally {
                btnSave.disabled = false;
                btnSave.textContent = "Lưu thay đổi";
            }
        });
    }
});

// ==========================================
// 6. TAB NAVIGATION & RENDERING LOGIC
// ==========================================
function setupTabs() {
    const tabOverview = document.getElementById('tab-overview');
    const tabMyProjects = document.getElementById('tab-my-projects');
    const tabLiked = document.getElementById('tab-liked');

    const contentOverview = document.getElementById('content-overview');
    const contentMyProjects = document.getElementById('content-my-projects');
    const contentLiked = document.getElementById('content-liked');

    const allTabs = [tabOverview, tabMyProjects, tabLiked];
    const allContents = [contentOverview, contentMyProjects, contentLiked];

    function setActiveTab(activeTab, activeContent) {
        // Reset all tabs
        allTabs.forEach(tab => {
            if (!tab) return;
            tab.classList.remove('border-b-2', 'border-[#f78166]', 'text-white', 'font-semibold');
            tab.classList.add('text-gray-400');
        });
        // Reset all contents
        allContents.forEach(content => {
            if (!content) return;
            content.classList.add('hidden');
            content.classList.remove('block');
        });

        // Set active tab
        if (activeTab) {
            activeTab.classList.remove('text-gray-400');
            activeTab.classList.add('border-b-2', 'border-[#f78166]', 'text-white', 'font-semibold');
        }
        // Set active content
        if (activeContent) {
            activeContent.classList.remove('hidden');
            activeContent.classList.add('block');
        }
    }

    if (tabOverview) {
        tabOverview.addEventListener('click', () => setActiveTab(tabOverview, contentOverview));
    }

    if (tabMyProjects) {
        tabMyProjects.addEventListener('click', () => {
            setActiveTab(tabMyProjects, contentMyProjects);
            renderProjectsList(userProjects, 'my-projects-grid'); // Dùng userProjects từ API ban đầu
        });
    }

    if (tabLiked) {
        tabLiked.addEventListener('click', async () => {
            setActiveTab(tabLiked, contentLiked);
            await loadLikedProjects();
        });
    }
}

function renderProjectsList(projects, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = ''; // Clear cũ
    if (!projects || projects.length === 0) {
        container.innerHTML = '<p class="text-gray-400 col-span-full">Không có đồ án nào để hiển thị.</p>';
        return;
    }

    projects.forEach(p => {
        const thumbUrl = p.thumbnailUrl ? (p.thumbnailUrl.startsWith('http') ? p.thumbnailUrl : `https://bonfirecode-api.onrender.com${p.thumbnailUrl}`) : 'https://placehold.co/600x400/21262d/8b949e?text=No+Image';
        const card = document.createElement('div');
        card.className = "bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden hover:border-[#8b949e] transition flex flex-col group relative";

        let categoriesHtml = '';
        if (p.categoryNames && p.categoryNames.length > 0) {
            categoriesHtml = p.categoryNames.map(c => `<span class="bg-[#21262d] text-xs px-2 py-1 rounded-full text-gray-300 border border-[#30363d]">${c}</span>`).join('');
        }

        const isMyProject = containerId === 'my-projects-grid';

        let adminButtons = '';
        if (isMyProject) {
            adminButtons = `
                <div class="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button onclick="editProject('${p.id}')" class="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded-md text-xs shadow-lg" title="Sửa">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                    <button onclick="deleteProject('${p.id}')" class="bg-red-600 hover:bg-red-500 text-white p-1.5 rounded-md text-xs shadow-lg" title="Xóa">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            `;
        }

        const authorName = p.authorName || document.getElementById('profile-username').textContent;
        const totalRatings = p.totalRatings || 0;
        const averageRating = p.averageRating || 0;

        card.innerHTML = `
            <div class="relative cursor-pointer h-40" onclick="window.location.href='detail.html?id=${p.id}'">
                <img src="${thumbUrl}" alt="Thumb" class="w-full h-full object-cover group-hover:opacity-80 transition">
                ${adminButtons}
            </div>
            <div class="p-4 flex-grow flex flex-col cursor-pointer" onclick="window.location.href='detail.html?id=${p.id}'">
                <h3 class="text-lg font-bold text-white mb-2 line-clamp-1 group-hover:text-blue-400 transition">${p.title}</h3>
                <p class="text-sm text-gray-400 line-clamp-2 mb-4 flex-grow">${p.description || 'Chưa có mô tả...'}</p>
                <div class="flex flex-wrap gap-1 mb-4 mt-auto">
                    ${categoriesHtml}
                </div>
                <div class="flex justify-between items-center text-xs pt-3 border-t border-[#30363d]">
                    <div class="flex items-center text-[#8b949e]">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        <span>${authorName}</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="flex items-center text-[#8b949e]" title="Tải xuống">
                            <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            <span>${p.downloadCount || 0}</span>
                        </div>
                        <div class="flex items-center text-[#8b949e]" title="Điểm đánh giá trung bình">
                            <svg class="w-3.5 h-3.5 mr-1 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                            <span class="font-medium ${totalRatings > 0 ? 'text-purple-400' : 'text-[#8b949e]'}">
                                ${totalRatings > 0 ? `${averageRating} (${totalRatings})` : 'Chưa có'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Global functions for Edit/Delete so they can be called from onclick
window.editProject = function(id) {
    event.stopPropagation();
    const proj = userProjects.find(p => p.id === id);
    if (!proj) return;
    
    const modal = document.getElementById('quickEditProjectModal');
    if (!modal) return alert("Không tìm thấy modal sửa.");
    
    document.getElementById('editProjId').value = id;
    document.getElementById('editProjTitle').value = proj.title;
    document.getElementById('editProjDesc').value = proj.description || '';
    
    // Check categories
    document.querySelectorAll('input[name="editProjCategories"]').forEach(cb => {
        cb.checked = proj.categoryNames && proj.categoryNames.includes(cb.nextElementSibling.textContent);
    });
    
    modal.classList.remove('hidden');
};

window.deleteProject = async function(id) {
    event.stopPropagation();
    if (!confirm("Ngài có chắc chắn muốn xóa đồ án này không?")) return;
    
    const token = localStorage.getItem('bonfire_token');
    try {
        const res = await fetch(`https://bonfirecode-api.onrender.com/api/projects/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (res.ok) {
            alert("Đã xóa đồ án!");
            window.location.reload();
        } else {
            const err = await res.text();
            alert("Lỗi: " + err);
        }
    } catch(e) {
        alert("Lỗi mạng: " + e.message);
    }
};

async function loadLikedProjects() {
    const token = localStorage.getItem('bonfire_token');
    const loading = document.getElementById('liked-loading');
    const grid = document.getElementById('liked-projects-grid');
    
    if (loading) loading.classList.remove('hidden');
    if (grid) grid.innerHTML = '';

    try {
        const res = await fetch('https://bonfirecode-api.onrender.com/api/projects/liked', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (loading) loading.classList.add('hidden');

        if (res.ok) {
            const projects = await res.json();
            renderProjectsList(projects, 'liked-projects-grid');
        } else {
            console.error("Lỗi lấy liked projects", res.status);
            if (grid) grid.innerHTML = '<p class="text-red-400 col-span-full">Không thể tải dữ liệu. Hãy thử lại.</p>';
        }
    } catch (e) {
        if (loading) loading.classList.add('hidden');
        console.error("Lỗi mạng:", e);
        if (grid) grid.innerHTML = '<p class="text-red-400 col-span-full">Lỗi kết nối máy chủ.</p>';
    }
}

// Gọi setupTabs khi load xong
setupTabs();

// --- URL ROUTING LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');
        const actionParam = urlParams.get('action');
        let shouldCleanUrl = false;

        if (tabParam === 'my-projects') {
            const tabBtn = document.getElementById('tab-my-projects');
            if (tabBtn) { tabBtn.click(); shouldCleanUrl = true; }
        } else if (tabParam === 'liked') {
            const tabBtn = document.getElementById('tab-liked');
            if (tabBtn) { tabBtn.click(); shouldCleanUrl = true; }
        }

        if (actionParam === 'edit') {
            const editBtn = document.getElementById('btn-edit-profile');
            if (editBtn) { editBtn.click(); shouldCleanUrl = true; }
        }

        if (shouldCleanUrl) {
            const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
        }
    }, 100);
});

// ==========================================
// 7. GAMIFICATION IDENTITY MODAL LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const btnOpenIdentity = document.getElementById('btn-open-identity-modal');
    const modalIdentity = document.getElementById('identityModal');
    const btnCloseIdentity = document.getElementById('btn-close-identity-modal');
    const btnCancelIdentity = document.getElementById('btn-cancel-identity');
    const btnSaveIdentity = document.getElementById('btn-save-identity');
    const spinnerSaveIdentity = document.getElementById('spinner-save-identity');

    // UI Preview Elements
    const prevBanner = document.getElementById('preview-id-banner');
    const prevAvatar = document.getElementById('preview-id-avatar');
    const prevBorder = document.getElementById('preview-id-border');
    const prevFullname = document.getElementById('preview-id-fullname');
    const prevUsername = document.getElementById('preview-id-username');

    // Currently Selected Values
    let currentAvatarUrl = null;
    let currentBorderUrl = null;
    let currentBannerUrl = null;

    if (btnOpenIdentity && modalIdentity) {
        const closeModal = () => {
            modalIdentity.classList.add('hidden');
        };

        btnOpenIdentity.addEventListener('click', () => {
            // Pre-fill user details
            const profileUsernameEl = document.getElementById('profile-username');
            const profileIdEl = document.getElementById('profile-id');
            const profileAvatarEl = document.getElementById('profile-avatar');
            const profileBannerEl = document.getElementById('profile-banner');
            const profileBorderEl = document.getElementById('profile-border');

            if (prevFullname) prevFullname.textContent = profileUsernameEl ? profileUsernameEl.textContent : 'Tên';
            if (prevUsername) prevUsername.textContent = profileIdEl ? profileIdEl.textContent : '@username';
            
            // Extract current images
            if (profileAvatarEl && prevAvatar) {
                const avatarSrc = profileAvatarEl.getAttribute('src');
                if (avatarSrc && avatarSrc.trim() !== '' && !avatarSrc.includes('placehold.co')) {
                    prevAvatar.src = profileAvatarEl.src; // Use resolved absolute URL for display
                    currentAvatarUrl = avatarSrc.replace('https://bonfirecode-api.onrender.com', '');
                } else {
                    prevAvatar.src = 'assets/images/avata.jpg';
                    currentAvatarUrl = null;
                }
            }
            if (profileBannerEl && prevBanner) {
                currentBannerUrl = profileBannerEl.dataset.url || null;
                applyBanner(prevBanner, currentBannerUrl);
            }
            if (profileBorderEl && prevBorder) {
                const borderSrc = profileBorderEl.getAttribute('src');
                if (profileBorderEl.classList.contains('hidden') || !borderSrc || borderSrc.trim() === '') {
                    prevBorder.classList.add('hidden');
                    currentBorderUrl = null;
                } else {
                    prevBorder.src = profileBorderEl.src;
                    prevBorder.classList.remove('hidden');
                    currentBorderUrl = borderSrc.replace('https://bonfirecode-api.onrender.com', '');
                }
            }

            // Apply Lock System based on userRankId
            const borderRankReqs = {
                'border-default': 1,
                'border-infernal': 2,
                'thorn-knight': 3,
                'border-void': 4,
                'dark-crusader': 4,
                'umbral-priest': 4,
                'rhogar-warrior': 4,
                'radiant-vanguard': 5,
                'fallen-sentinel': 5
            };

            const bannerRankReqs = {
                'default': 1,
                'hellfire': 2,
                'abyssal': 3,
                'radiant': 4,
                'blood': 5
            };

            const rankNames = {
                1: "Kẻ Lưu Đày",
                2: "Kẻ Nhóm Lửa",
                3: "Kỵ Sĩ Thuật Toán",
                4: "Ma Tôn Dữ Liệu",
                5: "Lãnh Chúa Tro Tàn"
            };

            const applyLockSystem = (selector, reqsMap) => {
                document.querySelectorAll(selector).forEach(item => {
                    const url = item.getAttribute('data-url') || (item.classList.contains('id-item-banner') ? 'default' : 'border-default');
                    const reqRank = reqsMap[url] || 1;

                    // Remove existing overlay if any
                    const existingOverlay = item.querySelector('.lock-overlay');
                    if (existingOverlay) existingOverlay.remove();
                    
                    if (userRankId < reqRank) {
                        item.setAttribute('data-locked', 'true');
                        item.classList.add('grayscale', 'opacity-50', 'cursor-not-allowed', 'relative');
                        item.classList.remove('hover:border-gray-500');

                        const overlay = document.createElement('div');
                        overlay.className = 'lock-overlay absolute inset-0 bg-black/60 z-50 flex flex-col items-center justify-center rounded-md pointer-events-none';
                        overlay.innerHTML = `
                            <svg class="w-8 h-8 text-[#d4af37] drop-shadow-md mb-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" fill-rule="evenodd"></path>
                            </svg>
                            <span class="text-[10px] text-[#d4af37] font-bold uppercase text-center leading-tight">Yêu cầu<br>${rankNames[reqRank]}</span>
                        `;
                        item.appendChild(overlay);
                    } else {
                        item.removeAttribute('data-locked');
                        item.classList.remove('grayscale', 'opacity-50', 'cursor-not-allowed');
                        item.classList.add('hover:border-gray-500');
                    }
                });
            };

            applyLockSystem('.id-item-border', borderRankReqs);
            applyLockSystem('.id-item-banner', bannerRankReqs);

            modalIdentity.classList.remove('hidden');
        });

        if (btnCloseIdentity) btnCloseIdentity.addEventListener('click', closeModal);
        if (btnCancelIdentity) btnCancelIdentity.addEventListener('click', closeModal);
        
        modalIdentity.addEventListener('click', (e) => {
            if (e.target === modalIdentity) closeModal();
        });

        // Tabs Logic
        const tabAvatar = document.getElementById('tab-id-avatar');
        const tabBorder = document.getElementById('tab-id-border');
        const tabBanner = document.getElementById('tab-id-banner');
        const contentAvatar = document.getElementById('content-id-avatar');
        const contentBorder = document.getElementById('content-id-border');
        const contentBanner = document.getElementById('content-id-banner');

        const allIdTabs = [tabAvatar, tabBorder, tabBanner];
        const allIdContents = [contentAvatar, contentBorder, contentBanner];

        const switchIdTab = (activeTab, activeContent) => {
            allIdTabs.forEach(t => {
                if (t) {
                    t.classList.remove('border-b-2', 'border-[#c8aa6e]', 'text-[#c8aa6e]');
                    t.classList.add('border-transparent');
                }
            });
            allIdContents.forEach(c => {
                if (c) {
                    c.classList.add('hidden');
                    c.classList.remove('block');
                }
            });
            if (activeTab) {
                activeTab.classList.remove('border-transparent');
                activeTab.classList.add('border-b-2', 'border-[#c8aa6e]', 'text-[#c8aa6e]');
            }
            if (activeContent) {
                activeContent.classList.remove('hidden');
                activeContent.classList.add('block');
            }
        };

        if (tabAvatar) tabAvatar.addEventListener('click', () => switchIdTab(tabAvatar, contentAvatar));
        if (tabBorder) tabBorder.addEventListener('click', () => switchIdTab(tabBorder, contentBorder));
        if (tabBanner) tabBanner.addEventListener('click', () => switchIdTab(tabBanner, contentBanner));

        // Real-time Preview Logic
        const resetActiveBorders = (selector) => {
            document.querySelectorAll(selector).forEach(el => {
                el.classList.remove('ring-[#c8aa6e]');
                el.classList.add('ring-transparent');
            });
        };

        // Custom Avatar Upload Logic
        const btnUploadCustomAvatar = document.getElementById('btn-upload-custom-avatar');
        const inputUploadAvatar = document.getElementById('input-upload-avatar');
        if (btnUploadCustomAvatar && inputUploadAvatar) {
            btnUploadCustomAvatar.addEventListener('click', () => {
                inputUploadAvatar.click();
            });

            inputUploadAvatar.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const formData = new FormData();
                formData.append('file', file);

                const token = localStorage.getItem('bonfire_token');
                if (!token) {
                    alert('Phiên đăng nhập đã hết hạn.');
                    return;
                }

                try {
                    const res = await fetch(`${API_BASE_URL}/users/upload-avatar`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
                        body: formData
                    });
                    const data = await res.json();
                    if (res.ok) {
                        const url = data.avatarUrl;
                        currentAvatarUrl = url;
                        if (prevAvatar) prevAvatar.src = `https://bonfirecode-api.onrender.com${url}`;
                        
                        resetActiveBorders('.id-item-avatar');
                        
                        // Dynamically add to grid
                        const avatarGrid = document.getElementById('avatar-grid');
                        if (avatarGrid) {
                            const newImg = document.createElement('img');
                            newImg.src = `https://bonfirecode-api.onrender.com${url}`;
                            newImg.alt = "Custom Avatar";
                            newImg.className = "id-item-avatar w-full aspect-square object-cover rounded bg-[#161b22] cursor-pointer border border-transparent hover:border-gray-500 transition ring-2 ring-[#c8aa6e]";
                            newImg.setAttribute('data-url', url);
                            newImg.onerror = function() { this.src='assets/images/avata.jpg'; };
                            
                            newImg.addEventListener('click', (ev) => {
                                currentAvatarUrl = url;
                                if (prevAvatar) prevAvatar.src = `https://bonfirecode-api.onrender.com${url}`;
                                resetActiveBorders('.id-item-avatar');
                                ev.currentTarget.classList.remove('ring-transparent');
                                ev.currentTarget.classList.add('ring-[#c8aa6e]');
                            });
                            
                            btnUploadCustomAvatar.insertAdjacentElement('afterend', newImg);
                        }
                    } else {
                        alert(data.message || 'Lỗi tải ảnh lên.');
                    }
                } catch (err) {
                    console.error(err);
                    alert('Lỗi hệ thống.');
                }
                inputUploadAvatar.value = '';
            });
        }

        // Select Avatar
        document.querySelectorAll('.id-item-avatar').forEach(item => {
            item.addEventListener('click', (e) => {
                const url = e.currentTarget.getAttribute('data-url');
                currentAvatarUrl = url;
                if (prevAvatar) prevAvatar.src = `https://bonfirecode-api.onrender.com${url}`;
                
                resetActiveBorders('.id-item-avatar');
                e.currentTarget.classList.remove('ring-transparent');
                e.currentTarget.classList.add('ring-[#c8aa6e]');
            });
        });

        // Select Border
        document.querySelectorAll('.id-item-border').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.currentTarget.getAttribute('data-locked') === 'true') {
                    // Use a toast alert or simple alert
                    alert('Bạn cần thăng cấp để mở khóa Khung này!');
                    return;
                }

                const url = e.currentTarget.getAttribute('data-url');
                currentBorderUrl = url || "";
                
                if (prevBorder) {
                    // Check if the selected item has an inline SVG
                    const svgElement = e.currentTarget.querySelector('svg');
                    
                    // Remove any previously injected SVG border
                    const existingSvg = prevBorder.parentElement.querySelector('.injected-svg-border');
                    if (existingSvg) {
                        existingSvg.remove();
                    }

                    if (svgElement) {
                        // Hide image border
                        prevBorder.classList.add('hidden');
                        prevBorder.src = '';
                        
                        // Inject SVG clone
                        const clonedSvg = svgElement.cloneNode(true);
                        clonedSvg.classList.add('injected-svg-border');
                        prevBorder.parentElement.appendChild(clonedSvg);
                    } else if (url) {
                        // Regular image border
                        prevBorder.src = `https://bonfirecode-api.onrender.com${url}`;
                        prevBorder.classList.remove('hidden');
                    } else {
                        // No border
                        prevBorder.classList.add('hidden');
                        prevBorder.src = '';
                    }
                }
                
                resetActiveBorders('.id-item-border');
                e.currentTarget.classList.remove('ring-transparent');
                e.currentTarget.classList.add('ring-[#c8aa6e]');
            });
        });

        // Select Banner
        document.querySelectorAll('.id-item-banner').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.currentTarget.getAttribute('data-locked') === 'true') {
                    alert('Bạn cần thăng cấp để mở khóa Cờ này!');
                    return;
                }

                const url = e.currentTarget.getAttribute('data-url');
                currentBannerUrl = url || null;
                if (prevBanner) {
                    applyBanner(prevBanner, currentBannerUrl);
                }
                
                resetActiveBorders('.id-item-banner');
                e.currentTarget.classList.remove('ring-transparent');
                e.currentTarget.classList.add('ring-[#c8aa6e]');
            });
        });

        // Save Identity
        if (btnSaveIdentity) {
            btnSaveIdentity.addEventListener('click', async () => {
                const token = localStorage.getItem('bonfire_token');
                if (!token) return;

                btnSaveIdentity.disabled = true;
                if (spinnerSaveIdentity) spinnerSaveIdentity.classList.remove('hidden');

                const payload = {};
                if (currentAvatarUrl) payload.avatarUrl = currentAvatarUrl;
                payload.borderUrl = currentBorderUrl; // allow null to remove
                payload.bannerUrl = currentBannerUrl; // allow null to remove

                try {
                    const res = await fetch(`${API_BASE_URL}/users/update-identity`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(payload)
                    });

                    if (!res.ok) {
                        const err = await res.text();
                        throw new Error(err || "Lỗi lưu định danh.");
                    }

                    // Success - reload page or update DOM
                    window.location.reload();

                } catch (error) {
                    alert('Lỗi: ' + error.message);
                } finally {
                    btnSaveIdentity.disabled = false;
                    if (spinnerSaveIdentity) spinnerSaveIdentity.classList.add('hidden');
                }
            });
        }
    }
});

