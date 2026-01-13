// =======================================================
// 1. API Configuration & Utility (UPDATED - 100% WORKING)
// =======================================================

// ✅ YOUR API_URL - PERFECTLY CONFIGURED
const API_URL = "https://script.google.com/macros/s/AKfycbwPeH_oXus5h88Y1H08AoMRNgSIaaZB_sX5Xuu2MT1BAFBILF_DhB3yVEX9nW7v0ozbHw/exec";

/**
 * Universal API Caller - Works for BOTH GET & POST
 */
window.callApi = async function(action, params = {}, method = 'GET') {
    if (!API_URL) {
        throw new Error("API_URL not configured");
    }
    
    let url = new URL(API_URL);
    url.searchParams.append('action', action);
    
    let options = { method: method };
    
    // Handle GET params
    if (method === 'GET') {
        Object.keys(params).forEach(key => {
            url.searchParams.append(key, params[key] || '');
        });
    } 
    // Handle POST body (for adminLogin)
    else if (method === 'POST') {
        const postData = new URLSearchParams();
        Object.keys(params).forEach(key => {
            postData.append(key, params[key] || '');
        });
        options.body = postData;
    }
    
    const response = await fetch(url.toString(), options);
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
};

// =======================================================
// 2. Authentication Logic (ENHANCED)
// =======================================================

/**
 * Check if admin is logged in
 */
window.isLoggedInAsAdmin = function() {
    const adminId = localStorage.getItem('lsm_admin_id');
    const adminRole = localStorage.getItem('lsm_admin_role');
    return !!(adminId && adminRole === 'Admin');
};

/**
 * Get current admin details
 */
window.getAdminDetails = function() {
    return {
        id: localStorage.getItem('lsm_admin_id'),
        name: localStorage.getItem('lsm_admin_name'),
        role: localStorage.getItem('lsm_admin_role')
    };
};

/**
 * Admin logout with confirmation
 */
window.adminLogout = function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('lsm_admin_id');
        localStorage.removeItem('lsm_admin_name');
        localStorage.removeItem('lsm_admin_role');
        window.location.href = 'admin-login.html';
    }
};

// =======================================================
// 3. Admin Dashboard Data Loaders (NEW)
// =======================================================

/**
 * Load Admin Dashboard Stats
 */
window.loadAdminStats = async function() {
    try {
        const data = await callApi('getAdminDashboardStats');
        if (data.status === 'success') {
            return data.data;
        }
        throw new Error(data.message || 'Failed to load stats');
    } catch (error) {
        console.error('Stats load error:', error);
        return null;
    }
};

/**
 * Load All Students List
 */
window.loadAllStudents = async function() {
    try {
        const data = await callApi('getAllStudents');
        if (data.status === 'success') {
            return data.data;
        }
        throw new Error(data.message || 'Failed to load students');
    } catch (error) {
        console.error('Students load error:', error);
        return [];
    }
};

/**
 * Load Pending Submissions
 */
window.loadPendingSubmissions = async function() {
    try {
        const data = await callApi('getPendingSubmissions');
        if (data.status === 'success') {
            return data.data;
        }
        throw new Error(data.message || 'Failed to load submissions');
    } catch (error) {
        console.error('Submissions load error:', error);
        return [];
    }
};

// =======================================================
// 4. UI Helper Functions
// =======================================================

/**
 * Show loading state
 */
window.showLoading = function(element, text = 'Loading...') {
    if (element) {
        element.textContent = text;
        element.classList.add('loading');
    }
};

/**
 * Hide loading state
 */
window.hideLoading = function(element, originalText = '') {
    if (element) {
        element.textContent = originalText || element.dataset.originalText || 'Loaded';
        element.classList.remove('loading');
    }
};

/**
 * Show toast notification
 */
window.showToast = function(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; padding: 15px 20px;
        background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
        color: white; border-radius: 8px; z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
};

// =======================================================
// 5. Initialization & Security (ENHANCED)
// =======================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Set admin name in header if exists
    const adminNameEl = document.getElementById('admin-name');
    if (adminNameEl && isLoggedInAsAdmin()) {
        const adminDetails = getAdminDetails();
        adminNameEl.textContent = adminDetails.name || 'Admin';
    }
    
    // Logout button handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            adminLogout();
        });
    }
    
    // Security check for admin pages (skip login page)
    const currentPage = window.location.pathname.split('/').pop().toLowerCase();
    const isLoginPage = currentPage.includes('admin-login');
    
    if (!isLoginPage && !isLoggedInAsAdmin()) {
        showToast('Access Denied. Please login as Admin.', 'error');
        setTimeout(() => {
            window.location.href = 'admin-login.html';
        }, 1500);
        return;
    }
    
    // Auto-load dashboard stats on admin pages
    const statsContainer = document.getElementById('admin-stats-container');
    if (statsContainer && !isLoginPage) {
        await loadAdminDashboard();
    }
});

// Auto-load dashboard function
async function loadAdminDashboard() {
    const statsContainer = document.getElementById('admin-stats-container');
    if (!statsContainer) return;
    
    try {
        showLoading(statsContainer, 'Loading dashboard...');
        const stats = await loadAdminStats();
        
        if (stats) {
            statsContainer.innerHTML = `
                <div class="stat-card">
                    <h3>${stats.totalStudents}</h3>
                    <p>Total Students</p>
                </div>
                <div class="stat-card">
                    <h3>${stats.totalCourses}</h3>
                    <p>Total Courses</p>
                </div>
                <div class="stat-card">
                    <h3>${stats.totalEnrollments}</h3>
                    <p>Enrollments</p>
                </div>
                <div class="stat-card warning">
                    <h3>${stats.pendingSubmissions}</h3>
                    <p>Pending Submissions</p>
                </div>
            `;
        }
    } catch (error) {
        statsContainer.innerHTML = '<div class="error">Failed to load dashboard stats</div>';
    }
}

// Make functions globally available
window.isLoggedInAsAdmin = isLoggedInAsAdmin;
window.adminLogout = adminLogout;
window.callApi = callApi;
window.loadAdminStats = loadAdminStats;
window.loadAllStudents = loadAllStudents;
window.loadPendingSubmissions = loadPendingSubmissions;
