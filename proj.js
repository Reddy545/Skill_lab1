let tasks = [];
let currentFilter = "all";
let currentCategory = "all";
let currentSort = "newest";
let searchText = "";
let lastDeleted = null;
let toastTimer = null;
let studentName = localStorage.getItem("studentName") || "Student";

const priorityOrder = { high: 0, medium: 1, low: 2 };
const priorityLabels = { high: "🔴 High", medium: "🟡 Medium", low: "🟢 Low" };

const taskInput = document.getElementById("taskInput");
const priorityInput = document.getElementById("priorityInput");
const categoryInput = document.getElementById("categoryInput");
const dueInput = document.getElementById("dueInput");
const addBtn = document.getElementById("addBtn");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const sortSelect = document.getElementById("sortSelect");
const taskList = document.getElementById("taskList");
const emptyText = document.getElementById("emptyText");
const errorText = document.getElementById("error");
const clearBtn = document.getElementById("clearBtn");
const themeBtn = document.getElementById("themeBtn");
const nameBtn = document.getElementById("nameBtn");
const greeting = document.getElementById("greeting");
const dateText = document.getElementById("dateText");
const toast = document.getElementById("toast");
const filterButtons = document.querySelectorAll(".filter-btn");

function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

function loadTasks() {
    let stored = [];
    try {
        stored = JSON.parse(localStorage.getItem("tasks")) || [];
    } catch (e) {
        stored = [];
    }
    tasks = stored.map(t => ({
        id: t.id,
        text: t.text,
        completed: !!t.completed,
        priority: t.priority || "medium",
        category: t.category || "General",
        due: t.due || "",
        createdAt: t.createdAt || t.id
    }));
}

function getToday() {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}`;
}

function isOverdue(task) {
    return !task.completed && task.due !== "" && task.due < getToday();
}

function formatDate(due) {
    return new Date(due + "T00:00:00").toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short"
    });
}

function showToast(message, actionLabel, action) {
    toast.innerHTML = "";
    const span = document.createElement("span");
    span.textContent = message;
    toast.appendChild(span);
    if (actionLabel) {
        const btn = document.createElement("button");
        btn.textContent = actionLabel;
        btn.addEventListener("click", action);
        toast.appendChild(btn);
    }
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 4000);
}

function launchConfetti() {
    const colors = ["#3b6cf6", "#1f9d63", "#e0a420", "#e04b4b", "#9b59b6", "#17a2b8"];
    for (let i = 0; i < 70; i++) {
        const piece = document.createElement("div");
        piece.className = "confetti";
        piece.style.left = Math.random() * 100 + "vw";
        piece.style.background = colors[i % colors.length];
        piece.style.animationDuration = 1.5 + Math.random() * 1.5 + "s";
        piece.style.animationDelay = Math.random() * 0.5 + "s";
        document.body.appendChild(piece);
        setTimeout(() => piece.remove(), 3800);
    }
}

function addTask() {
    const text = taskInput.value.trim();
    if (text.length === 0) {
        errorText.textContent = "Please enter a task.";
        taskInput.focus();
        return;
    }
    const duplicate = tasks.find(t => t.text.toLowerCase() === text.toLowerCase());
    if (duplicate) {
        errorText.textContent = "This task already exists.";
        return;
    }
    const task = {
        id: Date.now(),
        text: text,
        completed: false,
        priority: priorityInput.value,
        category: categoryInput.value,
        due: dueInput.value,
        createdAt: Date.now()
    };
    tasks.push(task);
    errorText.textContent = "";
    taskInput.value = "";
    dueInput.value = "";
    saveTasks();
    render();
    showToast("Task added ✅");
    taskInput.focus();
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    task.completed = !task.completed;
    saveTasks();
    render();
    if (task.completed && tasks.every(t => t.completed)) {
        launchConfetti();
        showToast("🎉 All tasks completed!");
    }
}

function startInlineEdit(task, textEl) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "inline-edit";
    input.value = task.text;
    textEl.replaceWith(input);
    input.focus();
    input.select();

    let finished = false;
    const finish = save => {
        if (finished) return;
        finished = true;
        const value = input.value.trim();
        if (save && value) {
            task.text = value;
            saveTasks();
        }
        render();
    };

    input.addEventListener("keydown", event => {
        if (event.key === "Enter") finish(true);
        else if (event.key === "Escape") finish(false);
    });
    input.addEventListener("blur", () => finish(true));
}

function undoDelete() {
    if (!lastDeleted) return;
    tasks.splice(lastDeleted.index, 0, lastDeleted.task);
    lastDeleted = null;
    saveTasks();
    render();
    showToast("Task restored");
}

function deleteTask(id, li) {
    li.classList.add("removing");
    setTimeout(() => {
        const index = tasks.findIndex(t => t.id === id);
        if (index === -1) return;
        lastDeleted = { task: tasks[index], index: index };
        tasks.splice(index, 1);
        saveTasks();
        render();
        showToast("Task deleted", "Undo", undoDelete);
    }, 250);
}

function clearCompleted() {
    const before = tasks.length;
    tasks = tasks.filter(t => !t.completed);
    saveTasks();
    render();
    showToast(`Cleared ${before - tasks.length} completed task(s)`);
}

function sortTasks(list) {
    const sorted = list.slice();
    if (currentSort === "newest") {
        sorted.sort((a, b) => b.createdAt - a.createdAt);
    } else if (currentSort === "oldest") {
        sorted.sort((a, b) => a.createdAt - b.createdAt);
    } else if (currentSort === "priority") {
        sorted.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    } else if (currentSort === "due") {
        sorted.sort((a, b) => {
            if (!a.due && !b.due) return 0;
            if (!a.due) return 1;
            if (!b.due) return -1;
            return a.due.localeCompare(b.due);
        });
    }
    return sorted;
}

function getVisibleTasks() {
    const filtered = tasks.filter(t => {
        const matchesSearch = t.text.toLowerCase().includes(searchText);
        const matchesCategory = currentCategory === "all" || t.category === currentCategory;
        let matchesFilter = true;
        if (currentFilter === "pending") {
            matchesFilter = !t.completed;
        } else if (currentFilter === "completed") {
            matchesFilter = t.completed;
        }
        return matchesSearch && matchesCategory && matchesFilter;
    });
    return sortTasks(filtered);
}

function createButton(label, className, title, handler) {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.className = "btn " + className;
    btn.title = title;
    btn.addEventListener("click", handler);
    return btn;
}

function createBadge(text, className) {
    const badge = document.createElement("span");
    badge.className = "badge " + className;
    badge.textContent = text;
    return badge;
}

function createDueLabel(task) {
    const due = document.createElement("span");
    due.className = "due";
    if (isOverdue(task)) {
        due.classList.add("overdue");
        due.textContent = "⚠️ Overdue · " + formatDate(task.due);
    } else if (task.due === getToday() && !task.completed) {
        due.classList.add("today");
        due.textContent = "⏰ Due today";
    } else {
        due.textContent = "📅 " + formatDate(task.due);
    }
    return due;
}

function renderList() {
    const visible = getVisibleTasks();
    taskList.innerHTML = "";

    visible.forEach(task => {
        const li = document.createElement("li");
        li.classList.add("priority-" + task.priority);
        if (task.completed) li.classList.add("completed");

        const main = document.createElement("div");
        main.className = "task-main";

        const span = document.createElement("span");
        span.className = "task-text";
        span.textContent = task.text;
        span.title = "Double-click to edit";
        span.addEventListener("dblclick", () => startInlineEdit(task, span));

        const meta = document.createElement("div");
        meta.className = "meta";
        meta.appendChild(createBadge(priorityLabels[task.priority], task.priority));
        meta.appendChild(createBadge(task.category, "category"));
        if (task.due) meta.appendChild(createDueLabel(task));

        main.appendChild(span);
        main.appendChild(meta);

        const actions = document.createElement("div");
        actions.className = "actions";
        actions.appendChild(createButton("✎", "", "Edit", () => startInlineEdit(task, span)));
        actions.appendChild(createButton("✓", "done-btn", "Mark complete", () => toggleTask(task.id)));
        actions.appendChild(createButton("Delete", "", "Delete", () => deleteTask(task.id, li)));

        li.appendChild(main);
        li.appendChild(actions);
        taskList.appendChild(li);
    });

    if (visible.length === 0) {
        emptyText.textContent = tasks.length === 0
            ? "No tasks yet. Add your first one above!"
            : "No tasks match your search or filters.";
    } else {
        emptyText.textContent = "";
    }
}

function getMessage(percent, total) {
    if (total === 0) return "Add a task to get started!";
    if (percent === 100) return "🎉 All tasks done. Great work!";
    if (percent >= 75) return "Almost there, keep going!";
    if (percent >= 40) return "Good progress, stay focused.";
    return "Every big goal starts with one small task.";
}

function updateStats() {
    const total = tasks.length;
    let done = 0;
    for (let i = 0; i < tasks.length; i++) {
        if (tasks[i].completed) done++;
    }
    const pending = total - done;
    const overdue = tasks.filter(isOverdue).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    document.getElementById("totalCount").textContent = total;
    document.getElementById("pendingCount").textContent = pending;
    document.getElementById("doneCount").textContent = done;
    document.getElementById("overdueCount").textContent = overdue;
    document.getElementById("progressBar").style.width = percent + "%";
    document.getElementById("progressText").textContent = `${percent}% completed`;
    document.getElementById("message").textContent = getMessage(percent, total);
    clearBtn.style.display = done > 0 ? "inline-block" : "none";
}

function updateGreeting() {
    const hour = new Date().getHours();
    let greet;
    if (hour < 12) {
        greet = "Good morning";
    } else if (hour < 17) {
        greet = "Good afternoon";
    } else {
        greet = "Good evening";
    }
    greeting.textContent = `${greet}, ${studentName}!`;
    dateText.textContent = new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

function render() {
    renderList();
    updateStats();
}

function applyTheme(theme) {
    document.body.classList.toggle("dark", theme === "dark");
    themeBtn.textContent = theme === "dark" ? "☀️" : "🌙";
}

addBtn.addEventListener("click", addTask);

taskInput.addEventListener("keydown", event => {
    if (event.key === "Enter") addTask();
});

taskInput.addEventListener("input", () => {
    errorText.textContent = "";
});

searchInput.addEventListener("input", event => {
    searchText = event.target.value.trim().toLowerCase();
    render();
});

categoryFilter.addEventListener("change", event => {
    currentCategory = event.target.value;
    render();
});

sortSelect.addEventListener("change", event => {
    currentSort = event.target.value;
    render();
});

filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        currentFilter = btn.dataset.filter;
        filterButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        render();
    });
});

clearBtn.addEventListener("click", clearCompleted);

nameBtn.addEventListener("click", () => {
    const newName = prompt("Enter your name:", studentName);
    if (newName && newName.trim()) {
        studentName = newName.trim();
        localStorage.setItem("studentName", studentName);
        updateGreeting();
    }
});

themeBtn.addEventListener("click", () => {
    const next = document.body.classList.contains("dark") ? "light" : "dark";
    localStorage.setItem("theme", next);
    applyTheme(next);
});

document.addEventListener("keydown", event => {
    const tag = document.activeElement.tagName;
    if (event.key === "/" && tag !== "INPUT" && tag !== "SELECT") {
        event.preventDefault();
        searchInput.focus();
    }
});

applyTheme(localStorage.getItem("theme") || "light");
updateGreeting();
loadTasks();
render();