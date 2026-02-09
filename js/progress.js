var GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzuweqFoWdQExkI4AXo9cwzNLA_OsBVObtpPUjWMBoD0z1_BcDjy73BvPaNjwknEQq2VA/exec";

document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('lsm_user_id');
    const loader = document.getElementById('course-loader');
    const content = document.getElementById('progress-content');

    if (!userId) {
        if(loader) loader.style.display = 'none';
        alert('Please login to view progress.');
        window.location.href = 'index.html';
        return;
    }
    

    await fetchProgressData(userId, loader, content);
});

async function fetchProgressData(userId, loader, content) {
    // Show loader, hide content
    if(loader) loader.style.display = 'block';
    if(content) content.style.display = 'none';

    try {
        const url = `${GOOGLE_SCRIPT_URL}?action=getAllCourses&userId=${encodeURIComponent(userId)}`;
        const response = await fetch(url);
        const data = await response.json();

        // Hide loader, show content
        if(loader) loader.style.display = 'none';
        if(content) content.style.display = 'block';

        if (data.status === 'success' && data.data) {
            // Filter enrolled courses only
            const enrolledCourses = data.data.filter(c => c.Progress !== null && c.Progress !== undefined);
            
            if (enrolledCourses.length > 0) {
                renderCards(enrolledCourses, userId);
                calculateOverall(enrolledCourses);
            } else {
                document.getElementById('progress-list').innerHTML = 
                    '<p style="grid-column: 1/-1; text-align:center; color: var(--text-dim);">No active courses found.</p>';
            }
        }
    } catch (error) {
        console.error(error);
        if(loader) loader.style.display = 'none';
        alert('Failed to load progress.');
    }
}

function calculateOverall(courses) {
    let totalPct = 0;
    courses.forEach(c => {
        totalPct += (c.Progress?.progressPercentage || 0);
    });
    const avg = Math.round(totalPct / courses.length);

    // Animate the Overall Bar and Text
    document.getElementById('overall-percent').innerText = `${avg}%`;
    setTimeout(() => {
        document.getElementById('overall-bar').style.width = `${avg}%`;
    }, 100);
}

function renderCards(courses, userId) {
    const list = document.getElementById('progress-list');
    list.innerHTML = '';

    courses.forEach(course => {
        const progress = course.Progress || {};
        const pct = progress.progressPercentage || 0;
        const completed = progress.topicsCompleted || 0;
        const total = progress.totalTopics || 0;

        // Get Styling based on Course Title (Matching My Courses)
        const style = getCourseStyle(course.Title);

        // Logic for Button Link
        let nextTopic = completed + 1;
        let link = `course-topic.html?courseId=${course.CourseID}&userId=${userId}&topicIndex=${nextTopic}`;
        let btnText = "Continue Learning";
        
        if(pct >= 100) {
            btnText = "View Certificate";
            link = `certificate.html?courseId=${course.CourseID}&userId=${userId}`;
        } else if (pct === 0) {
            btnText = "Start Course";
        }

        const html = `
        <div class="progress-card">
            <div class="p-card-header">
                <div class="p-icon" style="background: ${style.gradient};">
                    <i class="${style.icon}"></i>
                </div>
                <div class="p-badge">${course.CourseID}</div>
            </div>

            <div class="p-title">${course.Title}</div>
            
            <div class="p-stats">
                <span>${completed}/${total} Topics</span>
                <span class="highlight">${pct}%</span>
            </div>

            <div class="mini-track">
                <div class="mini-fill" style="width: ${pct}%; background: ${style.gradient};"></div>
            </div>

            <a href="${link}" class="btn-action">
                ${btnText} <i class="fas fa-arrow-right"></i>
            </a>
        </div>
        `;
        list.innerHTML += html;
    });
}

// Same Color/Icon Logic as My Courses Page
function getCourseStyle(title) {
    const t = (title || '').toLowerCase();
    if (t.includes('java')) return { gradient: 'linear-gradient(135deg, #667eea, #764ba2)', icon: 'fab fa-java' };
    if (t.includes('python')) return { gradient: 'linear-gradient(135deg, #ff9a9e, #fecfef)', icon: 'fab fa-python' };
    if (t.includes('js') || t.includes('script')) return { gradient: 'linear-gradient(135deg, #f6d365, #fda085)', icon: 'fab fa-js' };
    if (t.includes('react')) return { gradient: 'linear-gradient(135deg, #00c6ff, #0072ff)', icon: 'fab fa-react' };
    return { gradient: 'linear-gradient(135deg, #0ba360, #3cba92)', icon: 'fas fa-book' };
}