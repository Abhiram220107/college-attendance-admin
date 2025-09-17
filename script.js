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
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists && userDoc.data().role === 'admin') {
        showDashboard();
        loadDashboardData();
    } else {
        alert('Access denied. You are not an admin.');
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
            let errorMessage = "An unknown error occurred.";
            switch (error.code) {
                case "auth/invalid-email":
                    errorMessage = "Invalid email address format.";
                    break;
                case "auth/user-not-found":
                case "auth/wrong-password":
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
        // Remove active class from all buttons
        navButtons.forEach(btn => btn.classList.remove('active'));
        // Add active class to the clicked button
        button.classList.add('active');

        // Hide all sections
        sections.forEach(section => section.classList.remove('active-content'));

        // Show the corresponding section
        const targetId = button.id.replace('nav-', '');
        document.getElementById(targetId).classList.add('active-content');
    });
});

// --- Data Loading and Management ---
async function loadDashboardData() {
    await loadUsers();
    await loadClasses();
    await loadFacultyForClassForm();
    await loadStudentsForAnalytics();
    await loadAnalyticsData();
}

// Load and display users
async function loadUsers() {
    const usersTableBody = document.querySelector('#users-table tbody');
    usersTableBody.innerHTML = ''; // Clear existing data

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
}

// Add a new user
document.getElementById('add-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('add-email').value;
    const password = document.getElementById('add-password').value;
    const name = document.getElementById('add-name').value;
    const role = document.getElementById('add-role').value;

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            role: role
        });
        alert('User added successfully!');
        document.getElementById('add-user-form').reset();
        loadUsers(); // Refresh the user list
    } catch (error) {
        alert(error.message);
    }
});

// Delete a user
async function deleteUser(uid) {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            // Firestore doesn't allow deleting a user directly from client-side code for security.
            // In a real-world app, you'd use a cloud function here. For this project,
            // we'll just delete the Firestore document and the user can't log in anymore.
            await db.collection('users').doc(uid).delete();
            alert('User document deleted successfully. User will no longer be able to log in.');
            loadUsers(); // Refresh the user list
        } catch (error) {
            alert(error.message);
        }
    }
}

// Load faculty for class creation form
async function loadFacultyForClassForm() {
    const facultySelect = document.getElementById('faculty-select');
    facultySelect.innerHTML = '<option value="">Select Faculty</option>';
    const facultyDocs = await db.collection('users').where('role', '==', 'faculty').get();
    facultyDocs.forEach(doc => {
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = doc.data().name;
        facultySelect.appendChild(option);
    });
}

// Load students for analytics and class assignment
async function loadStudentsForAnalytics() {
    const studentSelect = document.getElementById('analytics-student-select');
    const studentAssignSelect = document.getElementById('student-select');
    studentSelect.innerHTML = '<option value="">Select Student</option>';
    studentAssignSelect.innerHTML = '';

    const studentDocs = await db.collection('users').where('role', '==', 'student').get();
    studentDocs.forEach(doc => {
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = doc.data().name;
        studentSelect.appendChild(option.cloneNode(true)); // for analytics
        studentAssignSelect.appendChild(option); // for class assignment
    });
}

// Load classes for assignment and analytics
async function loadClasses() {
    const classesList = document.getElementById('classes-list');
    const classSelect = document.getElementById('class-select');
    classesList.innerHTML = '';
    classSelect.innerHTML = '<option value="">Select Class</option>';

    const classDocs = await db.collection('classes').get();
    classDocs.forEach(doc => {
        const classData = doc.data();
        const li = document.createElement('li');
        li.textContent = `${classData.class_name} (Faculty: ${classData.faculty_id})`;
        classesList.appendChild(li);

        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = classData.class_name;
        classSelect.appendChild(option);
    });
}

// Add a new class
document.getElementById('add-class-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const className = document.getElementById('class-name').value;
    const facultyId = document.getElementById('faculty-select').value;

    try {
        await db.collection('classes').add({
            class_name: className,
            faculty_id: facultyId,
            student_ids: []
        });
        alert('Class created successfully!');
        document.getElementById('add-class-form').reset();
        loadClasses();
    } catch (error) {
        alert(error.message);
    }
});

// Assign students to a class
document.getElementById('assign-students-btn').addEventListener('click', async () => {
    const classId = document.getElementById('class-select').value;
    const studentSelect = document.getElementById('student-select');
    const selectedStudentIds = Array.from(studentSelect.options)
                                   .filter(option => option.selected)
                                   .map(option => option.value);

    if (classId && selectedStudentIds.length > 0) {
        try {
            const classRef = db.collection('classes').doc(classId);
            await classRef.update({
                student_ids: firebase.firestore.FieldValue.arrayUnion(...selectedStudentIds)
            });
            alert('Students assigned to class successfully!');
        } catch (error) {
            alert(error.message);
        }
    } else {
        alert('Please select a class and at least one student.');
    }
});

// --- Analytics Logic ---
async function loadAnalyticsData() {
    const attendanceDocs = await db.collection('attendance').get();
    const classAttendance = {};
    const totalClasses = {};

    attendanceDocs.forEach(doc => {
        const data = doc.data();
        const classId = data.class_id;

        if (!classAttendance[classId]) {
            classAttendance[classId] = 0;
            totalClasses[classId] = 0;
        }

        classAttendance[classId] += data.present_students.length;
        totalClasses[classId]++;
    });

    // Display overall class attendance (bar chart)
    const classNames = [];
    const attendanceCounts = [];
    const totalClassCounts = [];
    for (const classId in classAttendance) {
        const classDoc = await db.collection('classes').doc(classId).get();
        if (classDoc.exists) {
            classNames.push(classDoc.data().class_name);
            attendanceCounts.push(classAttendance[classId]);
            totalClassCounts.push(totalClasses[classId]);
        }
    }

    const ctx = document.getElementById('attendance-chart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: classNames,
            datasets: [{
                label: 'Total Students Attended',
                data: attendanceCounts,
                backgroundColor: 'rgba(52, 152, 219, 0.6)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 1
            }, {
                label: 'Total Classes Held',
                data: totalClassCounts,
                backgroundColor: 'rgba(149, 165, 166, 0.6)',
                borderColor: 'rgba(149, 165, 166, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

document.getElementById('analytics-student-select').addEventListener('change', async (e) => {
    const studentUid = e.target.value;
    if (!studentUid) {
        document.getElementById('student-attendance-percentage').textContent = '';
        return;
    }

    const attendanceDocs = await db.collection('attendance').get();
    let attendedClasses = 0;
    const totalClasses = {};

    attendanceDocs.forEach(doc => {
        const data = doc.data();
        const classId = data.class_id;
        
        if (!totalClasses[classId]) {
            totalClasses[classId] = 0;
        }
        totalClasses[classId]++;

        if (data.present_students.includes(studentUid)) {
            attendedClasses++;
        }
    });

    const totalClassesHeld = Object.keys(totalClasses).length;
    if (totalClassesHeld > 0) {
        const percentage = (attendedClasses / totalClassesHeld) * 100;
        document.getElementById('student-attendance-percentage').textContent = `Attendance: ${percentage.toFixed(2)}%`;
    } else {
        document.getElementById('student-attendance-percentage').textContent = 'No attendance data available.';
    }
});

