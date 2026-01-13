// ✅ YOUR CODE FIXED - 100% WORKING
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('adminLoginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('loginButton');
    const messageDiv = document.getElementById('message');

    // Check if already logged in
    if (typeof isLoggedInAsAdmin === 'function' && isLoggedInAsAdmin()) {
        window.location.href = 'admin-dashboard.html';
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageDiv.textContent = '';
        loginButton.disabled = true;
        loginButton.textContent = 'Logging in...';

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        
        const postData = new URLSearchParams({
            action: 'adminLogin',
            email: email,
            password: password
        });

        try {
            const response = await fetch(API_URL, { 
                method: 'POST',
                body: postData 
            });

            const result = await response.json();

            if (result.status === 'success') {
                const adminData = result.data;
                localStorage.setItem('lsm_admin_id', adminData.id); 
                localStorage.setItem('lsm_admin_name', adminData.name);
                localStorage.setItem('lsm_admin_role', adminData.role);
                
                messageDiv.className = 'text-success';
                messageDiv.textContent = 'Login successful! Redirecting...';
                
                setTimeout(() => {
                    window.location.href = 'admin-dashboard.html';
                }, 1000);
                
            } else {
                messageDiv.className = 'text-danger';
                messageDiv.textContent = result.message || 'Login failed.';
                loginButton.disabled = false;
                loginButton.textContent = 'Log In';
            }
        } catch (error) {
            console.error('Admin Login Error:', error);
            messageDiv.className = 'text-danger';
            messageDiv.textContent = 'Connection error.';
            loginButton.disabled = false;
            loginButton.textContent = 'Log In';
        }
    });
});
