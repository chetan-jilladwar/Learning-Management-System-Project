var GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzuweqFoWdQExkI4AXo9cwzNLA_OsBVObtpPUjWMBoD0z1_BcDjy73BvPaNjwknEQq2VA/exec";

// 1. Page Load Event
document.addEventListener('DOMContentLoaded', async () => {
    // Dark Mode Sync
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    const themeBtn = document.getElementById('dark-mode-toggle');
    if(themeBtn) {
        themeBtn.addEventListener('click', () => {
            const current = document.body.getAttribute('data-theme');
            const newTheme = current === 'dark' ? 'light' : 'dark';
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

    // Load Courses
    const userId = localStorage.getItem('lsm_user_id');
    const container = document.getElementById('courses-container');
    const loader = document.getElementById('course-loader');

    if (!userId) {
        if(loader) loader.style.display = 'none';
        if(container) {
            container.style.display = 'block';
            container.innerHTML = '<p style="text-align:center;">Please login first.</p>';
        }
        return;
    }

    await loadMyCourses(userId, container, loader);
});

// 2. Fetch Logic with Loader Control
async function loadMyCourses(userId, container, loader) {
    if(loader) loader.style.display = 'block';
    if(container) container.style.display = 'none';

    try {
        const url = `${GOOGLE_SCRIPT_URL}?action=getAllCourses&userId=${encodeURIComponent(userId)}`;
        const response = await fetch(url);
        const data = await response.json();

        if(loader) loader.style.display = 'none';
        if(container) container.style.display = 'grid'; 

        if (data.status === 'success' && data.data && data.data.length > 0) {
            // Filter: Only show enrolled courses
            const enrolledCourses = data.data.filter(c => c.Progress !== null && c.Progress !== undefined);
            
            if(enrolledCourses.length > 0){
                renderCourses(enrolledCourses, userId, container);
            } else {
                container.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">No enrolled courses found.</p>';
            }
        } else {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">No courses found.</p>';
        }

    } catch (error) {
        console.error(error);
        if(loader) loader.style.display = 'none';
        if(container) {
            container.style.display = 'block';
            container.innerHTML = '<p style="text-align:center; color:red;">Error loading courses.</p>';
        }
    }
}

// 3. Render Cards with Logic for Buttons
function renderCourses(courses, userId, container) {
    container.innerHTML = '';

    courses.forEach(course => {
        const progress = course.Progress || { progressPercentage: 0 };
        const percent = progress.progressPercentage || 0;
        
        // 🔥 FIX: Always link to Course Detail Page first
        // User should see overview/curriculum before jumping to video
        let link = `course-detail.html?id=${course.CourseID}`;

        // BUTTON LOGIC
        let btnText = "Start Course";
        let btnIcon = "fa-play";
        let badgeText = "Start Now";

        if (percent > 0 && percent < 100) {
            btnText = "Continue Learning";
            btnIcon = "fa-arrow-right";
            badgeText = "In Progress";
        } else if (percent >= 100) {
            btnText = "View Certificate";
            btnIcon = "fa-certificate";
            badgeText = "Completed";
            // If completed, maybe go to certificate directly? Or still detail page?
            // Let's keep it consistent: Detail page (where they can download cert)
            link = `course-detail.html?id=${course.CourseID}`;
        }

        // Dynamic Colors
        const gradients = [
            "linear-gradient(135deg, #667eea, #764ba2)", 
            "linear-gradient(135deg, #ff9a9e, #fecfef)",
            "linear-gradient(135deg, #0ba360, #3cba92)"
        ];
        const randomBg = gradients[Math.floor(Math.random() * gradients.length)];

        // Card HTML
        const html = `
        <div class="course-card">
            <div class="course-header-box" style="background: ${randomBg};">
                <span class="course-badge">${badgeText}</span>
                <div class="course-floating-icon"><i class="fas fa-book-open"></i></div>
            </div>
            <div class="card-content">
                <h3 class="course-title">${course.Title}</h3>
                <div class="course-instructor">
                    <i class="fas fa-user-circle"></i> ${course.Instructor || 'Instructor'}
                </div>
                
                <div class="card-footer">
                    <div class="progress-container">
                        <div class="progress-info">
                            <span>Completed</span>
                            <span>${percent}%</span>
                        </div>
                        <div class="progress-track">
                            <div class="progress-fill" style="width: ${percent}%;"></div>
                        </div>
                    </div>
                    
                    <a href="${link}" class="btn-course">
                        ${btnText} <i class="fas ${btnIcon}"></i>
                    </a>
                </div>
            </div>
        </div>
        `;
        container.innerHTML += html;
    });
}