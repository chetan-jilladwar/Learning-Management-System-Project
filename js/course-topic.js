// js/course-topic.js (WITH MCQ ASSIGNMENT)

let currentCourseId = null;
let currentTopicIndex = 1;   // 1-based
let currentTopicID = null;
let totalTopics = 0;

// MCQ state
let mcqQuestions = [];       // [{QuestionID, QuestionText, OptionA..D}]
let mcqCurrentIndex = 0;     // 0-based
let mcqAnswers = {};         // {QuestionID: 'A' | 'B' | ...}
let mcqCompleted = false;

// NOTE: Make sure GOOGLE_SCRIPT_URL is defined globally in HTML:
// <script> const GOOGLE_SCRIPT_URL = "YOUR_WEB_APP_URL/exec"; </script>

document.addEventListener('DOMContentLoaded', async () => {
  const storedUserId = localStorage.getItem('lsm_user_id');
  const urlParams = new URLSearchParams(window.location.search);

  // Debug logs – URL params check
  console.log('Current search:', window.location.search);
  console.log('courseId param =', urlParams.get('courseId'));
  console.log('topicIndex param =', urlParams.get('topicIndex'));
  console.log('userId param =', urlParams.get('userId'));

  currentCourseId   = urlParams.get('courseId');
  const paramTopic  = urlParams.get('topicIndex');
  currentTopicIndex = parseInt(paramTopic, 10);
  const urlUserId   = urlParams.get('userId');

  // Default topicIndex = 1 if missing/NaN
  if (isNaN(currentTopicIndex) || currentTopicIndex < 1) {
    currentTopicIndex = 1;
  }

  console.log('Resolved currentTopicIndex =', currentTopicIndex);

  // Security check
  if (!currentCourseId || !urlUserId || !storedUserId || storedUserId !== urlUserId) {
    alert('Security error. Please login again.');
    window.location.href = 'login.html';
    return;
  }

  // Global access
  window.userId = urlUserId;

  try {
    await Promise.all([
      loadTopic(currentCourseId, currentTopicIndex),
      loadSidebarTopics(currentCourseId)
    ]);
  } catch (err) {
    console.error('Init topic page error:', err);
  }

  setupEventListeners();
});







/* ================== EVENT LISTENERS ================== */


// Sidebar me current topic ke just next item ko lock/unlock karne ke liye
// 🔥 FIXED: updateNextTopicLockInList (Index bug solved)
function updateNextTopicLockInList(canGoNextFromThis) {
  const list = document.getElementById('sidebar-topic-list');
  if (!list) return;

  const items = list.querySelectorAll('.topic-item');
  const nextIndex = currentTopicIndex; // 1-based → 0-based fix
  const nextItemIndex = nextIndex; // Current topic (0-based array index)

  if (nextItemIndex < items.length) {
    const nextItem = items[nextItemIndex];
    if (nextItem) {
      if (canGoNextFromThis) {
        nextItem.classList.remove('locked-topic');
      } else {
        nextItem.classList.add('locked-topic');
      }
    }
  }
}




// ... existing code ...

function setupEventListeners() {
    // Back to dashboard
    const backBtn = document.getElementById('back-to-dashboard');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            showToast('Returning to dashboard...');
            window.location.href = 'dashboard.html';
        });
    }

    // Navigation
    document.getElementById('prev-topic')?.addEventListener('click', () => navigateTopic(-1));
    document.getElementById('next-topic')?.addEventListener('click', () => navigateTopic(1));

    // OLD textarea assignment submit (optional)
    document.getElementById('submit-assignment')?.addEventListener('click', submitAssignment);

    
    // 🔥 NEW: CODE COMPILER EVENT LISTENER
    document.getElementById('compiler-run')?.addEventListener('click', runCompiler); 
    

    // MCQ navigation + submit
    document.getElementById('mcq-prev')?.addEventListener('click', () => {
        saveCurrentMCQSelection();
        if (mcqCurrentIndex > 0) {
            mcqCurrentIndex--;
            renderCurrentMCQ();
        }
    });

    document.getElementById('mcq-next')?.addEventListener('click', () => {
        saveCurrentMCQSelection();
        if (mcqCurrentIndex < mcqQuestions.length - 1) {
            mcqCurrentIndex++;
            renderCurrentMCQ();
        }
    });

    document.getElementById('mcq-submit')?.addEventListener('click', submitMCQQuiz);
    document.getElementById('mcq-retest')?.addEventListener('click', retakeMCQQuiz);
}
// ... existing code ...

/* ================== LOAD SINGLE TOPIC ================== */

async function loadTopic(courseId, topicIndex) {
  const titleEl = document.getElementById('topic-title');
  showLoading(titleEl, 'Loading topic...');

  try {
    const params = new URLSearchParams({
      action: 'getTopicDetail',
      courseId: courseId,
      topicIndex: topicIndex,     // 1-based
      userId: window.userId
    });

    const response = await fetch(`${GOOGLE_SCRIPT_URL}?${params.toString()}`);
    const data = await response.json();

    if (data.status === 'success' && data.data) {
      const topic = data.data;

      currentTopicID    = topic.TopicID;
      totalTopics       = topic.TotalTopics || 0;
      currentTopicIndex = topic.TopicIndex || topicIndex;

      // Flags from backend
     const topicCompleted    = !!data.isCompleted;
const assignmentDone    = !!data.isAssignmentCompleted;
const canGoNextFromThis = topicCompleted && assignmentDone;


      // MCQ completed flag
      mcqCompleted = assignmentDone;

      displayTopicContent(topic);

      // Yahin se navigation aur lock handle karenge
      updateNavigationButtons(canGoNextFromThis);
      updateNextTopicLockInList(canGoNextFromThis);

      // Agar backend ne is topic ko lock kiya hai (previous incomplete) to full UI lock
      // loadTopic ke andar



      // Sirf jab topic unlocked ho tab MCQ load
      await loadMCQAssignment(currentCourseId, currentTopicID);

      // Mark complete button state
      updateCompletionStatus(topicCompleted);
      updateAssignmentControls();
    } else {
      console.error('getTopicDetail error:', data.message);
      throw new Error(data.message || 'Topic not found for this course/index');
    }
  } catch (error) {
    console.error('Topic load error:', error);
    showError('Failed to load topic');
  }
}


function showLockMessage(msg) {
  const resultEl = document.getElementById('mcq-result');
  if (resultEl) {
    resultEl.textContent = msg;
    resultEl.style.color = 'red';
  } else {
    showToast(msg);
  }
}
function disableTopicUI() {
  document.getElementById('mcq-prev')?.setAttribute('disabled', 'true');
  document.getElementById('mcq-next')?.setAttribute('disabled', 'true');
  document.getElementById('mcq-submit')?.setAttribute('disabled', 'true');
  const mark = document.getElementById('mark-complete');
  if (mark) {
    mark.setAttribute('disabled', 'true');
    mark.textContent = 'Locked (complete previous topic)';
  }
}

function enableTopicUI() {
  document.getElementById('mcq-prev')?.removeAttribute('disabled');
  document.getElementById('mcq-next')?.removeAttribute('disabled');
  document.getElementById('mcq-submit')?.removeAttribute('disabled');
  document.getElementById('mark-complete')?.removeAttribute('disabled');
}

function displayTopicContent(topic) {
  // Title
  const titleEl = document.getElementById('topic-title');
  if (titleEl) {
    titleEl.textContent = `${topic.TopicIndex}. ${topic.Title}`;
    titleEl.classList.remove('loading');
    titleEl.style.color = '';
  }

  // 🔥 DETAILS TAB - Ye missing tha!
  document.getElementById('video-duration').textContent = topic.Duration || 'Not specified';
  document.getElementById('topic-level').textContent = topic.Level || 'Beginner';
  document.getElementById('topic-objectives').textContent = topic.Objectives || 'Learn core concepts';
  document.getElementById('topic-status').textContent = topic.Status || 'In Progress';
  document.getElementById('topic-description').textContent = topic.Description || 'Topic description will appear here...';

  // 🔥 NOTES TAB (same)
  const notesEl = document.getElementById('topic-notes');
  if (notesEl) {
    if (topic.NotesURL && topic.NotesURL.trim() !== '') {
      notesEl.innerHTML = `
        <div style="padding:1.5rem;background:rgba(15,76,117,0.05);border-radius:16px;border-left:4px solid #0f4c75;">
          <a href="${topic.NotesURL}" target="_blank" style="
            display:inline-flex; align-items:center; gap:8px;
            padding:12px 20px; border-radius:12px;
            background:#0f4c75; color:#fff; font-weight:500; font-size:1rem;
            text-decoration:none; box-shadow:0 4px 12px rgba(15,76,117,0.3);
          ">
            📖 <span>Open Notes / PDF</span> 
            <i class="fas fa-external-link-alt"></i>
          </a>
        </div>
      `;
    } else if (topic.NotesContent && topic.NotesContent.trim() !== '') {
      notesEl.innerHTML = topic.NotesContent.replace(/\n/g, '<br>');
    } else {
      notesEl.innerHTML = '<span class="text-muted">No notes for this topic.</span>';
    }
  }

  // Assignment question (same)
  const assignmentEl = document.getElementById('assignment-question');
  if (assignmentEl) {
    assignmentEl.textContent = topic.AssignmentQuestion || 'No assignment for this topic.';
  }

  // Video (same)
  const videoFrame = document.getElementById('topic-video');
  if (videoFrame) {
    if (topic.VideoURL) {
      const parts   = topic.VideoURL.split('v=');
      const idPart  = parts.length > 1 ? parts[1] : topic.VideoURL.split('/').pop();
      const videoId = idPart.split('&')[0].split('?')[0];
      videoFrame.src = `https://www.youtube.com/embed/${videoId}`;
    } else {
      videoFrame.src = '';
    }
  }

  // Sidebar course title
  const sidebarTitle = document.getElementById('course-title-sidebar');
  if (sidebarTitle) {
    sidebarTitle.textContent = topic.CourseTitle || `Course: ${currentCourseId}`;
  }

  // 🔥 Progress update
  const progressEl = document.getElementById('topic-progress');
  const progressFill = document.getElementById('progress-fill');
  const currentNum = document.getElementById('current-topic-num');
  const totalNum = document.getElementById('total-topics-num');

  if (progressEl) progressEl.textContent = `${Math.round((topic.TopicIndex / totalTopics) * 100)}%`;
  if (progressFill) progressFill.style.width = `${Math.round((topic.TopicIndex / totalTopics) * 100)}%`;
  if (currentNum) currentNum.textContent = topic.TopicIndex;
  if (totalNum) totalNum.textContent = totalTopics;
}



/* ================== LOAD SIDEBAR TOPICS ================== */

async function loadSidebarTopics(courseId) {
  const listContainer = document.getElementById('sidebar-topic-list');
  if (!listContainer) return;

  showLoading(listContainer, 'Loading topics...');

  try {
    const params = new URLSearchParams({
      action: 'getCourseTopicsList',
      courseId: courseId
    });

    const response = await fetch(`${GOOGLE_SCRIPT_URL}?${params.toString()}`);
    const data = await response.json();

    if (data.status === 'success' && Array.isArray(data.data) && data.data.length) {
      displayTopicList(data.data);
    } else {
      listContainer.innerHTML = '<li class="error">No topics found for this course</li>';
    }
  } catch (error) {
    console.error('Sidebar topics error:', error);
    listContainer.innerHTML = '<li class="error">Failed to load topics</li>';
  }
}

function displayTopicList(topics) {
  const container = document.getElementById('sidebar-topic-list');
  if (!container) return;

  container.innerHTML = '';

  // Sort by Order or TopicIndex
  topics.sort((a, b) => (Number(a.Order || a.TopicIndex || 0)) - (Number(b.Order || b.TopicIndex || 0)));

  topics.forEach((topic, idx) => {
  const listIndex = idx + 1;

  const li = document.createElement('li');
  li.className = `topic-item ${listIndex === currentTopicIndex ? 'active' : ''}`;

  let isLockedForClick = false;

  // NEW RULE:
  // 1) Jo topics current se pehle hain -> always unlocked
  // 2) Jo topic current hai -> active
  // 3) Jo topic current ke baad hain:
  //    - Agar listIndex === currentTopicIndex + 1:
  //        unlock only if mcqCompleted true
  //    - Agar listIndex > currentTopicIndex + 1:
  //        always locked

  if (listIndex > currentTopicIndex) {
    // future topic
    if (listIndex === currentTopicIndex + 1) {
      // just next topic
      if (!mcqCompleted) {
        li.classList.add('locked-topic');
        isLockedForClick = true;
      }
    } else {
      // 3rd, 4th, ... sab lock jab tak 2nd complete nahi
      li.classList.add('locked-topic');
      isLockedForClick = true;
    }
  }

  const link = document.createElement('a');
  link.href = '#';
  link.innerHTML = `
    <span class="topic-number">${listIndex}.</span>
    <span class="topic-name">${topic.Title}</span>
  `;

  link.addEventListener('click', (e) => {
    e.preventDefault();
    if (isLockedForClick) {
      showToast('Complete previous topics and assignments step by step.');
      return;
    }
    switchTopic(listIndex);
  });

  li.appendChild(link);
  container.appendChild(li);
});



  totalTopics = topics.length;
  updateNavigationButtons();
}

/* ================== NAVIGATION ================== */

function navigateTopic(direction) {
  const newIndex = currentTopicIndex + direction;
  if (newIndex >= 1 && newIndex <= totalTopics) {
    window.location.href =
      `course-topic.html?courseId=${encodeURIComponent(currentCourseId)}` +
      `&topicIndex=${newIndex}&userId=${encodeURIComponent(window.userId)}`;
  } else {
    showToast('No more topics available');
  }
}

function switchTopic(newIndex) {
  if (newIndex >= 1 && newIndex <= totalTopics) {
    const url =
      `course-topic.html?courseId=${encodeURIComponent(currentCourseId)}` +
      `&topicIndex=${newIndex}&userId=${encodeURIComponent(window.userId)}`;

    console.log('Navigating to:', url);
    window.location.href = url;
  } else {
    console.log('Invalid newIndex', newIndex, 'totalTopics', totalTopics);
  }
}

/* ================== MCQ ASSIGNMENT ================== */

async function loadMCQAssignment(courseId, topicId) {
    const container = document.getElementById('mcq-container');
    if (!container) return;

    // 🔒 By default, Next button disable rakho (jab tak pata na chale ki assignment nahi hai ya complete ho gaya)
    const nextBtn = document.getElementById('next-topic');
    if (nextBtn) nextBtn.disabled = true;

    try {
        const params = new URLSearchParams({
            action: 	'getTopicMCQs',
            courseId: courseId,
            topicId: 	topicId,
            userId: 	window.userId
        });

        const res 	= await fetch(`${GOOGLE_SCRIPT_URL}?${params.toString()}`);
        const data = await res.json();

        if (data.status === 'success' && Array.isArray(data.data) && data.data.length) {
            // --- MCQ Questions Found ---
            mcqQuestions = data.data.map(q => ({
                QuestionID: 	q.QuestionID,
                QuestionText: q.QuestionText,
                OptionA: 			q.OptionA,
                OptionB: 			q.OptionB,
                OptionC: 			q.OptionC,
                OptionD: 			q.OptionD
            }));
            mcqCurrentIndex = 0;
            mcqAnswers = {};
            mcqCompleted = data.isAssignmentCompleted || false; // Backend se status lo
            
            renderCurrentMCQ();

            // ✅ (1) Previous completion check: Agar assignment complete hai to Next Button enable karo
            if (mcqCompleted && typeof updateNavigationButtons === 'function') {
                updateNavigationButtons(true);
            }
            
            // ✅ (2) Retake Test button visibility: Agar pehle se complete hai to Retest button dikhao
            const retestBtn = document.getElementById('mcq-retest');
            if (retestBtn) {
                retestBtn.style.display = mcqCompleted ? 'inline-block' : 'none';
            }
            
        } else {
            // --- No MCQ Questions Found ---
            mcqQuestions = [];
            container.innerHTML = '<p>No MCQ assignment for this topic. You may proceed to the next topic.</p>';
            
            // ✅ (3) Rule for No Assignment: Agar assignment hi nahi hai, to Next Topic ko turant allow karo
            if (typeof updateNavigationButtons === 'function') {
                updateNavigationButtons(true);
            }
            if (typeof updateNextTopicLockInList === 'function') {
                updateNextTopicLockInList(true);
            }
        }
    } catch (err) {
        console.error('loadMCQAssignment error:', err);
        container.innerHTML = '<p>Failed to load assignment.</p>';
    }
}


function renderCurrentMCQ() {
  if (!mcqQuestions.length) return;

  const q = mcqQuestions[mcqCurrentIndex];
  const qTextEl   = document.getElementById('mcq-question-text');
  const optsEl    = document.getElementById('mcq-options');
  const progEl    = document.getElementById('mcq-progress');
  const submitBtn = document.getElementById('mcq-submit');

  const selected = mcqAnswers[q.QuestionID] || null;

  qTextEl.textContent = `${mcqCurrentIndex + 1}. ${q.QuestionText}`;

  const optionsHtml = ['A','B','C','D'].map(letter => {
    const text = q[`Option${letter}`];
    if (!text) return '';
    const checked = selected === letter ? 'checked' : '';
    return `
      <label class="mcq-option">
        <input type="radio" name="mcq-option" value="${letter}" ${checked}>
        <span>${letter}. ${text}</span>
      </label>
    `;
  }).join('');

  optsEl.innerHTML = optionsHtml;
  progEl.textContent = `Question ${mcqCurrentIndex + 1} of ${mcqQuestions.length}`;

  const prevBtn = document.getElementById('mcq-prev');
  const nextBtn = document.getElementById('mcq-next');
  if (prevBtn) prevBtn.disabled = mcqCurrentIndex === 0;
  if (nextBtn) nextBtn.disabled = mcqCurrentIndex === mcqQuestions.length - 1;

  if (submitBtn) {
    submitBtn.disabled = !canEnableSubmit();
  }

  // Radio change event
  const radios = optsEl.querySelectorAll('input[name="mcq-option"]');
  radios.forEach(r => {
    r.addEventListener('change', () => {
      mcqAnswers[q.QuestionID] = r.value;
      if (submitBtn) {
        submitBtn.disabled = !canEnableSubmit();
      }
    });
  });
}

function saveCurrentMCQSelection() {
  if (!mcqQuestions.length) return;
  const q = mcqQuestions[mcqCurrentIndex];
  const selectedInput = document.querySelector('input[name="mcq-option"]:checked');
  if (selectedInput) {
    mcqAnswers[q.QuestionID] = selectedInput.value;
  }
}
function getTopicMCQs_(e) {
  var courseId = (e.parameter.courseId || '').trim();
  var topicId  = (e.parameter.topicId  || '').trim();
  var userId   = (e.parameter.userId   || '').trim();

  if (!courseId || !topicId) {
    return { status: 'error', message: 'Missing courseId/topicId' };
  }

  var ss = SpreadsheetApp.openById(SS_ID);
  var sh = ss.getSheetByName(SH_MCQ_ASSIGN);
  if (!sh) {
    return { status: 'error', message: 'MCQAssignments sheet not found' };
  }

  var data = sh.getDataRange().getValues();
  data.shift(); // header

  var result = [];
  data.forEach(function(row) {
    var rowCourse = String(row[0] || '').trim();
    var rowTopic  = String(row[1] || '').trim();
    if (rowCourse === courseId && rowTopic === topicId) {
      result.push({
        QuestionID:   row[2],
        QuestionText: row[3],
        OptionA:      row[4],
        OptionB:      row[5],
        OptionC:      row[6],
        OptionD:      row[7]
      });
    }
  });

  var isCompleted = hasMCQSubmission_(userId, courseId, topicId);

  return {
    status: 'success',
    data: result,
    isAssignmentCompleted: isCompleted
  };
}


function canEnableSubmit() {
  const attempted = Object.keys(mcqAnswers).length;
  const onLast = mcqCurrentIndex === mcqQuestions.length - 1;
  return onLast && attempted > 0;
}
async function submitMCQQuiz() {
  if (!mcqQuestions.length) return;

  // Last question par jo select kiya hai woh bhi save ho jaye
  saveCurrentMCQSelection();

  // Kam se kam 1 question attempt
  if (Object.keys(mcqAnswers).length === 0) {
    showToast('Attempt at least one question before submitting');
    return;
  }

  const submitBtn = document.getElementById('mcq-submit');
  const resultEl  = document.getElementById('mcq-result');

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
  }

  try {
    // Answers array banao
    const answersArray = Object.entries(mcqAnswers).map(([questionId, selected]) => ({
      questionId,
      selected
    }));

    const params = new URLSearchParams({
      action:  'submitMCQAssignment',
      userId:  window.userId,
      courseId: currentCourseId,
      topicId:  currentTopicID,
      answers: JSON.stringify(answersArray)
    });

    const res  = await fetch(`${GOOGLE_SCRIPT_URL}?${params.toString()}`, { method: 'POST' });
    const data = await res.json();

    if (data.status === 'success' && data.data) {
      // Backend se aane wala full result
      const { totalQuestions, attemptedCount, correctCount, perQuestionResult } = data.data;

      // Top summary text
      if (resultEl) {
        resultEl.textContent =
          `You attempted ${attemptedCount} out of ${totalQuestions} and got ${correctCount} correct.`;
      }

      // Assignment completed flag
      mcqCompleted = true;
      showToast('Assignment submitted successfully! Marking topic complete...');

      // (1) Next topic turant unlock (button + sidebar)
      if (typeof updateNavigationButtons === 'function') {
        // canGoNextFromThis = true
        updateNavigationButtons(true);
      }
      if (typeof updateNextTopicLockInList === 'function') {
        // Sidebar me next topic se 🔒 hatao
        updateNextTopicLockInList(true);
      }

      // (2) Topic ko auto-complete mark karo (progress sheet update)
      try {
        const completeParams = new URLSearchParams({
          action:   'markTopicComplete',
          userId:   window.userId,
          courseId: currentCourseId,
          topicId:  currentTopicID
        });

        const completeRes  = await fetch(`${GOOGLE_SCRIPT_URL}?${completeParams.toString()}`, {
          method: 'POST'
        });
        const completeData = await completeRes.json();

        if (completeData.status === 'success') {
          // UI me completed status
          updateCompletionStatus(true);
          showToast('Topic marked complete automatically.');
        } else {
          // Yahin se exact backend message dikhega (Progress issue ka reason)
          showToast(completeData.message || 'Could not mark topic complete.');
          console.warn('markTopicComplete error:', completeData);
        }
      } catch (err2) {
        console.error('auto markTopicComplete error:', err2);
        showToast('Topic completion update failed.');
      }

      // (3) Har question ka review dikhाओ (student vs correct)
      if (Array.isArray(perQuestionResult) && typeof showMCQReview === 'function') {
        showMCQReview(perQuestionResult);
      }

      // (4) Retest button visible karo
      const retestBtn = document.getElementById('mcq-retest');
      if (retestBtn) {
        retestBtn.style.display = 'inline-block';
      }

    } else {
      throw new Error(data.message || 'Failed to submit MCQ assignment');
    }
  } catch (err) {
    console.error('submitMCQQuiz error:', err);
    showToast('Failed to submit MCQ assignment');
    if (submitBtn) submitBtn.disabled = false;
  } finally {
    if (submitBtn) submitBtn.textContent = 'Submit Quiz';
  }
}





function updateAssignmentControls() {
  const submitBtn = document.getElementById('mcq-submit');
  const markBtn   = document.getElementById('mark-complete');

  // Agar MCQ hai to old textarea assignment ko hide kar do
  if (mcqQuestions.length > 0) {
    const ta  = document.getElementById('assignment-submission');
    const qEl = document.getElementById('assignment-question');
    const oldBtn = document.getElementById('submit-assignment');
    if (ta) ta.style.display = 'none';
    if (qEl) qEl.style.display = 'none';
    if (oldBtn) oldBtn.style.display = 'none';

    if (submitBtn) {
      submitBtn.disabled = mcqQuestions.length === 0;
    }
    if (markBtn && !mcqCompleted) {
      markBtn.textContent = 'Complete assignment to unlock';
      markBtn.disabled = true;
    }
  }
}

/* ================== MARK COMPLETE ================== */

async function markTopicComplete() {
  const btn = document.getElementById('mark-complete');
  if (!btn) return;

  showLoadingBtn(btn, 'Saving...');

  try {
    const params = new URLSearchParams({
      action: 'markTopicComplete',
      userId: window.userId,
      courseId: currentCourseId,
      topicId: currentTopicID
    });

    const response = await fetch(`${GOOGLE_SCRIPT_URL}?${params.toString()}`, {
      method: 'POST'
    });
    const data = await response.json();

    if (data.status === 'success') {
      updateCompletionStatus(true);
      showToast('✅ Topic marked complete!');
    } else {
      throw new Error(data.message || 'Failed to mark topic complete');
    }
  } catch (error) {
    console.error('markTopicComplete error:', error);
    showToast('❌ Failed to mark complete');
    hideLoadingBtn(btn, 'Mark as Complete');
  }
}

/* ================== TEXTAREA ASSIGNMENT (OPTIONAL) ================== */

async function submitAssignment() {
  const btn = document.getElementById('submit-assignment');
  const textarea = document.getElementById('assignment-submission');
  if (!btn || !textarea) return;

  const submission = textarea.value.trim();
  if (submission.length < 10) {
    showToast('Please write a detailed answer (10+ chars)');
    return;
  }

  showLoadingBtn(btn, 'Submitting...');

  try {
    const params = new URLSearchParams({
      action: 'submitAssignment',
      userId: window.userId,
      courseId: currentCourseId,
      topicId: currentTopicID,
      submission: submission
    });

    const response = await fetch(`${GOOGLE_SCRIPT_URL}?${params.toString()}`, {
      method: 'POST'
    });
    const data = await response.json();
    const retestBtn = document.getElementById('mcq-retest');

    if (data.status === 'success') {
      textarea.value = '';
      btn.textContent = '✅ Submitted';
      btn.disabled = true;
      showToast('Assignment submitted successfully!');
    } 
    if (retestBtn) {
  retestBtn.style.display = 'inline-block';
}
    

else {
      throw new Error(data.message || 'Failed to submit assignment');
    }
  } catch (error) {
    console.error('submitAssignment error:', error);
    showToast('Failed to submit assignment');
    hideLoadingBtn(btn, 'Submit Assignment');
  }
}




function retakeMCQQuiz() {
  if (!mcqQuestions.length) return;

  mcqAnswers = {};
  mcqCurrentIndex = 0;
  mcqCompleted = false;

  const resultEl = document.getElementById('mcq-result');
  const reviewEl = document.getElementById('mcq-review');
  if (resultEl) resultEl.textContent = '';
  if (reviewEl) reviewEl.innerHTML = '';

  const submitBtn = document.getElementById('mcq-submit');
  if (submitBtn) {
    submitBtn.disabled = true;          // jab tak dubara answers fill na hon
    submitBtn.textContent = 'Submit Quiz';
  }

  const retestBtn = document.getElementById('mcq-retest');
  if (retestBtn) retestBtn.style.display = 'none';

  renderCurrentMCQ();                   // question 1 se start
}




/* ================== UI HELPERS ================== */



// 🔥 ADDED: Missing functions
function showMCQReview(perQuestionResult) {
  const reviewEl = document.getElementById('mcq-review');
  if (!reviewEl) return;

  const html = perQuestionResult.map((row, idx) => {
    const status = row.isCorrect ? '✅ Correct' : '❌ Wrong';
    return `
      <div class="mcq-review-item" style="
        background:var(--card-bg); border-radius:12px; padding:1.2rem; margin-bottom:1rem;
        border-left:4px solid ${row.isCorrect ? '#10b981' : '#ef4444'};
        box-shadow:var(--shadow-light);
      ">
        <div class="mcq-review-q" style="font-weight:600;margin-bottom:0.5rem;">
          ${idx + 1}. ${row.questionText}
        </div>
        <div class="mcq-review-opts" style="font-size:0.95rem;">
          <div><strong>Your answer:</strong> ${row.studentOption || '-'} ${row.studentText ? '- ' + row.studentText : ''}</div>
          <div><strong>Correct answer:</strong> ${row.correctOption} - ${row.correctText}</div>
          <div class="mcq-review-status" style="
            font-weight:600; padding:4px 12px; border-radius:20px; 
            display:inline-block; margin-top:0.5rem;
            background:${row.isCorrect ? '#d1fae5' : '#fee2e2'};
            color:${row.isCorrect ? '#065f46' : '#991b1b'};
          ">${status}</div>
        </div>
      </div>
    `;
  }).join('');

  reviewEl.innerHTML = html;
}


function updateNavigationButtons(canGoNextFromThis = true) {
  const prevBtn = document.getElementById('prev-topic');
  const nextBtn = document.getElementById('next-topic');

  if (prevBtn) prevBtn.disabled = currentTopicIndex <= 1;

  if (nextBtn) {
    if (totalTopics === 0 || currentTopicIndex >= totalTopics) {
      nextBtn.disabled = true;
    } else {
      nextBtn.disabled = !canGoNextFromThis;
    }
  }
}



function updateCompletionStatus(isCompleted) {
  const btn = document.getElementById('mark-complete');
  if (!btn) return;

  btn.disabled = true;
  btn.textContent = isCompleted ? '✅ Completed' : 'Complete after quiz';
  btn.style.background = isCompleted ? '#10b981' : '';
}


function showLoading(element, message) {
  if (!element) return;
  element.textContent = message;
  element.classList.add('loading');
}

function showError(message) {
  const titleEl = document.getElementById('topic-title');
  if (!titleEl) return;
  titleEl.textContent = message;
  titleEl.style.color = 'red';
}

function showLoadingBtn(btn, text) {
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = text;
}

function hideLoadingBtn(btn, text) {
  if (!btn) return;
  btn.disabled = false;
  btn.textContent = text;
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}


/* =========================================================
   COMPILER EXECUTION  (Piston API)
========================================================= */
async function runCompiler() {

  const code = document.getElementById("compiler-input").value;
  const lang = document.getElementById("compiler-language").value;
  const stdin = document.getElementById("compiler-stdin").value;
  const out = document.getElementById("compiler-output");

  if (!code.trim()) return out.innerText = "⚠️ Write some code first.";

  out.innerText = "⏳ Running...";

  try {
    const response = await fetch("https://emkc.org/api/v2/piston/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: lang,
        version: "*",
        files: [{ content: code }],
        stdin
      })
    });

    const result = await response.json();

    out.innerText =
      result.run?.output ||
      result.run?.stderr ||
      "⚠️ No output.";
  }
  catch (err) {
    out.innerText = "❌ Error running code.";
  }
}

