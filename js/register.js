const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwPeH_oXus5h88Y1H08AoMRNgSIaaZB_sX5Xuu2MT1BAFBILF_DhB3yVEX9nW7v0ozbHw/exec";

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('register-form');
    const submitBtn = document.getElementById('submit-btn');
    const messageEl = document.getElementById('message');

    if (form) {
        form.addEventListener('submit', handleRegister);
    }

    // Global functions
    window.handleRegister = handleRegister;
});

async function handleRegister(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = document.getElementById('submit-btn');
    const messageEl = document.getElementById('message');

    // 1. ✅ VALIDATION
    const formData = {
        action: 'register',
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        password: form.password.value.trim()
    };

    const errors = validateRegister(formData);
    if (errors.length > 0) {
        showMessage(errors[0], 'error', messageEl);
        return;
    }

    // 2. Loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registering...';
    showMessage('Creating your account...', 'loading', messageEl);

    try {
        // ⭐ 3. CORS-FREE: URLSearchParams + POST (No JSON body)
        const params = new URLSearchParams(formData);
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?${params}`, {
            method: 'POST'
            // No headers, no JSON body = No CORS preflight!
        });

        const data = await response.json();

        if (data.status === 'success' && data.userId) {
            // 4. SUCCESS: Auto-login + Enroll
            form.reset();
            showMessage('Registration successful! Redirecting...', 'success', messageEl);
            
            localStorage.setItem('lsm_user_id', data.userId);
            
            // Auto-enroll if pending course
            setTimeout(() => autoEnrollAndRedirect(data.userId), 1000);
            
        } else {
            throw new Error(data.message || 'Registration failed');
        }

    } catch (error) {
        console.error('Registration error:', error);
        showMessage(error.message || 'Registration failed. Try again.', 'error', messageEl);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Register';
    }
}

async function autoEnrollAndRedirect(userId) {
    const pendingCourseId = localStorage.getItem('pendingEnrollCourseId');
    
    if (pendingCourseId) {
        try {
            // ⭐ CORS-FREE Enroll
            const enrollParams = new URLSearchParams({
                action: 'enrollCourse',
                userId: userId,
                courseId: pendingCourseId
            });

            const enrollResponse = await fetch(`${GOOGLE_SCRIPT_URL}?${enrollParams}`, {
                method: 'POST'
            });

            const enrollData = await enrollResponse.json();
            
            localStorage.removeItem('pendingEnrollCourseId');
            
            if (enrollData.status === 'success') {
                window.location.href = `course-topic.html?courseId=${pendingCourseId}&topicIndex=1`;
            } else {
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error('Enrollment error:', error);
            window.location.href = 'login.html';
        }
    } else {
        window.location.href = 'login.html';
    }
}

// VALIDATION
function validateRegister(data) {
    if (!data.name || data.name.length < 2) return ['Name must be 2+ characters'];
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return ['Enter valid email'];
    if (!data.phone || !/^\d{10}$/.test(data.phone)) return ['Enter valid 10-digit phone'];
    if (data.password.length < 6) return ['Password must be 6+ characters'];
    return [];
}

// UI HELPERS
function showMessage(text, type, messageEl) {
    if (messageEl) {
        messageEl.textContent = text;
        messageEl.className = type; // error, success, loading
    }
}
