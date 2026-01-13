// admin-topics.js

document.addEventListener('DOMContentLoaded', () => {
  if (!isLoggedInAsAdmin()) {
    window.location.href = 'admin-login.html';
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const courseId = params.get('courseId');

  if (!courseId) {
    alert('courseId missing in URL');
    window.location.href = 'admin-dashboard.html';
    return;
  }

  window.currentCourseId = courseId;
  document.getElementById('courseIdLabel').textContent = 'Course ID: ' + courseId;

  loadCourseTitle(courseId);
  loadTopics(courseId);

  const form = document.getElementById('addTopicForm');
  form.addEventListener('submit', (e) => handleAddTopic(e, courseId));
});

function showStatus(msg, type='success') {
  const box = document.getElementById('status-message');
  box.textContent = msg;
  box.className = type === 'success' ? 'success' : 'error';
  box.style.display = 'block';
  setTimeout(() => box.style.display = 'none', 4000);
}

async function loadCourseTitle(courseId) {
  try {
    const data = await callApi('getAllCourses');
    if (data.status === 'success' && Array.isArray(data.data)) {
      const course = data.data.find(c => c.CourseID === courseId);
      if (course) {
        document.getElementById('courseTitle').textContent = course.Title + ' – Topics';
      }
    }
  } catch (e) {
    console.error('loadCourseTitle error', e);
  }
}

async function loadTopics(courseId) {
  const tbody = document.getElementById('topicsTable');
  tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-muted">Loading topics...</td></tr>`;
  try {
    const data = await callApi('getTopicsByCourse', { courseId });
    if (data.status === 'success' && Array.isArray(data.data) && data.data.length) {
      tbody.innerHTML = data.data.map(t => `
        <tr>
          <td>${t.Order || ''}</td>
          <td>${t.Title}</td>
          <td>${t.VideoURL ? `<a href="${t.VideoURL}" target="_blank">Open</a>` : '-'}</td>
          <td>${t.ContentURL ? `<a href="${t.ContentURL}" target="_blank">Open</a>` : '-'}</td>
          <td>${t.Duration || ''}</td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-muted">No topics yet. Add first topic above.</td></tr>`;
    }
  } catch (e) {
    console.error('loadTopics error', e);
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-danger">Failed to load topics.</td></tr>`;
  }
}

async function handleAddTopic(e, courseId) {
  e.preventDefault();
  const btn = document.getElementById('addTopicButton');
  btn.disabled = true;
  btn.textContent = 'Adding...';

  const title      = document.getElementById('topicTitle').value.trim();
  const order      = document.getElementById('topicOrder').value.trim();
  const duration   = document.getElementById('topicDuration').value.trim();
  const videoUrl   = document.getElementById('topicVideoUrl').value.trim();
  const contentUrl = document.getElementById('topicContentUrl').value.trim();

  if (!title) {
    showStatus('Title is required', 'error');
    btn.disabled = false;
    btn.textContent = 'Add Topic';
    return;
  }

  const params = {
    courseId,
    title,
    order,
    duration,
    videoUrl,
    contentUrl
  };

  try {
    const res = await callApi('addTopic', params, 'POST');
    if (res.status === 'success') {
      showStatus('Topic added successfully', 'success');
      document.getElementById('addTopicForm').reset();
      loadTopics(courseId);
    } else {
      showStatus(res.message || 'Failed to add topic', 'error');
    }
  } catch (e) {
    console.error('addTopic error', e);
    showStatus('Server error while adding topic', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add Topic';
  }
}
