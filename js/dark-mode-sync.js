// js/dark-mode-sync.js

document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('dark-mode-toggle');
    const toggleIcon = document.getElementById('toggle-icon');
    const body = document.body;

    // Load theme from localStorage or default to 'light'
    const savedTheme = localStorage.getItem('theme') || 'light';
    body.setAttribute('data-theme', savedTheme);
    updateToggleIcon(savedTheme);

    if (toggleButton) {
        toggleButton.addEventListener('click', toggleDarkMode);
    }

    function toggleDarkMode() {
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateToggleIcon(newTheme);
    }

    function updateToggleIcon(theme) {
        if (toggleIcon) {
            toggleIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
        }
    }
});