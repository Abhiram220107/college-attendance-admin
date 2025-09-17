// Firebase configuration and initialization
const firebaseConfig = {
  apiKey: "AIzaSyBRtkq7GpBLInpqTTrc1pcRvhOrYhWdlEY",
  authDomain: "college-attendance-app-f394c.firebaseapp.com",
  projectId: "college-attendance-app-f394c",
  storageBucket: "college-attendance-app-f394c.firebasestorage.app",
  messagingSenderId: "1001509576660",
  appId: "1:1001509576660:web:3bfc16e7b8a637f3a5c041"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// UI Elements
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('login-form');
const messageElement = document.getElementById('message');
const logoutBtn = document.getElementById('logout-btn');

const navButtons = document.querySelectorAll('.nav-button');
const sections = document.querySelectorAll('.section-content');

// --- Main App Logic ---

// Listen for authentication state changes
auth.onAuthStateChanged(user => {
    if (user) {
        checkUserRole(user.uid);
    } else {
        showLoginScreen();
    }
});

// Check user role and display dashboard if they are an admin
async function checkUserRole(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists && userDoc.data().role === 'admin') {
            showDashboard();
            // Call the function to load user data here
            loadUsers(); 
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

// Handle login form submission
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

// Handle logout
logoutBtn.addEventListener('click', () => {
    auth.signOut();
});

// --- Dashboard Navigation ---
navButtons.forEach(button => {
    button.addEventListener('click', () => {
        navButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        sections.forEach(section => section.classList.remove('active-content'));
        const targetId = button.id.replace('nav-', '');
        document.getElementById(targetId).classList.add('active-content');
        
        // Call the specific loading function for each tab
        if (targetId === 'users-section') {
            loadUsers();
        } else if (targetId === 'classes-section') {
            loadClasses();
            loadFacultyForClassForm();
            loadStudentsForAnalytics();
        } else if (targetId === 'analytics-section') {
            loadAnalyticsData();
            loadStudentsForAnalytics();
        }
    });
});

// --- Data Loading and Management ---
// Load and display users
async function loadUsers() {
    const usersTableBody = document.querySelector('#users-table tbody');
    usersTableBody.innerHTML = ''; 

    try {
        const users = await db.collection('users').get();
        users.forEach(doc => {
            const user = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td class="actions-buttons">
                    <button onclick="deleteUser('${doc.id}')">Delete</button>
                </td>
            `;
            usersTableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Error fetching users: ", error);
        usersTableBody.innerHTML = '<tr><td colspan="4">Error loading users. Check console for details.</td></tr>';
    }
}
// All other functions are the same as before.
