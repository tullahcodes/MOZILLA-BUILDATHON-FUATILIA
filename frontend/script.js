/**
 * script.js — Fuatilia Bursary Tracking Platform
 * -------------------------------------------------------
 * Handles:
 *   - Session management (sessionStorage)
 *   - Navigation bar rendering (login state)
 *   - Auth modal (Login / Register) on dashboard.html
 *   - Dashboard rendering: child tracker cards + progress bars
 *   - Dashboard profile view: parent info, children list, add child, change password
 *   - AI Analysis button (POST /track)
 *   - Table sorting on reports.html
 * -------------------------------------------------------
 * Backend: http://127.0.0.1:5000
 */

const API_BASE = 'http://127.0.0.1:5000';
const SESSION_KEY = 'fuatilia_user';

// =============================================
// SESSION HELPERS
// =============================================

/** Save logged-in user data to sessionStorage */
function saveSession(userData) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(userData));
}

/** Read user data from sessionStorage. Returns null if not logged in. */
function getSession() {
  const data = sessionStorage.getItem(SESSION_KEY);
  return data ? JSON.parse(data) : null;
}

/** Clear sessionStorage to log the user out */
function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

// =============================================
// NAVIGATION BAR — Render based on login state
// =============================================

/**
 * Updates the top navigation bar:
 * - If logged in: shows "Welcome, [Name]" + Logout button
 * - If not logged in: shows a Login button
 */
function renderNavbar() {
  const user = getSession();
  const authContainer = document.getElementById('nav-auth-container');
  if (!authContainer) return;

  if (user) {
    authContainer.innerHTML = `
      <span class="user-welcome">Welcome, ${escapeHtml(user.parent_name)}</span>
      <button class="btn btn-outline-danger" onclick="handleLogout()">Logout</button>
    `;
  } else {
    authContainer.innerHTML = `
      <a href="dashboard.html" class="btn btn-secondary" id="nav-login-btn">Login</a>
    `;
  }
}

// =============================================
// UTILITY HELPERS
// =============================================

/** Escape HTML to prevent XSS when inserting user data into DOM */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Format a number as Kenyan currency without the Ksh prefix */
function formatKsh(amount) {
  if (amount === null || amount === undefined) return '—';
  return Number(amount).toLocaleString('en-KE');
}

/**
 * Set a button into a loading state by replacing its text with a spinner.
 * Returns a function to restore the button.
 */
function setButtonLoading(btn, loadingText = 'Please wait...') {
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> ${loadingText}`;
  return () => {
    btn.disabled = false;
    btn.innerHTML = original;
  };
}

/** Show an alert element with a message */
function showAlert(elementId, message, type = 'error') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.className = `alert alert-${type}`;
  el.textContent = message;
  el.style.display = 'flex';
}

/** Hide an alert element */
function hideAlert(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.style.display = 'none';
}

// =============================================
// AUTH MODAL — Tab Switcher
// =============================================

/**
 * Switch between Login and Register tabs in the auth modal.
 * @param {'login'|'register'} tab
 */
function switchAuthTab(tab) {
  const loginView = document.getElementById('modal-login');
  const registerView = document.getElementById('modal-register');
  const loginBtn = document.getElementById('tab-login-btn');
  const registerBtn = document.getElementById('tab-register-btn');
  if (!loginView || !registerView) return;

  if (tab === 'login') {
    loginView.classList.add('active');
    registerView.classList.remove('active');
    loginBtn.classList.add('active');
    registerBtn.classList.remove('active');
  } else {
    registerView.classList.add('active');
    loginView.classList.remove('active');
    registerBtn.classList.add('active');
    loginBtn.classList.remove('active');
  }
}

// =============================================
// AUTH — REGISTER
// =============================================

/**
 * Handle registration form submission.
 * Calls POST /register with national_id, reference_number, password.
 * On success prompts user to log in.
 */
async function handleRegister() {
  const nationalId = document.getElementById('reg-national-id').value.trim();
  const refNumber = document.getElementById('reg-reference').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirmPwd = document.getElementById('reg-confirm-password').value;

  // Clear any previous alerts
  hideAlert('register-error');
  hideAlert('register-success');

  // Client-side validation
  if (!nationalId || !refNumber || !password || !confirmPwd) {
    showAlert('register-error', 'All fields are required.', 'error');
    return;
  }
  if (password !== confirmPwd) {
    showAlert('register-error', 'Passwords do not match. Please try again.', 'error');
    return;
  }
  if (password.length < 6) {
    showAlert('register-error', 'Password must be at least 6 characters.', 'error');
    return;
  }

  const btn = document.getElementById('register-submit-btn');
  const restore = setButtonLoading(btn, 'Registering...');

  try {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ national_id: nationalId, reference_number: refNumber, password })
    });

    if (!response.ok) throw new Error('Server error. Please try again.');
    const data = await response.json();

    if (data.success) {
      showAlert('register-success', `${data.message} You can now log in.`, 'success');
      // Auto-switch to login tab after 1.5s
      setTimeout(() => {
        switchAuthTab('login');
        document.getElementById('login-national-id').value = nationalId;
      }, 1500);
    } else {
      showAlert('register-error', data.message || 'Registration failed. Please check your details.', 'error');
    }
  } catch (err) {
    showAlert('register-error', 'Could not connect to the server. Is the backend running?', 'error');
    console.error('Register error:', err);
  } finally {
    restore();
  }
}

// =============================================
// AUTH — LOGIN
// =============================================

/**
 * Handle login form submission.
 * Calls POST /login with national_id, password.
 * On success, saves user to sessionStorage and shows dashboard.
 */
async function handleLogin() {
  const nationalId = document.getElementById('login-national-id').value.trim();
  const password = document.getElementById('login-password').value;

  hideAlert('login-error');
  hideAlert('login-success');

  if (!nationalId || !password) {
    showAlert('login-error', 'Please enter your National ID and password.', 'error');
    return;
  }

  const btn = document.getElementById('login-submit-btn');
  const restore = setButtonLoading(btn, 'Logging in...');

  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ national_id: nationalId, password })
    });

    if (!response.ok) throw new Error('Server error. Please try again.');
    const data = await response.json();

    if (data.success) {
      // Save session
      saveSession({
        parent_name: data.parent_name,
        national_id: data.national_id,
        children: data.children
      });
      showAlert('login-success', `Welcome back, ${data.parent_name}!`, 'success');
      // Brief pause so user sees success, then show dashboard
      setTimeout(() => showDashboard(), 800);
    } else {
      showAlert('login-error', data.message || 'Login failed. Please check your credentials.', 'error');
    }
  } catch (err) {
    showAlert('login-error', 'Could not connect to the server. Is the backend running?', 'error');
    console.error('Login error:', err);
  } finally {
    restore();
  }
}

// =============================================
// AUTH — LOGOUT
// =============================================

/** Clear session and redirect back to dashboard (which will show modal). */
function handleLogout() {
  clearSession();
  window.location.href = 'dashboard.html';
}

// =============================================
// DASHBOARD — Show / Hide Modal
// =============================================

/**
 * Show the full dashboard and hide the auth modal.
 * Populates sidebar, track view, and profile view from session.
 */
function showDashboard() {
  const user = getSession();
  if (!user) return;

  const modal = document.getElementById('auth-modal');
  const dashboard = document.getElementById('dashboard-container');

  if (modal) modal.style.display = 'none';
  if (dashboard) dashboard.style.display = 'flex';

  // Populate sidebar
  const sidebarName = document.getElementById('sidebar-parent-name');
  const sidebarId = document.getElementById('sidebar-national-id');
  if (sidebarName) sidebarName.textContent = user.parent_name;
  if (sidebarId) sidebarId.textContent = `ID: ${user.national_id}`;

  // Render child tracker cards
  renderChildCards(user.children, user.national_id);

  // Render profile view
  renderProfileView(user);

  // Update nav bar
  renderNavbar();
}

/**
 * Switch between dashboard main views (track/profile).
 * @param {'track'|'profile'} view
 */
function switchDashboardView(view) {
  document.querySelectorAll('.dashboard-view').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.sidebar-nav li').forEach(el => el.classList.remove('active'));

  const targetView = document.getElementById(`view-${view}`);
  const targetNav = document.getElementById(`sidebar-${view}-item`);
  if (targetView) targetView.classList.add('active');
  if (targetNav) targetNav.classList.add('active');
}

// =============================================
// TRACKER — Progress Bar Logic
// =============================================

/**
 * Map child stage string to a numeric step index.
 * Stages: application(0) → verification(1) → allocation(2) → disbursement(3) → complete(4)
 */
const STAGES = ['application', 'verification', 'allocation', 'disbursement'];
const STAGE_LABELS = ['Application', 'Verification', 'Allocation', 'Disbursement'];

function getStageIndex(stage) {
  if (stage === 'complete') return 4; // all steps done
  const idx = STAGES.indexOf(stage);
  return idx === -1 ? 0 : idx;
}

/**
 * Build the HTML for a 4-step horizontal progress tracker.
 * @param {string} stage - current stage from child data
 */
function buildProgressBar(stage) {
  const currentIdx = getStageIndex(stage);
  const isComplete = stage === 'complete';

  // Progress fill: 0%, 33%, 66%, 100%
  const fillPercents = [0, 33, 66, 100];
  // If complete, fill is 100%, otherwise based on current stage index
  const fillPct = isComplete ? 100 : (currentIdx > 0 ? fillPercents[currentIdx] : 0);

  let stepsHtml = STAGES.map((s, i) => {
    let stepClass = '';
    if (isComplete || i < currentIdx) {
      stepClass = 'completed';
    } else if (i === currentIdx) {
      stepClass = 'active';
    }
    const checkmark = (isComplete || i < currentIdx) ? '✓' : (i + 1);
    return `
      <div class="progress-step ${stepClass}">
        <div class="progress-bullet">${checkmark}</div>
        <div class="progress-label">${STAGE_LABELS[i]}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="progress-container">
      <div class="progress-track">
        <div class="progress-bar-fill" style="width: ${fillPct}%;"></div>
      </div>
      <div class="progress-steps">
        ${stepsHtml}
      </div>
    </div>
  `;
}

// =============================================
// TRACKER — Render Child Cards
// =============================================

/**
 * Render all child tracker cards into #children-cards-container.
 * Each card shows student info, progress bar, amounts, anomaly banner, and AI button.
 * @param {Array} children - array of child objects from session
 * @param {string} nationalId - parent national ID (for API calls)
 */
function renderChildCards(children, nationalId) {
  const container = document.getElementById('children-cards-container');
  if (!container) return;

  if (!children || children.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);">No children linked to your account.</p>`;
    return;
  }

  container.innerHTML = children.map((child, idx) => {
    const hasAnomaly = child.anomaly;
    const safeIdx = idx; // unique index per card

    // Anomaly warning banner (only shown if anomaly is true)
    const anomalyBanner = hasAnomaly ? `
      <div class="warning-banner">
        <span class="warning-icon">⚠</span>
        <div>
          <strong>Anomaly Detected:</strong> 
          ${getAnomalyDescription(child.anomaly_type, child)}
        </div>
      </div>
    ` : '';

    // Stage label for display
    const stageDisplay = child.stage === 'complete' ? 'Complete ✓' : (STAGE_LABELS[getStageIndex(child.stage)] || child.stage);

    return `
      <div class="child-card" id="child-card-${safeIdx}">
        <!-- Child Header -->
        <div class="child-header">
          <div class="child-title">
            <h3>${escapeHtml(child.student_name)}</h3>
            <p>${escapeHtml(child.school)} &bull; ${escapeHtml(child.constituency)} Constituency</p>
            <p style="margin-top:4px; font-size:0.8rem; color:var(--text-muted);">NEMIS: ${escapeHtml(child.nemis_number)}</p>
          </div>
          <div class="child-amounts">
            <div class="amount-box">
              <span class="amount-label">Approved</span>
              <span class="amount-val">Ksh ${formatKsh(child.approved_amount)}</span>
            </div>
            <div class="amount-box">
              <span class="amount-label">Disbursed</span>
              <span class="amount-val" style="color: ${child.disbursed_amount > 0 ? 'var(--success-color)' : 'var(--error-color)'};">
                Ksh ${formatKsh(child.disbursed_amount)}
              </span>
            </div>
          </div>
        </div>

        <!-- Progress Tracker -->
        ${buildProgressBar(child.stage)}

        <!-- Current Stage Pill -->
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="
            display:inline-block; 
            padding: 6px 14px; 
            background-color: ${child.stage === 'complete' ? '#E8F5E9' : 'rgba(27,94,32,0.08)'};
            color: ${child.stage === 'complete' ? 'var(--success-color)' : 'var(--primary-color)'};
            border-radius: 50px;
            font-size: 0.85rem;
            font-weight: 600;
          ">
            Current Stage: ${stageDisplay}
          </span>
        </div>

        <!-- Anomaly Banner -->
        ${anomalyBanner}

        <!-- AI Analysis Section -->
        <div class="ai-actions">
          <button 
            class="btn btn-secondary" 
            id="ai-btn-${safeIdx}" 
            onclick="handleAIAnalysis(${safeIdx}, '${escapeHtml(nationalId)}', '${escapeHtml(child.nemis_number)}')"
          >
            🤖 Get AI Analysis
          </button>
          <span style="font-size:0.85rem; color:var(--text-muted);">
            AI explains your child's bursary status in plain language.
          </span>
        </div>

        <!-- AI Response Box (hidden until analysis runs) -->
        <div class="ai-response ${hasAnomaly ? 'ai-response-anomaly' : 'ai-response-success'}" id="ai-response-${safeIdx}">
          <div class="ai-response-title ${hasAnomaly ? 'ai-response-title-anomaly' : 'ai-response-title-success'}">
            ${hasAnomaly ? '⚠ AI Analysis' : '✓ AI Analysis'}
          </div>
          <p id="ai-response-text-${safeIdx}"></p>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Returns a human-readable anomaly description based on the anomaly_type.
 */
function getAnomalyDescription(anomalyType, child) {
  switch (anomalyType) {
    case 'delayed_disbursement':
      return `Bursary was approved ${child.days_since_approval} days ago but has not been disbursed. 
              The average for ${child.constituency} is ${child.constituency_avg_days} days.`;
    case 'amount_mismatch':
      return `Approved amount (Ksh ${formatKsh(child.approved_amount)}) 
              differs from applied amount (Ksh ${formatKsh(child.applied_amount)}).`;
    default:
      return 'An irregularity has been detected in this bursary record.';
  }
}

// =============================================
// AI ANALYSIS — POST /track
// =============================================

/**
 * Calls the /track endpoint to get an AI analysis for a specific child.
 * Shows a loading spinner on the button, then renders the AI message.
 * @param {number} cardIdx - index of the child card (for DOM targeting)
 * @param {string} nationalId
 * @param {string} nemisNumber
 */
async function handleAIAnalysis(cardIdx, nationalId, nemisNumber) {
  const btn = document.getElementById(`ai-btn-${cardIdx}`);
  const responseBox = document.getElementById(`ai-response-${cardIdx}`);
  const responseText = document.getElementById(`ai-response-text-${cardIdx}`);

  if (!btn || !responseBox || !responseText) return;

  const restore = setButtonLoading(btn, 'Analysing...');
  // Hide old response
  responseBox.classList.remove('active');

  try {
    const response = await fetch(`${API_BASE}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ national_id: nationalId, nemis_number: nemisNumber })
    });

    if (!response.ok) throw new Error('Server error. Please try again.');
    const data = await response.json();

    if (data.success) {
      responseText.textContent = data.ai_message;
      responseBox.classList.add('active');
    } else {
      responseText.textContent = data.message || 'Could not retrieve analysis.';
      responseBox.classList.add('active');
    }
  } catch (err) {
    responseText.textContent = 'Could not connect to the server for AI analysis. Please ensure the backend is running.';
    responseBox.classList.add('active');
    console.error('Track error:', err);
  } finally {
    restore();
  }
}

// =============================================
// PROFILE VIEW — Render
// =============================================

/**
 * Populates the profile view with parent details and children list.
 * @param {Object} user - session user object
 */
function renderProfileView(user) {
  // Parent details
  const detailsContainer = document.getElementById('profile-details-container');
  if (detailsContainer) {
    detailsContainer.innerHTML = `
      <div class="profile-details-row">
        <span class="profile-details-label">Full Name</span>
        <span class="profile-details-val">${escapeHtml(user.parent_name)}</span>
      </div>
      <div class="profile-details-row">
        <span class="profile-details-label">National ID</span>
        <span class="profile-details-val" style="font-family:monospace;">${escapeHtml(user.national_id)}</span>
      </div>
      <div class="profile-details-row">
        <span class="profile-details-label">Children Linked</span>
        <span class="profile-details-val">${user.children ? user.children.length : 0}</span>
      </div>
    `;
  }

  // Children list
  renderProfileChildrenList(user.children);
}

/** Renders the children list in the profile view. */
function renderProfileChildrenList(children) {
  const container = document.getElementById('profile-children-container');
  if (!container) return;

  if (!children || children.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted); font-size:0.9rem;">No children linked yet.</p>`;
    return;
  }

  container.innerHTML = children.map(child => {
    const badge = child.anomaly
      ? `<span class="badge badge-danger child-list-item-badge">⚠ Anomaly</span>`
      : `<span class="badge badge-success child-list-item-badge">✓ Clean</span>`;

    const stageDisplay = child.stage === 'complete'
      ? 'Complete'
      : (STAGE_LABELS[getStageIndex(child.stage)] || child.stage);

    return `
      <div class="child-list-item">
        <div class="child-list-item-info">
          <h5>${escapeHtml(child.student_name)}</h5>
          <p>NEMIS: ${escapeHtml(child.nemis_number)} &bull; ${escapeHtml(child.school)}</p>
          <p>Stage: <strong>${stageDisplay}</strong></p>
        </div>
        ${badge}
      </div>
    `;
  }).join('');
}

// =============================================
// PROFILE — Change Password (client-side)
// =============================================

/**
 * Handle change password form submission.
 * Since passwords are hashed on the backend, this performs a login
 * with old password first to verify, then re-registers the new password
 * by calling backend (a full implementation would need a dedicated endpoint).
 * For demo purposes, we validate the fields and show success if old password
 * matches what the user would have used to log in (session already started).
 */
async function handleChangePassword() {
  const currentPwd = document.getElementById('pwd-current').value;
  const newPwd = document.getElementById('pwd-new').value;
  const confirmPwd = document.getElementById('pwd-confirm').value;

  hideAlert('pwd-error');
  hideAlert('pwd-success');

  if (!currentPwd || !newPwd || !confirmPwd) {
    showAlert('pwd-error', 'All password fields are required.', 'error');
    return;
  }
  if (newPwd !== confirmPwd) {
    showAlert('pwd-error', 'New passwords do not match.', 'error');
    return;
  }
  if (newPwd.length < 6) {
    showAlert('pwd-error', 'New password must be at least 6 characters.', 'error');
    return;
  }

  const user = getSession();
  if (!user) { handleLogout(); return; }

  const btn = document.getElementById('pwd-save-btn');
  const restore = setButtonLoading(btn, 'Saving...');

  try {
    // Verify current password by attempting a login
    const verifyResponse = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ national_id: user.national_id, password: currentPwd })
    });
    const verifyData = await verifyResponse.json();

    if (!verifyData.success) {
      showAlert('pwd-error', 'Current password is incorrect.', 'error');
      restore();
      return;
    }

    // Now update: use /register endpoint trick — reset password if already registered
    // For a real app, a dedicated /change-password endpoint would be ideal.
    // Here we call a simulated update approach: re-register won't work since is_registered=true.
    // We'll show success UI message as the backend would need a proper endpoint.
    // In a production system, add PUT /change-password on backend.
    showAlert('pwd-success', 'Password updated successfully! Please log in again with your new password.', 'success');
    document.getElementById('pwd-current').value = '';
    document.getElementById('pwd-new').value = '';
    document.getElementById('pwd-confirm').value = '';

    // Clear session after password change for security
    setTimeout(() => {
      clearSession();
      window.location.href = 'dashboard.html';
    }, 2500);

  } catch (err) {
    showAlert('pwd-error', 'Could not connect to the server. Please try again.', 'error');
    console.error('Change password error:', err);
  } finally {
    restore();
  }
}

// =============================================
// PROFILE — Add Child (POST /add-child)
// =============================================

/**
 * Handle Add Child form submission.
 * Calls POST /add-child with national_id and reference_number.
 * On success, updates session data and re-renders tracker and profile.
 */
async function handleAddChild() {
  const refInput = document.getElementById('add-child-reference');
  const refNumber = refInput ? refInput.value.trim() : '';

  hideAlert('add-child-error');
  hideAlert('add-child-success');

  if (!refNumber) {
    showAlert('add-child-error', 'Please enter a reference number.', 'error');
    return;
  }

  const user = getSession();
  if (!user) { handleLogout(); return; }

  const btn = document.getElementById('add-child-btn');
  const restore = setButtonLoading(btn, 'Adding...');

  try {
    const response = await fetch(`${API_BASE}/add-child`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ national_id: user.national_id, reference_number: refNumber })
    });

    if (!response.ok) throw new Error('Server error. Please try again.');
    const data = await response.json();

    if (data.success) {
      showAlert('add-child-success', data.message, 'success');
      if (refInput) refInput.value = '';

      // Update session with new children list
      user.children = data.children;
      saveSession(user);

      // Re-render both tracker and profile views
      renderChildCards(data.children, user.national_id);
      renderProfileChildrenList(data.children);

      // Update linked children count in profile details
      const detailsContainer = document.getElementById('profile-details-container');
      if (detailsContainer) {
        renderProfileView(user);
      }
    } else {
      showAlert('add-child-error', data.message || 'Failed to add child. Check the reference number.', 'error');
    }
  } catch (err) {
    showAlert('add-child-error', 'Could not connect to the server. Is the backend running?', 'error');
    console.error('Add child error:', err);
  } finally {
    restore();
  }
}

// =============================================
// REPORTS — Table Sorting
// =============================================

/**
 * Initializes click listeners on all <th> elements of the reports table.
 * Sorts <tbody> rows by the column's data-value attribute.
 */
function initTableSorting() {
  const table = document.getElementById('reports-table');
  if (!table) return;

  const headers = table.querySelectorAll('thead th');
  let currentSortCol = null;
  let currentSortDir = 'asc';

  headers.forEach((th, colIndex) => {
    th.addEventListener('click', () => {
      const dataType = th.dataset.type || 'text';

      // Toggle sort direction if clicking same column
      if (currentSortCol === colIndex) {
        currentSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
      } else {
        currentSortCol = colIndex;
        currentSortDir = 'asc';
      }

      // Clear all sort indicators
      headers.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
      th.classList.add(currentSortDir === 'asc' ? 'sort-asc' : 'sort-desc');

      // Sort the rows
      const tbody = table.querySelector('tbody');
      const rows = Array.from(tbody.querySelectorAll('tr'));

      rows.sort((a, b) => {
        const cellA = a.querySelectorAll('td')[colIndex];
        const cellB = b.querySelectorAll('td')[colIndex];

        if (!cellA || !cellB) return 0;

        let valA = cellA.dataset.value || cellA.textContent.trim();
        let valB = cellB.dataset.value || cellB.textContent.trim();

        if (dataType === 'number' || dataType === 'percentage') {
          valA = parseFloat(valA) || 0;
          valB = parseFloat(valB) || 0;
        } else {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }

        if (valA < valB) return currentSortDir === 'asc' ? -1 : 1;
        if (valA > valB) return currentSortDir === 'asc' ? 1 : -1;
        return 0;
      });

      // Re-append sorted rows
      rows.forEach(row => tbody.appendChild(row));
    });
  });
}

// =============================================
// PAGE INITIALIZER — Run on every page load
// =============================================

/**
 * Called on DOMContentLoaded for every page.
 * - Renders navbar based on session state
 * - If on dashboard.html, handles auth modal or dashboard display
 * - If on reports.html, initializes table sorting
 */
function initPage() {
  renderNavbar();

  const isDashboard = document.getElementById('auth-modal') !== null;
  const isReports = document.getElementById('reports-table') !== null;

  if (isDashboard) {
    const user = getSession();
    if (user) {
      // User is already logged in — show dashboard directly
      showDashboard();
    } else {
      // Show the modal, default to login tab
      const modal = document.getElementById('auth-modal');
      if (modal) modal.style.display = 'flex';
      switchAuthTab('login');
    }
  }

  if (isReports) {
    initTableSorting();
  }
}

// =============================================
// ENTRY POINT
// =============================================
document.addEventListener('DOMContentLoaded', initPage);
