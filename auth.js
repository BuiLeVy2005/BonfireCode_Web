const API_BASE_URL = 'https://bonfirecode-api.onrender.com/api';

document.addEventListener('DOMContentLoaded', () => {
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const formForgot = document.getElementById('form-forgot');
    const errorBox = document.getElementById('auth-error');
    
    // Forgot Password elements
    const linkForgot = document.getElementById('link-forgot');
    const btnBackToLogin = document.getElementById('btn-back-to-login');
    const formForgotStep1 = document.getElementById('form-forgot-step1');
    const formForgotStep2 = document.getElementById('form-forgot-step2');

    // UI Toggling
    tabLogin.addEventListener('click', () => {
        formLogin.classList.remove('hidden');
        formRegister.classList.add('hidden');
        tabLogin.className = "w-1/2 py-3 text-purple-500 font-medium border-b-2 border-purple-500";
        tabRegister.className = "w-1/2 py-3 text-neutral-500 hover:text-neutral-300 font-medium border-b-2 border-transparent transition";
        errorBox.classList.add('hidden');
    });

    tabRegister.addEventListener('click', () => {
        formRegister.classList.remove('hidden');
        formLogin.classList.add('hidden');
        formForgot.classList.add('hidden');
        tabRegister.className = "w-1/2 py-3 text-purple-500 font-medium border-b-2 border-purple-500";
        tabLogin.className = "w-1/2 py-3 text-neutral-500 hover:text-neutral-300 font-medium border-b-2 border-transparent transition";
        errorBox.classList.add('hidden');
    });

    linkForgot.addEventListener('click', (e) => {
        e.preventDefault();
        formLogin.classList.add('hidden');
        formRegister.classList.add('hidden');
        formForgot.classList.remove('hidden');
        formForgotStep1.classList.remove('hidden');
        formForgotStep2.classList.add('hidden');
        errorBox.classList.add('hidden');
    });

    btnBackToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        formForgot.classList.add('hidden');
        formLogin.classList.remove('hidden');
        errorBox.classList.add('hidden');
    });

    // Login Logic
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-login-submit');
        btn.disabled = true;
        btn.textContent = "Đang xử lý...";
        errorBox.classList.add('hidden');

        const payload = {
            username: document.getElementById('login-username').value,
            password: document.getElementById('login-password').value
        };

        try {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Sai tài khoản hoặc mật khẩu.");
            }

            const data = await res.json();
            localStorage.setItem('bonfire_token', data.token);
            window.location.href = 'dashboard.html';
        } catch (err) {
            errorBox.textContent = err.message;
            errorBox.classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.textContent = "Tiến Vào Trạm Nghỉ";
        }
    });

    // Register Logic
    formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-reg-submit');
        btn.disabled = true;
        btn.textContent = "Đang tạo tài khoản...";
        errorBox.classList.add('hidden');

        const payload = {
            username: document.getElementById('reg-username').value,
            email: document.getElementById('reg-email').value,
            password: document.getElementById('reg-password').value
        };

        try {
            const res = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Lỗi đăng ký.");
            }

            // Đăng ký thành công thì chuyển sang tab login
            errorBox.className = "mb-4 bg-green-900/30 border border-green-500/50 text-green-400 p-3 rounded text-sm";
            errorBox.textContent = "Đăng ký thành công! Hãy đăng nhập.";
            errorBox.classList.remove('hidden');
            
            setTimeout(() => {
                tabLogin.click();
                errorBox.className = "hidden mb-4 bg-red-900/30 border border-red-500/50 text-red-400 p-3 rounded text-sm";
            }, 2000);

        } catch (err) {
            errorBox.textContent = err.message;
            errorBox.classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.textContent = "Create account >";
        }
    });

    // Forgot Password - Step 1
    formForgotStep1.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-forgot-step1');
        btn.disabled = true;
        btn.textContent = "Đang gửi...";
        errorBox.classList.add('hidden');

        const email = document.getElementById('forgot-email').value;

        try {
            const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Lỗi gửi yêu cầu.");
            }

            const data = await res.json();
            
            // Show OTP for testing
            alert(`[DEV TEST] M� OTP của bạn l�: ${data.otp || data.OTP}`);

            formForgotStep1.classList.add('hidden');
            formForgotStep2.classList.remove('hidden');
            
            errorBox.className = "mb-4 bg-green-900/30 border border-green-500/50 text-green-400 p-3 rounded text-sm";
            errorBox.textContent = "Mã OTP đã được gửi đến email của bạn.";
            errorBox.classList.remove('hidden');

        } catch (err) {
            errorBox.className = "mb-4 bg-red-900/30 border border-red-500/50 text-red-400 p-3 rounded text-sm";
            errorBox.textContent = err.message;
            errorBox.classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.textContent = "Nhận mã OTP";
        }
    });

    // Forgot Password - Step 2
    formForgotStep2.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-forgot-step2');
        btn.disabled = true;
        btn.textContent = "Đang xử lý...";
        errorBox.classList.add('hidden');

        const payload = {
            email: document.getElementById('forgot-email').value,
            otp: document.getElementById('forgot-otp').value,
            newPassword: document.getElementById('forgot-new-password').value
        };

        try {
            const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "L?i d?i m?t kh?u.");
            }

            errorBox.className = "mb-4 bg-green-900/30 border border-green-500/50 text-green-400 p-3 rounded text-sm";
            errorBox.textContent = "�?i m?t kh?u th�nh c�ng! Vui l�ng dĐăng nhập l?i.";
            errorBox.classList.remove('hidden');
            
            setTimeout(() => {
                btnBackToLogin.click();
            errorBox.textContent = "Khôi phục mật khẩu thành công. Vui lòng đăng nhập lại.";

        } catch (err) {
            errorBox.className = "mb-4 bg-red-900/30 border border-red-500/50 text-red-400 p-3 rounded text-sm";
            errorBox.textContent = err.message;
            errorBox.classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.textContent = "X�c nh?n d?i m?t kh?u";
            btn.textContent = "Khôi phục mật khẩu";
    });
});

