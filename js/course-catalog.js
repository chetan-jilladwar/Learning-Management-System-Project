// js/course-catalog.js (FINAL & CORRECTED VERSION)

// NOTE: यदि GOOGLE_SCRIPT_URL config.js में परिभाषित नहीं है, तो इसे यहाँ अनकमेंट करें और अपडेट करें:
 //const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw.../exec";

// Use API_URL from config.js if available, otherwise fallback (replace with your actual URL)
const API_URL = (typeof GOOGLE_SCRIPT_URL !== 'undefined') ? GOOGLE_SCRIPT_URL : "https://script.google.com/macros/s/AKfycbyUyX9QrGH5zBtS3-EvQs3kSlmzBTEmXWMmhiLSIIGQ1h8LDruLtkkF_-stKHexSonZog/exec"; 

document.addEventListener('DOMContentLoaded', () => {
    // 1. Auth and Navigation Update
    const userId = localStorage.getItem('lsm_user_id');
    const authControls = document.getElementById('auth-controls');
    const navDashboard = document.getElementById('nav-dashboard');

    if (userId) {
        // Logged In: Show only Logout/Dashboard
        if (authControls) authControls.innerHTML = `<a href="dashboard.html" class="btn btn-secondary">Dashboard</a>`;
        if (navDashboard) navDashboard.href = "dashboard.html";
    } else {
        // Logged Out: Show Login/Register
        if (navDashboard) navDashboard.href = "login.html"; 
    }
    
    // 2. Load Course Catalog
    const catalogContainer = document.getElementById('course-catalog-container'); 

    if (catalogContainer) {
        // userId को API में पास करें ताकि यह कोर्स के साथ प्रगति डेटा भी लौटा सके
        fetchCourseCatalog(catalogContainer, userId);
    }
    initTestimonialSlider();
    initFacultySlider();   // ⬅️ naya call
    initPlacementsMarquee();
    
});

/**
 * Fetches course data and user progress from the backend using a single API call.
 */
async function fetchCourseCatalog(catalogContainer, userId) {
    
    catalogContainer.innerHTML = '<p style="text-align:center;">Loading available courses...</p>'; 

    try {
        // === FIXED: Calling 'getAllCourses' (which handles both catalog and progress check) ===
        // userId पास किया जाता है ताकि Apps Script प्रत्येक कोर्स ऑब्जेक्ट के अंदर progress डेटा जोड़ सके।
        const courseResponse = await fetch(`${API_URL}?action=getAllCourses&userId=${userId || ''}`);
        const courseData = await courseResponse.json();

        if (courseData.status === "success" && courseData.data && courseData.data.length > 0) {
            
            // B. Create Progress Map from the fetched course data
            let progressMap = {};
            if (userId) {
                // courseData.data में अब Progress ऑब्जेक्ट शामिल है (यदि छात्र एनरोल्ड है)
                courseData.data.forEach(course => {
                    // Progress ऑब्जेक्ट का अस्तित्व Enrollment को दर्शाता है
                    if (course.Progress && course.Progress.totalTopics > 0) { 
                        progressMap[course.CourseID] = course.Progress; 
                    }
                });
            }

            // C. Display Courses
            displayCatalog(courseData.data, progressMap, catalogContainer);
            
        } else {
            catalogContainer.innerHTML = '<p style="text-align:center;">No courses are currently available in the catalog.</p>';
        }

    } catch (error) {
        console.error('Catalog data fetch failed:', error);
        catalogContainer.innerHTML = '<p style="color: red; text-align:center;">Error: Failed to load courses. Please try again later.</p>';
    }
}

/**
 * Renders the course cards into the container.
 */
function displayCatalog(courses, progressMap, catalogContainer) {
  catalogContainer.innerHTML = ''; // Clear loading

  const cardsHTML = courses.map(course => {
    const isEnrolled = progressMap[course.CourseID] !== undefined;

    // Description
    const descriptionText = String(course.Description || "").trim();
    const shortDescription =
      descriptionText.length > 100
        ? descriptionText.substring(0, 100) + "..."
        : descriptionText;

    // Image
    const encodedTitle = course.Title ? course.Title.replace(/\s/g, "+") : "Course+Image";
    const courseSpecificPlaceholderUrl =
      `https://via.placeholder.com/300x180?text=${encodedTitle}`;
    const imageUrl =
      course.ImageUrl && course.ImageUrl.trim() !== ""
        ? course.ImageUrl
        : courseSpecificPlaceholderUrl;

    // Buttons (UI same jo tum chahte ho)
    let actionButtons = "";

    if (isEnrolled) {
      const courseProgress = progressMap[course.CourseID];
      let nextTopicIndex = (courseProgress.topicsCompleted || 0) + 1;
      if (courseProgress.totalTopics && nextTopicIndex > courseProgress.totalTopics) {
        nextTopicIndex = 1;
      }

      const continueUrl =
        `course-topic.html?courseId=${course.CourseID}` +
        `&topicIndex=${nextTopicIndex}` +
        `&userId=${localStorage.getItem("lsm_user_id") || ""}`;

      actionButtons = `
        <a href="${continueUrl}" class="btn-action btn-continue">
          CONTINUE LEARNING
        </a>
        <a href="course-detail.html?id=${course.CourseID}" class="btn-action btn-view">
          DETAILS
        </a>
      `;
    } else {
      const userId = localStorage.getItem("lsm_user_id");
      const enrollLink = userId
        ? `enroll.html?id=${course.CourseID}`
        : `login.html`;
      const onclickAttr = userId
        ? ""
        : `onclick="localStorage.setItem('pendingEnrollCourseId', '${course.CourseID}')"` ;

      actionButtons = `
        <a href="${enrollLink}" ${onclickAttr} class="btn-action btn-enroll">
          ENROLL NOW
        </a>
        <a href="course-detail.html?id=${course.CourseID}" class="btn-action btn-view">
          VIEW DETAILS
        </a>
      `;
    }

    return `
      <div class="course-card">
        <div class="course-image-container">
          <img src="${imageUrl}"
               alt="${course.Title} Image"
               loading="lazy"
               onerror="this.onerror=null; this.src='${courseSpecificPlaceholderUrl}';">
        </div>

        <div class="course-header">
          <h3>${course.Title}</h3>
        </div>

        <div class="course-info">
          <p><strong>Instructor:</strong> ${course.Instructor || "Expert"}</p>
          <p class="description">${shortDescription}</p>
          <p><strong>Duration:</strong> ${course.Duration || "Self-paced"}</p>
        </div>

        <div class="course-actions">
          ${actionButtons}
        </div>
      </div>
    `;
  }).join("");

  catalogContainer.innerHTML = cardsHTML;

  // IMPORTANT: slider ko yahin se initialise karo
  initCourseSlider();
}

function initCourseSlider() {
  const scrollContainer = document.getElementById("course-catalog-container");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  if (!scrollContainer || !prevBtn || !nextBtn) return;

  const CARD_WIDTH = 275;
  const CARD_GAP = 20;
  const scrollAmount = 3 * (CARD_WIDTH + CARD_GAP); // 885

  nextBtn.onclick = () => {
    scrollContainer.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  prevBtn.onclick = () => {
    scrollContainer.scrollBy({ left: -scrollAmount, behavior: "smooth" });
  };

  function checkScrollButtons() {
    const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;

    if (scrollContainer.scrollLeft <= 5) {
      prevBtn.style.opacity = "0.4";
      prevBtn.style.pointerEvents = "none";
    } else {
      prevBtn.style.opacity = "1";
      prevBtn.style.pointerEvents = "auto";
    }

    if (scrollContainer.scrollLeft >= maxScroll - 10) {
      nextBtn.style.opacity = "0.4";
      nextBtn.style.pointerEvents = "none";
    } else {
      nextBtn.style.opacity = "1";
      nextBtn.style.pointerEvents = "auto";
    }
  }

  scrollContainer.addEventListener("scroll", checkScrollButtons);
  setTimeout(checkScrollButtons, 300);
}

function initTestimonialSlider() {
  const slider = document.getElementById("testimonial-slider");
  const prev = document.getElementById("testiPrev");
  const next = document.getElementById("testiNext");
  if (!slider || !prev || !next) return;

  const CARD_WIDTH = 275;
  const CARD_GAP = 20;
  const scrollAmount = 3 * (CARD_WIDTH + CARD_GAP); // same logic

  next.onclick = () => {
    slider.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  prev.onclick = () => {
    slider.scrollBy({ left: -scrollAmount, behavior: "smooth" });
  };

  function checkButtons() {
    const maxScroll = slider.scrollWidth - slider.clientWidth;

    if (slider.scrollLeft <= 5) {
      prev.style.opacity = "0.4";
      prev.style.pointerEvents = "none";
    } else {
      prev.style.opacity = "1";
      prev.style.pointerEvents = "auto";
    }

    if (slider.scrollLeft >= maxScroll - 10) {
      next.style.opacity = "0.4";
      next.style.pointerEvents = "none";
    } else {
      next.style.opacity = "1";
      next.style.pointerEvents = "auto";
    }
  }

  slider.addEventListener("scroll", checkButtons);
  setTimeout(checkButtons, 300);
}


function initFacultySlider() {
  const slider = document.getElementById("faculty-slider");
  const prev = document.getElementById("facultyPrev");
  const next = document.getElementById("facultyNext");
  if (!slider || !prev || !next) return;

  const CARD_WIDTH = 275;
  const CARD_GAP = 20;
  const scrollAmount = 3 * (CARD_WIDTH + CARD_GAP); // course/testimonial jaisa

  next.onclick = () => {
    slider.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  prev.onclick = () => {
    slider.scrollBy({ left: -scrollAmount, behavior: "smooth" });
  };

  function checkButtons() {
    const maxScroll = slider.scrollWidth - slider.clientWidth;

    if (slider.scrollLeft <= 5) {
      prev.style.opacity = "0.4";
      prev.style.pointerEvents = "none";
    } else {
      prev.style.opacity = "1";
      prev.style.pointerEvents = "auto";
    }

    if (slider.scrollLeft >= maxScroll - 10) {
      next.style.opacity = "0.4";
      next.style.pointerEvents = "none";
    } else {
      next.style.opacity = "1";
      next.style.pointerEvents = "auto";
    }
  }

  slider.addEventListener("scroll", checkButtons);
  setTimeout(checkButtons, 300);
}




