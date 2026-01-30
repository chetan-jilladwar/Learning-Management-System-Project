// js/profile.js (Same Logic, Works with New UI)
document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('lsm_user_id');
    
    if (!userId) {
        alert('Please login to access your profile.');
        window.location.href = 'index.html';
        return;
    }
    
    window.userId = userId; // Global access
    await initProfile(userId);
});

async function initProfile(userId) {
    const messageEl = document.getElementById('message');
    showMessage(messageEl, 'Loading profile...', 'loading');
    
    try {
        const params = new URLSearchParams({
            action: 'getProfile',
            userId: userId
        });
        
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?${params}`);
        const data = await response.json();
        
        if (data.status === 'success' && data.data) {
            const profile = data.data;
            populateProfileForm(profile);
            showMessage(messageEl, '', ''); // Clear loading msg
            // messageEl.style.display = 'none';
        } else {
            throw new Error(data.message || 'Profile not found');
        }
    } catch (error) {
        console.error('Profile load error:', error);
        showMessage(messageEl, 'Failed to load profile', 'error');
    }
}

function populateProfileForm(profile) {
    // Ye IDs ab HTML me exist karte hain
    if(document.getElementById('name')) document.getElementById('name').value = profile.Name || '';
    if(document.getElementById('email')) document.getElementById('email').value = profile.Email || '';
    if(document.getElementById('phone')) document.getElementById('phone').value = profile.Phone || '';
    
    // Update Avatar UI
    const placeholder = document.querySelector('.profile-pic-placeholder');
    if (placeholder) {
        const initials = (profile.Name || '').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        placeholder.textContent = initials || 'U';
    }
    
    localStorage.setItem('lsm_user_name', profile.Name);
}

// --- UPDATE PROFILE ---
document.getElementById('save-button')?.addEventListener('click', async () => {
    const messageEl = document.getElementById('message');
    const saveButton = document.getElementById('save-button');
    
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    
    if (name.length < 2) {
        showMessage(messageEl, 'Name must be at least 2 characters', 'error');
        return;
    }
    
    showLoading(saveButton, messageEl, 'Updating...');
    
    try {
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
            showMessage(messageEl, 'Profile updated successfully!', 'success');
        } else {
            throw new Error(data.message || 'Update failed');
        }
    } catch (error) {
        console.error('Update error:', error);
        showMessage(messageEl, 'Update failed: ' + error.message, 'error');
    } finally {
        hideLoading(saveButton, 'Save Changes');
    }
});

// --- CHANGE PASSWORD ---
document.getElementById('change-password-button')?.addEventListener('click', async () => {
    const messageEl = document.getElementById('message');
    const btn = document.getElementById('change-password-button');
    
    const currentPass = document.getElementById('current-password').value;
    const newPass = document.getElementById('new-password').value;
    const confirmPass = document.getElementById('confirm-password').value;
    
    if (!currentPass || newPass.length < 6 || newPass !== confirmPass) {
        showMessage(messageEl, !currentPass ? 'Current password required' : newPass.length < 6 ? 'Password too short' : 'Passwords mismatch', 'error');
        return;
    }
    
    showLoading(btn, messageEl, 'Updating...');
    
    try {
        const params = new URLSearchParams({
            action: 'changePassword',
            userId: window.userId,
            currentPassword: currentPass,
            newPassword: newPass
        });
        
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?${params}`, { method: 'POST' });
        const data = await response.json();
        
        if (data.status === 'success') {
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
            showMessage(messageEl, 'Password changed successfully!', 'success');
        } else {
            throw new Error(data.message || 'Failed');
        }
    } catch (error) {
        showMessage(messageEl, error.message, 'error');
    } finally {
        hideLoading(btn, 'Update Password');
    }
});

// --- UTILS ---
function showMessage(el, text, type) {
    if(el) {
        el.textContent = text;
        el.className = `message ${type}`;
        el.style.display = 'block';
    }
}

function showLoading(btn, msgEl, text) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
    showMessage(msgEl, text, 'loading');
}

function hideLoading(btn, originalText) {
    btn.disabled = false;
    btn.innerHTML = originalText || 'Save';
}