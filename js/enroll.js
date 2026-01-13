// js/enroll.js (100% Working - CORS Free)
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('id');
    const userId = localStorage.getItem('lsm_user_id');
    
    const statusTitle = document.getElementById('status-title');
    const statusMessage = document.getElementById('status-message');
    const loader = document.getElementById('loader');
    const backBtn = document.getElementById('back-btn');
    
    // 1. VALIDATION
    if (!courseId) {
        showError(statusTitle, statusMessage, loader, backBtn, "Invalid Request", "Course ID is missing from URL.");
        return;
    }
    
    if (!userId) {
        showError(statusTitle, statusMessage, loader, backBtn, "Not Logged In", "Please login to enroll in courses.");
        setTimeout(() => window.location.href = 'login.html', 2500);
        return;
    }
    
    // 2. SHOW LOADING
    showLoading(statusTitle, statusMessage, loader, "Enrolling you in the course...");
    
    try {
        // ⭐ PERFECT CORS-FREE: URLSearchParams in URL
        const params = new URLSearchParams({
            action: "enrollCourse",
            userId: userId,
            courseId: courseId
        });
        
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?${params}`, {
            method: "POST"
            // No headers = No CORS preflight!
        });
        
        const result = await response.json();
        
        if (result.status === "success") {
            // ✅ SUCCESS
            statusTitle.textContent = "🎉 Enrollment Successful!";
            statusTitle.style.color = '#27ae60';
            statusMessage.textContent = `Welcome to ${courseId}! Redirecting to Topic 1...`;
            loader.style.display = 'none';
            backBtn.style.display = 'none';
            
            setTimeout(() => {
                window.location.href = `course-topic.html?courseId=${courseId}&topicIndex=1&userId=${userId}`;
            }, 2000);
            
        } else if (result.status === "error" && result.message?.includes("already enrolled")) {
            // ✅ ALREADY ENROLLED (Smart Redirect)
            statusTitle.textContent = "✅ Already Enrolled!";
            statusTitle.style.color = '#3498db';
            statusMessage.innerHTML = `
                You're already enrolled in <strong>${courseId}</strong>!<br>
                Taking you to your course content...
            `;
            loader.style.display = 'none';
            backBtn.style.display = 'none';
            
            setTimeout(() => {
                window.location.href = `course-topic.html?courseId=${courseId}&topicIndex=1&userId=${userId}`;
            }, 2000);
            
        } else {
            // ❌ OTHER ERRORS
            showError(statusTitle, statusMessage, loader, backBtn, 
                     "Enrollment Failed", result.message || "Could not process enrollment.");
        }
        
    } catch (error) {
        console.error("Enrollment Error:", error);
        showError(statusTitle, statusMessage, loader, backBtn, 
                 "Connection Error", "Failed to connect to server. Please try again.");
    }
});

function showLoading(titleEl, messageEl, loaderEl, message) {
    titleEl.textContent = "Processing...";
    titleEl.style.color = '#3498db';
    messageEl.textContent = message;
    loaderEl.style.display = 'inline-block';
}

function showError(titleEl, messageEl, loaderEl, backBtnEl, title, message) {
    loaderEl.style.display = 'none';
    titleEl.textContent = title;
    titleEl.style.color = '#e74c3c';
    messageEl.textContent = message;
    backBtnEl.style.display = 'inline-block';
}
