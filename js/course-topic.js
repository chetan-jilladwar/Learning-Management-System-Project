// js/course-topic.js (FINAL VERIFIED)

let currentCourseId = null;
let currentTopicIndex = 1;   // 1-based
let currentTopicID = null;
let totalTopics = 0;

// MCQ state
let mcqQuestions = [];       // [{QuestionID, QuestionText, OptionA..D}]
let mcqCurrentIndex = 0;     // 0-based
let mcqAnswers = {};         // {QuestionID: 'A' | 'B' | ...}
let mcqCompleted = false;

document.addEventListener('DOMContentLoaded', async () => {
  const storedUserId = localStorage.getItem('lsm_user_id');
  const urlParams = new URLSearchParams(window.location.search);

  // Debug logs
  console.log('Current search:', window.location.search);
  
  currentCourseId   = urlParams.get('courseId');
  const paramTopic  = urlParams.get('topicIndex');
  currentTopicIndex = parseInt(paramTopic, 10);
  const urlUserId   = urlParams.get('userId');

  // Default topicIndex = 1 if missing/NaN
  if (isNaN(currentTopicIndex) || currentTopicIndex < 1) {
    currentTopicIndex = 1;
  }

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

function setupEventListeners() {
    // Navigation
    document.getElementById('prev-topic')?.addEventListener('click', () => navigateTopic(-1));
    document.getElementById('next-topic')?.addEventListener('click', () => navigateTopic(1));

    // Compiler
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

// Sidebar me current topic ke just next item ko lock/unlock karne ke liye
function updateNextTopicLockInList(canGoNextFromThis) {
  const list = document.getElementById('sidebar-topic-list');
  if (!list) return;

  const items = list.querySelectorAll('.topic-item');
  // Current index is 1-based, list is 0-based.
  const nextItemIndex = currentTopicIndex; 

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

      currentTopicID        = topic.TopicID;
      totalTopics           = topic.TotalTopics || 0;
      currentTopicIndex     = parseInt(topic.TopicIndex || topicIndex);

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

      // Sirf jab topic unlocked ho tab MCQ load
      await loadMCQAssignment(currentCourseId, currentTopicID);

      // Mark complete button state
      updateCompletionStatus(topicCompleted);
      updateAssignmentControls();
      
    } else {
      console.error('getTopicDetail error:', data.message);
      throw new Error(data.message || 'Topic not found');
    }
  } catch (error) {
    console.error('Topic load error:', error);
    showError('Failed to load topic');
  }
}

/* ================== MARK COMPLETE (UPDATED LOGIC) ================== */

async function markTopicComplete() {
  const btn = document.getElementById('mark-complete');
  
  // UI update (Optimistic)
  if (btn) {
      btn.disabled = true;
      btn.textContent = 'Saving...';
  }

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

      // 🔥 CRITICAL: CHECK COURSE COMPLETION FROM BACKEND
      const isLastTopic = (currentTopicIndex >= totalTopics);

      if (data.isCourseCompleted === true || isLastTopic) {
          console.log("Course Completion Detected!");
          showCourseCompletionCard();
      }

    } else {
      console.error('Mark complete failed:', data.message);
      // Agar fail hua to button wapas enable karo (unless MCQ done hai)
      if(btn && !mcqCompleted) {
          btn.disabled = false;
          btn.textContent = 'Mark Complete';
      }
    }
  } catch (error) {
    console.error('markTopicComplete error:', error);
    showToast('❌ Failed to mark complete');
    // Error case mein button reset
    if(btn && !mcqCompleted) {
        btn.disabled = false;
        btn.textContent = 'Mark Complete';
    }
  }
}

function showCourseCompletionCard() {
    const card = document.getElementById('course-completion-card');
    const nextBtn = document.getElementById('next-topic');
    const quizCard = document.querySelector('.quiz-card'); 
    
    if (card) {
        card.style.display = 'block';
        
        // Smooth scroll uss tak
        setTimeout(() => {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        
        // Confetti Celebration 🎉
        if(window.confetti) {
            var duration = 3 * 1000;
            var animationEnd = Date.now() + duration;
            var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

            var interval = setInterval(function() {
              var timeLeft = animationEnd - Date.now();
              if (timeLeft <= 0) {
                return clearInterval(interval);
              }
              var particleCount = 50 * (timeLeft / duration);
              confetti(Object.assign({}, defaults, { particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } }));
            }, 250);
        }
    }
    
    // Agar course khatam, to Next Button gayab
    if (nextBtn) nextBtn.style.display = 'none';
}

/* ================== CERTIFICATE DOWNLOAD ================== */

/* ================== CERTIFICATE DOWNLOAD ================== */
async function downloadCertificate() {
    const btn = document.getElementById('btn-download-cert');
    const msg = document.getElementById('cert-loading-msg');

    if (btn) btn.disabled = true;
    if (msg) msg.style.display = 'block';

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            // 🔥 FIXED HEADER: This solves 'undefined action' error
            headers: { "Content-Type": "text/plain;charset=utf-8" }, 
            body: JSON.stringify({
                action: 'generateCertificate',
                userId: window.userId,
                courseId: currentCourseId
            })
        });

        const data = await response.json();

        if (data.status === 'success') {
            if (msg) {
                msg.style.color = "green";
                msg.innerText = "Downloaded Successfully! 🎉";
            }
            
            // Base64 Download Logic
            const link = document.createElement('a');
            link.href = "data:application/pdf;base64," + data.base64;
            link.download = data.fileName || "Certificate.pdf";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            if (btn) {
                btn.innerText = "Download Again 🎓";
                btn.disabled = false;
            }
        } else {
            throw new Error(data.message); 
        }

    } catch (error) {
        console.error(error);
        if (msg) {
            msg.style.color = "red";
            msg.innerText = "Error: " + error.message;
        }
        if (btn) btn.disabled = false;
    }
}

/* ================== MCQ SUBMISSION (UPDATED) ================== */

async function submitMCQQuiz() {
  if (!mcqQuestions.length) return;
  saveCurrentMCQSelection();

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
      const { totalQuestions, attemptedCount, correctCount, perQuestionResult } = data.data;

      if (resultEl) {
        resultEl.innerHTML = `
            <div class="alert alert-info text-center">
                <h4>Quiz Result</h4>
                <p class="mb-0">You attempted <strong>${attemptedCount}/${totalQuestions}</strong></p>
                <p class="h5 mt-2">Score: <span class="badge bg-success">${correctCount} Correct</span></p>
            </div>
        `;
      }

      mcqCompleted = true;
      showToast('Quiz submitted! Updating progress...');

      // Unlock UI
      updateNavigationButtons(true);
      updateNextTopicLockInList(true);

      // 🔥 AUTO MARK COMPLETE & WAIT FOR IT
      await markTopicComplete();

      // Show Review
      if (Array.isArray(perQuestionResult)) {
        showMCQReview(perQuestionResult);
      }

      // Show Retest
      const retestBtn = document.getElementById('mcq-retest');
      if (retestBtn) retestBtn.style.display = 'inline-block';

    } else {
      throw new Error(data.message || 'Failed to submit quiz');
    }
  } catch (err) {
    console.error('submitMCQQuiz error:', err);
    showToast('Failed to submit quiz');
    if (submitBtn) submitBtn.disabled = false;
  } finally {
    if (submitBtn) submitBtn.textContent = 'Submit Quiz';
  }
}

/* ================== DISPLAY & HELPERS ================== */

async function loadMCQAssignment(courseId, topicId) {
    const container = document.getElementById('mcq-container');
    if (!container) return;

    const nextBtn = document.getElementById('next-topic');
    if (nextBtn && currentTopicIndex < totalTopics) nextBtn.disabled = true;

    try {
        const params = new URLSearchParams({
            action:   'getTopicMCQs',
            courseId: courseId,
            topicId:  topicId,
            userId:   window.userId
        });

        const res   = await fetch(`${GOOGLE_SCRIPT_URL}?${params.toString()}`);
        const data = await res.json();

        if (data.status === 'success' && Array.isArray(data.data) && data.data.length) {
            mcqQuestions = data.data.map(q => ({
                QuestionID:   q.QuestionID,
                QuestionText: q.QuestionText,
                OptionA:      q.OptionA,
                OptionB:      q.OptionB,
                OptionC:      q.OptionC,
                OptionD:      q.OptionD
            }));
            mcqCurrentIndex = 0;
            mcqAnswers = {};
            mcqCompleted = data.isAssignmentCompleted || false; 
            
            renderCurrentMCQ();

            if (mcqCompleted) {
                updateNavigationButtons(true);
            }
            
            const retestBtn = document.getElementById('mcq-retest');
            if (retestBtn) {
                retestBtn.style.display = mcqCompleted ? 'inline-block' : 'none';
            }
            
        } else {
            mcqQuestions = [];
            container.innerHTML = '<p class="text-muted text-center py-5">No quiz for this topic. Proceed to next.</p>';
            updateNavigationButtons(true);
            updateNextTopicLockInList(true);
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

  if(qTextEl) qTextEl.textContent = `${mcqCurrentIndex + 1}. ${q.QuestionText}`;

  const optionsHtml = ['A','B','C','D'].map(letter => {
    const text = q[`Option${letter}`];
    if (!text) return '';
    const checked = selected === letter ? 'checked' : '';
    return `
      <label class="mcq-option">
        <input type="radio" name="mcq-option" value="${letter}" ${checked}>
        <span class="ms-2">${letter}. ${text}</span>
      </label>
    `;
  }).join('');

  if(optsEl) optsEl.innerHTML = optionsHtml;
  if(progEl) progEl.textContent = `Question ${mcqCurrentIndex + 1} of ${mcqQuestions.length}`;

  const prevBtn = document.getElementById('mcq-prev');
  const nextBtn = document.getElementById('mcq-next');
  if (prevBtn) prevBtn.disabled = mcqCurrentIndex === 0;
  if (nextBtn) nextBtn.disabled = mcqCurrentIndex === mcqQuestions.length - 1;

  if (submitBtn) {
    submitBtn.disabled = !canEnableSubmit();
  }

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

function canEnableSubmit() {
  const attempted = Object.keys(mcqAnswers).length;
  const onLast = mcqCurrentIndex === mcqQuestions.length - 1;
  return onLast && attempted > 0;
}

function retakeMCQQuiz() {
  if (!mcqQuestions.length) return;
  mcqAnswers = {};
  mcqCurrentIndex = 0;
  mcqCompleted = false;

  const resultEl = document.getElementById('mcq-result');
  const reviewEl = document.getElementById('mcq-review');
  if (resultEl) resultEl.innerHTML = '';
  if (reviewEl) reviewEl.innerHTML = '';

  const submitBtn = document.getElementById('mcq-submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submit Quiz';
  }

  const retestBtn = document.getElementById('mcq-retest');
  if (retestBtn) retestBtn.style.display = 'none';

  renderCurrentMCQ();
}

function showMCQReview(perQuestionResult) {
    let reviewEl = document.getElementById('mcq-review');
    
    if(!reviewEl) {
        reviewEl = document.createElement('div');
        reviewEl.id = 'mcq-review';
        document.getElementById('mcq-container').appendChild(reviewEl);
    }

    const html = perQuestionResult.map((row, idx) => {
        const isCorrect = row.isCorrect;
        const color = isCorrect ? '#d1fae5' : '#fee2e2';
        const borderColor = isCorrect ? '#10b981' : '#ef4444';
        
        return `
          <div style="background:${color}; border-left:4px solid ${borderColor}; padding:15px; margin-bottom:10px; border-radius:8px;">
            <strong>Q${idx + 1}: ${row.questionText}</strong><br>
            <span style="font-size:0.9em">
                Your Answer: ${row.studentText || 'Skipped'} 
                ${isCorrect ? '✅' : '❌'}
            </span><br>
            ${!isCorrect ? `<span style="font-size:0.9em; color:#047857;">Correct Answer: ${row.correctText}</span>` : ''}
          </div>
        `;
    }).join('');

    reviewEl.innerHTML = html;
}

function displayTopicContent(topic) {
  const titleEl = document.getElementById('topic-title');
  if (titleEl) {
    titleEl.textContent = `${topic.TopicIndex}. ${topic.Title}`;
    titleEl.classList.remove('loading');
  }

  document.getElementById('video-duration').textContent = topic.Duration || 'Not specified';
  document.getElementById('topic-level').textContent = topic.Level || 'Beginner';
  document.getElementById('topic-objectives').textContent = topic.Objectives || 'Learn core concepts';
  document.getElementById('topic-status').textContent = topic.Status || 'In Progress';
  document.getElementById('topic-description').textContent = topic.Description || 'Topic description...';

  const notesEl = document.getElementById('topic-notes');
  if (notesEl) {
    if (topic.NotesURL && topic.NotesURL.trim() !== '') {
      notesEl.innerHTML = `<a href="${topic.NotesURL}" target="_blank" class="btn-primary">📖 Open Notes / PDF</a>`;
    } else {
      notesEl.innerHTML = '<span class="text-muted">No notes for this topic.</span>';
    }
  }

  const videoFrame = document.getElementById('topic-video');
  if (videoFrame) {
    if (topic.VideoURL) {
      let videoId = "";
      if(topic.VideoURL.includes('v=')) {
          videoId = topic.VideoURL.split('v=')[1].split('&')[0];
      } else {
          videoId = topic.VideoURL.split('/').pop();
      }
      videoFrame.src = `https://www.youtube.com/embed/${videoId}`;
    } else {
      videoFrame.src = '';
    }
  }

  const sidebarTitle = document.getElementById('course-title-sidebar');
  if (sidebarTitle) sidebarTitle.textContent = topic.CourseTitle || `Course ID: ${currentCourseId}`;

  const progressEl = document.getElementById('topic-progress');
  const progressFill = document.getElementById('progress-fill');
  const currentNum = document.getElementById('current-topic-num');
  const totalNum = document.getElementById('total-topics-num');

  const pct = Math.round((topic.TopicIndex / totalTopics) * 100) || 0;

  if (progressEl) progressEl.textContent = `${pct}%`;
  if (progressFill) progressFill.style.width = `${pct}%`;
  if (currentNum) currentNum.textContent = topic.TopicIndex;
  if (totalNum) totalNum.textContent = totalTopics;
}

async function loadSidebarTopics(courseId) {
  const listContainer = document.getElementById('sidebar-topic-list');
  if (!listContainer) return;

  try {
    const params = new URLSearchParams({
      action: 'getCourseTopicsList',
      courseId: courseId
    });

    const response = await fetch(`${GOOGLE_SCRIPT_URL}?${params.toString()}`);
    const data = await response.json();

    if (data.status === 'success' && Array.isArray(data.data)) {
      displayTopicList(data.data);
    }
  } catch (error) {
    console.error('Sidebar topics error:', error);
  }
}

function displayTopicList(topics) {
  const container = document.getElementById('sidebar-topic-list');
  if (!container) return;
  container.innerHTML = '';

  topics.sort((a, b) => (Number(a.Order || a.TopicIndex || 0)) - (Number(b.Order || b.TopicIndex || 0)));

  topics.forEach((topic, idx) => {
    const listIndex = idx + 1;
    const li = document.createElement('li');
    li.className = `topic-item ${listIndex === currentTopicIndex ? 'active' : ''}`;

    if (listIndex > currentTopicIndex) {
        li.classList.add('locked-topic'); 
    }

    li.innerHTML = `
      <span class="topic-number">${listIndex}.</span>
      <span class="topic-name">${topic.Title}</span>
    `;

    li.addEventListener('click', () => {
        if(li.classList.contains('locked-topic')) {
            showToast('🚫 Locked! Complete previous topics first.');
            return;
        }
        navigateTopic(listIndex - currentTopicIndex);
    });

    container.appendChild(li);
  });

  totalTopics = topics.length;
}

function navigateTopic(direction) {
  const newIndex = currentTopicIndex + direction;
  if (newIndex >= 1 && newIndex <= totalTopics) {
    window.location.href = `course-topic.html?courseId=${encodeURIComponent(currentCourseId)}&topicIndex=${newIndex}&userId=${encodeURIComponent(window.userId)}`;
  } else {
    showToast('No more topics available');
  }
}

function updateNavigationButtons(canGoNext = true) {
  const prevBtn = document.getElementById('prev-topic');
  const nextBtn = document.getElementById('next-topic');

  if (prevBtn) prevBtn.disabled = currentTopicIndex <= 1;
  if (nextBtn) {
      if(currentTopicIndex >= totalTopics) {
          nextBtn.disabled = true; // Last topic
      } else {
          nextBtn.disabled = !canGoNext;
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

function updateAssignmentControls() {
  const markBtn = document.getElementById('mark-complete');
  if (mcqQuestions.length > 0 && markBtn && !mcqCompleted) {
      markBtn.textContent = 'Complete assignment to unlock';
      markBtn.disabled = true;
  }
}

function showLoading(element, message) {
  if (element) element.textContent = message;
}

function showError(message) {
  const titleEl = document.getElementById('topic-title');
  if (titleEl) {
      titleEl.textContent = message;
      titleEl.style.color = 'red';
  }
}

function showLoadingBtn(btn, text) {
  if (btn) { btn.disabled = true; btn.textContent = text; }
}

function hideLoadingBtn(btn, text) {
  if (btn) { btn.disabled = false; btn.textContent = text; }
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast show';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

async function runCompiler() {
  const code = document.getElementById("compiler-input").value;
  const lang = document.getElementById("compiler-language").value;
  const out = document.getElementById("compiler-output");

  if (!code.trim()) return out.innerText = "⚠️ Write some code first.";
  out.innerText = "⏳ Running...";

  try {
    const response = await fetch("https://emkc.org/api/v2/piston/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: lang, version: "*", files: [{ content: code }] })
    });
    const result = await response.json();
    out.innerText = result.run?.output || result.run?.stderr || "⚠️ No output.";
  } catch (err) {
    out.innerText = "❌ Error running code.";
  }
}