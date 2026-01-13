// Ensure API_URL and callApi are defined in admin-common.js

/**
 * Apps Script API से रिपोर्ट डेटा फेच करता है।
 * @returns {object} रिपोर्ट डेटा ऑब्जेक्ट।
 */
async function fetchReportsData() {
    try {
        const result = await callApi('getReportsData', {}, 'GET');

        if (result.status === 'success') {
            return result.data;
        } else {
            console.error("Server Error fetching reports:", result.message);
            throw new Error(result.message || "Failed to fetch report data from server.");
        }
    } catch (error) {
        console.error("Failed to load reports:", error);
        document.getElementById('errorDisplay').style.display = 'block';
        throw error;
    }
}

/**
 * Overall Stats (Total Students/Courses) को UI में अपडेट करता है।
 * @param {object} overallStats - कुल छात्र और कोर्स संख्या।
 */
function populateOverallStats(overallStats) {
    document.getElementById('reportTotalStudents').textContent = overallStats.totalStudents || 0;
    document.getElementById('reportTotalCourses').textContent = overallStats.totalCourses || 0;
}

/**
 * Course Completion data को टेबल में भरता है।
 * @param {Array<object>} completions - हर कोर्स के लिए कंप्लीशन डेटा।
 */
function populateCompletionTable(completions) {
    const tbody = document.getElementById('courseCompletionBody');
    tbody.innerHTML = ''; 

    if (!completions || completions.length === 0) {
        document.getElementById('noDataMessage').style.display = 'block';
        return;
    }

    completions.forEach(course => {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = course.CourseID;
        row.insertCell(1).textContent = course.Title;
        row.insertCell(2).textContent = course.TotalTopics;
        row.insertCell(3).textContent = course.EnrolledStudents;
        row.insertCell(4).textContent = course.CompletedStudents;
        
        // Avg. Completion Rate को प्रतिशत के रूप में दिखाता है
        const rateCell = row.insertCell(5);
        rateCell.textContent = `${course.AvgCompletionRate}%`; 
    });
}

/**
 * Enrollment Trend data का उपयोग करके Chart.js लाइन चार्ट बनाता है।
 * @param {Array<object>} trendData - तारीख के अनुसार संचयी नामांकन डेटा।
 */
function renderEnrollmentChart(trendData) {
    if (!trendData || trendData.length === 0) return;

    const labels = trendData.map(item => item.date);
    const data = trendData.map(item => item.cumulativeCount);

    const ctx = document.getElementById('enrollmentChart').getContext('2d');
    
    // Check if chart already exists (for potential re-renders)
    if (window.enrollmentChartInstance) {
        window.enrollmentChartInstance.destroy();
    }

    window.enrollmentChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cumulative Students Enrolled',
                data: data,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Total Students'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Cumulative Enrollment Over Time'
                }
            }
        }
    });
}


/**
 * पेज लोड होने पर मुख्य फ़ंक्शन।
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Login Check (assuming admin-common.js defines isLoggedInAsAdmin and redirects)
    if (typeof isLoggedInAsAdmin === 'function' && !isLoggedInAsAdmin()) {
        window.location.href = 'admin-login.html';
        return;
    }

    // 2. Hide error/no data messages initially
    document.getElementById('errorDisplay').style.display = 'none';
    document.getElementById('noDataMessage').style.display = 'none';

    try {
        // 3. Fetch data
        const stats = await fetchReportsData();
        
        // 4. Populate UI
        populateOverallStats(stats.overallStats);
        populateCompletionTable(stats.courseCompletions);
        renderEnrollmentChart(stats.enrollmentTrend);

    } catch (error) {
        // Error handling already done in fetchReportsData
    } finally {
        // 5. Hide loading indicator
        document.getElementById('loading').style.display = 'none';
    }
});