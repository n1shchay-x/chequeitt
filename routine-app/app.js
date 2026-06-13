/**
 * chequeitt - Core Logic
 * Handles task management, streak logic, and mascot emotions.
 */

// --- State Management (LocalStorage) ---
const STORAGE_KEY = 'aura_routine_data';

const defaultState = {
    tasks: [], // { id: string, text: string, completedAt: string | null }
    streak: 0,
    lastCompletedDate: null, // YYYY-MM-DD string
};

let appState = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultState;

// Bulletproof the state structure in case of corrupted local storage
if (!appState.tasks || !Array.isArray(appState.tasks)) {
    appState.tasks = [];
}
if (typeof appState.streak !== 'number') {
    appState.streak = 0;
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    updateUI();
}

// --- Utility Functions ---
function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

function getYesterdayString() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
}

// --- DOM Elements ---
const tasksListEl = document.getElementById('tasksList');
const streakCountEl = document.getElementById('streakCount');
const mascotContainer = document.getElementById('mascotContainer');
const mascotFace = document.getElementById('mascotFace');
const mascotMessage = document.getElementById('mascotMessage');
const addTaskBtn = document.getElementById('addTaskBtn');
const addTaskModal = document.getElementById('addTaskModal');
const taskInput = document.getElementById('taskInput');
const cancelTaskBtn = document.getElementById('cancelTaskBtn');
const saveTaskBtn = document.getElementById('saveTaskBtn');
const notificationBanner = document.getElementById('notificationBanner');
const enableNotificationsBtn = document.getElementById('enableNotificationsBtn');

// Confirm Untick Modal Elements
const confirmUntickModal = document.getElementById('confirmUntickModal');
const cancelUntickBtn = document.getElementById('cancelUntickBtn');
const confirmUntickBtn = document.getElementById('confirmUntickBtn');
let taskToUntickId = null;

// Confirm Delete Modal Elements
const confirmDeleteModal = document.getElementById('confirmDeleteModal');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
let taskToDeleteId = null;

// --- Sensory & OS Integration ---

function playDing() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
}

function triggerHaptic() {
    if (navigator.vibrate) {
        navigator.vibrate([50]);
    }
}

function updateAppBadge(uncompletedCount) {
    if ('setAppBadge' in navigator) {
        if (uncompletedCount > 0) {
            navigator.setAppBadge(uncompletedCount).catch(() => {});
        } else {
            navigator.clearAppBadge().catch(() => {});
        }
    }
}

function checkNotificationPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
        if(notificationBanner) notificationBanner.style.display = 'flex';
    } else {
        if(notificationBanner) notificationBanner.style.display = 'none';
    }
}

function sendLocalNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body: body, icon: "icon.svg" });
    }
}

// Dynamic Cursor Lighting
document.addEventListener('mousemove', (e) => {
    document.documentElement.style.setProperty('--cursor-x', e.clientX + 'px');
    document.documentElement.style.setProperty('--cursor-y', e.clientY + 'px');
});

// --- Mascot Expressions (SVGs) ---
const FACES = {
    neutral: `
        <circle cx="128" cy="128" r="120" fill="none" stroke="currentColor" stroke-width="16" />
        <circle cx="92" cy="108" r="16" fill="currentColor" />
        <circle cx="164" cy="108" r="16" fill="currentColor" />
        <line x1="88" y1="160" x2="168" y2="160" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="16" />
    `,
    happy: `
        <circle cx="128" cy="128" r="120" fill="none" stroke="currentColor" stroke-width="16" />
        <path d="M76 108 Q92 88 108 108" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" />
        <path d="M148 108 Q164 88 180 108" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" />
        <path d="M80 150 Q128 190 176 150" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" />
    `,
    angry: `
        <circle cx="128" cy="128" r="120" fill="none" stroke="currentColor" stroke-width="16" />
        <circle cx="92" cy="116" r="12" fill="currentColor" />
        <circle cx="164" cy="116" r="12" fill="currentColor" />
        <line x1="72" y1="90" x2="108" y2="100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="16" />
        <line x1="184" y1="90" x2="148" y2="100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="16" />
        <path d="M96 168 Q128 150 160 168" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" />
    `,
    anxious: `
        <circle cx="128" cy="128" r="120" fill="none" stroke="currentColor" stroke-width="16" />
        <circle cx="92" cy="116" r="14" fill="currentColor" />
        <circle cx="164" cy="116" r="14" fill="currentColor" />
        <path d="M88 160 Q108 140 128 160 T168 160" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" />
        <path d="M200 64 Q216 80 216 100 Q216 116 200 116 Q184 116 184 100 Q184 80 200 64" fill="currentColor" />
    `,
    panic: `
        <circle cx="128" cy="128" r="120" fill="none" stroke="currentColor" stroke-width="16" />
        <circle cx="92" cy="108" r="20" fill="none" stroke="currentColor" stroke-width="12" />
        <circle cx="164" cy="108" r="20" fill="none" stroke="currentColor" stroke-width="12" />
        <circle cx="92" cy="108" r="6" fill="currentColor" />
        <circle cx="164" cy="108" r="6" fill="currentColor" />
        <ellipse cx="128" cy="168" rx="24" ry="32" fill="none" stroke="currentColor" stroke-width="16" />
        <line x1="72" y1="76" x2="112" y2="64" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" />
        <line x1="184" y1="76" x2="144" y2="64" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" />
    `
};

// --- Logic ---

function checkStreak() {
    const today = getTodayString();
    const yesterday = getYesterdayString();

    // If there is a last completed date, and it's older than yesterday, streak is broken.
    if (appState.lastCompletedDate && appState.lastCompletedDate !== today && appState.lastCompletedDate !== yesterday) {
        appState.streak = 0;
        saveState();
    }
}

function updateUI() {
    checkStreak();

    // Render Tasks
    tasksListEl.innerHTML = '';
    const today = getTodayString();
    
    // We only care about tasks completed today. If completed before today, we uncheck them for a new daily routine.
    let totalTasks = appState.tasks.length;
    let uncompletedCount = 0;
    let completedTodayCount = 0;

    // Reset tasks from previous days automatically
    let needsReset = false;
    appState.tasks.forEach(task => {
        if (task.completedAt !== null && task.completedAt !== today) {
            task.completedAt = null;
            needsReset = true;
        }
    });
    if (needsReset) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    }

    if (totalTasks === 0) {
        tasksListEl.innerHTML = '<div class="empty-state">No tasks for today. Add one above!</div>';
    }

    appState.tasks.forEach(task => {
        const isCompletedToday = task.completedAt === today;

        if (!isCompletedToday) {
            uncompletedCount++;
        } else {
            completedTodayCount++;
        }

        const el = document.createElement('div');
        el.className = `task-item ${isCompletedToday ? 'completed' : ''}`;
        el.setAttribute('onclick', `toggleTask('${task.id}')`);
        el.innerHTML = `
            <div class="task-info" style="flex: 1; pointer-events: none;">
                <div class="task-check">
                    <i class="ph-bold ph-check"></i>
                </div>
                <div class="task-text">${DOMPurify(task.text)}</div>
            </div>
            <button class="task-delete" aria-label="Delete task" onclick="event.stopPropagation(); window.deleteTask('${task.id}')" style="pointer-events: auto; padding: 12px; margin: -12px;">
                <i class="ph ph-trash"></i>
            </button>
        `;
        tasksListEl.appendChild(el);
    });

    // Handle Streak & Mascot Logic
    streakCountEl.textContent = appState.streak;
    mascotContainer.className = 'mascot-container'; // reset classes
    
    // Sync OS App Badge
    updateAppBadge(uncompletedCount);

    // MINIMUM ONE TASK COMPLETED -> STREAK SECURED
    const streakSecuredToday = completedTodayCount > 0;

    if (streakSecuredToday) {
        // Did they just secure it right now?
        if (appState.lastCompletedDate !== today) {
            appState.lastCompletedDate = today;
            appState.streak += 1;
            
            // Sensory Feedback
            playDing();
            const ring = document.getElementById('mascotRing');
            ring.classList.remove('ripple');
            void ring.offsetWidth; // trigger reflow
            ring.classList.add('ripple');
            
            sendLocalNotification("Streak Secured! 🔥", "Great job! You saved your daily streak.");
            
            saveState();
            return; // triggers re-render with new streak
        }

        mascotContainer.classList.add('state-happy');
        mascotFace.innerHTML = `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">${FACES.happy}</svg>`;
        if (uncompletedCount === 0) {
            mascotMessage.textContent = "Amazing job! You crushed your entire routine today.";
        } else {
            mascotMessage.textContent = "Streak secured! Keep going to finish the rest of your routine.";
        }
    } else if (appState.streak === 0 && appState.lastCompletedDate !== null && appState.lastCompletedDate !== today && appState.lastCompletedDate !== getYesterdayString()) {
        // Streak broken
        mascotContainer.classList.add('state-angry');
        mascotFace.innerHTML = `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">${FACES.angry}</svg>`;
        mascotMessage.textContent = "You missed your routine yesterday! Don't let me down today.";
        
        // Notify user about broken streak if they just loaded
        if (!window._streakNotified) {
            sendLocalNotification("Streak Broken 😠", "You missed yesterday's routine! Let's get back on track today.");
            window._streakNotified = true;
        }
    } else {
        // Time-based Emotion Engine & Reminders
        const now = new Date();
        const hours = now.getHours();

        // 4-Hour Scheduled Reminders
        // Slots: 8, 12, 16, 20
        let currentSlot = null;
        if (hours >= 8 && hours < 12) currentSlot = 8;
        else if (hours >= 12 && hours < 16) currentSlot = 12;
        else if (hours >= 16 && hours < 20) currentSlot = 16;
        else if (hours >= 20) currentSlot = 20;

        if (currentSlot !== null && totalTasks > 0 && !streakSecuredToday) {
            const slotKey = `${today}-${currentSlot}`;
            if (appState.lastRemindedSlot !== slotKey) {
                appState.lastRemindedSlot = slotKey;
                // Send notification for EACH uncompleted task
                appState.tasks.forEach(t => {
                    if (t.completedAt !== today) {
                        sendLocalNotification("Time to chequeitt! ⏱️", `Friendly reminder: "${t.text}" is waiting for you.`);
                    }
                });
                saveState(); // save the slot immediately
            }
        }

        if (totalTasks === 0) {
            mascotContainer.className = 'mascot-container state-neutral';
            mascotFace.innerHTML = `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">${FACES.neutral}</svg>`;
            mascotMessage.textContent = "Add some tasks to get started.";
        } else if (hours >= 21) {
            mascotContainer.className = 'mascot-container state-panic';
            mascotFace.innerHTML = `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">${FACES.panic}</svg>`;
            const midnight = new Date();
            midnight.setHours(24, 0, 0, 0);
            const diffMs = midnight - now;
            const diffHrs = Math.floor((diffMs % 86400000) / 3600000);
            const diffMins = Math.floor(((diffMs % 86400000) % 3600000) / 60000);
            mascotMessage.textContent = `Only ${diffHrs}h ${diffMins}m left! Please don't break our streak!`;
            
            if (!window._panicNotified) {
                sendLocalNotification("Time is running out! ⏰", `Only ${diffHrs}h ${diffMins}m left to finish your routine.`);
                window._panicNotified = true;
            }
        } else if (hours >= 18) {
            mascotContainer.className = 'mascot-container state-anxious';
            mascotFace.innerHTML = `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">${FACES.anxious}</svg>`;
            mascotMessage.textContent = "It's getting late... Have you started your routine?";
        } else {
            if (!mascotContainer.classList.contains('state-panic') && !mascotContainer.classList.contains('state-anxious')) {
                mascotContainer.className = 'mascot-container state-neutral';
                mascotFace.innerHTML = `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">${FACES.neutral}</svg>`;
                mascotMessage.textContent = "I'm waiting for you to finish today's tasks.";
            }
        }
    }
}

// 60-second Emotion Engine Loop
setInterval(() => {
    updateUI();
}, 60000);

// --- Interactions ---

window.toggleTask = function(id) {
    const today = getTodayString();
    const task = appState.tasks.find(t => t.id === id);
    if (task) {
        if (task.completedAt !== today) {
            // Completing the task
            triggerHaptic();
            task.completedAt = today;
            saveState();
        } else {
            // Trying to untick a completed task -> Show Confirmation Modal (Duolingo Style: Protect Progress)
            taskToUntickId = id;
            confirmUntickModal.classList.add('active');
        }
    }
};

// Undo Task Confirmation Handlers
if (cancelUntickBtn) {
    cancelUntickBtn.addEventListener('click', () => {
        confirmUntickModal.classList.remove('active');
        taskToUntickId = null;
    });
}

if (confirmUntickBtn) {
    confirmUntickBtn.addEventListener('click', () => {
        if (taskToUntickId) {
            const task = appState.tasks.find(t => t.id === taskToUntickId);
            if (task) {
                task.completedAt = null;
                
                // If they undo a task, and today was marked as the lastCompletedDate, 
                // we must revert the streak ONLY IF there are no other tasks completed today.
                const today = getTodayString();
                if (appState.lastCompletedDate === today) {
                    const otherCompleted = appState.tasks.some(t => t.id !== taskToUntickId && t.completedAt === today);
                    if (!otherCompleted) {
                        // Streak is officially in danger again
                        appState.lastCompletedDate = getYesterdayString(); // Fallback to yesterday
                        appState.streak = Math.max(0, appState.streak - 1); // Remove today's point
                    }
                }
                saveState();
            }
        }
        confirmUntickModal.classList.remove('active');
        taskToUntickId = null;
    });
}

window.deleteTask = function(id) {
    taskToDeleteId = id;
    confirmDeleteModal.classList.add('active');
};

if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', () => {
        confirmDeleteModal.classList.remove('active');
        taskToDeleteId = null;
    });
}

if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', () => {
        if (taskToDeleteId) {
            appState.tasks = appState.tasks.filter(t => t.id !== taskToDeleteId);
            // If we delete the last uncompleted task, the rest might be completed. 
            // updateUI will recalculate.
            saveState();
        }
        confirmDeleteModal.classList.remove('active');
        taskToDeleteId = null;
    });
}

addTaskBtn.addEventListener('click', () => {
    addTaskModal.classList.add('active');
    taskInput.focus();
});

cancelTaskBtn.addEventListener('click', () => {
    addTaskModal.classList.remove('active');
    taskInput.value = '';
});

// Allow hitting Enter to save
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        saveTaskBtn.click();
    }
});

saveTaskBtn.addEventListener('click', () => {
    const text = taskInput.value.trim();
    if (text) {
        appState.tasks.push({
            id: Date.now().toString(),
            text: text,
            completedAt: null
        });
        saveState();
        addTaskModal.classList.remove('active');
        taskInput.value = '';
    }
});

// Basic DOMPurify placeholder to prevent XSS (simulating the ironclad rule)
function DOMPurify(str) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        "/": '&#x2F;',
    };
    const reg = /[&<>"'/]/ig;
    return str.replace(reg, (match) => (map[match]));
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    checkNotificationPermission();
    updateUI();
});

if (enableNotificationsBtn) {
    enableNotificationsBtn.addEventListener('click', () => {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                if(notificationBanner) notificationBanner.style.display = 'none';
                sendLocalNotification("Aura Routine", "Notifications are now active!");
            }
        });
    });
}

// --- PWA Installation Logic ---
let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Update UI notify the user they can install the PWA
    installBtn.style.display = 'flex';
});

installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }
        // We've used the prompt, and can't use it again, throw it away
        deferredPrompt = null;
        installBtn.style.display = 'none';
    }
});

window.addEventListener('appinstalled', () => {
    // Clear the deferredPrompt so it can be garbage collected
    deferredPrompt = null;
    console.log('PWA was installed');
});
