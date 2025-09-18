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

// Dynamic form elements for adding users
const roleSelect = document.getElementById('add-role');
const studentInputsContainer = document.getElementById('student-specific-inputs');
const addSectionInput = document.getElementById('add-section');
const addYearInput = document.getElementById('add-year');

// Edit Modal Elements
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
let activeChart = null; // To store the Chart.js instance for proper destruction

// --- Main App Logic ---
let isAddingUser = false;
auth.onAuthStateChanged(user => {
    if (user) {
        // Only run the role check if we are not in the middle of adding a new user
        if (!isAddingUser) {
            checkUserRole(user.uid);
        }
    } else {
        showLoginScreen();
    }
});

async function checkUserRole(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists && userDoc.data().role === 'admin') {
            showDashboard();
            // Get the last active tab from local storage, default to 'users-section'
            const lastActiveTab = localStorage.getItem('lastActiveTab') || 'users-section';
            // Trigger a click on the corresponding navigation button
            const navButtonToClick = document.getElementById(`nav-${lastActiveTab}`);
            if (navButtonToClick) {
                navButtonToClick.click();
            }
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
        
        // Save the active tab to local storage
        localStorage.setItem('lastActiveTab', targetId);

        if (targetId === 'users-section') {
            loadUsers();
        } else if (targetId === 'classes-section') {
            loadClassesAndTimetables();
        } else if (targetId === 'analytics-section') {
            loadAnalyticsData();
            loadStudentsForAnalytics();
        }
    });
});

// --- User Management ---
roleSelect.addEventListener('change', () => {
    if (roleSelect.value === 'student') {
        studentInputsContainer.style.display = 'block';
        addSectionInput.required = true;
        addYearInput.required = true;
    } else {
        studentInputsContainer.style.display = 'none';
        addSectionInput.required = false;
        addYearInput.required = false;
        addSectionInput.value = '';
        addYearInput.value = '';
    }
});

const editYearSelect = document.getElementById('edit-year'); // New line to get the element

editRoleSelect.addEventListener('change', () => {
    if (editRoleSelect.value === 'student') {
        editStudentInputsContainer.style.display = 'block';
    } else {
        editStudentInputsContainer.style.display = 'none';
        editSectionInput.value = '';
        editYearSelect.value = ''; // Corrected line to clear the select
    }
});

// Function to load all users with a real-time listener
function loadUsers() {
    const adminsTableBody = document.querySelector('#admins-table tbody');
    const facultyTableBody = document.querySelector('#faculty-table tbody');
    const studentsTableBody = document.querySelector('#students-table tbody');

    // Clear tables before a new data sync
    adminsTableBody.innerHTML = '';
    facultyTableBody.innerHTML = '';
    studentsTableBody.innerHTML = '';

    // Set up the real-time listener
    db.collection('users').onSnapshot(snapshot => {
        // Clear tables to prevent duplicate entries on each update
        adminsTableBody.innerHTML = '';
        facultyTableBody.innerHTML = '';
        studentsTableBody.innerHTML = '';

        snapshot.forEach(doc => {
            const user = doc.data();
            const row = document.createElement('tr');
            const actions = `<button class="edit-btn" data-uid="${doc.id}">Edit</button>
                             <button onclick="deleteUser('${doc.id}')">Delete</button>`;

            if (user.role === 'admin') {
                row.innerHTML = `
                    <td>${user.name || 'N/A'}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td class="actions-buttons">${actions}</td>
                `;
                adminsTableBody.appendChild(row);
            } else if (user.role === 'faculty') {
                row.innerHTML = `
                    <td>${user.name || 'N/A'}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td class="actions-buttons">${actions}</td>
                `;
                facultyTableBody.appendChild(row);
            } else if (user.role === 'student') {
                row.innerHTML = `
                    <td>${user.name || 'N/A'}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td>${user.section ? user.section : 'N/A'}</td>
                    <td>${user.year ? user.year : 'N/A'}</td>
                    <td class="actions-buttons">${actions}</td>
                `;
                studentsTableBody.appendChild(row);
            }
        });
    }, error => {
        console.error("Error fetching users: ", error);
        const errorRow = `<tr><td colspan="6">Error loading users. Check console for details.</td></tr>`;
        adminsTableBody.innerHTML = errorRow;
        facultyTableBody.innerHTML = errorRow;
        studentsTableBody.innerHTML = errorRow;
    });
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
        isAddingUser = true; // Set the flag

        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            role: role,
            section: section,
            year: year
        });
        
        alert('User added successfully!');
        document.getElementById('add-user-form').reset();
        studentInputsContainer.style.display = 'none';
        
        loadUsers();
    } catch (error) {
        alert(error.message);
    } finally {
        isAddingUser = false; // Always unset the flag
    }
});

async function deleteUser(uid) {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            await db.collection('users').doc(uid).delete();
            alert('User document deleted successfully.');
            loadUsers();
        } catch (error) {
            alert(error.message);
        }
    }
}

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('edit-btn')) {
        const uid = e.target.getAttribute('data-uid');
        openEditModal(uid);
    }
});

// ... (rest of your script)

async function openEditModal(uid) {
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
        const user = userDoc.data();
        currentEditingUserUid = uid;
        editNameInput.value = user.name;
        editEmailInput.value = user.email;
        editRoleSelect.value = user.role;
        editSectionInput.value = user.section || '';
        
        // Check if the role is 'student' to show/hide the correct fields
        if (user.role === 'student') {
            editStudentInputsContainer.style.display = 'block';
            
            // Set the selected year in the new dropdown
            editYearSelect.value = user.year || ''; 
        } else {
            editStudentInputsContainer.style.display = 'none';
        }
        
        editModal.style.display = 'flex';
    }
}

editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentEditingUserUid) return;

    const updatedData = {
        name: editNameInput.value,
        role: editRoleSelect.value,
        section: editRoleSelect.value === 'student' ? editSectionInput.value : null,
        year: editRoleSelect.value === 'student' ? editYearInput.value : null,
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

closeModal.addEventListener('click', () => {
    editModal.style.display = 'none';
});

// --- Class and Timetable Management ---
async function loadClassesAndTimetables() {
    await loadClasses();
    await loadTimetables();
    await loadFacultyForClassForm();
    await loadStudentsForClassAssignment();
}

async function loadFacultyForClassForm() {
    const facultySelect = document.getElementById('timetable-faculty-select');
    const facultyDocs = await db.collection('users').where('role', '==', 'faculty').get();
    facultySelect.innerHTML = '<option value="">Select Faculty</option>';
    facultyDocs.forEach(doc => {
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = doc.data().name;
        facultySelect.appendChild(option);
    });
}

async function loadStudentsForClassAssignment() {
    const studentAssignSelect = document.getElementById('student-assignment-select');
    studentAssignSelect.innerHTML = '';
    const studentDocs = await db.collection('users').where('role', '==', 'student').get();
    studentDocs.forEach(doc => {
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = doc.data().name;
        studentAssignSelect.appendChild(option);
    });
}

async function loadClasses() {
    const classesList = document.getElementById('classes-list');
    const classSelect = document.getElementById('timetable-class-select');
    const classAssignmentSelect = document.getElementById('class-assignment-select');

    classesList.innerHTML = '';
    classSelect.innerHTML = '<option value="">Select Class</option>';
    classAssignmentSelect.innerHTML = '<option value="">Select Class</option>';

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
        classAssignmentSelect.appendChild(option.cloneNode(true));
    });
}

async function loadTimetables() {
    const timetablesTableBody = document.querySelector('#timetables-table tbody');
    timetablesTableBody.innerHTML = ''; // Clear table before loading

    try {
        const timetablesSnapshot = await db.collection('timetables').get();
        timetablesSnapshot.forEach(async doc => {
            const data = doc.data();
            const row = document.createElement('tr');

            const facultyDoc = await db.collection('users').doc(data.faculty_id).get();
            const facultyName = facultyDoc.exists ? facultyDoc.data().name : 'N/A';

            row.innerHTML = `
                <td>${facultyName}</td>
                <td>${data.class_name}</td>
                <td>${data.section}</td>
                <td>${data.day}</td>
                <td>${data.start_time} - ${data.end_time}</td>
            `;
            timetablesTableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Error fetching timetables:", error);
        timetablesTableBody.innerHTML = '<tr><td colspan="5">Error loading timetables.</td></tr>';
    }
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

document.getElementById('add-timetable-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const facultyId = document.getElementById('timetable-faculty-select').value;
    const classId = document.getElementById('timetable-class-select').value;
    const section = document.getElementById('timetable-section-select').value;
    const day = document.getElementById('timetable-day-select').value;
    const startTime = document.getElementById('timetable-start-time').value;
    const endTime = document.getElementById('timetable-end-time').value;
    const className = document.getElementById('timetable-class-select').options[document.getElementById('timetable-class-select').selectedIndex].text;

    try {
        await db.collection('timetables').add({
            faculty_id: facultyId,
            class_id: classId,
            class_name: className,
            section: section,
            day: day,
            start_time: startTime,
            end_time: endTime
        });
        alert('Timetable entry added successfully!');
        document.getElementById('add-timetable-form').reset();
        loadTimetables();
    } catch (error) {
        alert("Error adding timetable: " + error.message);
    }
});

// Assign students to a class
document.getElementById('assign-students-btn').addEventListener('click', async () => {
    const classId = document.getElementById('class-assignment-select').value;
    const studentSelect = document.getElementById('student-assignment-select');
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
    if (activeChart) {
        activeChart.destroy();
    }

    const attendanceDocs = await db.collection('attendance').get();
    const classesSnapshot = await db.collection('classes').get();
    const classNames = {};
    classesSnapshot.forEach(doc => {
        classNames[doc.id] = doc.data().class_name;
    });

    const classAttendance = {};
    attendanceDocs.forEach(doc => {
        const data = doc.data();
        const classId = data.class_id;

        if (classNames[classId]) {
            if (!classAttendance[classId]) {
                classAttendance[classId] = {
                    attended: 0,
                    total: 0
                };
            }
            classAttendance[classId].attended += data.present_students.length;
            classAttendance[classId].total++;
        }
    });

    const chartLabels = Object.keys(classAttendance).map(classId => classNames[classId]);
    const chartAttendedData = Object.values(classAttendance).map(data => data.attended);
    const chartTotalData = Object.values(classAttendance).map(data => data.total);

    const ctx = document.getElementById('attendance-chart').getContext('2d');
    activeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Total Check-ins',
                data: chartAttendedData,
                backgroundColor: 'rgba(52, 152, 219, 0.6)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 1
            }, {
                label: 'Total Classes Held',
                data: chartTotalData,
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
    const studentAttendancePercentageP = document.getElementById('student-attendance-percentage');
    if (!studentUid) {
        studentAttendancePercentageP.textContent = '';
        return;
    }

    const attendanceDocs = await db.collection('attendance').get();
    let attendedClasses = 0;
    const classSessions = {};

    attendanceDocs.forEach(doc => {
        const data = doc.data();
        const classId = data.class_id;
        
        if (!classSessions[classId]) {
            classSessions[classId] = 0;
        }
        classSessions[classId]++;

        if (data.present_students.includes(studentUid)) {
            attendedClasses++;
        }
    });

    const totalClassesHeld = Object.keys(classSessions).length;
    if (totalClassesHeld > 0) {
        const percentage = (attendedClasses / totalClassesHeld) * 100;
        studentAttendancePercentageP.textContent = `Attendance: ${percentage.toFixed(2)}%`;
    } else {
        studentAttendancePercentageP.textContent = 'No attendance data available.';
    }
});
