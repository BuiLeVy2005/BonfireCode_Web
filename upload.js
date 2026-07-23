const API_BASE_URL = 'https://bonfirecode-api.onrender.com/api';
function getFullImageUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return "https://bonfirecode-api.onrender.com" + url;
}

document.addEventListener('DOMContentLoaded', () => {
    // Auth Check
    const token = localStorage.getItem('bonfire_token');
    if (!token) {
        alert("Bạn chưa Đăng Nhập. Không đủ tư cách thắp lửa!");
        window.location.href = 'auth.html';
        return;
    }

    // Since token exists, show user navbar and hide guest navbar
    const authBtns = document.getElementById('auth-buttons');
    const userBtns = document.getElementById('user-buttons');
    if (authBtns) authBtns.classList.add('hidden');
    if (userBtns) userBtns.classList.remove('hidden');

    fetchCategories();

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
            const username = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || payload.unique_name || payload.sub || 'Kẻ Khống Lửa';
            const usernameElem = document.getElementById('dropdown-username');
            if (usernameElem) usernameElem.textContent = username;
            
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
            window.location.href = 'index.html';
        }
    const logoutBtn = document.getElementById('btn-logout');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('bonfire_token');
            window.location.href = 'index.html';
        });
    }

    // UI File selection feedback
    const thumbInput = document.getElementById('up-thumbnail');
    const sourceInput = document.getElementById('up-source');
    const thumbName = document.getElementById('thumb-name');
    const sourceName = document.getElementById('source-name');

    // --- REAL-TIME PREVIEW LOGIC ---
    const upTitle = document.getElementById('up-title');
    const upDesc = document.getElementById('up-desc');
    const previewTitle = document.getElementById('preview-title');
    const previewDesc = document.getElementById('preview-desc');
    const previewImage = document.getElementById('preview-image');
    const previewCategories = document.getElementById('preview-categories');

    // 1. Text input preview
    const updateTextPreview = () => {
        if (previewTitle) previewTitle.textContent = upTitle.value.trim() || 'Tên dự án sẽ hiện ở đây...';
        if (previewDesc) previewDesc.textContent = upDesc.value.trim() || 'Mô tả dự án sẽ hiện ở đây...';
    };
    if (upTitle) upTitle.addEventListener('input', updateTextPreview);
    if (upDesc) upDesc.addEventListener('input', updateTextPreview);

    // 2. Thumbnail preview using FileReader
    if (thumbInput) {
        thumbInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (thumbName) thumbName.textContent = file.name;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    if (previewImage) previewImage.src = ev.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                if (thumbName) thumbName.textContent = 'Chưa chọn file';
                if (previewImage) previewImage.src = 'https://placehold.co/1200x600/222/ea580c?text=No+Image';
            }
        });
    }

    // 3. Category preview
    const updateCategoryPreview = () => {
        const selectedCbs = Array.from(document.querySelectorAll('input[name="category"]:checked'));
        if (!previewCategories) return;
        if (selectedCbs.length === 0) {
            previewCategories.innerHTML = '<span class="px-2 py-0.5 rounded-full bg-[#1f242c] border border-[#30363d] text-[#8b949e] text-xs font-medium">Chưa chọn lãnh địa</span>';
        } else {
            previewCategories.innerHTML = selectedCbs.map(cb => {
                const labelText = cb.nextElementSibling.textContent;
                return `<span class="px-2 py-0.5 rounded-full bg-[#1f242c] border border-[#30363d] text-[#8b949e] text-xs font-medium">${labelText}</span>`;
            }).join('');
        }
    };

    // Bind event delegation to containers
    const langContainer = document.getElementById('lang-checkboxes');
    const subjContainer = document.getElementById('subject-checkboxes');
    if (langContainer) langContainer.addEventListener('change', updateCategoryPreview);
    if (subjContainer) subjContainer.addEventListener('change', updateCategoryPreview);
    
    sourceInput.addEventListener('change', (e) => {
        if(e.target.files[0]) sourceName.textContent = e.target.files[0].name;
    });

    // Form Submission
    const formUpload = document.getElementById('form-upload');
    const errorBox = document.getElementById('upload-error');
    const successBox = document.getElementById('upload-success');

    formUpload.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-upload-submit');
        btn.disabled = true;
        btn.textContent = "Đang rèn (Uploading)...";
        errorBox.classList.add('hidden');
        successBox.classList.add('hidden');

        const sourceFile = sourceInput.files[0];
        if (!sourceFile) {
            errorBox.textContent = "Phải đính kèm Source Code!";
            errorBox.classList.remove('hidden');
            btn.disabled = false;
            btn.textContent = "Hiến Tế Ngọn Lửa (Tải Lên)";
            return;
        }

        const title = document.getElementById('up-title').value;
        const desc = document.getElementById('up-desc').value;
        
        // Lấy tất cả CategoryIds đã chọn
        const selectedCategories = Array.from(document.querySelectorAll('input[name="category"]:checked'))
                                        .map(cb => cb.value);

        if (selectedCategories.length === 0) {
            errorBox.textContent = "Vui lòng chọn ít nhất 1 Lãnh địa.";
            errorBox.classList.remove('hidden');
            btn.disabled = false;
            btn.textContent = "Hiến Tế Ngọn Lửa (Tải Lên)";
            return;
        }

        const formData = new FormData();
        formData.append("Title", title);
        formData.append("Description", desc);
        selectedCategories.forEach(id => formData.append("CategoryIds", id));
        formData.append("SourceCodeFile", sourceFile);
        
        const thumbFile = thumbInput.files[0];
        if (thumbFile) {
            formData.append("ThumbnailFile", thumbFile);
        }

        try {
            const res = await fetch(`${API_BASE_URL}/projects`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token
                    // Do not set Content-Type, fetch will automatically set it to multipart/form-data with the correct boundary
                },
                body: formData
            });

            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('bonfire_token');
                throw new Error("Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.");
            }

            if (res.ok) {
                successBox.textContent = "Bảo vật đã được hiến tế thành công!";
                successBox.classList.remove('hidden');
                formUpload.reset();
                thumbName.textContent = "Chưa chọn file";
                sourceName.textContent = "Chưa chọn file";
            } else {
                throw new Error("Lỗi từ server: " + await res.text());
            }
        } catch (e) {
            console.error(e);
            errorBox.textContent = "Có lỗi xảy ra: " + e.message;
            errorBox.classList.remove('hidden');
            if (e.message.includes("đăng nhập lại")) {
                setTimeout(() => window.location.href = 'auth.html', 1500);
            }
        } finally {
            btn.disabled = false;
            btn.textContent = "Hiến Tế Ngọn Lửa (Tải Lên)";
        }
    });
});

async function fetchCategories() {
    try {
        const res = await fetch(`${API_BASE_URL}/categories`);
        if (!res.ok) return;
        const categories = await res.json();
        
        const langsContainer = document.getElementById('lang-checkboxes');
        const subjectsContainer = document.getElementById('subject-checkboxes');
        langsContainer.innerHTML = '';
        subjectsContainer.innerHTML = '';
        
        const langs = categories.filter(c => c.type === 'NgonNgu');
        const subjects = categories.filter(c => c.type === 'MonHoc');

        const createCheckboxHTML = (c) => `
            <label class="flex items-center space-x-3 cursor-pointer group">
                <input type="checkbox" name="category" value="${c.id}" class="form-checkbox h-4 w-4 text-purple-600 bg-[#0d1117] border-[#30363d] rounded focus:ring-purple-500">
                <span class="text-sm text-gray-300 group-hover:text-white transition">${c.name}</span>
            </label>
        `;

        langsContainer.innerHTML = langs.map(createCheckboxHTML).join('');
        subjectsContainer.innerHTML = subjects.map(createCheckboxHTML).join('');
        
    } catch (e) {
        console.error("Lỗi tải danh mục:", e);
    }
}

