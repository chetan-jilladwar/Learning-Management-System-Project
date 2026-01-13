// js/admin-check.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Check for Admin Login
    const adminId = localStorage.getItem('lsm_admin_id');
    const adminName = localStorage.getItem('lsm_admin_name');
    const adminRole = localStorage.getItem('lsm_admin_role');

    if (!adminId) {
        // If not logged in, redirect to admin login page
        alert('Access Denied. Please log in to the Admin Portal.');
        window.location.href = 'admin-login.html';
        return;
    }
    
    // 2. Populate Header
    const welcomeElement = document.getElementById('welcomeMessage');
    if (welcomeElement) {
        welcomeElement.textContent = `Welcome, ${adminName || 'Admin'}!`;
    }

    const roleElement = document.getElementById('adminRole');
    if (roleElement) {
        roleElement.textContent = `Role: ${adminRole || 'Admin'}`;
    }

    // 3. Setup Logout (FIX: Null Check Added)
    const logoutBtn = document.getElementById('logoutButton');
    
    // Check karte hain ki kya logoutButton element is page par maujood hai
    if (logoutBtn) { 
        logoutBtn.addEventListener('click', () => {
            // Clear admin data from local storage
            localStorage.removeItem('lsm_admin_id');
            localStorage.removeItem('lsm_admin_name');
            localStorage.removeItem('lsm_admin_role');
            alert('You have been logged out.');
            window.location.href = 'admin-login.html';
        });
    }
    
    // --- Special Check for Admin-Courses.html ---
    // चूंकि admin-courses.html में 'logoutButton' नहीं है, लेकिन हमें admin-courses.js में
    // admin-check.js के खत्म होने के बाद ही courses लोड करने हैं, इसलिए यह चेक उपयोगी है।
});