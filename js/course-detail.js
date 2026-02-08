document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('lsm_user_id');
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('id');
    
    // Auth Check
    if (!userId) {
        localStorage.setItem('pendingEnrollCourseId', courseId);
        window.location.href = 'login.html';
        return;
    }
    
    // Global State
    window.userId = userId;
    window.currentCourseId = courseId;

    if (courseId) {
        await loadCourseData(courseId, userId);
    } else {
        safeSetText('course-title', 'Error: Course ID Missing');
    }
});

async function loadCourseData(courseId, userId) {
    const btn = document.getElementById('main-action-btn');
    if (btn) btn.textContent = 'Loading...';

    try {
        // Fetch All Data using CORS-friendly GET
        const [allCoursesRes, topicsRes] = await Promise.all([
            fetch(`${GOOGLE_SCRIPT_URL}?action=getAllCourses&userId=${encodeURIComponent(userId)}`),
            fetch(`${GOOGLE_SCRIPT_URL}?action=getCourseTopicsList&courseId=${encodeURIComponent(courseId)}`)
        ]);

        const allData = await allCoursesRes.json();
        const topicData = await topicsRes.json();

        // Validate
        const course = allData.data.find(c => c.CourseID === courseId);
        if (!course) throw new Error("Course not found");

        const topics = topicData.data || [];
        const progress = course.Progress || { topicsCompleted: 0, totalTopics: 0, progressPercentage: 0 };
        const isEnrolled = progress.totalTopics > 0 || course.isEnrolled;

        // Render UI
        renderHeader(course, progress, isEnrolled);
        renderCurriculum(topics, progress, isEnrolled);
        renderActionBtn(course, progress, isEnrolled, topics);

    } catch (err) {
        console.error(err);
        if (btn) {
            btn.textContent = "Error Loading Course";
            btn.style.background = "red";
        }
    }
}

// 🔥 SAFE TEXT HELPER (Ye Crash hone se bachayega)
function safeSetText(id, text) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = text;
    } else {
        console.warn(`Element with ID '${id}' not found in HTML.`);
    }
}

function renderHeader(course, progress, isEnrolled) {
    // Safe setting of text (Agar ID nahi mili to crash nahi hoga)
    safeSetText('course-title', course.Title);
    safeSetText('course-instructor', course.Instructor);
    safeSetText('course-duration', course.Duration);
    safeSetText('total-topics-count', `${course.TotalTopics || 0} Topics`);
    safeSetText('course-description', course.Description);

    // Progress Bar Logic
    if (isEnrolled) {
        const container = document.getElementById('progress-container');
        if (container) {
            container.style.display = 'block';
            
            const pct = progress.progressPercentage || 0;
            const done = progress.topicsCompleted || 0;
            const total = progress.totalTopics || 0;

            const fill = document.getElementById('progress-fill');
            if (fill) fill.style.width = `${pct}%`;

            safeSetText('progress-text', `${pct}% Completed`);
            safeSetText('topics-done-text', `${done}/${total} Done`);

            // 🔥 CERTIFICATE UNLOCK (If 100%)
            if (pct >= 100) {
                const banner = document.getElementById('cert-banner');
                const dlBtn = document.getElementById('download-cert-btn');
                
                if (banner) banner.style.display = 'flex';
                if (dlBtn) dlBtn.onclick = downloadCertificate;
            }
        }
    }
}

function renderCurriculum(topics, progress, isEnrolled) {
    const list = document.getElementById('topic-list');
    if (!list) return; // Safety check
    
    list.innerHTML = '';

    if (topics.length === 0) {
        list.innerHTML = '<li style="padding:15px; text-align:center;">No topics available yet.</li>';
        return;
    }

    topics.forEach((t, i) => {
        const index = i + 1;
        // Logic: Topic is completed if index <= topicsCompleted
        const isCompleted = isEnrolled && (index <= progress.topicsCompleted);
        const isLocked = !isEnrolled; 

        // Icon Logic
        let iconHtml = `<span class="topic-number">${index}</span>`;
        if (isCompleted) iconHtml = `<span class="topic-number" style="background:var(--accent); color:#1a2e05;"><i class="fas fa-check"></i></span>`;
        if (isLocked) iconHtml = `<span class="topic-number" style="background:#eee; color:#aaa;"><i class="fas fa-lock"></i></span>`;

        list.innerHTML += `
            <li class="topic-item ${isCompleted ? 'completed' : ''}">
                <div class="topic-left">
                    ${iconHtml}
                    <div class="topic-info">
                        <h4>${t.Title}</h4>
                        <span>Topic ${index} • ${t.Duration || '15m'}</span>
                    </div>
                </div>
                <div>
                    ${isLocked ? '' : '<i class="fas fa-play-circle" style="font-size:1.5rem; color:var(--primary); cursor:pointer;"></i>'}
                </div>
            </li>
        `;
    });
}

function renderActionBtn(course, progress, isEnrolled, topics) {
    const btn = document.getElementById('main-action-btn');
    if (!btn) return; // Safety check
    
    if (isEnrolled) {
        const pct = progress.progressPercentage || 0;
        if (pct >= 100) {
            btn.innerHTML = '<i class="fas fa-award"></i> View Certificate';
            btn.style.background = '#badc58'; // Greenish
            btn.style.color = '#1a2e05';
            btn.onclick = (e) => { e.preventDefault(); downloadCertificate(); };
        } else {
            // Find next topic
            let nextIndex = (progress.topicsCompleted || 0) + 1;
            if (nextIndex > topics.length) nextIndex = topics.length;

            btn.innerHTML = '<i class="fas fa-play"></i> Continue Learning';
            btn.href = `course-topic.html?courseId=${course.CourseID}&topicIndex=${nextIndex}&userId=${window.userId}`;
        }
    } else {
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Enroll Now';
        btn.onclick = (e) => {
            e.preventDefault();
            enrollUser(course.CourseID);
        };
    }
}

async function enrollUser(courseId) {
    const btn = document.getElementById('main-action-btn');
    if (btn) {
        btn.textContent = 'Enrolling...';
        btn.style.opacity = '0.7';
    }
    
    try {
        const params = new URLSearchParams({
            action: 'enrollCourse',
            userId: window.userId,
            courseId: courseId
        });
        
        await fetch(`${GOOGLE_SCRIPT_URL}?${params}`, { method: 'POST' });
        
        alert("Enrolled Successfully! 🎉");
        window.location.reload(); 
    } catch (e) {
        alert("Enrollment failed.");
        if (btn) {
            btn.textContent = "Enroll Now";
            btn.style.opacity = '1';
        }
    }
}

// 🔥 DOWNLOAD CERTIFICATE FUNCTION (Dynamic & Fixed)
async function downloadCertificate() {
    const btn = document.getElementById('download-cert-btn');
    const load = document.getElementById('cert-loading');
    
    // UI Feedback
    if(btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    }
    if(load) load.style.display = 'block';

    try {
        console.log("Generating certificate for:", window.userId, window.currentCourseId);

        // Prepare Data using FormData (Better for Apps Script POST)
        const formData = new FormData();
        formData.append('action', 'generateCertificate');
        formData.append('userId', window.userId);
        formData.append('courseId', window.currentCourseId);

        // Fetch Request
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (data.status === 'success') {
            // Create Download Link
            const link = document.createElement('a');
            link.href = "data:application/pdf;base64," + data.base64;
            link.download = data.fileName || "Certificate.pdf";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Success UI
            if(btn) btn.innerHTML = '<i class="fas fa-check"></i> Downloaded';
        } else {
            alert("Server Error: " + data.message);
            if(btn) btn.innerHTML = '<i class="fas fa-download"></i> Try Again';
        }
    } catch (e) {
        console.error(e);
        alert("Network Error: " + e.message);
        if(btn) btn.innerHTML = '<i class="fas fa-download"></i> Try Again';
    } finally {
        if(btn) btn.disabled = false;
        if(load) load.style.display = 'none';
    }
}