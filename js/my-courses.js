var GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyUyX9QrGH5zBtS3-EvQs3kSlmzBTEmXWMmhiLSIIGQ1h8LDruLtkkF_-stKHexSonZog/exec";

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
    // Show Loader, Hide Container
    if(loader) loader.style.display = 'block';
    if(container) container.style.display = 'none';

    try {
        const url = `${GOOGLE_SCRIPT_URL}?action=getAllCourses&userId=${encodeURIComponent(userId)}`;
        const response = await fetch(url);
        const data = await response.json();

        // Hide Loader, Show Container
        if(loader) loader.style.display = 'none';
        if(container) container.style.display = 'grid'; // Grid layout wapis laye

        if (data.status === 'success' && data.data && data.data.length > 0) {
             // Filter: Only show courses that have Progress data (Enrolled)
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
        
        // Link Calculation
        let nextTopic = (progress.topicsCompleted || 0) + 1;
        let link = `course-topic.html?courseId=${course.CourseID}&userId=${userId}&topicIndex=${nextTopic}`;

        // BUTTON LOGIC: "Start" vs "Continue"
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
            link = `certificate.html?courseId=${course.CourseID}&userId=${userId}`;
        }

        // Dynamic Colors (Randomized style)
        const gradients = [
            "linear-gradient(135deg, #667eea, #764ba2)", 
            "linear-gradient(135deg, #ff9a9e, #fecfef)",
            "linear-gradient(135deg, #0ba360, #3cba92)"
        ];
        const randomBg = gradients[Math.floor(Math.random() * gradients.length)];

        // Card HTML
        const html = `
        <div class="course-card">
            <div class="course-image-wrapper" style="background: ${randomBg};">
                <span class="course-badge">${badgeText}</span>
                <div class="course-icon-large"><i class="fas fa-book-open"></i></div>
            </div>
            <div class="card-content">
                <h3 class="course-title">${course.Title}</h3>
                <div class="course-meta">
                    <div class="meta-tag"><i class="fas fa-user-circle"></i> ${course.Instructor || 'Instructor'}</div>
                </div>
                
                <div class="card-footer">
                    <div class="progress-container">
                        <div class="progress-labels">
                            <span class="label-left">Completed</span>
                            <span class="label-right">${percent}%</span>
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