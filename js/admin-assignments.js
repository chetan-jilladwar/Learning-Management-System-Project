// js/admin-assignments.js

// Apps Script API URL (इसे अपने तैनात URL से बदलें)
// NOTE: मैंने आपके द्वारा प्रदान किए गए URL का उपयोग किया है।
const API_URL = "https://script.google.com/macros/s/AKfycbwPeH_oXus5h88Y1H08AoMRNgSIaaZB_sX5Xuu2MT1BAFBILF_DhB3yVEX9nW7v0ozbHw/exec"; 

// --- Shared API Call Function (Duplicated for context, ideally centralized) ---
async function callApi(action, params = {}, method = 'GET') {
    // Check for API URL before proceeding
    if (!API_URL) {
        throw new Error("API_URL is not defined.");
    }

    let url = new URL(API_URL);
    url.searchParams.append('action', action);

    let options = { method: method };

    if (method === 'GET') {
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    } else if (method === 'POST') {
        // POST requests: Use URLSearchParams for form data (Apps Script preference)
        const postData = new URLSearchParams();
        postData.append('action', action);
        Object.keys(params).forEach(key => postData.append(key, params[key]));
        options.body = postData;
    }

    const response = await fetch(url.toString(), options);
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return response.json();
}

// --- Main Functions ---

/**
 * लंबित सबमिशन (Pending Submissions) को API से प्राप्त करता है और उन्हें प्रदर्शित करता है।
 */
async function fetchPendingSubmissions() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('grading-container').style.display = 'none';
    document.getElementById('error-message').style.display = 'none';
    document.getElementById('pendingList').innerHTML = '';
    document.getElementById('noPending').style.display = 'none';

    try {
        const result = await callApi('getPendingSubmissions', {}, 'GET');

        if (result.status === 'success') {
            const pending = result.data;
            document.getElementById('pendingCount').textContent = pending.length;

            if (pending.length === 0) {
                document.getElementById('noPending').style.display = 'block';
            } else {
                pending.forEach(submission => {
                    // Create a card for each pending submission
                    // यह वह जगह है जहाँ createSubmissionCard से रिटर्न की गई वैल्यू का उपयोग होता है।
                    const card = createSubmissionCard(submission);
                    document.getElementById('pendingList').appendChild(card);
                });
                document.getElementById('grading-container').style.display = 'block';
            }
        } else {
            document.getElementById('error-message').textContent = `Server Error: ${result.message}`;
            document.getElementById('error-message').style.display = 'block';
        }

    } catch (error) {
        console.error("Error fetching pending submissions:", error);
        // FIX: अधिक सटीक एरर मैसेज
        document.getElementById('error-message').textContent = `Connection Error/Rendering Issue: Failed to fetch or display data. (${error.message})`;
        document.getElementById('error-message').style.display = 'block';
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

/**
 * दिए गए सबमिशन डेटा के लिए एक Bootstrap कार्ड बनाता है।
 * @param {object} submission - Submission data from API.
 */
function createSubmissionCard(submission) {
    // FIX: colDiv को पहले ही परिभाषित करें।
    const colDiv = document.createElement('div');
    colDiv.className = 'col-md-6 mb-4';
    
    const card = document.createElement('div');
    card.className = 'card shadow-sm';
    
    // एक अस्थायी SubmissionID बनाएँ (UserID और TopicID से)
    const uniqueSubmissionId = submission.UserID + "-" + submission.TopicID;

    // NOTE: HTML Content यहाँ तक सही था
    card.innerHTML = `
        <div class="card-header bg-warning text-dark">
            <strong>Topic ID:</strong> ${submission.TopicID} | 
            <strong>Course ID:</strong> ${submission.CourseID}
        </div>
        <div class="card-body">
            <h5 class="card-title">Student ID: ${submission.UserID}</h5>
            <p class="card-text">
                <strong>Submitted On:</strong> ${new Date(submission.SubmissionDate).toLocaleString()}<br>
                <strong>Submission Text:</strong> ${submission.SubmissionText} </p>
            
            <form id="gradeForm-${uniqueSubmissionId}" class="grade-form mt-3">
                <input type="hidden" name="submissionId" value="${uniqueSubmissionId}"> 
                <div class="mb-3">
                    <label for="grade-${uniqueSubmissionId}" class="form-label">Grade (Marks)</label>
                    <input type="number" class="form-control" name="grade" id="grade-${uniqueSubmissionId}" required min="0">
                </div>
                <div class="mb-3">
                    <label for="feedback-${uniqueSubmissionId}" class="form-label">Feedback</label>
                    <textarea class="form-control" name="feedback" id="feedback-${uniqueSubmissionId}" rows="2"></textarea>
                </div>
                <button type="submit" class="btn btn-success btn-sm">Submit Grade</button>
                <div class="grade-message mt-2" id="gradeMessage-${uniqueSubmissionId}"></div>
            </form>
        </div>
    `;

    // card को colDiv में जोड़ें
    colDiv.appendChild(card); 
    
    // Add submit listener
    const gradeForm = card.querySelector(`#gradeForm-${uniqueSubmissionId}`);
    gradeForm.addEventListener('submit', handleGradeSubmission);
    
    // FIX: colDiv को रिटर्न करें
    return colDiv;
}


/**
 * ग्रेडिंग फॉर्म सबमिशन को हैंडल करता है।
 * @param {Event} e - Submit event.
 */
async function handleGradeSubmission(e) {
    e.preventDefault();
    const form = e.target;
    const submissionId = form.elements.submissionId.value;
    const grade = form.elements.grade.value;
    const feedback = form.elements.feedback.value;
    const gradeMessageDiv = document.getElementById(`gradeMessage-${submissionId}`);
    const submitBtn = form.querySelector('button[type="submit"]');

    gradeMessageDiv.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    // 1. लॉगिन चेक (For security)
    if (!isLoggedInAsAdmin()) {
        alert("Session expired. Please log in again.");
        window.location.href = 'admin-login.html';
        return;
    }

    try {
        const result = await callApi('gradeSubmission', { 
            submissionId: submissionId, 
            grade: grade, 
            feedback: feedback 
        }, 'POST');

        if (result.status === 'success') {
            gradeMessageDiv.className = 'text-success';
            gradeMessageDiv.textContent = 'Grade submitted successfully!';
            // Refresh the pending list after successful grading
            setTimeout(fetchPendingSubmissions, 1000); 
        } else {
            gradeMessageDiv.className = 'text-danger';
            gradeMessageDiv.textContent = `Grading Failed: ${result.message}`;
        }
    } catch (error) {
        console.error("Grading Error:", error);
        gradeMessageDiv.className = 'text-danger';
        gradeMessageDiv.textContent = `Error: Could not grade submission.`;
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Grade';
    }
}


/**
 * नया असाइनमेंट बनाने के फॉर्म सबमिशन को हैंडल करता है।
 */
async function handleAddAssignment(e) {
    e.preventDefault();
    const form = e.target;
    const messageDiv = document.getElementById('assignmentMessage');
    const addBtn = document.getElementById('addAssignmentBtn');
    
    // 1. लॉगिन चेक
    if (!isLoggedInAsAdmin()) {
        alert("Session expired. Please log in again.");
        window.location.href = 'admin-login.html';
        return;
    }

    const assignmentData = {
        courseId: form.elements.courseId.value,
        title: form.elements.title.value,
        description: form.elements.description.value,
        maxMarks: form.elements.maxMarks.value,
        dueDate: form.elements.dueDate.value,
    };

    messageDiv.textContent = '';
    addBtn.disabled = true;
    addBtn.textContent = 'Creating...';

    try {
        const result = await callApi('addAssignment', assignmentData, 'POST');
        
        if (result.status === 'success') {
            messageDiv.className = 'alert alert-success';
            messageDiv.textContent = result.message;
            form.reset(); // Clear the form
        } else {
            messageDiv.className = 'alert alert-danger';
            messageDiv.textContent = `Creation Failed: ${result.message}`;
        }
    } catch (error) {
        console.error("Assignment Creation Error:", error);
        messageDiv.className = 'alert alert-danger';
        messageDiv.textContent = `Connection Error: Could not create assignment.`;
    } finally {
        addBtn.disabled = false;
        addBtn.textContent = 'Create Assignment';
    }
}


// --- Initialization ---

window.onload = function() {
    // Admin लॉगिन चेक करें (isLoggedInAsAdmin admin-common.js में होना चाहिए)
    if (!isLoggedInAsAdmin()) {
        alert("Access Denied. Please log in as Admin.");
        window.location.href = 'admin-login.html';
        return;
    }
    
    // 1. लंबित सबमिशन लोड करें
    fetchPendingSubmissions();

    // 2. असाइनमेंट बनाने के लिए इवेंट लिसनर सेट करें
    const addForm = document.getElementById('addAssignmentForm');
    if (addForm) {
        addForm.addEventListener('submit', handleAddAssignment);
    }
};