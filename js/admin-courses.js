// ✅ UPDATED - Perfectly Working with Backend
document.addEventListener('DOMContentLoaded', () => {
    // Security check
    if (!window.isLoggedInAsAdmin()) {
        window.location.href = 'admin-login.html';
        return;
    }

    loadCourses();
    
    const form = document.getElementById('addCourseForm');
    if (form) {
        form.addEventListener('submit', handleAddCourse);
    }
});

const statusMessage = document.getElementById('status-message');

function displayStatus(message, type = 'success') {
    if (!statusMessage) return;
    
    statusMessage.textContent = message;
    statusMessage.className = type === 'success' ? 'success' : 'error';
    statusMessage.style.display = 'block';
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 5000);
}

// 🔥 LOAD COURSES (Fixed)
async function loadCourses() {
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) {
        loadingMessage.textContent = "Loading courses...";
    }
    
    try {
        // ✅ Using callApi from admin-common.js
        const result = await window.callApi('getAllCourses');
        
        if (result.status === 'success' && result.data) {
            renderCourseTable(result.data);
        } else {
            if (loadingMessage) {
                loadingMessage.textContent = result.message || 'No courses found.';
            }
        }
    } catch (error) {
        console.error('Error fetching courses:', error);
        if (loadingMessage) {
            loadingMessage.textContent = 'Failed to load courses.';
        }
    }
}

function renderCourseTable(courses) {
    const courseListContainer = document.getElementById('courseList');
    const loadingMessage = document.getElementById('loadingMessage');

    if (!courseListContainer) return;

    if (courses.length === 0) {
        courseListContainer.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-book fa-3x text-muted mb-3"></i>
                <p class="text-muted mb-0">No courses found. Add your first course above!</p>
            </div>
        `;
        return;
    }

    let tableHTML = `
        <div class="table-responsive">
            <table class="table table-hover course-table mb-0">
                <thead class="table-dark">
                    <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Instructor</th>
                        <th>Duration</th>
                        <th>Topics</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    courses.forEach(course => {
        tableHTML += `
            <tr>
                <td><strong>${course.CourseID}</strong></td>
                <td>${course.Title}</td>
                <td>${course.Category || '-'}</td>
                <td>${course.Instructor}</td>
                <td>${course.Duration}</td>
                <td><span class="badge bg-info">${course.TotalTopics || 0}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-secondary btn-action me-1" onclick="editCourse('${course.CourseID}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info btn-action" onclick="goToTopics('${course.CourseID}')">
                        <i class="fas fa-list"></i> Topics
                    </button>
                </td>
            </tr>
        `;
    });

    tableHTML += `</tbody></table></div>`;
    courseListContainer.innerHTML = tableHTML;
    
    if (loadingMessage) {
        loadingMessage.textContent = `${courses.length} course(s) loaded.`;
        loadingMessage.className = 'text-success';
    }
}

// 🔥 ADD COURSE (Fixed)
async function handleAddCourse(e) {
    e.preventDefault();
    const button = document.getElementById('addCourseButton');
    
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Adding...';

    try {
        const formData = {
            action: 'addCourse',
            title: document.getElementById('title').value.trim(),
            category: document.getElementById('category').value.trim(),
            description: document.getElementById('description').value.trim(),
            duration: document.getElementById('duration').value.trim(),
            instructor: document.getElementById('instructor').value.trim(),
            imageUrl: document.getElementById('imageUrl').value.trim()
        };

        // ✅ Using callApi with POST support
        const result = await window.callApi('addCourse', formData, 'POST');
        
        if (result.status === 'success') {
            displayStatus(`✅ Success! Course "${formData.title}" added (ID: ${result.courseId})`, 'success');
            document.getElementById('addCourseForm').reset();
            loadCourses(); // Refresh list
        } else {
            displayStatus(result.message || 'Failed to add course.', 'error');
        }
    } catch (error) {
        console.error('Add Course Error:', error);
        displayStatus('❌ Server error. Please try again.', 'error');
    } finally {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-plus me-2"></i>Add Course';
    }
}

// 🔥 Global Functions (for onclick handlers)
window.editCourse = function(courseId) {
    alert(`Edit course ${courseId} - Feature coming soon!`);
};

window.goToTopics = function(courseId) {
    window.location.href = `admin-topics.html?courseId=${courseId}`;
};
