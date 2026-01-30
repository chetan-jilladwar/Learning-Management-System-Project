document.addEventListener('DOMContentLoaded', () => {
  if (!isLoggedInAsAdmin()) {
    window.location.href = 'admin-login.html';
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const courseId = params.get('courseId');

  if (!courseId) {
    alert('courseId missing');
    window.location.href = 'admin-courses.html';
    return;
  }

  window.currentCourseId = courseId;
  window.currentTopicId = null; 

  document.getElementById('courseIdLabel').textContent = 'Course ID: ' + courseId;

  loadCourseTitle(courseId);
  loadTopics(courseId);

  // Bind MCQ Form Submit
  document.getElementById('addMcqForm').addEventListener('submit', handleAddMcq);
});

// UI Helper
function showStatus(msg, type = 'success') {
  const box = document.getElementById('status-message');
  box.textContent = msg;
  box.className = type === 'success' ? 'alert alert-success' : 'alert alert-danger';
  box.style.display = 'block';
  setTimeout(() => box.style.display = 'none', 4000);
}

// Load Data Functions
async function loadCourseTitle(courseId) {
  try {
    const data = await callApi('getAllCourses');
    if (data.status === 'success' && Array.isArray(data.data)) {
      const course = data.data.find(c => c.CourseID === courseId);
      if (course) document.getElementById('courseTitle').textContent = course.Title + ' – Topics';
    }
  } catch (e) { console.error(e); }
}

async function loadTopics(courseId) {
  const tbody = document.getElementById('topicsTable');
  tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3">Loading...</td></tr>`;
  try {
    const data = await callApi('getTopicsByCourse', { courseId });
    if (data.status === 'success' && Array.isArray(data.data) && data.data.length) {
      tbody.innerHTML = data.data.map((t, index) => `
        <tr>
          <td>${t.Order || index + 1}</td>
          <td><strong>${t.Title}</strong><br><small class="text-muted">${t.TopicID}</small></td>
          <td>${t.VideoURL ? '<i class="fas fa-video text-danger"></i> ' : ''}${t.ContentURL ? '<i class="fas fa-file text-info"></i>' : ''}</td>
          <td>${t.Duration || '-'}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary" onclick="openMcqModal('${t.TopicID}', '${t.Title}')">
              Manage MCQs
            </button>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-muted">No topics yet.</td></tr>`;
    }
  } catch (e) {
    console.error(e);
  }
}

// 🔥 CORE FUNCTION: Save Topic & Optionally Open MCQ
async function submitTopic(mode) {
  // mode = 'simple' OR 'withMcq'
  
  const title = document.getElementById('topicTitle').value.trim();
  if(!title) { alert('Title required'); return; }

  // 1. Prepare Data
  const params = {
    courseId: window.currentCourseId,
    title: title,
    order: document.getElementById('topicOrder').value.trim(),
    duration: document.getElementById('topicDuration').value.trim(),
    videoUrl: document.getElementById('topicVideoUrl').value.trim(),
    contentUrl: document.getElementById('topicContentUrl').value.trim()
  };

  // 2. Call API to Add Topic
  try {
    showStatus('Saving topic...', 'success'); // temporary loading msg
    const res = await callApi('addTopic', params, 'POST');

    if (res.status === 'success') {
      showStatus('Topic Saved!', 'success');
      document.getElementById('addTopicForm').reset();
      
      // Refresh List
      loadTopics(window.currentCourseId);

      // 🔥 MAGIC PART: If user clicked "Save & Add MCQs"
      if (mode === 'withMcq') {
        // Open the modal immediately for the NEW topic
        // res.topicId backend se aana chahiye (addTopic function mein)
        if (res.topicId) {
          openMcqModal(res.topicId, title);
        } else {
          alert("Topic saved, but could not auto-open MCQ modal (ID missing). Please click 'Manage MCQs' in the list.");
        }
      }

    } else {
      showStatus(res.message || 'Failed', 'error');
    }
  } catch (e) {
    console.error(e);
    showStatus('Server Error', 'error');
  }
}

/* ================= MCQ MODAL FUNCTIONS ================= */

window.openMcqModal = function(topicId, topicTitle) {
  window.currentTopicId = topicId;
  document.getElementById('mcqTopicTitle').textContent = topicTitle;
  document.getElementById('addMcqForm').reset();
  
  const modal = new bootstrap.Modal(document.getElementById('mcqModal'));
  modal.show();

  loadTopicMcqs(topicId);
};

async function loadTopicMcqs(topicId) {
  const list = document.getElementById('mcqList');
  list.innerHTML = '<div class="text-center p-3">Loading...</div>';

  try {
    // Note: Backend should support filtering MCQs. Using generic getAll for now based on your structure.
    const res = await callApi('getAllMCQAssignments'); 
    
    if (res.status === 'success') {
      // Filter for THIS Course AND THIS Topic
      const assignment = res.data.find(a => a.CourseID === window.currentCourseId && a.TopicID === topicId);
      
      if (assignment && assignment.Questions.length > 0) {
        list.innerHTML = assignment.Questions.map((q, i) => `
          <div class="list-group-item d-flex justify-content-between align-items-start">
            <div>
              <strong>Q${i+1}: ${q.QuestionText}</strong><br>
              <small class="text-muted">A:${q.OptionA}, B:${q.OptionB}, C:${q.OptionC}, D:${q.OptionD} (Ans: ${q.CorrectOption})</small>
            </div>
            <button class="btn btn-sm text-danger" onclick="deleteMcq('${q.QuestionID}')"><i class="fas fa-trash"></i></button>
          </div>
        `).join('');
      } else {
        list.innerHTML = '<div class="text-center p-3 text-muted">No MCQs added for this topic yet.</div>';
      }
    }
  } catch (e) {
    list.innerHTML = '<div class="text-center text-danger">Error loading questions.</div>';
  }
}

async function handleAddMcq(e) {
  e.preventDefault();
  const btn = document.getElementById('saveMcqBtn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  const qId = 'Q' + Date.now(); 

  const params = {
    courseId: window.currentCourseId,
    topicId: window.currentTopicId,
    questionId: qId,
    questionText: document.getElementById('mcqQuestion').value.trim(),
    optionA: document.getElementById('mcqOptA').value.trim(),
    optionB: document.getElementById('mcqOptB').value.trim(),
    optionC: document.getElementById('mcqOptC').value.trim(),
    optionD: document.getElementById('mcqOptD').value.trim(),
    correctOption: document.getElementById('mcqCorrect').value
  };

  try {
    const res = await callApi('addMCQAssignment', params, 'POST');
    if (res.status === 'success') {
      document.getElementById('addMcqForm').reset();
      loadTopicMcqs(window.currentTopicId); // Refresh only the list inside modal
    } else {
      alert('Error: ' + res.message);
    }
  } catch (e) {
    alert('Failed to add question');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-plus"></i> Add Question';
  }
}

window.deleteMcq = async function(questionId) {
  if(!confirm('Delete this question?')) return;
  try {
    await callApi('deleteMCQAssignment', {
      courseId: window.currentCourseId,
      topicId: window.currentTopicId,
      questionId: questionId
    }, 'POST');
    loadTopicMcqs(window.currentTopicId);
  } catch(e) { alert('Delete failed'); }
};