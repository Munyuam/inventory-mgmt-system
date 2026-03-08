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

  let mode = 'login'; // 'login' or 'signup'

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
    } else {
      btnSignup.classList.add('active');
      btnLogin.classList.remove('active');
      submitBtn.textContent = 'Create Account';
      // In signup, we need username, email, & password
      emailGroup.style.display = 'flex';
      emailInput.required = true;
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

  authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const email = document.getElementById('email').value; // Only used in signup

    submitBtn.textContent = 'Authenticating...';
    submitBtn.disabled = true;

    // Start the transition by fading out
    document.body.classList.add('fade-out');

    // Wait for the transition to complete (500ms matching CSS, let's use 600ms for safety)
    setTimeout(() => {
      console.log(`Action: ${mode === 'login' ? 'Logging in' : 'Signing up'}\nUsername: ${username}`);
      if (mode === 'signup') {
        console.log(`Email provided: ${email}`);
      }

      // Navigate to the main application interface
      window.location.href = 'index.html';
    }, 600);
  });
});
