// js/discussions.js (100% Working - CORS Free Forum)
document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('lsm_user_id');
    const userName = localStorage.getItem('lsm_user_name') || 'Anonymous';
    
    if (!userId) {
        alert('Please login to participate in discussions.');
        window.location.href = 'login.html';
        return;
    }
    
    window.userId = userId;
    window.userName = userName;
    
    const postsContainer = document.getElementById('posts-container');
    const newPostForm = document.getElementById('new-post-form');
    const postButton = document.getElementById('post-button');
    const postMessageEl = document.getElementById('post-message');
    
    window.postsContainer = postsContainer;
    window.postButton = postButton;
    window.postMessageEl = postMessageEl;
    
    // Load posts
    await fetchPosts();
    
    // Submit handler
    if (newPostForm) {
        newPostForm.addEventListener('submit', handleSubmitPost);
    }
});

async function fetchPosts() {
    const postsContainer = window.postsContainer;
    showLoading(postsContainer, 'Loading discussions...');
    
    try {
        // ⭐ CORS-FREE: New getDiscussions action
        const params = new URLSearchParams({
            action: 'getDiscussions'
        });
        
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?${params}`);
        const data = await response.json();
        
        if (data.status === 'success' && data.data && data.data.length > 0) {
            displayPosts(data.data);
        } else {
            postsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💬</div>
                    <h3>No Discussions Yet</h3>
                    <p>Be the first to start a conversation!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Posts fetch error:', error);
        postsContainer.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <p>Failed to load discussions. <button onclick="fetchPosts()" class="btn-link">Retry</button></p>
            </div>
        `;
    }
}

function displayPosts(posts) {
    const container = window.postsContainer;
    container.innerHTML = '';
    
    // Sort by timestamp (newest first)
    posts.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
    
    posts.forEach(post => {
        const postDate = new Date(post.Timestamp).toLocaleString();
        const card = document.createElement('div');
        card.className = 'discussion-card';
        card.innerHTML = `
            <div class="post-header">
                <div class="post-author">
                    <div class="author-avatar">${getInitials(post.UserName)}</div>
                    <div>
                        <h4>${post.Topic}</h4>
                        <span class="author-name">${post.UserName}</span>
                        <span class="post-date">${postDate}</span>
                    </div>
                </div>
            </div>
            <div class="post-content">
                ${post.Content.replace(/\n/g, '<br>')}
            </div>
        `;
        container.appendChild(card);
    });
}

async function handleSubmitPost(e) {
    e.preventDefault();
    
    const topic = document.getElementById('topic')?.value.trim();
    const content = document.getElementById('content')?.value.trim();
    const postButton = window.postButton;
    const messageEl = window.postMessageEl;
    
    // Validation
    if (!topic || topic.length < 3) {
        showMessage(messageEl, 'Topic must be at least 3 characters', 'error');
        return;
    }
    if (!content || content.length < 10) {
        showMessage(messageEl, 'Content must be at least 10 characters', 'error');
        return;
    }
    
    showLoadingPost(postButton, messageEl, 'Posting discussion...');
    
    try {
        // ⭐ CORS-FREE: URLSearchParams POST
        const params = new URLSearchParams({
            action: 'submitPost',
            userId: window.userId,
            userName: window.userName,
            topic: topic,
            content: content
        });
        
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?${params}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showMessage(messageEl, '✅ Discussion posted successfully!', 'success');
            document.getElementById('new-post-form').reset();
            setTimeout(fetchPosts, 1000); // Refresh posts
        } else {
            throw new Error(data.message || 'Failed to post');
        }
    } catch (error) {
        console.error('Post error:', error);
        showMessage(messageEl, '❌ Failed to post: ' + error.message, 'error');
    } finally {
        hideLoadingPost(postButton);
    }
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

// UI Helpers
function showLoading(container, message) {
    container.innerHTML = `<div class="loading">🔄 ${message}</div>`;
}

function showMessage(element, text, type) {
    element.textContent = text;
    element.className = type; // error, success, loading
}

function showLoadingPost(button, messageEl, text) {
    button.disabled = true;
    button.textContent = 'Posting...';
    messageEl.textContent = text;
    messageEl.className = 'loading';
}

function hideLoadingPost(button) {
    button.disabled = false;
    button.textContent = 'Post Discussion';
}
