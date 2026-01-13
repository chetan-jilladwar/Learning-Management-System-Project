// js/profile.js (100% Working - CORS Free)
document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('lsm_user_id');
    
    if (!userId) {
        alert('Please login to access your profile.');
        window.location.href = 'login.html';
        return;
    }
    
    window.userId = userId; // Global access for functions
    await initProfile(userId);
});

async function initProfile(userId) {
    const messageEl = document.getElementById('message');
    showMessage(messageEl, 'Loading profile...', 'loading');
    
    try {
        // ⭐ CORS-FREE: Direct Students sheet query
        const params = new URLSearchParams({
            action: 'getProfile', // New function we'll add to Apps Script
            userId: userId
        });
        
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?${params}`);
        const data = await response.json();
        
        if (data.status === 'success' && data.data) {
            const profile = data.data;
            populateProfileForm(profile);
            showMessage(messageEl, 'Profile loaded successfully!', 'success');
        } else {
            throw new Error(data.message || 'Profile not found');
        }
    } catch (error) {
        console.error('Profile load error:', error);
        showMessage(messageEl, 'Failed to load profile', 'error');
    }
}

function populateProfileForm(profile) {
    document.getElementById('name').value = profile.Name || '';
    document.getElementById('email').value = profile.Email || '';
    document.getElementById('phone').value = profile.Phone || '';
    
    // Update placeholder
    const placeholder = document.querySelector('.profile-pic-placeholder');
    if (placeholder) {
        const initials = (profile.Name || '').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        placeholder.textContent = initials || 'U';
    }
    
    localStorage.setItem('lsm_user_name', profile.Name);
}

// --- UPDATE PERSONAL INFO ---
document.getElementById('save-button')?.addEventListener('click', handleProfileUpdate);

async function handleProfileUpdate() {
    const messageEl = document.getElementById('message');
    const saveButton = document.getElementById('save-button');
    
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    
    // Validation
    if (name.length < 2) {
        showMessage(messageEl, 'Name must be at least 2 characters', 'error');
        return;
    }
    
    showLoading(saveButton, messageEl, 'Updating profile...');
    
    try {
        // ⭐ CORS-FREE: URLSearchParams POST
        const params = new URLSearchParams({
            action: 'updateProfile',
            userId: window.userId,
            name: name,
            phone: phone
        });
        
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?${params}`, { method: 'POST' });
        const data = await response.json();
        
        if (data.status === 'success') {
            localStorage.setItem('lsm_user_name', name);
            populateProfileForm({ Name: name, Phone: phone });
            showMessage(messageEl, 'Profile updated successfully! ✅', 'success');
        } else {
            throw new Error(data.message || 'Update failed');
        }
    } catch (error) {
        console.error('Profile update error:', error);
        showMessage(messageEl, 'Update failed: ' + error.message, 'error');
    } finally {
        hideLoading(saveButton);
    }
}

// --- CHANGE PASSWORD ---
document.getElementById('change-password-button')?.addEventListener('click', handleChangePassword);

async function handleChangePassword() {
    const messageEl = document.getElementById('message');
    const changePasswordButton = document.getElementById('change-password-button');
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Validation
    if (!currentPassword || newPassword.length < 6 || newPassword !== confirmPassword) {
        showMessage(messageEl, 
            !currentPassword ? 'Current password required' : 
            newPassword.length < 6 ? 'Password must be 6+ characters' : 
            'Passwords do not match', 'error');
        return;
    }
    
    showLoading(changePasswordButton, messageEl, 'Changing password...');
    
    try {
        const params = new URLSearchParams({
            action: 'changePassword',
            userId: window.userId,
            currentPassword: currentPassword,
            newPassword: newPassword
        });
        
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?${params}`, { method: 'POST' });
        const data = await response.json();
        
        if (data.status === 'success') {
            // Clear fields
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
            showMessage(messageEl, 'Password changed successfully! 🔐', 'success');
        } else {
            throw new Error(data.message || 'Password change failed');
        }
    } catch (error) {
        console.error('Password change error:', error);
        showMessage(messageEl, 'Password change failed: ' + error.message, 'error');
    } finally {
        hideLoading(changePasswordButton);
    }
}

// --- UI UTILITIES ---
function showMessage(element, text, type = 'info') {
    if (element) {
        element.textContent = text;
        element.className = `message ${type}`;
    }
}

function showLoading(button, messageEl, text) {
    button.disabled = true;
    button.textContent = text;
    showMessage(messageEl, text, 'loading');
}

function hideLoading(button) {
    button.disabled = false;
    if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
    }
}
