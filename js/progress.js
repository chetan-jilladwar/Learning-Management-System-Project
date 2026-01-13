// js/progress.js (100% Working - CORS Free)
document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('lsm_user_id');
    
    if (!userId) {
        alert('Please login to view your progress.');
        window.location.href = 'login.html';
        return;
    }
    
    await fetchProgressData(userId);
});

async function fetchProgressData(userId) {
    const progressListEl = document.getElementById('progress-list');
    const loadingEl = document.getElementById('loading-message') || progressListEl;
    
    showLoading(loadingEl, 'Loading your progress...');
    
    try {
        // ⭐ CORS-FREE: getAllCourses (Returns enrolled courses + progress)
        const url = `${GOOGLE_SCRIPT_URL}?action=getAllCourses&userId=${encodeURIComponent(userId)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        hideLoading(loadingEl);
        
        if (data.status === 'success' && data.data) {
            // Filter enrolled courses only (with progress data)
            const enrolledCourses = data.data.filter(course => 
                course.Progress && course.Progress.totalTopics > 0
            );
            
            if (enrolledCourses.length > 0) {
                displayProgress(enrolledCourses);
            } else {
                showNoProgress(progressListEl);
            }
        } else {
            showNoProgress(progressListEl);
        }
        
    } catch (error) {
        console.error('Progress load error:', error);
        hideLoading(loadingEl);
        showError('Failed to load progress data', progressListEl);
    }
}

function displayProgress(courses) {
    const progressListEl = document.getElementById('progress-list');
    progressListEl.innerHTML = '';
    
    let totalProgress = 0;
    const totalCourses = courses.length;
    
    courses.forEach(course => {
        const progress = course.Progress || {};
        const progressPercent = progress.progressPercentage || 0;
        const completedTopics = progress.topicsCompleted || 0;
        const totalTopics = progress.totalTopics || 0;
        
        totalProgress += progressPercent;
        
        const card = document.createElement('div');
        card.className = 'progress-card course-card';
        card.innerHTML = `
            <div class="course-header">
                <h3>${course.Title}</h3>
                <span class="course-id">${course.CourseID}</span>
            </div>
            <div class="progress-stats">
                <div class="topic-count">
                    📚 ${completedTopics}/${totalTopics} Topics
                </div>
                <div class="progress-display">
                    <span class="progress-percent">${progressPercent}%</span>
                </div>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar-fill" style="width: ${progressPercent}%;"></div>
            </div>
            <div class="course-actions">
                <a href="course-detail.html?id=${course.CourseID}" class="btn btn-primary btn-small">
                    ${progressPercent >= 100 ? 'View Certificate 🎉' : 'Continue Learning'}
                </a>
                <a href="course-topic.html?courseId=${course.CourseID}&topicIndex=${completedTopics + 1}&userId=${localStorage.getItem('lsm_user_id')}" 
                   class="btn btn-outline">Next Topic</a>
            </div>
        `;
        progressListEl.appendChild(card);
    });
    
    const overallProgress = totalCourses > 0 ? Math.round(totalProgress / totalCourses) : 0;
    updateOverallProgress(overallProgress);
}

function updateOverallProgress(progress) {
    const overallProgressTextEl = document.getElementById('overall-progress-text');
    const overallProgressBarEl = document.getElementById('overall-progress-bar');
    
    if (overallProgressTextEl) {
        overallProgressTextEl.textContent = `Overall Progress: ${progress}% Complete`;
    }
    
    if (overallProgressBarEl) {
        overallProgressBarEl.style.width = `${progress}%`;
        overallProgressBarEl.dataset.progress = progress;
    }
}

function showNoProgress(container) {
    container.innerHTML = `
        <div class="empty-state progress-empty">
            <div class="empty-icon">📊</div>
            <h3>No Progress Data</h3>
            <p>You haven't completed any topics yet. Start learning to see your progress here!</p>
            <div class="action-buttons">
                <a href="my-courses.html" class="btn btn-primary">View My Courses</a>
                <a href="index.html" class="btn btn-secondary">Browse Courses</a>
            </div>
        </div>
    `;
    updateOverallProgress(0);
}

function showError(message, container) {
    container.innerHTML = `
        <div class="error-state">
            <div class="error-icon">⚠️</div>
            <h3>Failed to Load Progress</h3>
            <p>${message}</p>
            <button onclick="location.reload()" class="btn btn-primary">Retry</button>
        </div>
    `;
}

function showLoading(container, message) {
    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>${message}</p>
        </div>
    `;
}

function hideLoading(container) {
    const loadingEl = container.querySelector('.loading-state');
    if (loadingEl) loadingEl.remove();
}
