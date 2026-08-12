const API_BASE_URL = 'https://bonfirecode-api.onrender.com/api';

// --- State Management cho Cross-Filtering ---
let allProjectsList = [];
let currentLangFilter = null;
let currentSubjectFilter = null;
let currentSearchQuery = "";
let currentSort = 'newest';

document.addEventListener('DOMContentLoaded', () => {
    fetchProjects();
    fetchCategories();

    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    
    // --- Lọc theo Search (Gọi applyFilters) ---
    searchInput.addEventListener('input', function (e) {
        currentSearchQuery = e.target.value.toLowerCase();
        applyFilters();
    });

    searchBtn.addEventListener('click', () => {
        currentSearchQuery = searchInput.value.toLowerCase();
        applyFilters();
    });

    searchInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            searchBtn.click();
        }
    });

    // --- Sắp xếp (Sort) ---
    const sortBtns = document.querySelectorAll('.sort-btn');
    sortBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetBtn = e.currentTarget;
            currentSort = targetBtn.dataset.sort;
            
            // Xóa active class TẤT CẢ các nút sort
            sortBtns.forEach(b => {
                b.classList.remove('bg-[#1f242c]', 'text-purple-400', 'font-semibold', 'border-[#30363d]');
                b.classList.add('text-[#8b949e]', 'border-transparent');
            });
            
            // Set active class cho nút vừa click
            targetBtn.classList.remove('text-[#8b949e]', 'border-transparent');
            targetBtn.classList.add('bg-[#1f242c]', 'text-purple-400', 'font-semibold', 'border-[#30363d]');
            
            applyFilters();
        });
    });

    // Auth UI Logic
    const token = localStorage.getItem('bonfire_token');
    const authButtons = document.getElementById('auth-buttons');
    const userButtons = document.getElementById('user-buttons');

    if (token) {
        if(authButtons) authButtons.classList.add('hidden');
        if(userButtons) userButtons.classList.remove('hidden');
    } else {
        if(authButtons) authButtons.classList.remove('hidden');
        if(userButtons) userButtons.classList.add('hidden');
    }

    
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
        if (token) {
            try {
                const payload = JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))));
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
                        if (navAvatar) {
                            navAvatar.src = data.avatarUrl.startsWith('http') ? data.avatarUrl : `https://bonfirecode-api.onrender.com${data.avatarUrl}`;
                        }
                    }
                }).catch(e => console.error(e));
            } catch(e) { 
                console.error("Lỗi parse token hoặc fetch avatar", e); 
                localStorage.removeItem('bonfire_token');
            }
        }
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('bonfire_token');
            window.location.href = 'index.html';
        });
    }
});

// --- API Calls ---

async function fetchProjects() {
    const grid = document.getElementById('project-grid');
    grid.innerHTML = `
        <div class="col-span-full text-center py-20 text-neutral-500">
            <svg class="animate-spin h-8 w-8 mx-auto mb-4 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p>Đang tải dữ liệu từ ngọn lửa...</p>
        </div>
    `;

    try {
        const res = await fetch(`${API_BASE_URL}/projects`);
        if (!res.ok) throw new Error("Lỗi kết nối tới API Server.");
        
        const data = await res.json();
        
        // Fetch ratings cho tất cả projects để phục vụ Sắp xếp theo Rating
        await Promise.all(data.map(async (p) => {
            try {
                const rRes = await fetch(`${API_BASE_URL}/ratings/${p.id}`);
                if (rRes.ok) {
                    const rData = await rRes.json();
                    p.averageRating = rData.average || 0;
                    p.totalRatings = rData.totalRatings || 0;
                } else {
                    p.averageRating = 0;
                    p.totalRatings = 0;
                }
            } catch {
                p.averageRating = 0;
                p.totalRatings = 0;
            }
        }));
        
        allProjectsList = data;
        applyFilters();
    } catch (e) {
        console.error(e);
        grid.innerHTML = `
            <div class="col-span-full text-center py-20 text-red-500">
                <p>Ngọn lửa đã tắt. Không thể kết nối tới server!</p>
                <p class="text-sm mt-2 text-neutral-500">${e.message}</p>
            </div>
        `;
    }
}

let currentPage = 1;
const ITEMS_PER_PAGE = 5;
let currentDisplayedProjects = [];

// --- Logic Lọc Chéo Đa Điều Kiện (Cross-Filtering) ---
function applyFilters() {
    let filtered = allProjectsList;

    if (currentSearchQuery) {
        filtered = filtered.filter(p => 
            (p.title && p.title.toLowerCase().includes(currentSearchQuery)) ||
            (p.description && p.description.toLowerCase().includes(currentSearchQuery)) ||
            (p.authorName && p.authorName.toLowerCase().includes(currentSearchQuery))
        );
    }

    if (currentLangFilter) {
        filtered = filtered.filter(p => p.categoryNames && p.categoryNames.includes(currentLangFilter));
    }

    if (currentSubjectFilter) {
        filtered = filtered.filter(p => p.categoryNames && p.categoryNames.includes(currentSubjectFilter));
    }

    // Logic Sắp Xếp
    let sorted = [...filtered];
    if (currentSort === 'newest') {
        sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (currentSort === 'oldest') {
        sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (currentSort === 'rating') {
        sorted.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    }

    currentDisplayedProjects = sorted;
    currentPage = 1; // Reset về trang 1 mỗi khi lọc/tìm kiếm
    renderCurrentPage();
}

function renderCurrentPage() {
    const totalPages = Math.ceil(currentDisplayedProjects.length / ITEMS_PER_PAGE);
    
    // Nếu không có data hoặc chỉ có 1 trang, ẩn pagination
    const paginationContainer = document.getElementById('pagination-container');
    if (totalPages <= 1) {
        if(paginationContainer) paginationContainer.classList.add('hidden');
    } else {
        if(paginationContainer) paginationContainer.classList.remove('hidden');
    }

    // Tính toán index slice
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageData = currentDisplayedProjects.slice(startIndex, endIndex);

    renderProjects(pageData);
    renderPaginationControls(totalPages);
}

function renderPaginationControls(totalPages) {
    const btnPrev = document.getElementById('btn-prev-page');
    const btnNext = document.getElementById('btn-next-page');
    const paginationNumbers = document.getElementById('pagination-numbers');
    if(!btnPrev || !btnNext || !paginationNumbers) return;

    btnPrev.disabled = (currentPage === 1);
    btnNext.disabled = (currentPage === totalPages);

    paginationNumbers.innerHTML = '';
    
    // Hiển thị tối đa 5 nút xung quanh trang hiện tại (logic đơn giản)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    if (endPage - startPage < 4) {
        if (startPage === 1) endPage = Math.min(totalPages, 5);
        else if (endPage === totalPages) startPage = Math.max(1, totalPages - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = `px-3 py-1 rounded transition text-sm font-medium ${i === currentPage ? 'bg-purple-600 text-white border-purple-500' : 'bg-[#161b22] border border-[#30363d] text-gray-400 hover:bg-[#21262d] hover:text-white'}`;
        
        btn.addEventListener('click', () => {
            currentPage = i;
            renderCurrentPage();
            // Cuộn mượt lên đầu danh sách project
            document.getElementById('project-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        
        paginationNumbers.appendChild(btn);
    }
}

// Setup Event listeners for Prev/Next buttons
document.addEventListener('DOMContentLoaded', () => {
    const btnPrev = document.getElementById('btn-prev-page');
    const btnNext = document.getElementById('btn-next-page');
    
    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderCurrentPage();
                document.getElementById('project-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }
    
    if (btnNext) {
        btnNext.addEventListener('click', () => {
            const totalPages = Math.ceil(currentDisplayedProjects.length / ITEMS_PER_PAGE);
            if (currentPage < totalPages) {
                currentPage++;
                renderCurrentPage();
                document.getElementById('project-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }
});

function renderProjects(projects) {
    const grid = document.getElementById('project-grid');
    grid.innerHTML = '';

    if (projects.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-20 text-neutral-500">
                <p>Không tìm thấy bảo vật nào trong khu vực này.</p>
            </div>
        `;
        return;
    }

    projects.forEach(p => {
        const card = document.createElement('div');
        card.className = 'bg-[#0d1117] rounded-md overflow-hidden border border-[#30363d] hover:border-purple-500 transition duration-300 flex flex-col md:flex-row group w-full';
        
        const imgUrl = p.thumbnailUrl ? (p.thumbnailUrl.startsWith('http') ? p.thumbnailUrl : `https://bonfirecode-api.onrender.com${p.thumbnailUrl}`) : 'https://placehold.co/600x400/222/ea580c?text=No+Image';

        card.innerHTML = `
            <a href="detail.html?id=${p.id}" class="block w-full md:w-[220px] h-32 md:h-auto overflow-hidden shrink-0 border-r border-[#30363d]">
                <img src="${imgUrl}" alt="${p.title}" onerror="this.src='https://placehold.co/600x400/222/ea580c?text=No+Image'" class="w-full h-full object-cover transform group-hover:scale-105 transition duration-500">
            </a>
            <div class="p-4 flex flex-col justify-between flex-grow">
                <div>
                    <div class="flex justify-between items-start">
                        <a href="detail.html?id=${p.id}" class="hover:text-purple-400 transition duration-300">
                            <h3 class="text-lg font-bold text-[#c9d1d9] group-hover:text-blue-400 transition duration-300">${p.title}</h3>
                        </a>
                        <div class="flex flex-wrap gap-1 justify-end ml-2">
                            ${p.categoryNames.map(name => `<span class="bg-purple-900/30 text-purple-400 font-mono text-[10px] px-2 py-0.5 rounded-full border border-purple-700/50 whitespace-nowrap">${name}</span>`).join('')}
                        </div>
                    </div>
                    <p class="text-[#8b949e] text-sm mt-2 line-clamp-2">${p.description}</p>
                </div>
                
                <div class="flex justify-between items-center text-xs mt-4 pt-3 border-t border-[#30363d]">
                    <div class="flex items-center text-[#8b949e] space-x-4">
                        <div class="flex items-center">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                            <span>${p.authorName}</span>
                            ${p.authorName === 'LordAdmin' ? '<i class="fa-solid fa-crown text-fire ml-1 text-xs" title="Admin"></i>' : ''}
                        </div>
                        <div class="flex items-center" title="Điểm đánh giá trung bình">
                            <svg class="w-3.5 h-3.5 mr-1 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                            <span class="rating-text font-medium ${p.totalRatings > 0 ? 'text-purple-400' : 'text-[#8b949e]'}">
                                ${p.totalRatings > 0 ? `${p.averageRating} (${p.totalRatings})` : 'Chưa có'}
                            </span>
                        </div>
                    </div>
                    
                    <a href="${p.sourceCodeUrl ? (p.sourceCodeUrl.startsWith('http') ? p.sourceCodeUrl : 'https://bonfirecode-api.onrender.com' + p.sourceCodeUrl) : '#'}" target="_blank" class="flex items-center justify-center bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] px-3 py-1.5 rounded-md transition duration-300 border border-[#30363d] text-xs font-semibold shadow-sm">
                        <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        Tải Code
                    </a>
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

async function fetchRating(projectId) {
    try {
        const res = await fetch(`${API_BASE_URL}/ratings/${projectId}`);
        if (!res.ok) return;
        const data = await res.json();
        
        const ratingContainer = document.querySelector(`#rating-${projectId}`);
        const ratingSpan = ratingContainer.querySelector('.rating-text');
        
        if (data.totalRatings > 0) {
            ratingSpan.textContent = `${data.average} (${data.totalRatings})`;
            ratingSpan.classList.add('text-purple-400');
        } else {
            ratingSpan.textContent = `Chưa có`;
        }
    } catch (e) {
        console.error("Lỗi khi tải rating:", e);
    }
}

async function fetchCategories() {
    try {
        const res = await fetch(`${API_BASE_URL}/categories`);
        if (!res.ok) return;
        const categories = await res.json();
        
        const categoryList = document.getElementById('categoryFilterList');
        
        let html = `
            <li>
                <button id="btn-all-categories" onclick="window.resetFilters(this)" class="w-full text-left px-3 py-1.5 bg-[#1f242c] text-purple-400 font-semibold border-l-2 border-purple-500 rounded-md transition text-sm whitespace-normal break-words leading-tight">
                    🔥 Tất cả Lãnh địa
                </button>
            </li>
        `;

        const langs = categories.filter(c => c.type === 'NgonNgu');
        const subjects = categories.filter(c => c.type === 'MonHoc');

        const renderGroup = (title, items, moreId, btnId, type) => {
            if (items.length === 0) return '';
            
            let groupHtml = `<li class="pt-4 pb-2"><h3 class="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">${title}</h3></li>`;
            
            const defaultItems = items.slice(0, 3);
            const moreItems = items.slice(3);
            
            groupHtml += `<li class="flex flex-col gap-2">`;
            defaultItems.forEach(c => {
                groupHtml += `<button onclick="window.handleCategoryClick('${c.name}', '${type}', this)" class="cat-btn-${type} w-full text-left px-3 py-1.5 text-[#8b949e] rounded-md hover:bg-[#1f242c] hover:text-gray-200 transition text-sm whitespace-normal break-words leading-tight">${c.name}</button>`;
            });
            
            if (moreItems.length > 0) {
                groupHtml += `<div id="${moreId}" class="hidden grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#30363d]">`;
                moreItems.forEach(c => {
                    groupHtml += `<button onclick="window.handleCategoryClick('${c.name}', '${type}', this)" class="cat-btn-${type} w-full text-left px-3 py-1.5 text-[#8b949e] rounded-md hover:bg-[#1f242c] hover:text-gray-200 transition text-sm whitespace-normal break-words leading-tight" title="${c.name}">${c.name}</button>`;
                });
                groupHtml += `</div>`;
                
                groupHtml += `<button id="${btnId}" onclick="window.toggleSidebarCat('${moreId}', '${btnId}')" class="text-xs text-purple-400 hover:text-purple-300 mt-2 flex items-center transition w-full text-left px-1">Hiển thị thêm ▾</button>`;
            }
            
            groupHtml += `</li>`;
            return groupHtml;
        };

        html += renderGroup('NGÔN NGỮ LẬP TRÌNH', langs, 'more-lang', 'btn-toggle-lang', 'NgonNgu');
        html += renderGroup('MÔN HỌC', subjects, 'more-subject', 'btn-toggle-subject', 'MonHoc');
        
        categoryList.innerHTML = html;
        
    } catch (e) {
        console.error("Lỗi tải danh mục:", e);
    }
}

// --- Logic UI Click Handler ---
window.handleCategoryClick = function(categoryName, type, element) {
    let isActive = false;

    if (type === 'NgonNgu') {
        if (currentLangFilter === categoryName) {
            currentLangFilter = null; // Toggle off
        } else {
            currentLangFilter = categoryName; // Select new
            isActive = true;
        }
    } else if (type === 'MonHoc') {
        if (currentSubjectFilter === categoryName) {
            currentSubjectFilter = null; // Toggle off
        } else {
            currentSubjectFilter = categoryName; // Select new
            isActive = true;
        }
    }

    // Xóa active class của TẤT CẢ các mục trong cùng nhóm (type)
    const groupBtns = document.querySelectorAll(`.cat-btn-${type}`);
    groupBtns.forEach(b => {
        b.classList.remove('bg-[#1f242c]', 'text-purple-400', 'font-semibold', 'border-l-2', 'border-purple-500');
        b.classList.add('text-[#8b949e]');
    });

    // Thêm active class vào mục vừa click (nếu nó đang được bật)
    if (isActive) {
        element.classList.remove('text-[#8b949e]');
        element.classList.add('bg-[#1f242c]', 'text-purple-400', 'font-semibold', 'border-l-2', 'border-purple-500');
    }

    // Xử lý nút "Tất cả Lãnh địa"
    const btnAll = document.getElementById('btn-all-categories');
    btnAll.classList.remove('bg-[#1f242c]', 'text-purple-400', 'font-semibold', 'border-l-2', 'border-purple-500');
    btnAll.classList.add('text-[#8b949e]');

    if (!currentLangFilter && !currentSubjectFilter) {
        btnAll.classList.remove('text-[#8b949e]');
        btnAll.classList.add('bg-[#1f242c]', 'text-purple-400', 'font-semibold', 'border-l-2', 'border-purple-500');
    }

    applyFilters();
};

window.resetFilters = function(element) {
    currentLangFilter = null;
    currentSubjectFilter = null;
    currentSearchQuery = document.getElementById('searchInput').value.toLowerCase();
    
    // Tẩy trắng tất cả mục
    document.querySelectorAll('.cat-btn-NgonNgu, .cat-btn-MonHoc').forEach(b => {
        b.classList.remove('bg-[#1f242c]', 'text-purple-400', 'font-semibold', 'border-l-2', 'border-purple-500');
        b.classList.add('text-[#8b949e]');
    });
    
    // Sáng Tất cả
    element.classList.remove('text-[#8b949e]');
    element.classList.add('bg-[#1f242c]', 'text-purple-400', 'font-semibold', 'border-l-2', 'border-purple-500');

    applyFilters();
};

window.toggleSidebarCat = function(moreId, btnId) {
    const moreDiv = document.getElementById(moreId);
    const btn = document.getElementById(btnId);
    if (moreDiv.classList.contains('hidden')) {
        moreDiv.classList.remove('hidden');
        btn.textContent = 'Ẩn bớt ▴';
    } else {
        moreDiv.classList.add('hidden');
        btn.textContent = 'Hiển thị thêm ▾';
    }
};
