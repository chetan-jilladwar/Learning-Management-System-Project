// js/my-courses.js - Updated with Dark Mode Toggle and Modern Loader
var GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwPeH_oXus5h88Y1H08AoMRNgSIaaZB_sX5Xuu2MT1BAFBILF_DhB3yVEX9nW7v0ozbHw/exec";

// --- Dark Mode Functions ---

/**
 * Syncs the theme from localStorage and sets the theme attribute on the body.
 * Also sets the correct icon on the dark mode toggle button.
 */
function syncDarkMode() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const body = document.body;
    const toggleIcon = document.getElementById('toggle-icon');

    // Apply theme
    body.setAttribute('data-theme', savedTheme);
    
    // Set button icon
    if (toggleIcon) {
        toggleIcon.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
    }
}

/**
 * Toggles the dark/light theme, saves the preference, and updates the button icon.
 */
function toggleDarkMode() {
    const body = document.body;
    // Get current theme from body attribute (default to 'light' if not set)
    let currentTheme = body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    
    // Determine the new theme
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    // Apply and save the new theme
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update the button icon
    const toggleIcon = document.getElementById('toggle-icon');
    if (toggleIcon) {
        toggleIcon.textContent = newTheme === 'dark' ? '🌙' : '☀️';
    }
}


// --- Utility Functions (Loader, Error, Logout) ---

function showLoading(container, message) {
    const loaderEl = document.getElementById('loader-circle');
    const loadingTextEl = document.getElementById('loading-text');

    // Hide the course container while loading
    if (container) container.style.display = 'none';

    if (loaderEl && loadingTextEl) {
        loaderEl.style.display = 'block';
        loadingTextEl.textContent = message;
    }
}

function hideLoading(container) {
    const loaderEl = document.getElementById('loader-circle');
    const loadingTextEl = document.getElementById('loading-text');

    // Show the course container after loading
    if (container) container.style.display = 'grid'; // Assuming it's a grid layout

    if (loaderEl && loadingTextEl) {
        loaderEl.style.display = 'none';
        loadingTextEl.textContent = '';
    }
}

function showNoCourses(container) {
    if (!container) return;
    container.style.display = 'block'; // Make sure the container is visible for the message
    container.innerHTML = `
        <div class="no-courses">
            <div class="empty-state">
                <div class="empty-icon">📚</div>
                <h3>No Enrolled Courses</h3>
                <p>You haven't enrolled in any courses yet. <strong>Enroll now to start learning!</strong></p>
                <div class="action-buttons">
                    <a href="dashboard.html" class="btn btn-primary">Browse All Courses</a>
                </div>
            </div>
        </div>
    `;
}

function showError(message, container) {
    if (!container) return;
    container.style.display = 'block'; // Make sure the container is visible for the message
    container.innerHTML = `
        <div class="error-state">
            <div class="error-icon">⚠️</div>
            <h3>Oops! Something went wrong</h3>
            <p>${message}</p>
            <div class="action-buttons">
                <button onclick="location.reload()" class="btn btn-primary">Retry</button>
                <a href="dashboard.html" class="btn btn-secondary">Go to Dashboard</a>
            </div>
        </div>
    `;
}

function setupLogout() {
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to log out?')) {
                localStorage.clear();
                window.location.href = 'index.html';
            }
        });
    }
}


// --- Main Logic: Load Courses ---

async function loadMyCourses(userId, coursesContainer) {
    // 🔥 UPDATED: Using the new showLoading
    showLoading(coursesContainer, 'Loading your enrolled courses...'); 

    try {
        const url = `${GOOGLE_SCRIPT_URL}?action=getAllCourses&userId=${encodeURIComponent(userId)}`;
        const response = await fetch(url);
        const data = await response.json();

        // 🔥 UPDATED: Hide loading state
        hideLoading(coursesContainer); 

        if (data.status === 'success' && Array.isArray(data.data) && data.data.length > 0) {
            // ✅ CORRECTED FILTER: Now a course is considered "enrolled" if it has a Progress object.
            // We remove the strict 'totalTopics > 0' check to allow just-enrolled courses to show.
            const enrolledCourses = data.data.filter(course => 
                course.Progress !== null && 
                course.Progress !== undefined
            );

            if (enrolledCourses.length > 0) {
                displayEnrolledCourses(enrolledCourses, userId, coursesContainer);
            } else {
                showNoCourses(coursesContainer);
            }
        } else {
            showNoCourses(coursesContainer);
        }
    } catch (error) {
        console.error('Courses load error:', error);
        hideLoading(coursesContainer);
        showError('Failed to load courses. Please check your connection.', coursesContainer);
    }
}

function displayEnrolledCourses(enrolledCourses, userId, coursesContainer) {
    coursesContainer.innerHTML = '';
    coursesContainer.style.display = 'grid'; // Ensure it is grid layout

    enrolledCourses.forEach(course => {
        const progress = course.Progress || { progressPercentage: 0, topicsCompleted: 0, totalTopics: 0 };
        const progressPercent = progress.progressPercentage || 0;

        let nextTopicIndex = 1;
        if ((progress.totalTopics || 0) > 0 && progressPercent < 100) {
            nextTopicIndex = (progress.topicsCompleted || 0) + 1;
        }

        const progressColor = getProgressColor(progressPercent);

        // Construct the link (This logic looks correct)
        const baseLink = `course-topic.html?courseId=${encodeURIComponent(course.CourseID)}&userId=${encodeURIComponent(userId)}`;
        const continueLink = `${baseLink}&topicIndex=${nextTopicIndex}`;
        const certificateLink = `certificate.html?courseId=${encodeURIComponent(course.CourseID)}&userId=${encodeURIComponent(userId)}`;

        let buttonText = 'Continue Learning';
        let finalLink = continueLink;

        if (progressPercent >= 100) {
            buttonText = 'View Certificate 🎉';
            finalLink = certificateLink;
        } else if (progressPercent === 0 && (progress.totalTopics || 0) > 0) {
            buttonText = 'Start Course';
        } else if ((progress.totalTopics || 0) === 0) {
            // Handle case: Just enrolled, no topics defined yet
            buttonText = 'Course Pending Setup'; 
            finalLink = '#';
        }


        const card = createCourseCard(
            course,
            progressPercent,
            progress.topicsCompleted || 0,
            progress.totalTopics || 0,
            buttonText,
            finalLink,
            progressColor
        );
        coursesContainer.appendChild(card);
    });
}

// Updated createCourseCard function to match the new HTML structure
function createCourseCard(course, progressPercent, completedTopics, totalTopics, buttonText, link, progressColor) {
    const card = document.createElement('div');
    card.className = 'course-card';
    const safeDesc = course.Description || 'No description available.';
    const emoji = getCourseEmoji(course.Title || course.Category);

    // Dynamic color logic for a unique course icon background
    const courseInitial = course.Title ? course.Title[0].toUpperCase().charCodeAt(0) : 65;
    const hue = (courseInitial - 65) * 15 % 360; 
    const dynamicBgColor = `hsl(${hue}, 80%, 95%)`;
    const dynamicIconColor = `hsl(${hue}, 70%, 40%)`;

    card.innerHTML = `
        <div class="course-image-placeholder" style="background-color: ${dynamicBgColor};">
            <span class="icon" style="color: ${dynamicIconColor};">${emoji}</span>
            <span class="course-code">${course.CourseID || 'N/A'}</span>
        </div>
        <div class="card-content">
            <h3>${course.Title}</h3>
            
            <div class="metadata">
                <p>👨‍🏫 Instructor: ${course.Instructor || 'TBD'}</p>
                <p>⏳ Duration: ${course.Duration || 'N/A'}</p>
            </div>
            <p class="course-description">
                ${safeDesc.substring(0, 85)}${safeDesc.length > 85 ? '...' : ''}
            </p>

            <div class="progress-container">
                <div class="progress-label">
                    <span>${progressPercent}% Complete</span>
                    <span>(${completedTopics}/${totalTopics} topics)</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercent}%; background: ${progressColor};"></div>
                </div>
            </div>
            
            <a href="${link}" class="btn-action ${link === '#' ? 'disabled-link' : ''}">
                ${buttonText}
            </a>
        </div>
    `;
     // Add CSS for disabled-link if needed in style block, but for now, the JS part is done.
    return card;
}

// Helper function to get a relevant emoji
function getCourseEmoji(title) {
    const t = (title || '').toLowerCase();
    if (t.includes('java') || t.includes('spring')) return '☕';
    if (t.includes('python') || t.includes('data')) return '🐍';
    if (t.includes('ui') || t.includes('design') || t.includes('web')) return '🎨';
    if (t.includes('c ')) return '⚙️';
    if (t.includes('maths') || t.includes('algebra')) return '🧮';
    if (t.includes('cloud') || t.includes('aws') || t.includes('azure')) return '☁️';
    return '📚';
}

function getProgressColor(percent) {
    if (percent >= 100) return '#2ecc71'; // Green for Complete
    if (percent >= 70) return '#3498db'; // Blue for High Progress
    if (percent >= 40) return '#e67e22'; // Orange for Mid Progress
    return '#e74c3c'; // Red for Low Progress
}


// --- DOMContentLoaded Listener (The starting point) ---

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Sync Dark Mode setting from localStorage and set the initial button icon
    syncDarkMode(); 
    
    // 2. Setup the toggle button click event
    const darkModeToggleBtn = document.getElementById('dark-mode-toggle');
    if (darkModeToggleBtn) {
        darkModeToggleBtn.addEventListener('click', toggleDarkMode);
    }
    
    // 3. Load Courses
    const userId = localStorage.getItem('lsm_user_id');
    const coursesContainer = document.getElementById('courses-container');

    if (!userId) {
        showError('Please login to access your courses.', coursesContainer);
        return;
    }

    if (coursesContainer) {
        await loadMyCourses(userId, coursesContainer);
    }

    // 4. Setup Logout
    setupLogout(); 
});