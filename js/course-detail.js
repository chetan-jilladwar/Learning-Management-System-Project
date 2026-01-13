// js/course-detail.js (100% Working - CORS Free)
document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('lsm_user_id');
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('id');
    
    // 1. Auth Check
    if (!userId) {
        localStorage.setItem('pendingEnrollCourseId', courseId);
        alert('Please login to view course details.');
        window.location.href = 'login.html';
        return;
    }
    
    if (!courseId) {
        document.getElementById('course-title').textContent = 'Error: Course ID missing';
        return;
    }
    
    // 2. Tab switching (keep existing)
    document.querySelectorAll('.tab-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const tabId = this.getAttribute('data-tab');
            
            document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // 3. Load course details
    await loadCourseDetails(courseId, userId);
});

async function loadCourseDetails(courseId, userId) {
    const startLearningBtn = document.querySelector('#overview .btn-primary');
    showLoading(startLearningBtn, 'Loading course details...');
    
    try {
        // ⭐ CORS-FREE: Existing APIs only
        const [allCoursesRes, topicsRes] = await Promise.all([
            fetch(`${GOOGLE_SCRIPT_URL}?action=getAllCourses&userId=${encodeURIComponent(userId)}`),
            fetch(`${GOOGLE_SCRIPT_URL}?action=getCourseTopicsList&courseId=${encodeURIComponent(courseId)}&userId=${encodeURIComponent(userId)}`)
        ]);
        
        const allCoursesData = await allCoursesRes.json();
        const topicsData = await topicsRes.json();
        
        if (allCoursesData.status !== 'success' || topicsData.status !== 'success') {
            throw new Error('Failed to load course data');
        }
        
        // Find course in all courses
        const course = allCoursesData.data.find(c => c.CourseID === courseId);
        if (!course) {
            throw new Error('Course not found');
        }
        
        const topics = topicsData.data || [];
        const progress = course.Progress || { topicsCompleted: 0, totalTopics: 0, progressPercentage: 0 };
        
        renderCourseDetails(course, topics, progress, userId);
        
    } catch (error) {
        console.error('Course load error:', error);
        document.getElementById('course-title').textContent = 'Failed to load course';
        showError(startLearningBtn, 'Error loading course');
    }
}

function renderCourseDetails(course, topics, progress, userId) {
    // 1. Basic Info
    document.getElementById('course-title').textContent = course.Title;
    document.getElementById('course-instructor').textContent = `👨‍🏫 ${course.Instructor}`;
    document.getElementById('course-duration').textContent = `⏱️ ${course.Duration}`;
    document.getElementById('course-description').textContent = course.Description;
    
    // 2. Progress
    const isEnrolled = progress.totalTopics > 0;
    const progressEl = document.getElementById('course-progress');
    progressEl.innerHTML = isEnrolled ? `
        <div class="progress-bar-container">
            <div class="progress-bar" style="width: ${progress.progressPercentage}%"></div>
        </div>
        <p>${progress.progressPercentage}% Complete (${progress.topicsCompleted}/${progress.totalTopics} topics)</p>
    ` : '';
    
    // 3. Curriculum
    renderCurriculum(topics, course.CourseID, userId, isEnrolled);
    
    // 4. Button Logic
    const startLearningBtn = document.querySelector('#overview .btn-primary');
    hideLoading(startLearningBtn);
    
    if (isEnrolled) {
        const nextTopicIndex = progress.topicsCompleted + 1;
        startLearningBtn.href = `course-topic.html?courseId=${course.CourseID}&topicIndex=${nextTopicIndex}&userId=${userId}`;
        startLearningBtn.textContent = progress.progressPercentage >= 100 ? 'View Certificate 🎉' : 'Continue Learning';
        startLearningBtn.className = 'btn btn-primary';
    } else {
        startLearningBtn.href = '#';
        startLearningBtn.textContent = 'Enroll Now - Free';
        startLearningBtn.className = 'btn btn-success';
        startLearningBtn.onclick = () => handleEnrollment(course.CourseID, userId, startLearningBtn);
    }
}

function renderCurriculum(topics, courseId, userId, isEnrolled) {
    const curriculumEl = document.getElementById('curriculum-content');
    
    if (topics.length === 0) {
        curriculumEl.innerHTML = '<li class="text-muted">No topics available yet</li>';
        return;
    }
    
    const curriculumHTML = topics.map((topic, index) => {
        const topicNum = topic.TopicIndex || (index + 1);
        const topicTitle = topic.Title || 'Untitled Topic';
        const isCompleted = topic.isCompleted;
        const hasAssignment = topic.AssignmentQuestion;
        
        if (isEnrolled) {
            return `
                <li class="topic-item ${isCompleted ? 'completed' : ''}">
                    <span class="topic-number">${topicNum}</span>
                    <a href="course-topic.html?courseId=${courseId}&topicIndex=${topicNum}&userId=${userId}" class="topic-link">
                        ${topicTitle}
                    </a>
                    ${hasAssignment ? '<span class="assignment-badge">📝 Assignment</span>' : ''}
                    ${isCompleted ? '<span class="completed-badge">✅</span>' : ''}
                </li>
            `;
        } else {
            return `
                <li class="topic-item disabled">
                    <span class="topic-number">${topicNum}</span>
                    <span class="topic-title">${topicTitle}</span>
                    <span class="locked">🔒 Enroll to unlock</span>
                </li>
            `;
        }
    }).join('');
    
    curriculumEl.innerHTML = curriculumHTML;
}

async function handleEnrollment(courseId, userId, button) {
    if (!confirm(`Enroll in "${courseId}"?`)) return;
    
    showLoading(button, 'Enrolling...');
    
    try {
        // ⭐ CORS-FREE: URLSearchParams POST
        const params = new URLSearchParams({
            action: 'enrollCourse',
            userId: userId,
            courseId: courseId
        });
        
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?${params}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            alert('✅ Enrolled successfully! Redirecting...');
            window.location.href = `course-topic.html?courseId=${courseId}&topicIndex=1&userId=${userId}`;
        } else {
            throw new Error(data.message || 'Enrollment failed');
        }
    } catch (error) {
        console.error('Enrollment error:', error);
        alert('❌ Enrollment failed: ' + error.message);
        hideLoading(button, 'Enroll Now');
    }
}

// UI Helpers
function showLoading(element, text) {
    element.disabled = true;
    element.dataset.originalText = element.textContent;
    element.textContent = text;
}

function hideLoading(element) {
    element.disabled = false;
    if (element.dataset.originalText) {
        element.textContent = element.dataset.originalText;
    }
}

function showError(element, text) {
    element.textContent = text;
    element.classList.add('btn-danger');
}
