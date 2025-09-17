// public/script.js

// Firebase configuration and initialization
const firebaseConfig = {
  apiKey: "AIzaSyBRtkq7GpBLInpqTTrc1pcRvhOrYhWdlEY",
  authDomain: "college-attendance-app-f394c.firebaseapp.com",
  projectId: "college-attendance-app-f394c",
  storageBucket: "college-attendance-app-f394c.firebasestorage.app",
  messagingSenderId: "1001509576660",
  appId: "1:1001509576660:web:3bfc16e7b8a637f3a5c041"
};

// Initialize Firebase (namespaced v8)
firebase.initializeApp(firebaseConfig);

// Services
const auth = firebase.auth();
const db = firebase.firestore();

// IMPORTANT: match the region used in functions/index.js (default us-central1)
const functions = firebase.app().functions('us-central1');

// Callable reference
const deleteUserByAdmin = functions.httpsCallable('deleteUserByAdmin');

// --- UI Elements (unchanged) ---
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('login-form');
const messageElement = document.getElementById('message');
const logoutBtn = document.getElementById('logout-btn');

const navButtons = document.querySelectorAll('.nav-button');
const sections = document.querySelectorAll('.section-content');

const roleSelect = document.getElementById('add-role');
const studentInputsContainer = document.getElementById('student-specific-inputs');
const addSectionInput = document.getElementById('add-section');
const addYearInput = document.getElementById('add-year');

const editModal = document.getElementById('edit-modal');
const closeModal = document.getElementById('close-modal');
const editForm = document.getElementById('edit-user-form');
const editNameInput = document.getElementById('edit-name');
const editEmailInput = document.getElementById('edit-email');
const editRoleSelect = document.getElementById('edit-role');
const editStudentInputsContainer = document.getElementById('edit-student-inputs');
const editSectionInput = document.getElementById('edit-section');
const editYearInput = document.getElementById('edit-year');

let currentEditingUserUid = null;
let activeChart = null;

// --- Auth flow ---
auth.onAuthStateChanged(user => {
  if (user) {
    checkUserRole(user.uid);
  } else {
    showLoginScreen();
  }
});

async function checkUserRole(uid) {
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists && userDoc.data().role === 'admin') {
      showDashboard();
      const lastActiveTab = localStorage.getItem('lastActiveTab') || 'users-section';
      const navButtonToClick = document.getElementById(`nav-${lastActiveTab}`);
      if (navButtonToClick) navButtonToClick.click();
    } else {
      alert('Access denied. You are not an admin.');
      auth.signOut();
    }
  } catch (error) {
    alert("Failed to load user data. Please try again.");
    auth.signOut();
  }
}

function showLoginScreen() {
  loginContainer.style.display = 'block';
  dashboardContainer.style.display = 'none';
}

function showDashboard() {
  loginContainer.style.display = 'none';
  dashboardContainer.style.display = 'block';
}

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  auth.signInWithEmailAndPassword(email, password)
    .catch(error => {
      let errorMessage = "An error occurred. Please try again.";
      switch (error.code) {
        case "auth/invalid-email":
        case "auth/wrong-password":
        case "auth/user-not-found":
          errorMessage = "Invalid email or password.";
          break;
        case "auth/user-disabled":
          errorMessage = "Your account has been disabled.";
          break;
        default:
          errorMessage = "An error occurred. Please try again.";
      }
      messageElement.innerText = `Error: ${errorMessage}`;
    });
});

logoutBtn.addEventListener('click', () => {
  auth.signOut();
});

// --- Navigation ---
const navHandlers = {
  'users-section': () => loadUsers(),
  'classes-section': () => loadClassesAndTimetables(),
  'analytics-section': () => { loadAnalyticsData(); loadStudentsForAnalytics(); }
};

document.querySelectorAll('.nav-button').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    document.querySelectorAll('.section-content').forEach(section => section.classList.remove('active-content'));
    const targetId = button.id.replace('nav-', '');
    document.getElementById(targetId).classList.add('active-content');
    localStorage.setItem('lastActiveTab', targetId);
    navHandlers[targetId]?.();
  });
});

// --- User management ---
roleSelect.addEventListener('change', () => {
  const isStudent = roleSelect.value === 'student';
  studentInputsContainer.style.display = isStudent ? 'block' : 'none';
  addSectionInput.required = isStudent;
  addYearInput.required = isStudent;
  if (!isStudent) { addSectionInput.value = ''; addYearInput.value = ''; }
});

editRoleSelect.addEventListener('change', () => {
  const isStudent = editRoleSelect.value === 'student';
  editStudentInputsContainer.style.display = isStudent ? 'block' : 'none';
  if (!isStudent) { editSectionInput.value = ''; editYearInput.value = ''; }
});

async function loadUsers() {
  const adminsBody = document.querySelector('#admins-table tbody');
  const facultyBody = document.querySelector('#faculty-table tbody');
  const studentsBody = document.querySelector('#students-table tbody');
  adminsBody.innerHTML = '';
  facultyBody.innerHTML = '';
  studentsBody.innerHTML = '';
  try {
    const snap = await db.collection('users').get();
    snap.forEach(doc => {
      const user = doc.data();
      const row = document.createElement('tr');
      const actions = `<button class="edit-btn" data-uid="${doc.id}">Edit</button>
                       <button onclick="deleteUser('${doc.id}')">Delete</button>`;
      if (user.role === 'admin') {
        row.innerHTML = `<td>${user.name || 'N/A'}</td><td>${user.email || 'N/A'}</td><td class="actions-buttons">${actions}</td>`;
        adminsBody.appendChild(row);
      } else if (user.role === 'faculty') {
        row.innerHTML = `<td>${user.name || 'N/A'}</td><td>${user.email || 'N/A'}</td><td class="actions-buttons">${actions}</td>`;
        facultyBody.appendChild(row);
      } else if (user.role === 'student') {
        row.innerHTML = `<td>${user.name || 'N/A'}</td><td>${user.email || 'N/A'}</td><td>${user.section || 'N/A'}</td><td>${user.year || 'N/A'}</td><td class="actions-buttons">${actions}</td>`;
        studentsBody.appendChild(row);
      }
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    const errorRow = `<tr><td colspan="6">Error loading users. Check console for details.</td></tr>`;
    adminsBody.innerHTML = errorRow;
    facultyBody.innerHTML = errorRow;
    studentsBody.innerHTML = errorRow;
  }
}

document.getElementById('add-user-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('add-email').value;
  const password = document.getElementById('add-password').value;
  const name = document.getElementById('add-name').value;
  const role = document.getElementById('add-role').value;
  const section = (role === 'student') ? addSectionInput.value : null;
  const year = (role === 'student') ? addYearInput.value : null;
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await db.collection('users').doc(cred.user.uid).set({ name, email, role, section, year });
    alert('User added successfully!');
    e.target.reset();
    studentInputsContainer.style.display = 'none';
    loadUsers();
  } catch (err) {
    alert(err.message);
  }
});

// Delete user via callable
async function deleteUser(uid) {
  if (!confirm('Are you sure you want to delete this user?')) return;
  try {
    await deleteUserByAdmin({ uid });
    alert('User and their data deleted successfully!');
    loadUsers();
  } catch (error) {
    console.error('Error calling Cloud Function:', error);
    alert(`Error deleting user: ${error.message}`);
  }
}

// Edit modal handlers
document.getElementById('users-table').addEventListener('click', (e) => {
  if (e.target.classList.contains('edit-btn')) {
    const uid = e.target.getAttribute('data-uid');
    openEditModal(uid);
  }
});

async function openEditModal(uid) {
  const doc = await db.collection('users').doc(uid).get();
  if (!doc.exists) return;
  const user = doc.data();
  currentEditingUserUid = uid;
  editNameInput.value = user.name || '';
  editEmailInput.value = user.email || '';
  editRoleSelect.value = user.role || 'faculty';
  editSectionInput.value = user.section || '';
  editYearInput.value = user.year || '';
  editStudentInputsContainer.style.display = (user.role === 'student') ? 'block' : 'none';
  editModal.style.display = 'flex';
}

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentEditingUserUid) return;
  const updated = {
    name: editNameInput.value,
    role: editRoleSelect.value,
    section: editRoleSelect.value === 'student' ? editSectionInput.value : null,
    year: editRoleSelect.value === 'student' ? editYearInput.value : null,
  };
  try {
    await db.collection('users').doc(currentEditingUserUid).update(updated);
    alert('User updated successfully!');
    editModal.style.display = 'none';
    loadUsers();
  } catch (err) {
    alert(err.message);
  }
});

closeModal.addEventListener('click', () => { editModal.style.display = 'none'; });

// --- Classes, timetables, analytics (unchanged from your version) ---
/* Keep your existing loadClassesAndTimetables, loadFacultyForClassForm,
   loadStudentsForClassAssignment, loadClasses, loadTimetables, add-class,
   add-timetable, assign-students, and analytics code here. */
