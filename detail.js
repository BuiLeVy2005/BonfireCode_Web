const API_BASE_URL = 'https://bonfirecode-api.onrender.com/api';
function getFullImageUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return 'https://bonfirecode-api.onrender.com' + url;
}


document.addEventListener('DOMContentLoaded', () => {
    // 1. Kiểm tra Token để đổi nút Login/Logout
    const token = localStorage.getItem('bonfire_token');
    if (token) {
        document.getElementById('auth-buttons').classList.add('hidden');
        document.getElementById('user-buttons').classList.remove('hidden');
        
        // Setup dropdown toggle
        const btnAvatar = document.getElementById('btn-avatar-dropdown');
        const dropdownMenu = document.getElementById('user-dropdown-menu');
        
        if (btnAvatar && dropdownMenu) {
            btnAvatar.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownMenu.classList.toggle('hidden');
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!btnAvatar.contains(e.target) && !dropdownMenu.contains(e.target)) {
                    dropdownMenu.classList.add('hidden');
                }
            });
        }
        
        // Decode token to get username if possible
        try {
            const payload = JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))));
            // Lấy username từ các claim phổ biến
            const username = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || payload.unique_name || payload.sub || 'Kẻ Khống Lửa';
            const role = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.role;
            const usernameElem = document.getElementById('dropdown-username');
            if (usernameElem) usernameElem.textContent = username;

            if (role === 'Admin') {
                const dropdownMenu = document.querySelector('#user-dropdown-menu .py-1:nth-of-type(2)');
                if (dropdownMenu && !document.getElementById('admin-link')) {
                    dropdownMenu.insertAdjacentHTML('afterbegin', '<a id="admin-link" href="admin.html" class="block px-4 py-1.5 text-[#ff4500] font-bold hover:bg-[#0366d6] hover:text-white transition"><i class="fa-solid fa-gavel mr-1"></i> Tòa Án Tối Cao</a>');
                }
            }
            
            // Lấy AvatarUrl thật từ Backend
            fetch('https://bonfirecode-api.onrender.com/api/Auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.json()).then(data => {
                if (data.avatarUrl) {
                    const navAvatar = document.querySelector('#btn-avatar-dropdown img');
                    if (navAvatar) navAvatar.src = `${getFullImageUrl(data.avatarUrl)}`;
                }
            }).catch(e => console.error(e));
        } catch(e) { 
            console.error("Lỗi parse token hoặc fetch avatar", e); 
            localStorage.removeItem('bonfire_token');
            window.location.reload();
        }
        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) {
            btnLogout.addEventListener('click', () => {
                localStorage.removeItem('bonfire_token');
                window.location.href = 'index.html';
            });
        }
    } else {
        document.getElementById('rating-auth-warning').classList.remove('hidden');
        document.getElementById('comment-auth-warning').classList.remove('hidden');
    }

    // 2. Lấy ID từ URL Params
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (!projectId) {
        alert("Không tìm thấy thông tin dự án!");
        window.location.href = 'index.html';
        return;
    }

    // Tương tác giao diện Rating
    const starInput = document.getElementById('star-value');
    const starDisplay = document.getElementById('star-display');
    starInput.addEventListener('input', (e) => {
        starDisplay.textContent = e.target.value + '⭐';
    });

    // Load Dữ liệu
    loadProjectDetail(projectId);
    loadProjectRating(projectId);
    loadProjectComments(projectId);

    // Form Submits
    document.getElementById('form-rating').addEventListener('submit', (e) => handleRatingSubmit(e, projectId, token));
    document.getElementById('form-comment').addEventListener('submit', (e) => handleCommentSubmit(e, projectId, token));
});

// --- API Calls ---

async function loadProjectDetail(id) {
    try {
        const res = await fetch(`${API_BASE_URL}/projects/${id}`);
        if (!res.ok) throw new Error("Dự án không tồn tại hoặc lỗi máy chủ.");
        const p = await res.json();
        
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('detail-content').classList.remove('hidden');

        document.getElementById('dt-title').textContent = p.title;
        const categoryContainer = document.getElementById('dt-category');
        if (p.categoryNames && p.categoryNames.length > 0) {
            categoryContainer.innerHTML = p.categoryNames.map(name => 
                `<span class="bg-blue-900/30 text-blue-400 font-medium px-3 py-1 rounded-full text-xs border border-blue-800/30">${name}</span>`
            ).join('');
        } else {
            categoryContainer.innerHTML = '<span class="text-xs italic text-gray-500">Chưa phân loại</span>';
        }
        document.getElementById('dt-author').innerHTML = p.authorName + (p.authorName === 'LordAdmin' ? ' <i class="fa-solid fa-crown text-fire ml-1 text-xs" title="Admin"></i>' : '');
        
        // Cập nhật Avatar của tác giả
        const authorAvatarUrl = p.authorAvatarUrl ? `${getFullImageUrl(p.authorAvatarUrl)}` : 'https://placehold.co/100x100/161b22/8b949e?text=A';
        const dtAuthorAvatar = document.getElementById('dt-author-avatar');
        if (dtAuthorAvatar) dtAuthorAvatar.src = authorAvatarUrl;
        
        const dtContributorAvatar = document.getElementById('dt-contributor-avatar');
        if (dtContributorAvatar) dtContributorAvatar.src = authorAvatarUrl;
        
        const dtContributorName = document.getElementById('dt-contributor-name');
        if (dtContributorName) dtContributorName.innerHTML = p.authorName + (p.authorName === 'LordAdmin' ? ' <i class="fa-solid fa-crown text-fire ml-1 text-xs" title="Admin"></i>' : '');

        document.getElementById('dt-date').textContent = new Date(p.createdAt).toLocaleDateString('vi-VN');
        const descEl = document.getElementById('dt-desc');
        if (p.description) {
            marked.setOptions({
                highlight: function (code, lang) {
                    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
                    return hljs.highlight(code, { language }).value;
                },
                langPrefix: 'hljs language-',
                breaks: true
            });
            descEl.innerHTML = marked.parse(p.description);
        } else {
            descEl.textContent = 'Không có mô tả.';
        }
        
        const imgUrl = p.thumbnailUrl ? (p.thumbnailUrl.startsWith('http') ? p.thumbnailUrl : `${getFullImageUrl(p.thumbnailUrl)}`) : 'https://placehold.co/1200x600/222/ea580c?text=No+Image';
        document.getElementById('dt-image').src = imgUrl;
        
        document.getElementById('btn-download').href = `${getFullImageUrl(p.sourceCodeUrl)}`;

        const btnDownload = document.getElementById('btn-download');
        if (btnDownload) {
            btnDownload.addEventListener('click', () => {
                fetch(`${API_BASE_URL}/projects/${projectId}/download`, { method: 'POST' }).catch(console.error);
            });
        }

    } catch (err) {
        document.getElementById('loading').innerHTML = `<p class="text-red-500">${err.message}</p>`;
    }
}

async function loadProjectRating(id) {
    try {
        const res = await fetch(`${API_BASE_URL}/ratings/${id}`);
        if (res.ok) {
            const data = await res.json();
            document.getElementById('dt-rating-avg').textContent = data.average.toFixed(1);
            document.getElementById('dt-rating-count').textContent = `(${data.totalRatings} đánh giá)`;
        }
    } catch (err) {
        console.error("Lỗi lấy rating:", err);
    }
}

async function loadProjectComments(id) {
    try {
        const res = await fetch(`${API_BASE_URL}/comments/${id}`);
        if (res.ok) {
            const comments = await res.json();
            const list = document.getElementById('comments-list');
            
            if (comments.length === 0) {
                list.innerHTML = '<p class="text-neutral-500 text-sm italic text-center">Chưa có bình luận nào. Hãy là người đầu tiên để lại dấu ấn!</p>';
                return;
            }

            list.innerHTML = comments.map(c => `
                <div class="bg-[#0d1117] p-4 rounded border border-gray-800">
                    <div class="flex justify-between items-center mb-2 border-b border-gray-900 pb-2">
                        <span class="font-bold text-purple-400 text-sm">${c.authorName} ${c.authorName === 'LordAdmin' ? '<i class="fa-solid fa-crown text-fire ml-1 text-xs" title="Admin"></i>' : ''}</span>
                        <span class="text-xs text-neutral-500">${new Date(c.createdAt).toLocaleString('vi-VN')}</span>
                    </div>
                    <p class="text-neutral-300 text-sm whitespace-pre-line">${c.content}</p>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error("Lỗi lấy comments:", err);
    }
}

// --- Submit Handlers ---

async function handleRatingSubmit(e, projectId, token) {
    e.preventDefault();
    if (!token) {
        alert("Bạn chưa đăng nhập! Vui lòng Đăng Nhập để đánh giá.");
        return;
    }

    const starValue = document.getElementById('star-value').value;
    const msgBox = document.getElementById('rating-msg');

    try {
        const res = await fetch(`${API_BASE_URL}/ratings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ projectId, starValue: parseInt(starValue) })
        });

        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('bonfire_token');
            throw new Error("Phiên đăng nhập hết hạn. Vui lòng tải lại trang và Đăng Nhập.");
        }

        if (!res.ok) throw new Error("Lỗi khi gửi đánh giá.");
        
        msgBox.textContent = "Đã gửi đánh giá thành công!";
        msgBox.className = "mt-2 text-sm text-center text-green-500";
        msgBox.classList.remove('hidden');

        // Reload rating
        loadProjectRating(projectId);
    } catch (err) {
        msgBox.textContent = err.message;
        msgBox.className = "mt-2 text-sm text-center text-red-500";
        msgBox.classList.remove('hidden');
    }
}

async function handleCommentSubmit(e, projectId, token) {
    e.preventDefault();
    if (!token) {
        alert("Bạn chưa đăng nhập! Vui lòng Đăng Nhập để bình luận.");
        return;
    }

    const contentInput = document.getElementById('comment-content');
    const msgBox = document.getElementById('comment-msg');

    try {
        const res = await fetch(`${API_BASE_URL}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ projectId, content: contentInput.value })
        });

        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('bonfire_token');
            throw new Error("Phiên đăng nhập hết hạn. Vui lòng tải lại trang và Đăng Nhập.");
        }

        if (!res.ok) throw new Error("Lỗi khi gửi bình luận.");
        
        contentInput.value = '';
        msgBox.textContent = "Đã gửi bình luận thành công!";
        msgBox.className = "mb-4 text-sm text-center text-green-500";
        msgBox.classList.remove('hidden');

        // Reload comments
        loadProjectComments(projectId);
        
        // Hide success message after 3 seconds
        setTimeout(() => msgBox.classList.add('hidden'), 3000);
    } catch (err) {
        msgBox.textContent = err.message;
        msgBox.className = "mb-4 text-sm text-center text-red-500";
        msgBox.classList.remove('hidden');
    }
}

// --- MINI PROFILE POPUP LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    const popup = document.getElementById('mini-profile-popup');
    let hoverTimeout;
    let hideTimeout;
    let currentTargetUsername = '';
    let currentTargetId = '';

    const authorElements = [document.getElementById('dt-author-avatar'), document.getElementById('dt-author')];

    authorElements.forEach(el => {
        if (!el) return;
        el.addEventListener('mouseenter', (e) => {
            clearTimeout(hideTimeout);
            const username = document.getElementById('dt-author').textContent;
            if (!username || username.trim() === '') return;
            
            hoverTimeout = setTimeout(async () => {
                try {
                    const res = await fetch(`https://bonfirecode-api.onrender.com/api/users/${username}/profile`);
                    if (res.ok) {
                        const data = await res.json();
                        currentTargetUsername = data.username;
                        currentTargetId = data.id;

                        // Fill popup data
                        document.getElementById('popup-fullname').textContent = data.fullName || data.username;
                        document.getElementById('popup-username-link').textContent = `@${data.username}`;
                        document.getElementById('popup-username-link').href = `profile.html?username=${data.username}`;
                        const viewProfileBtn = document.getElementById('popup-view-profile');
                        if (viewProfileBtn) viewProfileBtn.href = `profile.html?username=${data.username}`;
                        
                        document.getElementById('popup-bio').textContent = data.bio || 'Chưa có tiểu sử.';
                        document.getElementById('popup-followers').textContent = data.followersCount;
                        document.getElementById('popup-following').textContent = data.followingCount;
                        
                        const avatarUrl = data.avatarUrl ? `${getFullImageUrl(data.avatarUrl)}` : 'https://placehold.co/100x100/161b22/8b949e?text=U';
                        document.getElementById('popup-avatar').src = avatarUrl;
                        const coverUrl = data.coverUrl ? `${getFullImageUrl(data.coverUrl)}` : 'https://placehold.co/600x200/222/ea580c?text=Cover';
                        document.getElementById('popup-cover').src = coverUrl;

                        // Position popup
                        const rect = el.getBoundingClientRect();
                        popup.style.top = `${rect.bottom + window.scrollY + 10}px`;
                        popup.style.left = `${rect.left + window.scrollX}px`;
                        popup.style.display = 'block';
                        
                        // Small reflow delay for transition
                        setTimeout(() => {
                            popup.classList.remove('opacity-0', 'pointer-events-none');
                        }, 10);
                    }
                } catch (err) {
                    console.error('Error fetching user profile:', err);
                }
            }, 300);
        });

        el.addEventListener('mouseleave', () => {
            clearTimeout(hoverTimeout);
            hideTimeout = setTimeout(() => {
                popup.classList.add('opacity-0', 'pointer-events-none');
                setTimeout(() => { popup.style.display = 'none'; }, 300);
            }, 300);
        });
    });

    if (popup) {
        popup.addEventListener('mouseenter', () => {
            clearTimeout(hideTimeout);
        });

        popup.addEventListener('mouseleave', () => {
            hideTimeout = setTimeout(() => {
                popup.classList.add('opacity-0', 'pointer-events-none');
                setTimeout(() => { popup.style.display = 'none'; }, 300);
            }, 300);
        });
    }

    const btnFollow = document.getElementById('btn-popup-follow');
    if (btnFollow) {
        btnFollow.addEventListener('click', async () => {
            if (!currentTargetId) return;
            const token = localStorage.getItem('bonfire_token');
            if (!token) {
                alert('Vui lòng đăng nhập để theo dõi!');
                return;
            }

            try {
                const res = await fetch(`https://bonfirecode-api.onrender.com/api/users/${currentTargetId}/toggle-follow`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                const result = await res.json();
                if (res.ok) {
                    const followersEl = document.getElementById('popup-followers');
                    let count = parseInt(followersEl.textContent);
                    if (result.isFollowing) {
                        btnFollow.textContent = 'Đang theo dõi';
                        btnFollow.classList.replace('bg-gray-700', 'bg-blue-600');
                        followersEl.textContent = count + 1;
                    } else {
                        btnFollow.textContent = 'Theo dõi';
                        btnFollow.classList.replace('bg-blue-600', 'bg-gray-700');
                        followersEl.textContent = count - 1;
                    }
                } else {
                    alert(result.message);
                }
            } catch (err) {
                console.error(err);
            }
        });
    }
});
