alert("자바스크립트 연결 확인!");
// Get DOM elements
const taskInput = document.getElementById('taskInput');
const timeInput = document.getElementById('timeInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');
const dateCarousel = document.getElementById('dateCarousel');
const taskDateLabel = document.getElementById('taskDateLabel');

// State
let selectedDate = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format

// Load tasks from localStorage on page load
document.addEventListener('DOMContentLoaded', () => {
    initDateCarousel();
    loadTasks();
});

// Add task on button click
addBtn.addEventListener('click', addTask);

// Add task on Enter key press
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTask();
    }
});

// Initialize date carousel
function initDateCarousel() {
    dateCarousel.innerHTML = '';
    const today = new Date();
    
    // Generate 7 days from today
    for (let i = -1; i < 6; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        
        const dateStr = date.toISOString().split('T')[0];
        const dayNum = date.getDate();
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        const button = document.createElement('button');
        button.className = 'date-btn';
        button.setAttribute('data-date', dateStr);
        if (dateStr === selectedDate) {
            button.classList.add('active');
        }
        
        button.innerHTML = `<span class="date-day">${dayNum}</span><span class="date-name">${dayName}</span>`;
        button.addEventListener('click', () => selectDate(dateStr));
        
        dateCarousel.appendChild(button);
    }
}

// Select date from carousel
function selectDate(dateStr) {
    // Save current tasks before switching dates
    saveTasks();
    
    selectedDate = dateStr;
    
    // Update active state
    document.querySelectorAll('.date-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-date="${dateStr}"]`).classList.add('active');
    
    // Update label
    const date = new Date(dateStr);
    const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    taskDateLabel.textContent = `Task for ${dateLabel}`;
    
    // Reload tasks for selected date
    loadTasks();
}

// Add a new task
function addTask() {
    const taskText = taskInput.value.trim();
    const taskTime = timeInput.value;

    // Validate input
    if (taskText === '') {
        alert('Please enter a task!');
        return;
    }

    // Create task object
    const task = {
        id: Date.now(),
        text: taskText,
        date: selectedDate,
        time: taskTime,
        completed: false
    };

    // Save task to localStorage
    saveTasks(); 

    // 1. 입력창 초기화
    taskInput.value = '';
    timeInput.value = '';

    // 2. 화면 업데이트 함수 호출 (중요!)
    renderTasks();

    // Clear input fields
    taskInput.value = '';
    timeInput.value = '';
    taskInput.focus();
}

// Render a single task in the DOM
function renderTask(task) {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.completed ? ' completed' : '');
    li.setAttribute('data-id', task.id);
    li.setAttribute('data-date', task.date);
    li.setAttribute('data-time', task.time || '');

    const dateTimeStr = formatDateTime(task.date, task.time);
    const dateTimeDisplay = dateTimeStr ? `<span class="task-datetime">${dateTimeStr}</span>` : '';

    li.innerHTML = `
        <div class="task-content">
            <span class="task-text">${escapeHtml(task.text)}</span>
            ${dateTimeDisplay}
        </div>
        <div class="task-actions">
            <div class="task-buttons">
                <button class="complete-btn" onclick="toggleComplete(${task.id})" title="${task.completed ? 'Undo' : 'Mark done'}">
                    ${task.completed ? '✓' : '○'}
                </button>
                <button class="delete-btn" onclick="deleteTask(${task.id})" title="Delete">
                    ✕
                </button>
            </div>
        </div>
    `;

    taskList.appendChild(li);
}

// Toggle task completion status
function toggleComplete(id) {
    const tasks = getTasks();
    const task = tasks.find(t => t.id === id);
    
    if (task) {
        task.completed = !task.completed;
        localStorage.setItem('tasks', JSON.stringify(tasks));
        renderAllTasks();
    }
}

// Delete a task
function deleteTask(id) {
    const tasks = getTasks();
    const filteredTasks = tasks.filter(t => t.id !== id);
    localStorage.setItem('tasks', JSON.stringify(filteredTasks));
    renderAllTasks();
}

// Get all tasks from localStorage
function getTasks() {
    const tasks = localStorage.getItem('tasks');
    return tasks ? JSON.parse(tasks) : [];
}

// Save all tasks to localStorage
function saveTasks() {
    // Get all tasks from localStorage (including those not visible in DOM)
    const allStoredTasks = getTasks();
    
    // Get current DOM tasks state
    const domTasks = [];
    document.querySelectorAll('.task-item').forEach(li => {
        const id = parseInt(li.getAttribute('data-id'));
        const text = li.querySelector('.task-text').textContent;
        const completed = li.classList.contains('completed');
        const date = li.getAttribute('data-date');
        const time = li.getAttribute('data-time') || '';
        domTasks.push({ id, text, date, time, completed });
    });
    
    // Update tasks: merge DOM state with stored data
    const updatedTasks = allStoredTasks.map(task => {
        const domTask = domTasks.find(t => t.id === task.id);
        if (domTask) {
            // Update with current DOM state
            return domTask;
        }
        return task;
    });
    
    // Add any new tasks that are in DOM but not in stored tasks
    const storedIds = new Set(allStoredTasks.map(t => t.id));
    domTasks.forEach(domTask => {
        if (!storedIds.has(domTask.id)) {
            updatedTasks.push(domTask);
        }
    });
    
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));
}

// Load tasks from localStorage
function loadTasks() {
    const tasks = getTasks();
    const filteredTasks = tasks.filter(task => task.date === selectedDate);
    taskList.innerHTML = '';
    
    if (filteredTasks.length === 0) {
        taskList.innerHTML = '<div class="empty-message">No tasks for this day</div>';
        return;
    }

    // Sort by complete state first (incomplete -> complete), then by time, then by most recent no-time tasks
    const sortedTasks = filteredTasks.sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1; // completed should come last
        }

        if (!a.completed) {
            if (a.time && b.time) {
                return a.time.localeCompare(b.time);
            }
            if (a.time && !b.time) return -1;
            if (!a.time && b.time) return 1;
            // both no time => newest first
            return b.id - a.id;
        }

        // both completed: keep by completion time/newer first (based on id timestamp)
        return b.id - a.id;
    });

    let dividerInserted = false;
    sortedTasks.forEach(task => {
        if (task.completed && !dividerInserted) {
            // Insert separator between pending tasks and completed tasks
            const divider = document.createElement('li');
            divider.className = 'task-divider';
            divider.textContent = 'Completed Tasks';
            taskList.appendChild(divider);
            dividerInserted = true;
        }
        renderTask(task);
    });
}

// Render all tasks
function renderAllTasks() {
    loadTasks();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Format date and time for display
function formatDateTime(date, time) {
    if (!date && !time) return '';
    
    let formatted = '';
    
    if (date) {
        const dateObj = new Date(date);
        formatted = dateObj.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric'
        });
    }
    
    if (time) {
        const [hours, minutes] = time.split(':');
        const timeObj = new Date(2000, 0, 1, hours, minutes);
        const timeStr = timeObj.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true
        });
        formatted += formatted ? ` at ${timeStr}` : timeStr;
    }
    
    return formatted;
}
