// Apps Script API URL (इसे अपने तैनात URL से बदलें)
const API_URL = "https://script.google.com/macros/s/AKfycbz0a9i4wDEMqv43FT1xMQ12WcS1NeXqMzPWIHfGmMrJ6PpXT57eqQrckpDPzB6_grUDaQ/exec"; 

/**
 * API को कॉल करता है और JSON डेटा को पार्स करता है।
 * @param {string} action - Apps Script में चलाने के लिए एक्शन।
 * @param {object} params - अतिरिक्त URL पैरामीटर (GET) या बॉडी डेटा (POST)।
 * @param {string} method - HTTP method ('GET' या 'POST')।
 * @returns {Promise<object>} API response data.
 */
async function callApi(action, params = {}, method = 'GET') {
    let url = new URL(API_URL);
    url.searchParams.append('action', action);

    let options = { method: method };

    if (method === 'GET') {
        // GET requests: Append params to URL search parameters
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    } else if (method === 'POST') {
        // POST requests: Send JSON body
        options.headers = { 'Content-Type': 'application/json' };
        // POST body में action और अन्य डेटा भेजें
        options.body = JSON.stringify({ action: action, ...params });
    }

    // Network Call
    const response = await fetch(url.toString(), options);
    
    // Check for HTTP errors (e.g., 404, 500)
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return response.json();
}


/**
 * सभी छात्रों की सूची प्राप्त करता है और टेबल में प्रदर्शित करता है।
 */
async function fetchStudents() {
    // UI elements ko initialize karein
    document.getElementById('loading').style.display = 'block';
    document.getElementById('students-data-container').style.display = 'none';
    document.getElementById('error-message').style.display = 'none';
    const tableBody = document.getElementById('students-table-body');
    tableBody.innerHTML = ''; // पिछली पंक्तियों को साफ करें

    try {
        // 'getAllStudents' API call
        const result = await callApi('getAllStudents', {}, 'GET');

        if (result.status === 'success') {
            if (result.data.length === 0) {
                // Agar koi student nahi hai
                tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No students registered yet.</td></tr>';
            } else {
                // Students ko table mein darshayein
                result.data.forEach(student => {
                    const row = tableBody.insertRow();
                    row.insertCell().textContent = student.UserID;
                    row.insertCell().textContent = student.Name;
                    row.insertCell().textContent = student.Email;
                    row.insertCell().textContent = student.Phone;
                    
                    // Date formatting (Apps Script timestamp object ko string mein convert karega)
                    const dateValue = student.RegistrationDate ? new Date(student.RegistrationDate) : new Date();
                    const regDate = dateValue instanceof Date && !isNaN(dateValue) ? dateValue.toLocaleDateString('en-GB') : 'N/A';
                    
                    row.insertCell().textContent = regDate;

                    const actionCell = row.insertCell();
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'btn btn-sm btn-outline-danger';
                    deleteBtn.textContent = 'Delete';
                    deleteBtn.onclick = () => confirmDelete(student.UserID, student.Name);
                    actionCell.appendChild(deleteBtn);
                });
            }
            document.getElementById('students-data-container').style.display = 'block';
        } else {
            // API se 'error' status mila
            document.getElementById('error-message').textContent = `Server Error: ${result.message}`;
            document.getElementById('error-message').style.display = 'block';
        }

    } catch (error) {
        // Network ya JSON parsing error
        console.error("Error fetching students:", error);
        document.getElementById('error-message').textContent = `Connection Error: Failed to fetch data. Check API URL or network. (${error.message})`;
        document.getElementById('error-message').style.display = 'block';
    } finally {
        // Loading spinner ko band karein
        document.getElementById('loading').style.display = 'none';
    }
}

/**
 * छात्र को हटाने के लिए पुष्टि डायलॉग दिखाता है और API कॉल करता है।
 * @param {string} userId - हटाने के लिए छात्र का ID।
 * @param {string} userName - पुष्टि के लिए छात्र का नाम।
 */
async function confirmDelete(userId, userName) {
    if (confirm(`Are you sure you want to delete student: ${userName} (${userId})? This action is irreversible.`)) {
        
        // Safety check (isLoggedInAsAdmin function must be in admin-common.js)
        if (!isLoggedInAsAdmin()) {
            alert("Session expired. Please log in again.");
            window.location.href = 'admin-login.html';
            return;
        }
        
        // Disable confirmation dialog during deletion
        document.body.style.pointerEvents = 'none'; 

        try {
            // 'deleteStudent' API call
            const result = await callApi('deleteStudent', { userId: userId }, 'POST');
            
            if (result.status === 'success') {
                alert(`Success: ${result.message}`);
                // डेटा को ताज़ा करें
                fetchStudents();
            } else {
                alert(`Deletion Failed: ${result.message}`);
            }
        } catch (error) {
            console.error("Deletion error:", error);
            alert("An error occurred during deletion: " + error.message);
        } finally {
            // Re-enable input
            document.body.style.pointerEvents = 'auto';
        }
    }
}

// पेज लोड होने पर छात्रों को फेच करें
window.onload = function() {
    // Admin लॉगिन चेक करें (यह isLoggedInAsAdmin() अब lsm_admin_id को चेक करेगा)
    if (!isLoggedInAsAdmin()) {
        alert("Access Denied. Please log in as Admin.");
        window.location.href = 'admin-login.html';
        return;
    }
    // Fetch data if admin is logged in
    fetchStudents();
};