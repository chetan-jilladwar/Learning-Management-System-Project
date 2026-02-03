var GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxAUni6GS7Eoe6IVad0K9OakqOCD2wAT62UVQIV16rQxURt5IZU1TAaJJSsv_4Zj2h_VA/exec";

document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('lsm_user_id');
    const loader = document.getElementById('profile-loader');
    const content = document.getElementById('profile-content');

    // 1. Auth Check
    if (!userId) {
        if(loader) loader.style.display = 'none';
        // Redirect logic optional
        // window.location.href = 'index.html';
        return;
    }

    try {
        // Show Loader
        if(loader) loader.style.display = 'block';
        if(content) content.style.display = 'none';

        // 2. Fetch User Data
        // (Agar backend ready nahi hai to hum fallback use karenge)
        let userData = {
            Name: localStorage.getItem('lsm_user_name') || 'Student',
            Email: userId,
            Phone: localStorage.getItem('lsm_user_phone') || '',
            JoinDate: new Date().toLocaleDateString() 
        };

        // Try fetching from API (Optional)
        try {
            const url = `${GOOGLE_SCRIPT_URL}?action=getUser&userId=${encodeURIComponent(userId)}`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.status === 'success' && data.data) {
                userData = data.data;
            }
        } catch (e) {
            console.log("Using local data fallback");
        }

        // 3. Populate Form (Safely)
        populateForm(userData);

        // Hide Loader
        if(loader) loader.style.display = 'none';
        if(content) content.style.display = 'block';

    } catch (error) {
        console.error("Profile Error:", error);
        if(loader) loader.style.display = 'none';
    }

    // 4. Handle Save Button
    const form = document.getElementById('profile-form');
    if(form) {
        form.addEventListener('submit', handleSave);
    }
});

function populateForm(user) {
    // Helper function to safely set value
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };

    // Helper function to safely set text content
    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val || '';
    };

    // Set Input Values (Matching HTML IDs)
    setVal('name-input', user.Name);
    setVal('email-input', user.Email);
    setVal('phone-input', user.Phone);
    setVal('date-input', user.JoinDate);
    
    // Set Header Text
    setText('display-name', user.Name || 'Student');
    
    // Set Avatar Initials
    const name = user.Name || 'Student';
    const initials = name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
    setText('avatar-initials', initials);
}

async function handleSave(e) {
    e.preventDefault();
    const btn = document.getElementById('save-btn');
    if (!btn) return;

    const originalText = btn.innerHTML;
    
    // Animation: Loading
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    // Simulate Network Request
    await new Promise(r => setTimeout(r, 1500));

    // Animation: Success
    btn.innerHTML = '<i class="fas fa-check"></i> Saved!';
    btn.style.background = 'var(--success)'; // Green color
    
    // Save to LocalStorage
    const newNameEl = document.getElementById('name-input');
    const newPhoneEl = document.getElementById('phone-input');
    
    if (newNameEl) {
        const newName = newNameEl.value;
        localStorage.setItem('lsm_user_name', newName);
        
        // Update display immediately
        const displayEl = document.getElementById('display-name');
        if(displayEl) displayEl.textContent = newName;
        
        const avatarEl = document.getElementById('avatar-initials');
        if(avatarEl) {
            avatarEl.textContent = newName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
        }
    }
    
    if (newPhoneEl) {
        localStorage.setItem('lsm_user_phone', newPhoneEl.value);
    }

    // Reset Button Style
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.background = ''; 
        btn.disabled = false;
    }, 2000);
}