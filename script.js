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

// User Management Elements
const roleSelect = document.getElementById('add-role');
const studentInputsContainer = document.getElementById('student-specific-inputs');
const addFacultyInputsContainer = document.getElementById('add-faculty-inputs');
const addSectionInput = document.getElementById('add-section');
const addYearInput = document.getElementById('add-year');
const addSubjectsSelect = document.getElementById('add-subjects');
const assignClassesSelect = document.getElementById('assign-classes-select');
const editAssignClassesSelect = document.getElementById('edit-assign-classes-select');

// Edit Modal Elements
const editModal = document.getElementById('edit-modal');
const closeModal = document.getElementById('close-modal');
const editForm = document.getElementById('edit-user-form');
const editNameInput = document.getElementById('edit-name');
const editEmailInput = document.getElementById('edit-email');
const editRoleSelect = document.getElementById('edit-role');
const editStudentInputsContainer = document.getElementById('edit-student-inputs');
const editFacultyInputsContainer = document.getElementById('edit-faculty-inputs');
const editSectionInput = document.getElementById('edit-section');
const editYearSelect = document.getElementById('edit-year');
const editSubjectsSelect = document.getElementById('edit-subjects');
let currentEditingUserUid = null;
let activeChart = null;

// Timetable and Class Management Elements
const newClassNameInput = document.getElementById('new-class-name');
const classFacultySelect = document.getElementById('class-faculty-select');
const timetableClassSelect = document.getElementById('timetable-class-select');
const timetableSubjectSelect = document.getElementById('timetable-subject-select');
const timetableFacultyDisplay = document.getElementById('timetable-faculty-display');
const timetableDaySelect = document.getElementById('timetable-day-select');
const timetableStartTime = document.getElementById('timetable-start-time');
const timetableEndTime = document.getElementById('timetable-end-time');
const displayClassSelect = document.getElementById('display-class-select');
const timetableGrid = document.getElementById('timetable-grid');
const noTimetableMessage = document.getElementById('no-timetable-message');

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
            const lastActiveTab = localStorage.getItem('lastActiveTab') || 'users-section';
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
    messageElement.innerText = '';
    loginForm.reset();
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
                case "auth/network-request-failed":
                    errorMessage = "Network error. Please check your internet connection.";
                    break;
                default:
                    errorMessage = "An unknown error occurred.";
            }
            messageElement.innerText = `Error: ${errorMessage}`;
        });
});

logoutBtn.addEventListener('click', () => {
    auth.signOut();
});

// --- Dashboard Navigation ---
navButtons.forEach(button => {
    button.addEventListener('click', async () => {
        navButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        sections.forEach(section => section.classList.remove('active-content'));
        const targetId = button.id.replace('nav-', '');
        document.getElementById(targetId).classList.add('active-content');
        localStorage.setItem('lastActiveTab', targetId);

        if (targetId === 'users-section') {
            loadUsers();
        } else if (targetId === 'subjects-section') {
            loadSubjects();
        } else if (targetId === 'classes-section') {
            await loadManagementForms();
        } else if (targetId === 'analytics-section') {
            loadAnalyticsData();
            loadStudentsForAnalytics();
        }
    });
});

// --- User Management ---
roleSelect.addEventListener('change', () => {
    studentInputsContainer.style.display = 'none';
    addFacultyInputsContainer.style.display = 'none';
    
    if (roleSelect.value === 'student') {
        studentInputsContainer.style.display = 'block';
        loadClassesForUserAssignment(assignClassesSelect);
    } else if (roleSelect.value === 'faculty') {
        addFacultyInputsContainer.style.display = 'block';
        loadSubjectsForAddFaculty();
    }
});

async function loadClassesForUserAssignment(selectElement) {
    selectElement.innerHTML = '';
    const classesSnapshot = await db.collection('classes').get();
    classesSnapshot.forEach(doc => {
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = doc.data().class_name;
        selectElement.appendChild(option);
    });
}

async function loadSubjectsForAddFaculty() {
    addSubjectsSelect.innerHTML = '';
    const subjectsSnapshot = await db.collection('subjects').get();
    subjectsSnapshot.forEach(doc => {
        const subject = doc.data();
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = subject.subject_name;
        addSubjectsSelect.appendChild(option);
    });
}

editRoleSelect.addEventListener('change', async () => {
    editStudentInputsContainer.style.display = 'none';
    editFacultyInputsContainer.style.display = 'none';
    
    if (editRoleSelect.value === 'student') {
        editStudentInputsContainer.style.display = 'block';
        loadClassesForUserAssignment(editAssignClassesSelect);
    } else if (editRoleSelect.value === 'faculty') {
        editFacultyInputsContainer.style.display = 'block';
        if (currentEditingUserUid) {
            const userDoc = await db.collection('users').doc(currentEditingUserUid).get();
            if (userDoc.exists) {
                const user = userDoc.data();
                await loadSubjectsForFaculty(user.subjects_taught || []);
            }
        }
    }
});

function loadUsers() {
    const adminsTableBody = document.querySelector('#admins-table tbody');
    const facultyTableBody = document.querySelector('#faculty-table tbody');
    const studentsTableBody = document.querySelector('#students-table tbody');

    db.collection('users').onSnapshot(async snapshot => {
        adminsTableBody.innerHTML = '';
        facultyTableBody.innerHTML = '';
        studentsTableBody.innerHTML = '';

        const subjectsMap = {};
        const subjectsSnapshot = await db.collection('subjects').get();
        subjectsSnapshot.forEach(doc => {
            subjectsMap[doc.id] = doc.data().subject_name;
        });

        const classesMap = {};
        const classesSnapshot = await db.collection('classes').get();
        classesSnapshot.forEach(doc => {
            classesMap[doc.id] = doc.data().class_name;
        });

        snapshot.forEach(doc => {
            const user = doc.data();
            const row = document.createElement('tr');
            const actions = `<button class="edit-btn" data-uid="${doc.id}">Edit</button>
                             <button class="delete-user-btn" data-uid="${doc.id}">Delete</button>`;

            if (user.role === 'admin') {
                row.innerHTML = `
                    <td>${user.name || 'N/A'}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td class="actions-buttons">${actions}</td>
                `;
                adminsTableBody.appendChild(row);
            } else if (user.role === 'faculty') {
                const subjects = user.subjects_taught || [];
                const subjectNames = subjects.map(id => subjectsMap[id] || 'Unknown Subject').join(', ');
                
                row.innerHTML = `
                    <td>${user.name || 'N/A'}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td>${subjectNames || 'N/A'}</td>
                    <td class="actions-buttons">${actions}</td>
                `;
                facultyTableBody.appendChild(row);
            } else if (user.role === 'student') {
                const classes = user.class_ids || [];
                const classNames = classes.map(id => classesMap[id] || 'N/A').join(', ');
                
                row.innerHTML = `
                    <td>${user.name || 'N/A'}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td>${user.section ? user.section : 'N/A'}</td>
                    <td>${user.year ? user.year : 'N/A'}</td>
                    <td>${classNames || 'N/A'}</td>
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

document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-user-btn')) {
        const uid = e.target.getAttribute('data-uid');
        if (confirm('Are you sure you want to delete this user? This will remove their data from the database and disable their account.')) {
            try {
                // To securely delete users, you must use a backend/serverless function
                alert('User deletion is a backend process. This is a placeholder for the delete action.');
                // await db.collection('users').doc(uid).delete();
                // alert('User deleted successfully!');
            } catch (error) {
                alert("Error deleting user: " + error.message);
            }
        }
    }
});

document.getElementById('add-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('add-email').value;
    const password = document.getElementById('add-password').value;
    const name = document.getElementById('add-name').value;
    const role = document.getElementById('add-role').value;
    
    let userProfileData = {
        name: name,
        email: email,
        role: role
    };

    if (role === 'student') {
        const selectedClasses = Array.from(assignClassesSelect.options)
            .filter(option => option.selected)
            .map(option => option.value);
        userProfileData.section = addSectionInput.value;
        userProfileData.year = addYearInput.value;
        userProfileData.class_ids = selectedClasses;
    } else if (role === 'faculty') {
        const selectedSubjects = Array.from(addSubjectsSelect.options)
            .filter(option => option.selected)
            .map(option => option.value);
        if (selectedSubjects.length === 0) {
            alert('Please select at least one subject for the faculty member.');
            return;
        }
        userProfileData.subjects_taught = selectedSubjects;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('users').doc(userCredential.user.uid).set(userProfileData);
        alert('User added successfully!');
        document.getElementById('add-user-form').reset();
    } catch (error) {
        alert(error.message);
    }
});


function loadSubjects() {
    const subjectsTableBody = document.querySelector('#subjects-table tbody');
    subjectsTableBody.innerHTML = '';
    
    db.collection('subjects').onSnapshot(snapshot => {
        subjectsTableBody.innerHTML = '';
        snapshot.forEach(doc => {
            const subject = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${subject.subject_name}</td>
                <td>${subject.subject_code}</td>
                <td class="actions-buttons">
                    <button class="delete-subject-btn" data-id="${doc.id}">Delete</button>
                </td>
            `;
            subjectsTableBody.appendChild(row);
        });
    });
}

document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-subject-btn')) {
        const subjectId = e.target.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this subject?')) {
            try {
                await db.collection('subjects').doc(subjectId).delete();
                alert('Subject deleted successfully.');
            } catch (error) {
                alert("Error deleting subject: " + error.message);
            }
        }
    }
});

// User edit modal and logic
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('edit-btn')) {
        const uid = e.target.getAttribute('data-uid');
        openEditModal(uid);
    }
});

async function openEditModal(uid) {
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
        const user = userDoc.data();
        currentEditingUserUid = uid;
        editNameInput.value = user.name;
        editEmailInput.value = user.email;
        editRoleSelect.value = user.role;
        
        editStudentInputsContainer.style.display = 'none';
        editFacultyInputsContainer.style.display = 'none';

        if (user.role === 'student') {
            editStudentInputsContainer.style.display = 'block';
            editSectionInput.value = user.section || '';
            editYearSelect.value = user.year || '';
            await loadClassesForUserAssignment(editAssignClassesSelect);
            const userClassIds = user.class_ids || [];
            Array.from(editAssignClassesSelect.options).forEach(option => {
                if (userClassIds.includes(option.value)) {
                    option.selected = true;
                }
            });
        } else if (user.role === 'faculty') {
            editFacultyInputsContainer.style.display = 'block';
            await loadSubjectsForFaculty(user.subjects_taught || []);
        }
        
        editModal.style.display = 'flex';
    }
}

async function loadSubjectsForFaculty(subjectsTaught) {
    editSubjectsSelect.innerHTML = '';
    const subjectsSnapshot = await db.collection('subjects').get();
    
    subjectsSnapshot.forEach(doc => {
        const subject = doc.data();
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = subject.subject_name;
        if (subjectsTaught && subjectsTaught.includes(doc.id)) {
            option.selected = true;
        }
        editSubjectsSelect.appendChild(option);
    });
}

editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentEditingUserUid) return;

    let updatedData = {
        name: editNameInput.value,
        role: editRoleSelect.value,
    };

    if (updatedData.role === 'student') {
        const selectedClasses = Array.from(editAssignClassesSelect.options)
            .filter(option => option.selected)
            .map(option => option.value);
        updatedData.class_ids = selectedClasses;
        updatedData.section = editSectionInput.value;
        updatedData.year = editYearSelect.value;
        updatedData.subjects_taught = firebase.firestore.FieldValue.delete();
    } else if (updatedData.role === 'faculty') {
        const selectedSubjects = Array.from(editSubjectsSelect.options)
            .filter(option => option.selected)
            .map(option => option.value);
        if (selectedSubjects.length === 0) {
            alert('Please select at least one subject for the faculty member.');
            return;
        }
            
        updatedData.subjects_taught = selectedSubjects;
        updatedData.class_ids = firebase.firestore.FieldValue.delete();
        updatedData.section = firebase.firestore.FieldValue.delete();
        updatedData.year = firebase.firestore.FieldValue.delete();
    } else { // Admin
        updatedData.subjects_taught = firebase.firestore.FieldValue.delete();
        updatedData.class_ids = firebase.firestore.FieldValue.delete();
        updatedData.section = firebase.firestore.FieldValue.delete();
        updatedData.year = firebase.firestore.FieldValue.delete();
    }

    try {
        await db.collection('users').doc(currentEditingUserUid).update(updatedData);
        alert('User updated successfully!');
        editModal.style.display = 'none';
        loadUsers();
    } catch (error) {
        alert("Error updating user: " + error.message);
        console.error("Error updating user: ", error);
    }
});

closeModal.addEventListener('click', () => {
    editModal.style.display = 'none';
});

// --- Timetable and Class Management ---

async function loadManagementForms() {
    await loadFacultyForClassCreation();
    await loadClassesForTimetable();
    await loadSubjectsForTimetable();
    await loadClassesForDisplay();
}

async function loadFacultyForClassCreation() {
    const facultySelects = [classFacultySelect];
    const facultyDocs = await db.collection('users').where('role', '==', 'faculty').get();
    facultySelects.forEach(select => {
        select.innerHTML = '<option value="">Select Faculty</option>';
        facultyDocs.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.data().name;
            select.appendChild(option);
        });
    });
}

async function loadClassesForTimetable() {
    const classSelects = [timetableClassSelect, displayClassSelect];
    const classDocs = await db.collection('classes').get();
    classSelects.forEach(select => {
        select.innerHTML = '<option value="">Select Class</option>';
        classDocs.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.data().class_name;
            select.appendChild(option);
        });
    });
}

const allSubjects = {};
const facultyBySubject = {};

async function loadSubjectsForTimetable() {
    const subjectsSnapshot = await db.collection('subjects').get();
    subjectsSnapshot.forEach(doc => {
        allSubjects[doc.id] = doc.data();
    });

    timetableSubjectSelect.innerHTML = '<option value="">Select Subject</option>';
    subjectsSnapshot.forEach(doc => {
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = doc.data().subject_name;
        timetableSubjectSelect.appendChild(option);
    });
}

timetableSubjectSelect.addEventListener('change', async (e) => {
    const subjectId = e.target.value;
    timetableFacultyDisplay.innerHTML = '<option value="">Select Faculty</option>';
    if (subjectId) {
        const facultySnapshot = await db.collection('users').where('role', '==', 'faculty').get();
        facultySnapshot.forEach(doc => {
            const faculty = doc.data();
            if (faculty.subjects_taught && faculty.subjects_taught.includes(subjectId)) {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = faculty.name;
                timetableFacultyDisplay.appendChild(option);
            }
        });
    }
});

document.getElementById('add-class-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const className = newClassNameInput.value;
    const facultyId = classFacultySelect.value;
    
    try {
        await db.collection('classes').add({
            class_name: className,
            faculty_id: facultyId,
            student_ids: []
        });
        alert('Class created successfully!');
        document.getElementById('add-class-form').reset();
        await loadClassesForTimetable();
        await loadClassesForDisplay();
    } catch (error) {
        alert("Error creating class: " + error.message);
    }
});

document.getElementById('add-timetable-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const classId = timetableClassSelect.value;
    const subjectId = timetableSubjectSelect.value;
    const facultyId = timetableFacultyDisplay.value;
    const day = timetableDaySelect.value;
    const startTime = timetableStartTime.value;
    const endTime = timetableEndTime.value;
    
    try {
        await db.collection('timetables').add({
            class_id: classId,
            subject_id: subjectId,
            faculty_id: facultyId,
            day: day,
            start_time: startTime,
            end_time: endTime
        });
        alert('Timetable entry added successfully!');
        document.getElementById('add-timetable-form').reset();
    } catch (error) {
        alert("Error adding timetable entry: " + error.message);
    }
});

displayClassSelect.addEventListener('change', async (e) => {
    const classId = e.target.value;
    if (classId) {
        await renderTimetableGrid(classId);
    } else {
        timetableGrid.innerHTML = '';
        noTimetableMessage.style.display = 'none';
    }
});

document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-timetable-btn')) {
        const timetableId = e.target.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this timetable entry?')) {
            try {
                await db.collection('timetables').doc(timetableId).delete();
                alert('Timetable entry deleted successfully.');
                const classId = displayClassSelect.value;
                if (classId) {
                    await renderTimetableGrid(classId);
                }
            } catch (error) {
                alert("Error deleting timetable entry: " + error.message);
            }
        }
    }
});

async function renderTimetableGrid(classId) {
    timetableGrid.innerHTML = '';
    noTimetableMessage.style.display = 'none';
    
    const [timetablesSnapshot, facultySnapshot, subjectsSnapshot] = await Promise.all([
        db.collection('timetables').where('class_id', '==', classId).get(),
        db.collection('users').where('role', '==', 'faculty').get(),
        db.collection('subjects').get()
    ]);
    
    const facultyNames = {};
    facultySnapshot.forEach(doc => facultyNames[doc.id] = doc.data().name);
    const subjectsMap = {};
    subjectsSnapshot.forEach(doc => subjectsMap[doc.id] = doc.data().subject_name);
    
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00'];
    
    if (timetablesSnapshot.empty) {
        noTimetableMessage.style.display = 'block';
        return;
    }

    const timetableData = {};
    timetablesSnapshot.forEach(doc => {
        const data = doc.data();
        const key = `${data.day}-${data.start_time}`;
        if (!timetableData[key]) {
            timetableData[key] = [];
        }
        timetableData[key].push({ ...data, id: doc.id });
    });
    
    // Render the grid headers (days of the week)
    const emptyCell = document.createElement('div');
    emptyCell.classList.add('grid-cell', 'grid-header');
    timetableGrid.appendChild(emptyCell);
    days.forEach(day => {
        const headerCell = document.createElement('div');
        headerCell.classList.add('grid-cell', 'grid-header');
        headerCell.textContent = day;
        timetableGrid.appendChild(headerCell);
    });

    // Render the grid cells with data
    timeSlots.forEach(time => {
        const timeCell = document.createElement('div');
        timeCell.classList.add('grid-cell', 'time-slot');
        timeCell.textContent = time;
        timetableGrid.appendChild(timeCell);

        days.forEach(day => {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            
            const key = `${day}-${time}`;
            if (timetableData[key]) {
                timetableData[key].forEach(entry => {
                    const entryDiv = document.createElement('div');
                    entryDiv.classList.add('timetable-entry');
                    const facultyName = facultyNames[entry.faculty_id] || 'N/A';
                    const subjectName = subjectsMap[entry.subject_id] || 'N/A';
                    entryDiv.innerHTML = `
                        <strong>${subjectName}</strong><br>
                        <small>${facultyName}</small><br>
                        <button class="delete-timetable-btn" data-id="${entry.id}">Delete</button>
                    `;
                    cell.appendChild(entryDiv);
                });
            }
            timetableGrid.appendChild(cell);
        });
    });
}

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
                classAttendance[classId] = { attended: 0, total_sessions: 0 };
            }
            classAttendance[classId].attended += data.present_students.length;
            classAttendance[classId].total_sessions++;
        }
    });

    const chartLabels = Object.keys(classAttendance).map(classId => classNames[classId]);
    const chartAttendedData = Object.values(classAttendance).map(data => data.attended);

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

async function loadStudentsForAnalytics() {
    const studentSelect = document.getElementById('analytics-student-select');
    studentSelect.innerHTML = '<option value="">Select Student</option>';
    const studentDocs = await db.collection('users').where('role', '==', 'student').get();
    studentDocs.forEach(doc => {
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = doc.data().name;
        studentSelect.appendChild(option);
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
    const studentDoc = await db.collection('users').doc(studentUid).get();
    const studentData = studentDoc.data();
    const studentClasses = studentData.class_ids || [];

    const totalSessionsInStudentClasses = attendanceDocs.docs
        .filter(doc => studentClasses.includes(doc.data().class_id))
        .length;

    attendanceDocs.forEach(doc => {
        const data = doc.data();
        if (studentClasses.includes(data.class_id) && data.present_students.includes(studentUid)) {
            attendedClasses++;
        }
    });

    if (totalSessionsInStudentClasses > 0) {
        const percentage = (attendedClasses / totalSessionsInStudentClasses) * 100;
        studentAttendancePercentageP.textContent = `Attendance: ${percentage.toFixed(2)}%`;
    } else {
        studentAttendancePercentageP.textContent = 'No attendance data available.';
    }
});
