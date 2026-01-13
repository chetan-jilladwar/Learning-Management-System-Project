// js/certificate.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Check for User and Course ID
    const userId = localStorage.getItem('lsm_user_id');
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get('courseId');

    if (!userId) {
        alert('Please login to view your certificate.');
        window.location.href = 'login.html';
        return;
    }
    
    if (!courseId) {
        displayError('Error: Course ID is missing from the URL.');
        return;
    }

    // 2. Load Data
    fetchCertificateData(userId, courseId);
    
    // 3. Setup Download (Simple Print/PDF for now)
    document.getElementById('download-button').addEventListener('click', downloadCertificate);
});

function displayLoading(show) {
    document.getElementById('loading-message').style.display = show ? 'block' : 'none';
}

function displayError(message) {
    displayLoading(false);
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-message').style.display = 'block';
    document.getElementById('certificate-content').style.display = 'none';
}

async function fetchCertificateData(userId, courseId) {
    displayLoading(true);

    // GOOGLE_SCRIPT_URL config.js se aa raha hai
    const fetchUrl = `${GOOGLE_SCRIPT_URL}?action=getCertificateData&userId=${userId}&courseId=${courseId}`;

    try {
        const response = await fetch(fetchUrl);
        const result = await response.json();

        displayLoading(false);

        if (result.status === "success" && result.data) {
            populateCertificate(result.data, courseId);
            document.getElementById('certificate-content').style.display = 'block';
            document.getElementById('download-button').style.display = 'block';
        } else {
            // Agar 100% complete nahi hua toh API se error ya message aayega
            displayError(result.message || 'Course not completed (100% required) or data missing.');
        }

    } catch (error) {
        console.error('Error fetching certificate:', error);
        displayError('Server error while verifying completion.');
    }
}

function populateCertificate(data, courseId) {
    const studentName = localStorage.getItem('lsm_user_name'); // Better to use Local Storage name

    document.getElementById('student-name').textContent = studentName || 'Learner';
    document.getElementById('course-title').textContent = data.courseTitle;
    document.getElementById('completion-date').textContent = data.completionDate;
    document.getElementById('instructor-name').textContent = data.instructorName;
    document.getElementById('issued-date').textContent = new Date().toLocaleDateString('en-GB'); 
    
    // Certificate ko course ID ke saath ek unique look dene ke liye (optional)
    document.getElementById('certificate-content').setAttribute('data-course-id', courseId);
}

function downloadCertificate() {
    // For a simple web app, printing to PDF is the easiest way to "download".
    alert('Preparing certificate for download/print. Please select "Save as PDF" in the print dialog.');
    window.print();
}