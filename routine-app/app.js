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
    xp: 0,
    level: 1
};

let appState = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultState;

// Bulletproof the state structure in case of corrupted local storage
if (!appState.tasks || !Array.isArray(appState.tasks)) {
    appState.tasks = [];
}
if (typeof appState.streak !== 'number') {
    appState.streak = 0;
}
if (typeof appState.xp !== 'number') appState.xp = 0;
if (typeof appState.level !== 'number') appState.level = 1;

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
const xpCountEl = document.getElementById('xpCount');
const walkOfShameModal = document.getElementById('walkOfShameModal');
const shameInput = document.getElementById('shameInput');
const unlockAppBtn = document.getElementById('unlockAppBtn');
const mascotContainer = document.getElementById('mascotContainer');
const mascotFace = document.getElementById('mascotFace');
const mascotMessage = document.getElementById('mascotMessage');
const addTaskBtn = document.getElementById('addTaskBtn');
const addTaskModal = document.getElementById('addTaskModal');
const taskInput = document.getElementById('taskInput');
const cancelTaskBtn = document.getElementById('cancelTaskBtn');
const saveTaskBtn = document.getElementById('saveTaskBtn');
const addTaskForm = document.getElementById('addTaskForm');
const notificationBanner = document.getElementById('notificationBanner');
const enableNotificationsBtn = document.getElementById('enableNotificationsBtn');
const themeBtn = document.getElementById('themeBtn');
const themeIcon = document.getElementById('themeIcon');

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

let heartbeatInterval = null;
function playHeartbeat() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(50, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
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

const NOTIFICATIONS = {
    streak_secured: [
        { title: "Streak Secured! 🔥", body: "You survived another day. The mascot is pleased." },
        { title: "Phew... 😅", body: "Your streak is safe. I can finally relax." },
        { title: "Great job! 🎉", body: "Routine complete. See you tomorrow!" }
    ],
    streak_broken: [
        { title: "Streak Broken 😠", body: "I trusted you. We had a good thing going. Now look at us." },
        { title: "Really? 💔", body: "You missed yesterday's routine. Don't make me angry again today." },
        { title: "Back to ZERO. 📉", body: "All that hard work, gone. Let's restart today." }
    ],
    reminder_neutral: [
        { title: "Time to chequeitt! ⏱️", body: "Friendly reminder: tasks are waiting for you." },
        { title: "Knock knock 👀", body: "You have unfinished business today." },
        { title: "Still there? 🐢", body: "Your routine isn't going to complete itself." }
    ],
    reminder_anxious: [
        { title: "It's getting late... 😰", body: "Have you started your routine? I'm getting nervous." },
        { title: "Uh oh... 🕰️", body: "The day is slipping away. Please do your tasks!" },
        { title: "Don't do this to me 🥺", body: "I hate seeing unfinished tasks this late." }
    ],
    reminder_panic: [
        { title: "TIME IS RUNNING OUT! 🚨", body: "Finish your routine NOW! Don't break our streak!" },
        { title: "CODE RED! 🆘", body: "Midnight is approaching! Do your tasks immediately!" },
        { title: "PLEASE! I'M BEGGING YOU! 😭", body: "Just tick one task! Don't let our streak die!" }
    ]
};

function getRandomNotification(type) {
    const pool = NOTIFICATIONS[type];
    return pool[Math.floor(Math.random() * pool.length)];
}

function sendLocalNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body: body, icon: "icon.svg" });
    }
}

// Dynamic Favicon Generator
function updateDynamicFavicon(svgContent, color) {
    const favicon = document.getElementById('dynamicFavicon');
    if (!favicon) return;
    
    // Convert the raw inner SVG string into a valid, standalone SVG document
    const encodedColor = encodeURIComponent(color);
    const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" style="color: ${encodedColor}; width: 100%; height: 100%;">${svgContent}</svg>`;
    
    // Base64 encode it
    const base64Svg = btoa(unescape(encodeURIComponent(fullSvg)));
    favicon.href = 'data:image/svg+xml;base64,' + base64Svg;
}

// Dynamic Cursor Lighting
document.addEventListener('mousemove', (e) => {
    document.documentElement.style.setProperty('--cursor-x', e.clientX + 'px');
    document.documentElement.style.setProperty('--cursor-y', e.clientY + 'px');
});

const FACES = {
    neutral: `
        <path d="M128 32 C128 32 64 96 64 160 C64 195 92 224 128 224 C164 224 192 195 192 160 C192 96 128 32 128 32 Z" fill="none" stroke="currentColor" stroke-width="12" stroke-linejoin="round"/>
        <ellipse cx="104" cy="140" rx="8" ry="12" fill="currentColor"/>
        <ellipse cx="152" cy="140" rx="8" ry="12" fill="currentColor"/>
        <line x1="116" y1="176" x2="140" y2="176" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>
    `,
    happy: `
        <path d="M128 32 C128 32 64 96 64 160 C64 195 92 224 128 224 C164 224 192 195 192 160 C192 96 128 32 128 32 Z" fill="none" stroke="currentColor" stroke-width="12" stroke-linejoin="round"/>
        <path d="M92 140 Q104 124 116 140" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>
        <path d="M140 140 Q152 124 164 140" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>
        <path d="M104 168 Q128 196 152 168" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
        <path d="M104 168 Q128 196 152 168 Z" fill="currentColor"/>
    `,
    angry: `
        <path d="M128 40 L100 80 L60 100 L70 150 L60 180 L90 220 L128 210 L166 220 L196 180 L186 150 L196 100 L156 80 Z" fill="none" stroke="currentColor" stroke-width="12" stroke-linejoin="round"/>
        <circle cx="104" cy="150" r="8" fill="currentColor"/>
        <circle cx="152" cy="150" r="8" fill="currentColor"/>
        <line x1="88" y1="124" x2="116" y2="140" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
        <line x1="168" y1="124" x2="140" y2="140" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
        <path d="M110 180 Q128 168 146 180" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/>
    `,
    anxious: `
        <path d="M128 32 C128 32 64 96 64 160 C64 195 92 224 128 224 C164 224 192 195 192 160 C192 96 128 32 128 32 Z" fill="none" stroke="currentColor" stroke-width="12" stroke-linejoin="round"/>
        <circle cx="104" cy="140" r="14" fill="none" stroke="currentColor" stroke-width="8"/>
        <circle cx="152" cy="140" r="14" fill="none" stroke="currentColor" stroke-width="8"/>
        <circle cx="104" cy="140" r="4" fill="currentColor"/>
        <circle cx="152" cy="140" r="4" fill="currentColor"/>
        <path d="M104 180 Q112 172 120 180 T136 180 T152 180" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>
        <path d="M180 80 C180 80 160 100 170 110 C180 120 190 100 180 80 Z" fill="#3b82f6" stroke="none"/>
    `,
    panic: `
        <path d="M128 32 C120 48 56 96 64 160 C68 190 92 220 128 220 C164 220 188 190 192 160 C200 96 136 48 128 32 Z" fill="none" stroke="currentColor" stroke-width="12" stroke-linejoin="round" stroke-dasharray="10 6"/>
        <ellipse cx="104" cy="136" rx="16" ry="20" fill="none" stroke="currentColor" stroke-width="10"/>
        <ellipse cx="152" cy="136" rx="20" ry="16" fill="none" stroke="currentColor" stroke-width="10"/>
        <circle cx="104" cy="136" r="4" fill="currentColor"/>
        <circle cx="152" cy="136" r="4" fill="currentColor"/>
        <ellipse cx="128" cy="184" rx="16" ry="24" fill="none" stroke="currentColor" stroke-width="10"/>
        <path d="M180 60 C180 60 150 90 165 110 C180 130 200 90 180 60 Z" fill="#3b82f6" stroke="none"/>
        <path d="M50 160 L30 150 M60 200 L40 210 M206 160 L226 150 M196 200 L216 210" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>
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

    // Calculate Level
    appState.level = Math.floor(appState.xp / 100) + 1;

    // Handle Streak & Mascot Logic
    streakCountEl.textContent = appState.streak;
    if (xpCountEl) xpCountEl.textContent = `${appState.xp} XP (Lvl ${appState.level})`;
    mascotContainer.className = 'mascot-container'; // reset classes
    
    // Sync OS App Badge
    updateAppBadge(uncompletedCount);

    // Stop heartbeat if running
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }

    // MINIMUM ONE TASK COMPLETED -> STREAK SECURED
    const streakSecuredToday = completedTodayCount > 0;

    if (streakSecuredToday) {
        // Did they just secure it right now?
        if (appState.lastCompletedDate !== today) {
            appState.lastCompletedDate = today;
            appState.streak += 1;
            appState.xp += 50; // Streak Bonus
            
            const ring = document.getElementById('mascotRing');
            ring.classList.remove('ripple');
            void ring.offsetWidth; // trigger reflow
            ring.classList.add('ripple');
            
            const msg = getRandomNotification('streak_secured');
            sendLocalNotification(msg.title, msg.body);
            
            saveState();
            return; // triggers re-render with new streak
        }

        mascotContainer.classList.add('state-happy');
        mascotFace.innerHTML = `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">${FACES.happy}</svg>`;
        updateDynamicFavicon(FACES.happy, '#10b981'); // happy-color
        if (uncompletedCount === 0) {
            mascotMessage.textContent = "Amazing job! You crushed your entire routine today.";
        } else {
            mascotMessage.textContent = "Streak secured! Keep going to finish the rest of your routine.";
        }
    } else if (appState.streak === 0 && appState.lastCompletedDate !== null && appState.lastCompletedDate !== today && appState.lastCompletedDate !== getYesterdayString()) {
        // Streak broken
        mascotContainer.classList.add('state-angry');
        mascotFace.innerHTML = `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">${FACES.angry}</svg>`;
        updateDynamicFavicon(FACES.angry, '#ef4444'); // angry-color
        mascotMessage.textContent = "You missed your routine yesterday! Don't let me down today.";
        
        // Notify user about broken streak if they just loaded
        if (!window._streakNotified) {
            const msg = getRandomNotification('streak_broken');
            sendLocalNotification(msg.title, msg.body);
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
                // Get the appropriate message pool based on time
                let notifType = 'reminder_neutral';
                if (hours >= 21) notifType = 'reminder_panic';
                else if (hours >= 18) notifType = 'reminder_anxious';
                
                // Send notification for EACH uncompleted task
                appState.tasks.forEach(t => {
                    if (t.completedAt !== today) {
                        const msg = getRandomNotification(notifType);
                        sendLocalNotification(msg.title, msg.body + ` ("${t.text}")`);
                    }
                });
                saveState(); // save the slot immediately
            }
        }

        if (totalTasks === 0) {
            mascotContainer.className = 'mascot-container state-neutral';
            mascotFace.innerHTML = `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">${FACES.neutral}</svg>`;
            updateDynamicFavicon(FACES.neutral, '#94a3b8'); // neutral-color
            mascotMessage.textContent = "Add some tasks to get started.";
        } else if (hours >= 21) {
            mascotContainer.className = 'mascot-container state-panic';
            mascotFace.innerHTML = `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">${FACES.panic}</svg>`;
            updateDynamicFavicon(FACES.panic, '#d97706'); // primary / amber glow
            const midnight = new Date();
            midnight.setHours(24, 0, 0, 0);
            const diffMs = midnight - now;
            const diffHrs = Math.floor((diffMs % 86400000) / 3600000);
            const diffMins = Math.floor(((diffMs % 86400000) % 3600000) / 60000);
            mascotMessage.textContent = `Only ${diffHrs}h ${diffMins}m left! Please don't break our streak!`;
            
            // Start heartbeat
            if (!heartbeatInterval) {
                heartbeatInterval = setInterval(playHeartbeat, 1500);
                playHeartbeat();
            }

            if (!window._panicNotified) {
                const msg = getRandomNotification('reminder_panic');
                sendLocalNotification(msg.title, `Only ${diffHrs}h ${diffMins}m left. ` + msg.body);
                window._panicNotified = true;
            }
        } else if (hours >= 18) {
            mascotContainer.className = 'mascot-container state-anxious';
            mascotFace.innerHTML = `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">${FACES.anxious}</svg>`;
            updateDynamicFavicon(FACES.anxious, '#d97706'); // primary / amber glow
            mascotMessage.textContent = "It's getting late... Have you started your routine?";
        } else {
            if (!mascotContainer.classList.contains('state-panic') && !mascotContainer.classList.contains('state-anxious')) {
                mascotContainer.className = 'mascot-container state-neutral';
                mascotFace.innerHTML = `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">${FACES.neutral}</svg>`;
                updateDynamicFavicon(FACES.neutral, '#94a3b8'); // neutral-color
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
            playDing();
            task.completedAt = today;
            appState.xp += 10;
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
    taskInput.blur();
});

if (addTaskForm) {
    addTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();
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
            taskInput.blur();
        }
    });
}

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

    // Check Walk of Shame
    const today = getTodayString();
    const yesterday = getYesterdayString();
    if (appState.streak === 0 && appState.lastCompletedDate !== null && appState.lastCompletedDate !== today && appState.lastCompletedDate !== yesterday) {
        // App is locked until they pledge
        if (walkOfShameModal) walkOfShameModal.style.display = 'flex';
    }

});

// Walk of Shame Inputs
if (shameInput && unlockAppBtn && walkOfShameModal) {
    const requiredPhrase = "I will not let my routine die again";
    shameInput.addEventListener('input', (e) => {
        if (e.target.value.trim() === requiredPhrase) {
            unlockAppBtn.disabled = false;
            unlockAppBtn.style.opacity = '1';
        } else {
            unlockAppBtn.disabled = true;
            unlockAppBtn.style.opacity = '0.5';
        }
    });
    unlockAppBtn.addEventListener('click', () => {
        walkOfShameModal.style.opacity = '0';
        setTimeout(() => walkOfShameModal.style.display = 'none', 300);
    });
}

// --- Theme Management ---
let currentTheme = localStorage.getItem('aura_theme') || 'dark';

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (themeIcon) {
        // In dark mode, show a sun to switch to light. In light mode, show a moon.
        themeIcon.className = theme === 'dark' ? 'ph ph-sun' : 'ph ph-moon';
    }
}
applyTheme(currentTheme);

if (themeBtn) {
    themeBtn.addEventListener('click', () => {
        triggerHaptic();
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('aura_theme', currentTheme);
        applyTheme(currentTheme);
    });
}


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
