// config.js से URL (पहले से define)
//const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxFfc34-kTg72hx8uphOgO-5ZQApQv4cbjMHFaIkZyNjZQ7ChxkRN-cn7x2XS2K8Xf5AA/exec";

// ============= LOGIN FORM =============
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

async function handleLogin(e) {
    e.preventDefault();

    const emailEl = document.getElementById('email');
    const passwordEl = document.getElementById('password');
    const loginButton = document.getElementById('login-button');
    const messageEl = document.getElementById('login-message');

    const email = emailEl.value.trim();
    const password = passwordEl.value.trim();

    // ✅ CLIENT-SIDE VALIDATION
    const errors = validateLogin(email, password);
    if (errors.length > 0) {
        showMessage(errors[0], 'error', messageEl);
        return;
    }

    // Loading state
    showLoading(loginButton, messageEl, 'Logging in...');

    try {
        // ⭐ FIXED: URL Parameters के साथ POST (Apps Script expects this)
        const params = new URLSearchParams({
            action: 'login',
            email: email,
            password: password
        });

        const response = await fetch(`${GOOGLE_SCRIPT_URL}?${params}`, {
            method: 'POST',
            // ⭐ NO Content-Type needed for URL params
        });

        const data = await response.json();

        if (data.status === 'success' && data.data) {
            // Store user data
            localStorage.setItem('lsm_user_id', data.data.id);
            localStorage.setItem('lsm_user_name', data.data.name);

            // Check pending enrollment
            const pendingCourseId = localStorage.getItem('pendingEnrollCourseId');
            if (pendingCourseId) {
                localStorage.removeItem('pendingEnrollCourseId');
                window.location.href = `course-detail.html?id=${pendingCourseId}`;
            } else {
                window.location.href = 'dashboard.html';
            }
        } else {
            throw new Error(data.message || 'Invalid credentials');
        }

    } catch (error) {
        console.error('Login error:', error);
        showMessage(error.message, 'error', messageEl);
    } finally {
        // Reset button
        loginButton.disabled = false;
        loginButton.textContent = 'Login';
    }
}

// ============= REGISTRATION FORM =============
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
}

async function handleRegister(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = document.getElementById('submit-btn');
    const messageEl = document.getElementById('message');

    const formData = {
        action: 'register',
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        password: form.password.value.trim()
    };

    // ✅ CLIENT-SIDE VALIDATION
    const errors = validateRegister(formData);
    if (errors.length > 0) {
        showMessage(errors[0], 'error', messageEl);
        return;
    }

    showLoading(submitBtn, messageEl, 'Registering...');

    try {
        // ⭐ FIXED: URL Parameters के साथ POST
        const params = new URLSearchParams(formData);
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?${params}`, {
            method: 'POST',
        });

        const data = await response.json();

        if (data.status === 'success' && data.userId) {
            // Auto-login & redirect
            localStorage.setItem('lsm_user_id', data.userId);
            showMessage('Registration successful! Redirecting...', 'success', messageEl);
            
            setTimeout(() => {
                const pendingCourseId = localStorage.getItem('pendingEnrollCourseId');
                if (pendingCourseId) {
                    enrollCourseAndRedirect(data.userId, pendingCourseId);
                } else {
                    window.location.href = 'dashboard.html';
                }
            }, 1500);

        } else {
            throw new Error(data.message || 'Registration failed');
        }

    } catch (error) {
        console.error('Register error:', error);
        showMessage(error.message, 'error', messageEl);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Register';
    }
}

// ============= VALIDATION FUNCTIONS =============
function validateLogin(email, password) {
    if (!email) return ['Email is required'];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return ['Enter valid email'];
    if (password.length < 6) return ['Password must be at least 6 characters'];
    return [];
}

function validateRegister(data) {
    if (!data.name || data.name.length < 2) return ['Name must be at least 2 characters'];
    if (!data.email) return ['Email is required'];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return ['Enter valid email'];
    if (!data.phone || !/^\d{10}$/.test(data.phone)) return ['Enter valid 10-digit phone'];
    if (data.password.length < 6) return ['Password must be at least 6 characters'];
    return [];
}

// ============= UTILITY FUNCTIONS =============
function showLoading(button, messageEl, text) {
    button.disabled = true;
    if (messageEl) {
        messageEl.textContent = text;
        messageEl.className = 'loading';
    }
}

function showMessage(text, type, messageEl) {
    if (messageEl) {
        messageEl.textContent = text;
        messageEl.className = type;
    }
}

async function enrollCourseAndRedirect(userId, courseId) {
    try {
        const params = new URLSearchParams({
            action: 'enrollCourse',
            userId: userId,
            courseId: courseId
        });

        const response = await fetch(`${GOOGLE_SCRIPT_URL}?${params}`, { method: 'POST' });
        const data = await response.json();

        if (data.status === 'success') {
            window.location.href = `course-topic.html?courseId=${courseId}&topicIndex=1`;
        } else {
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        console.error('Enrollment error:', error);
        window.location.href = 'dashboard.html';
    }
}
