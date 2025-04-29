// DOM Elements
const issuesList = document.getElementById('issues-list');
const addIssueBtn = document.getElementById('addIssueBtn');
const issueModal = document.getElementById('issueModal');
const modalClose = document.querySelector('.close');
const issueForm = document.getElementById('issueForm');
const modalTitle = document.getElementById('modalTitle');
const currentDateEl = document.getElementById('current-date');
const timeSinceEl = document.getElementById('time-since');

// API Endpoints
const API_URL = '/api/issues';

// Global state
let isEditMode = false;
let editingIssueId = null;

// Set current date in footer
const today = new Date();
currentDateEl.textContent = today.toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
});

// Initialize the app
async function init() {
  fetchIssues();
  setupEventListeners();
}

// Fetch all issues from API
async function fetchIssues() {
  try {
    const response = await fetch(API_URL);
    const issues = await response.json();
    
    // Calculate time since first promise
    if (issues.length > 0) {
      const dates = issues.map(issue => new Date(issue.datePromised));
      const oldestDate = new Date(Math.min(...dates));
      const timeDiff = today - oldestDate;
      const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      timeSinceEl.textContent = `${daysDiff} days`;
    } else {
      timeSinceEl.textContent = 'No issues yet';
    }
    
    renderIssues(issues);
  } catch (error) {
    issuesList.innerHTML = `
      <div class="error">
        <p>Failed to load issues. Please try again later.</p>
        <button class="btn" onclick="fetchIssues()">Retry</button>
      </div>
    `;
    console.error('Error fetching issues:', error);
  }
}

// Render issues to the DOM
function renderIssues(issues) {
  if (issues.length === 0) {
    issuesList.innerHTML = `
      <div class="empty-state">
        <p>No open issues found. Add a new issue to get started!</p>
      </div>
    `;
    return;
  }
  
  issuesList.innerHTML = issues.map(issue => `
    <div class="issue-card ${issue.status}">
      <h3 class="issue-title">${escapeHtml(issue.title)}</h3>
      <p class="issue-description">${escapeHtml(issue.description)}</p>
      <div class="issue-meta">
        <div>
          <span class="status-badge ${issue.status}">${formatStatus(issue.status)}</span>
          <span>Promised: ${formatDate(issue.datePromised)}</span>
        </div>
        <div class="issue-actions">
          <button class="issue-btn edit-btn" data-id="${issue.id}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="issue-btn delete-btn" data-id="${issue.id}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
  
  // Add event listeners to the new buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => editIssue(parseInt(btn.dataset.id)));
  });
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteIssue(parseInt(btn.dataset.id)));
  });
}

// Setup event listeners
function setupEventListeners() {
  // Open modal to add new issue
  addIssueBtn.addEventListener('click', () => {
    isEditMode = false;
    editingIssueId = null;
    modalTitle.textContent = 'Add New Issue';
    issueForm.reset();
    document.getElementById('issueDatePromised').valueAsDate = new Date();
    openModal();
  });
  
  // Close modal
  modalClose.addEventListener('click', closeModal);
  window.addEventListener('click', event => {
    if (event.target === issueModal) {
      closeModal();
    }
  });
  
  // Submit form
  issueForm.addEventListener('submit', handleFormSubmit);
}

// Open modal
function openModal() {
  issueModal.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

// Close modal
function closeModal() {
  issueModal.style.display = 'none';
  document.body.style.overflow = '';
}

// Edit issue
async function editIssue(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch issue details');
    }
    
    const issues = await fetch(API_URL).then(res => res.json());
    const issue = issues.find(i => i.id === id);
    
    if (!issue) {
      throw new Error('Issue not found');
    }
    
    isEditMode = true;
    editingIssueId = id;
    modalTitle.textContent = 'Edit Issue';
    
    // Populate form fields
    document.getElementById('issueId').value = issue.id;
    document.getElementById('issueTitle').value = issue.title;
    document.getElementById('issueDescription').value = issue.description;
    document.getElementById('issueDatePromised').value = formatDateForInput(issue.datePromised);
    document.getElementById('issueStatus').value = issue.status;
    
    openModal();
  } catch (error) {
    console.error('Error editing issue:', error);
    alert('Failed to load issue details. Please try again.');
  }
}

// Delete issue
async function deleteIssue(id) {
  if (!confirm('Are you sure you want to delete this issue?')) {
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete issue');
    }
    
    fetchIssues(); // Refresh the list
  } catch (error) {
    console.error('Error deleting issue:', error);
    alert('Failed to delete issue. Please try again.');
  }
}

// Handle form submission (both add and edit)
async function handleFormSubmit(event) {
  event.preventDefault();
  
  const formData = {
    title: document.getElementById('issueTitle').value.trim(),
    description: document.getElementById('issueDescription').value.trim(),
    datePromised: document.getElementById('issueDatePromised').value,
    status: document.getElementById('issueStatus').value
  };
  
  try {
    let response;
    
    if (isEditMode) {
      // Update existing issue
      response = await fetch(`${API_URL}/${editingIssueId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
    } else {
      // Create new issue
      response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
    }
    
    if (!response.ok) {
      throw new Error('Failed to save issue');
    }
    
    closeModal();
    fetchIssues(); // Refresh the list
  } catch (error) {
    console.error('Error saving issue:', error);
    alert('Failed to save issue. Please try again.');
  }
}

// Utility functions
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateForInput(dateString) {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

function formatStatus(status) {
  if (!status) return 'Pending';
  return status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);