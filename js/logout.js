/*
 * YEH HAMARA LOGOUT JAVASCRIPT HAI (logout.js)
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Logout button/link ko target karein
    const logoutLink = document.getElementById('logout-link'); // Maan liya ki aapki logout link ki ID 'logout-link' hai
    
    // Agar link ki ID kuch aur hai, toh use yahan update karein.
    // Example: Agar aap sidebar mein 'Logout' class use kar rahe hain, toh:
    // const logoutLink = document.querySelector('.sidebar .logout-class'); 
    
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault(); // Default link action ko rokein
            handleLogout();
        });
    } else {
        console.error("Logout link with ID 'logout-link' not found.");
    }
});

function handleLogout() {
    // 1. Local Storage se User ID hatana (Session End)
    localStorage.removeItem('lsm_user_id');
    
    // Optional: Agar koi aur session data hai toh use bhi hata dein
    // localStorage.removeItem('lsm_user_name'); 
    
    // 2. User ko Login page par redirect karna
    alert("You have been successfully logged out!");
    window.location.href = 'login.html'; 
}



// **Important:** Is file ko apni HTML (Jahan bhi Logout link hai) mein link karna na bhulein:
// <script src="js/logout.js"></script>