document.addEventListener('DOMContentLoaded', () => {

  const submitBtn = document.getElementById('submit-btn');
  const usernameInput = document.getElementById('username');
  const authForm = document.getElementById('auth-form');
  const themeToggle = document.getElementById('theme-toggle');
  const iconSun = document.getElementById('icon-sun');
  const iconMoon = document.getElementById('icon-moon');
  const forgotLink = document.getElementById('forgot-link');
  const authFeedback = document.getElementById('auth-feedback');

  // --- Helpers ---
  const showFeedback = (message, type = 'info') => {
    authFeedback.textContent = message;
    authFeedback.className = `auth-feedback ${type}`;
    authFeedback.style.display = 'block';
  };

  const hideFeedback = () => {
    authFeedback.style.display = 'none';
  };

  // --- Theming Logic ---
  const applyThemeIcons = (theme) => {
    if (theme === 'dark') {
      iconSun.style.display = 'block'; 
      iconMoon.style.display = 'none';
    } else {
      iconSun.style.display = 'none';
      iconMoon.style.display = 'block'; 
    }
  };

  const currentTheme = document.documentElement.getAttribute('data-theme');
  applyThemeIcons(currentTheme);

  themeToggle.addEventListener('click', () => {
    const activeTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = activeTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('app-theme', newTheme);
    applyThemeIcons(newTheme);
  });

  // --- Auth Logic ---
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideFeedback();

    const username = usernameInput.value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      showFeedback('Username and password are required', 'error');
      return;
    }

    submitBtn.textContent = 'Please wait...';
    submitBtn.disabled = true;

    try {
      const result = await window.api.login({ username, password });
      if (result.success) {
        showFeedback('Login successful! Redirecting...', 'success');
        document.body.classList.add('fade-out');
        setTimeout(() => {
          window.location.href = './dashboard.html';
        }, 600);
        return; 
      } else {
        showFeedback(result.error || 'Login failed', 'error');
      }
    } catch (err) {
      showFeedback('An unexpected error occurred: ' + err.message, 'error');
    } finally {
      if (!document.body.classList.contains('fade-out')) {
        submitBtn.textContent = 'Continue';
        submitBtn.disabled = false;
      }
    }
  });
});
