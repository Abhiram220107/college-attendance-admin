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

const roleSelect = document.getElementById('add-role');
const sectionContainer = document.getElementById('section-input-container');
const sectionInput = document.getElementById('add-section');

// Edit Modal Elements
const editModal = document.getElementById('edit-modal');
const closeModal = document.getElementById('close-modal');
const editForm = document.getElementById('edit-user-form');
const editName = document.getElementById('edit-name');
const editEmail = document.getElementById('edit-email');
const editRole = document.getElementById('edit-role');
const editSection = document.getElementById('edit-section');
const editSectionContainer = document.getElementById('edit-section-container');
let currentEditingUserUid = null;

// --- Main App Logic ---
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

// --- Dashboard Navigation ---
navButtons.forEach(button => {
    button.addEventListener('click', () => {
        navButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        sections.forEach(section => section.classList.remove('active-content'));
        const targetId = button.id.replace('nav-', '');
        document.getElementById(targetId).classList.add('active-content');
        
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
roleSelect.addEventListener('change', () => {
    if (roleSelect.value === 'student') {
        sectionContainer.style.display = 'block';
        sectionInput.required = true;
    } else {
        sectionContainer.style.display = 'none';
        sectionInput.required = false;
        sectionInput.value = '';
    }
});

// Dynamically show/hide section input in edit modal
editRole.addEventListener('change', () => {
    if (editRole.value === 'student') {
        editSectionContainer.style.display = 'block';
    } else {
        editSectionContainer.style.display = 'none';
        editSection.value = '';
    }
});

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
                <td>${user.section ? user.section : 'N/A'}</td>
                <td class="actions-buttons">
                    <button onclick="openEditModal('${doc.id}')">Edit</button>
                    <button onclick="deleteUser('${doc.id}')">Delete</button>
                </td>
            `;
            usersTableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Error fetching users: ", error);
        usersTableBody.innerHTML = '<tr><td colspan="5">Error loading users. Check console for details.</td></tr>';
    }
}

// Add a new user
document.getElementById('add-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('add-email').value;
    const password = document.getElementById('add-password').value;
    const name = document.getElementById('add-name').value;
    const role = document.getElementById('add-role').value;
    const section = (role === 'student') ? document.getElementById('add-section').value : null;

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            role: role,
            section: section
        });
        alert('User added successfully!');
        document.getElementById('add-user-form').reset();
        sectionContainer.style.display = 'none';
        loadUsers();
    } catch (error) {
        alert(error.message);
    }
});

// Open the edit modal with user data
async function openEditModal(uid) {
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
        const user = userDoc.data();
        currentEditingUserUid = uid;
        editName.value = user.name;
        editEmail.value = user.email;
        editRole.value = user.role;
        editSection.value = user.section || '';
        if (user.role === 'student') {
            editSectionContainer.style.display = 'block';
        } else {
            editSectionContainer.style.display = 'none';
        }
        editModal.style.display = 'block';
    }
}

// Save edits from the modal
editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentEditingUserUid) return;

    const updatedData = {
        name: editName.value,
        role: editRole.value,
        section: editRole.value === 'student' ? editSection.value : null
    };

    try {
        await db.collection('users').doc(currentEditingUserUid).update(updatedData);
        alert('User updated successfully!');
        editModal.style.display = 'none';
        loadUsers();
    } catch (error) {
        alert(error.message);
    }
});

// Close the edit modal
closeModal.addEventListener('click', () => {
    editModal.style.display = 'none';
});

// Delete a user
async function deleteUser(uid) {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            await db.collection('users').doc(uid).delete();
            alert('User document deleted successfully. User will no longer be able to log in.');
            loadUsers();
        } catch (error) {
            alert(error.message);
        }
    }
}

// All other functions remain unchanged.
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
        studentSelect.appendChild(option.cloneNode(true));
        studentAssignSelect.appendChild(option);
    });
}

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

document.getElementById('assign-students-btn').addEventListener('click', async () => {
    const classId = document.getElementById('class-select').value;
    const studentSelect = document.getElementById('student-select');
    const selectedStudentIds = Array.from(studentSelect.options).filter(option => option.selected).map(option => option.value);
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
