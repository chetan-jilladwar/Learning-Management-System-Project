// js/dashboard.js - FIXED: Sirf ENROLLED courses hi dikhega
var GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwPeH_oXus5h88Y1H08AoMRNgSIaaZB_sX5Xuu2MT1BAFBILF_DhB3yVEX9nW7v0ozbHw/exec";

document.addEventListener('DOMContentLoaded', async () => {
  const userId = localStorage.getItem('lsm_user_id');
  const userName = localStorage.getItem('lsm_user_name') || 'Student';

  if (!userId) {
    alert('Please login to view dashboard.');
    window.location.href = 'login.html';
    return;
  }

  setupWelcomeMessage(userName);
  setupLogout();
  await loadDashboardStats(userId);
});


// --- New Dark Mode Logic ---

// Function to handle Dark/Light theme switching
function setupDarkModeToggle() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const body = document.body;
    const icon = darkModeToggle.querySelector('i');

    // 1. Theme applying function
    function setTheme(theme) {
        body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        if (theme === 'dark') {
            icon.classList.replace('fa-moon', 'fa-sun');
        } else {
            icon.classList.replace('fa-sun', 'fa-moon');
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


// --- Update DOMContentLoaded to include Dark Mode Setup ---
document.addEventListener('DOMContentLoaded', async () => {
  const userId = localStorage.getItem('lsm_user_id');
  const userName = localStorage.getItem('lsm_user_name') || 'Student';

  if (!userId) {
    alert('Please login to view dashboard.');
    window.location.href = 'login.html';
    return;
  }

  // 🔥 NEW: Setup Dark Mode before anything else
  setupDarkModeToggle(); 
  
  setupWelcomeMessage(userName);
  setupLogout();
  await loadDashboardStats(userId);
});

// ... (rest of your existing functions: setupWelcomeMessage, setupLogout, loadDashboardStats, etc.)
// Note: loadDashboardStats, updateDashboardStats, setLoadingStats, and showDashboardError functions 
//       should remain the same as the original script you provided.

// ... (existing functions)

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
    recentActivityEl: document.querySelector('.dashboard-section'),
    upcomingSessionEl: document.getElementById('upcoming-session')
  };

  setLoadingStats(stats);

  try {
    const response = await fetch(
      `${GOOGLE_SCRIPT_URL}?action=getAllCourses&userId=${encodeURIComponent(userId)}`
    );
    const data = await response.json();

    if (data.status === 'success' && Array.isArray(data.data)) {
      // 🔥 FIXED: SIRF ENROLLED COURSES (Progress !== null)
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

  if (stats.recentActivityEl) {
    if (enrolledCount > 0) {
      const recentCourse = enrolledCourses[0];
      stats.recentActivityEl.innerHTML = `
        <h2>Recent Activity</h2>
        <div class="activity-item">
          📚 Enrolled in <strong>${recentCourse.Title}</strong>
          <span class="activity-date">${new Date().toLocaleDateString()}</span>
        </div>
        <div class="activity-item">
          🎯 ${recentCourse.Progress.topicsCompleted || 0}/${recentCourse.Progress.totalTopics || 0} topics completed
        </div>
      `;
    } else {
      stats.recentActivityEl.innerHTML = `
        <h2>Recent Activity</h2>
        <div class="activity-item">
          📚 No enrolled courses yet
          <span class="activity-date">Start your learning journey!</span>
        </div>
        <div class="activity-item">
          <a href="index.html" class="btn btn-primary btn-small">Browse Courses</a>
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

  if (stats.recentActivityEl) {
    stats.recentActivityEl.innerHTML = `
      <h2>Recent Activity</h2>
      <div class="loading">Loading your activity...</div>
    `;
  }
}

function showDashboardError(stats) {
  if (stats.enrolledCoursesEl) stats.enrolledCoursesEl.textContent = '0';
  if (stats.overallProgressEl) stats.overallProgressEl.textContent = '0%';

  if (stats.recentActivityEl) {
    stats.recentActivityEl.innerHTML = `
      <h2>Recent Activity</h2>
      <div class="error-state">
        <p>⚠️ Failed to load data</p>
        <button onclick="location.reload()" class="btn btn-small">Retry</button>
      </div>
    `;
  }
}
