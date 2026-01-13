// js/auth-check.js (NEW FILE - Only for Protected Pages like dashboard.html)

document.addEventListener('DOMContentLoaded', () => {
    const userId = localStorage.getItem('lsm_user_id');

    if (!userId) {
        // Yeh check sirf protected pages par chalega.
        // Index/Home page par yeh file link nahi hogi.
        alert('Please login to view this page.'); 
        window.location.href = 'login.html';
    }
});