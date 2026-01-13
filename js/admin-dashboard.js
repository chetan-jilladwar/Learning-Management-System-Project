// js/admin-dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
    // Admin login check
    if (!isLoggedInAsAdmin()) {
        window.location.href = 'admin-login.html';
        return;
    }

    // Header par admin ka naam
    const adminNameEl = document.getElementById('admin-name');
    if (adminNameEl) {
        adminNameEl.textContent = localStorage.getItem('lsm_admin_name') || 'Admin';
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', adminLogout);
    }

    try {
        await initAdminDashboard();
    } catch (err) {
        console.error('Dashboard initialization failed:', err);
    }
});

// Main init
async function initAdminDashboard() {
    await Promise.all([
        loadStats(),
        loadStudents(),
        loadCoursesForDashboard(),
        loadPendingSubmissions()
    ]);
}

/* =====================  STATS  ===================== */

async function loadStats() {
    try {
        const res = await callApi('getDashboardStats');
        if (res.status === 'success' && res.data) {
            const s = res.data;
            setText('total-students', s.totalStudents || 0);
            setText('total-courses', s.totalCourses || 0);
            setText('total-enrollments', s.totalEnrollments || 0);
            setText('pending-submissions', s.pendingSubmissions || 0);
        } else {
            console.error('Stats API error:', res.message);
        }
    } catch (err) {
        console.error('Stats load error:', err);
    }
}

/* =====================  STUDENTS TAB  ===================== */

async function loadStudents() {
    const tbody = document.querySelector('#studentsTable tbody');
    if (!tbody) return;

    tbody.innerHTML = rowFullCol(4, 'Loading students...');

    try {
        const res = await callApi('getAllStudents');
        if (res.status === 'success' && Array.isArray(res.data) && res.data.length) {
            tbody.innerHTML = res.data.map(s => `
                <tr>
                    <td>${safe(s.userId)}</td>
                    <td>${safe(s.name)}</td>
                    <td>${safe(s.email)}</td>
                    <td>${safe(s.phone)}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = rowFullCol(4, 'No students found.', 'empty-state');
        }
    } catch (err) {
        console.error('Students load error:', err);
        tbody.innerHTML = rowFullCol(4, 'Failed to load students.', 'error-state');
    }
}

/* =====================  COURSES TAB  ===================== */

async function loadCoursesForDashboard() {
    const tbody = document.querySelector('#coursesTable tbody');
    if (!tbody) return;

    tbody.innerHTML = rowFullCol(6, 'Loading courses...');

    try {
        const res = await callApi('getAllCourses');
        if (res.status === 'success' && Array.isArray(res.data) && res.data.length) {
            tbody.innerHTML = res.data.map(c => `
                <tr>
                    <td>${safe(c.CourseID)}</td>
                    <td>${safe(c.Title)}</td>
                    <td>${safe(c.Category) || '-'}</td>
                    <td>${safe(c.Instructor)}</td>
                    <td>${safe(c.Duration)}</td>
                    <td>${c.TotalTopics || 0}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = rowFullCol(6, 'No courses found.', 'empty-state');
        }
    } catch (err) {
        console.error('Courses load error:', err);
        tbody.innerHTML = rowFullCol(6, 'Failed to load courses.', 'error-state');
    }
}

/* =====================  PENDING SUBMISSIONS TAB  ===================== */

async function loadPendingSubmissions() {
    const tbody = document.querySelector('#submissionsTable tbody');
    if (!tbody) return;

    tbody.innerHTML = rowFullCol(5, 'Loading submissions...');

    try {
        const res = await callApi('getPendingSubmissions');
        if (res.status === 'success' && Array.isArray(res.data) && res.data.length) {
            tbody.innerHTML = res.data.map(sub => `
                <tr>
                    <td>${safe(sub.userId)}</td>
                    <td>${safe(sub.courseId)}</td>
                    <td>${safe(sub.topicId)}</td>
                    <td>${shortText(sub.submission, 80)}</td>
                    <td>${formatDate(sub.timestamp)}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = rowFullCol(5, 'No pending submissions.', 'empty-state');
        }
    } catch (err) {
        console.error('Submissions load error:', err);
        tbody.innerHTML = rowFullCol(5, 'Failed to load submissions.', 'error-state');
    }
}

/* =====================  HELPERS  ===================== */

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function rowFullCol(colspan, text, cls = 'loading-state') {
    return `
        <tr>
            <td colspan="${colspan}" class="${cls}">${text}</td>
        </tr>
    `;
}

function safe(v) {
    return (v === null || v === undefined) ? '' : String(v);
}

function shortText(v, max) {
    const txt = safe(v);
    return txt.length > max ? txt.substring(0, max) + '…' : txt;
}

function formatDate(v) {
    if (!v) return '';
    try {
        return new Date(v).toLocaleDateString();
    } catch {
        return v;
    }
}
