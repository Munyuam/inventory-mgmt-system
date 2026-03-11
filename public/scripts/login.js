document.addEventListener('DOMContentLoaded', () => {

  const btnLogin = document.getElementById('btn-login');
  const btnSignup = document.getElementById('btn-signup');
  const submitBtn = document.getElementById('submit-btn');
  const emailGroup = document.getElementById('email-group');
  const emailInput = document.getElementById('email');
  const usernameInput = document.getElementById('username');
  const authForm = document.getElementById('auth-form');
  const themeToggle = document.getElementById('theme-toggle');
  const iconSun = document.getElementById('icon-sun');
  const iconMoon = document.getElementById('icon-moon');
  const forgotLink = document.getElementById('forgot-link');
  const authFeedback = document.getElementById('auth-feedback');

  let mode = 'login'; // 'login' or 'signup'

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
      iconSun.style.display = 'block'; // Show sun button to switch to light
      iconMoon.style.display = 'none';
    } else {
      iconSun.style.display = 'none';
      iconMoon.style.display = 'block'; // Show moon button to switch to dark
    }
  };

  // The default is set via inline head script, so we just read it here on load
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
  const updateUI = () => {
    if (mode === 'login') {
      btnLogin.classList.add('active');
      btnSignup.classList.remove('active');
      submitBtn.textContent = 'Continue';
      // In login, we only need username & password
      emailGroup.style.display = 'none';
      emailInput.required = false;
      forgotLink.style.display = 'block';
    } else {
      btnSignup.classList.add('active');
      btnLogin.classList.remove('active');
      submitBtn.textContent = 'Create Account';
      // In signup, we need username, email, & password
      emailGroup.style.display = 'flex';
      emailInput.required = true;
      forgotLink.style.display = 'none';
    }
  };

  btnLogin.addEventListener('click', () => {
    mode = 'login';
    updateUI();
  });

  btnSignup.addEventListener('click', () => {
    mode = 'signup';
    updateUI();
  });

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideFeedback();

    const username = usernameInput.value.trim();
    const password = document.getElementById('password').value;
    const email = emailInput.value.trim();

    if (!username || !password) {
      showFeedback('Username and password are required', 'error');
      return;
    }

    submitBtn.textContent = 'Please wait...';
    submitBtn.disabled = true;

    try {
      if (mode === 'signup') {
        const result = await window.api.signup({ username, email, password });
        if (result.success) {
          showFeedback('Account created! Logging you in...', 'success');
          document.body.classList.add('fade-out');
          setTimeout(() => {
            window.location.href = './dashboard.html';
          }, 600);
          return;
        } else {
          showFeedback(result.error || 'Signup failed', 'error');
        }
      } else {
        const result = await window.api.login({ username, password });
        if (result.success) {
          showFeedback('Login successful! Redirecting...', 'success');
          document.body.classList.add('fade-out');
          setTimeout(() => {
            window.location.href = './dashboard.html';
          }, 600);
          return; // Prevent resetting the button
        } else {
          showFeedback(result.error || 'Login failed', 'error');
        }
      }
    } catch (err) {
      showFeedback('An unexpected error occurred: ' + err.message, 'error');
    } finally {
      if (!document.body.classList.contains('fade-out')) {
        submitBtn.textContent = (mode === 'login' ? 'Continue' : 'Create Account');
        submitBtn.disabled = false;
      }
    }
  });
});
