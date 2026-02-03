// js/dashboard.js - FIXED: Duplicate Auth Check Removed

var GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxAUni6GS7Eoe6IVad0K9OakqOCD2wAT62UVQIV16rQxURt5IZU1TAaJJSsv_4Zj2h_VA/exec";

// --- New Dark Mode Logic ---
function setupDarkModeToggle() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const body = document.body;
    // Check if the toggle exists to prevent errors on pages without it
    if (!darkModeToggle) return;

    const icon = darkModeToggle.querySelector('i');

    // 1. Theme applying function
    function setTheme(theme) {
        body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Only update icon if it exists
        if (icon) {
            if (theme === 'dark') {
                icon.classList.replace('fa-moon', 'fa-sun');
            } else {
                icon.classList.replace('fa-sun', 'fa-moon');
            }
        }
    }

    // 2. Load saved theme on startup
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);

    // 3. Toggle listener
    darkModeToggle.addEventListener('click', () => {
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
  const userId = localStorage.getItem('lsm_user_id');
  const userName = localStorage.getItem('lsm_user_name') || 'Student';

  // 🔥 REMOVED DUPLICATE AUTH CHECK HERE
  // Because js/auth-check.js is already handling the redirection logic.
  
  // Just return if no user to stop further execution of dashboard logic
  if (!userId) return; 

  // Initialize features
  setupDarkModeToggle(); 
  setupWelcomeMessage(userName);
  setupLogout();
  
  // Load data
  await loadDashboardStats(userId);
});

function setupWelcomeMessage(userName) {
  const welcomeEl = document.getElementById('welcome-message');
  if (welcomeEl) welcomeEl.textContent = `Welcome back, ${userName}! 👋`;

  const welcomeNameEl = document.getElementById('welcome-user-name');
  const nameEl = document.getElementById('user-display-name');
  const avatarEl = document.getElementById('user-avatar-initials');

  if (welcomeNameEl) welcomeNameEl.textContent = userName;
  if (nameEl) nameEl.textContent = userName;

  if (avatarEl) {
    const initials = userName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
    avatarEl.textContent = initials || 'ID';
  }
}

function setupLogout() {
  const logoutLink = document.getElementById('logout-link');
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Logout?')) {
        localStorage.clear();
        window.location.href = 'index.html';
      }
    });
  }
}

async function loadDashboardStats(userId) {
  const stats = {
    enrolledCoursesEl: document.getElementById('enrolled-count'),
    overallProgressEl: document.getElementById('progress-percent'),
    recentActivityEl: document.querySelector('.dashboard-section'), // Targeting section for activity update
    upcomingSessionEl: document.getElementById('upcoming-session')
  };

  setLoadingStats(stats);

  try {
    const response = await fetch(
      `${GOOGLE_SCRIPT_URL}?action=getAllCourses&userId=${encodeURIComponent(userId)}`
    );
    const data = await response.json();

    if (data.status === 'success' && Array.isArray(data.data)) {
      // 🔥 FIXED: Filter for ENROLLED courses (Progress is not null/undefined)
      const enrolledCourses = data.data.filter(course => 
        course.Progress !== null && 
        course.Progress !== undefined && 
        course.Progress.totalTopics > 0
      );
      
      updateDashboardStats(enrolledCourses, stats);
    } else {
      throw new Error(data.message || 'No data received');
    }
  } catch (error) {
    console.error('Dashboard error:', error);
    showDashboardError(stats);
  }
}

function updateDashboardStats(enrolledCourses, stats) {
  const enrolledCount = enrolledCourses.length;

  if (stats.enrolledCoursesEl) {
    stats.enrolledCoursesEl.textContent = enrolledCount;
  }

  let totalProgress = 0;
  if (enrolledCount > 0) {
    totalProgress = enrolledCourses.reduce(
      (sum, course) => sum + (course.Progress.progressPercentage || 0),
      0
    ) / enrolledCount;
  }

  if (stats.overallProgressEl) {
    stats.overallProgressEl.textContent = `${Math.round(totalProgress)}%`;
  }

  // Update Activity Section based on data
  if (stats.recentActivityEl) {
    // We are looking for the .activity-list container specifically if it exists, otherwise the section
    const activityListContainer = document.getElementById('activity-data-container') || stats.recentActivityEl;
    
    if (enrolledCount > 0) {
      const recentCourse = enrolledCourses[0];
      // Keep existing structure, just inject content
      activityListContainer.innerHTML = `
        <div class="activity-item">
          <div>
            <strong>Enrolled in ${recentCourse.Title}</strong>
            <p>${new Date().toLocaleDateString()}</p>
          </div>
          <span class="status-tag status-new">✨ Active</span>
        </div>
        <div class="activity-item">
          <div>
            <strong>Progress Check</strong>
            <p>${recentCourse.Progress.topicsCompleted || 0}/${recentCourse.Progress.totalTopics || 0} topics completed</p>
          </div>
          <span class="status-tag" style="color:var(--accent); background:rgba(6,182,212,0.15);">⏳ ${recentCourse.Progress.progressPercentage}% Done</span>
        </div>
      `;
    } else {
      activityListContainer.innerHTML = `
        <div class="activity-item">
          <div>
            <strong>No enrolled courses yet</strong>
            <p>Start your learning journey today!</p>
          </div>
          <span class="status-tag status-new">🆕 New</span>
        </div>
        <div class="activity-item" style="justify-content: center;">
          <a href="index.html" class="btn-primary" style="padding: 8px 16px; border-radius: 8px; font-size: 13px; text-decoration: none;">Browse Courses</a>
        </div>
      `;
    }
  }

  if (stats.upcomingSessionEl) {
    stats.upcomingSessionEl.textContent = 
      enrolledCount > 0 ? 'Next Topic Available' : 'Enroll in a Course First';
  }
}

function setLoadingStats(stats) {
  if (stats.enrolledCoursesEl) stats.enrolledCoursesEl.textContent = '…';
  if (stats.overallProgressEl) stats.overallProgressEl.textContent = '…%';

  // Optional: add loading state to activity list if needed
}

function showDashboardError(stats) {
  if (stats.enrolledCoursesEl) stats.enrolledCoursesEl.textContent = '0';
  if (stats.overallProgressEl) stats.overallProgressEl.textContent = '0%';

  const activityListContainer = document.getElementById('activity-data-container');
  if (activityListContainer) {
    activityListContainer.innerHTML = `
      <div class="activity-item" style="justify-content: center; flex-direction: column; gap: 10px; text-align: center;">
        <p>⚠️ Failed to load data</p>
        <button onclick="location.reload()" style="padding: 5px 10px; cursor: pointer;">Retry</button>
      </div>
    `;
  }
}