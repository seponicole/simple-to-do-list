class TaskManager {
  constructor() {
    this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    this.currentFilter = 'all';
    this.currentSort = 'date';
    this.isDarkTheme = localStorage.getItem('darkTheme') !== 'false';
    
    this.initializeElements();
    this.setupEventListeners();
    this.applyTheme();
    this.render();
    this.updateStats();
  }

  initializeElements() {
    this.taskInput = document.getElementById('taskInput');
    this.colorInput = document.getElementById('colorInput');
    this.priorityInput = document.getElementById('priorityInput');
    this.addTaskBtn = document.getElementById('addTaskBtn');
    this.taskList = document.getElementById('taskList');
    this.emptyState = document.getElementById('emptyState');
    this.themeToggle = document.getElementById('themeToggle');
    this.filterBtns = document.querySelectorAll('.filter-btn');
    this.sortBy = document.getElementById('sortBy');
    this.clearCompleted = document.getElementById('clearCompleted');
    this.fabBtn = document.getElementById('fabBtn');
    this.toastContainer = document.getElementById('toastContainer');
    
    // Stats elements
    this.totalTasks = document.getElementById('totalTasks');
    this.completedTasks = document.getElementById('completedTasks');
    this.pendingTasks = document.getElementById('pendingTasks');
    this.taskCount = document.getElementById('taskCount');
  }

  setupEventListeners() {
    // Add task
    this.addTaskBtn.addEventListener('click', () => this.addTask());
    this.fabBtn.addEventListener('click', () => this.focusInput());
    this.taskInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addTask();
    });

    // Theme toggle
    this.themeToggle.addEventListener('click', () => this.toggleTheme());

    // Filters
    this.filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.setFilter(e.target.dataset.filter));
    });

    // Sort
    this.sortBy.addEventListener('change', (e) => this.setSortBy(e.target.value));

    // Clear completed
    this.clearCompleted.addEventListener('click', () => this.clearCompletedTasks());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
  }

  addTask() {
    const text = this.taskInput.value.trim();
    const color = this.colorInput.value;
    const priority = this.priorityInput.value;

    if (!text) {
      this.showToast('Please enter a task!', 'error');
      this.taskInput.focus();
      return;
    }

    const task = {
      id: Date.now(),
      text,
      color,
      priority,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    this.tasks.unshift(task);
    this.taskInput.value = '';
    this.save();
    this.render();
    this.updateStats();
    this.showToast('Task added successfully!');

    // Add animation
    setTimeout(() => {
      const newTaskElement = this.taskList.firstElementChild;
      if (newTaskElement) {
        newTaskElement.style.animation = 'none';
        newTaskElement.offsetHeight; // Force reflow
        newTaskElement.style.animation = 'taskSlideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
      }
    }, 10);
  }

  toggleTask(id) {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      task.completedAt = task.completed ? new Date().toISOString() : null;
      this.save();
      this.render();
      this.updateStats();
      
      const action = task.completed ? 'completed' : 'uncompleted';
      this.showToast(`Task ${action}!`);
    }
  }

  editTask(id) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return;

    const newText = prompt('Edit task:', task.text);
    if (newText !== null && newText.trim()) {
      task.text = newText.trim();
      this.save();
      this.render();
      this.showToast('Task updated!');
    }
  }

  deleteTask(id) {
    if (confirm('Are you sure you want to delete this task?')) {
      this.tasks = this.tasks.filter(t => t.id !== id);
      this.save();
      this.render();
      this.updateStats();
      this.showToast('Task deleted!');
    }
  }

  setFilter(filter) {
    this.currentFilter = filter;
    this.filterBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    this.render();
  }

  setSortBy(sortBy) {
    this.currentSort = sortBy;
    this.render();
  }

  clearCompletedTasks() {
    const completedCount = this.tasks.filter(t => t.completed).length;
    if (completedCount === 0) {
      this.showToast('No completed tasks to clear!', 'error');
      return;
    }

    if (confirm(`Delete ${completedCount} completed task(s)?`)) {
      this.tasks = this.tasks.filter(t => !t.completed);
      this.save();
      this.render();
      this.updateStats();
      this.showToast(`${completedCount} completed task(s) cleared!`);
    }
  }

  getFilteredAndSortedTasks() {
    let filtered = [...this.tasks];

    // Apply filter
    switch (this.currentFilter) {
      case 'pending':
        filtered = filtered.filter(t => !t.completed);
        break;
      case 'completed':
        filtered = filtered.filter(t => t.completed);
        break;
    }

    // Apply sort
    switch (this.currentSort) {
      case 'priority':
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.text.localeCompare(b.text));
        break;
      case 'date':
      default:
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }

    return filtered;
  }

  render() {
    const tasks = this.getFilteredAndSortedTasks();
    
    if (tasks.length === 0) {
      this.taskList.style.display = 'none';
      this.emptyState.style.display = 'block';
    } else {
      this.taskList.style.display = 'block';
      this.emptyState.style.display = 'none';
    }

    this.taskList.innerHTML = tasks.map(task => this.createTaskHTML(task)).join('');
    
    tasks.forEach(task => {
      const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
      if (taskElement) {
        this.setupTaskEventListeners(taskElement, task);
      }
    });
  }

  createTaskHTML(task) {
    const createdDate = new Date(task.createdAt).toLocaleDateString();
    const timeAgo = this.getTimeAgo(task.createdAt);
    
    return `
      <li class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
        <div class="task-checkbox ${task.completed ? 'checked' : ''}" data-action="toggle">
          ${task.completed ? '<span class="material-icons-outlined" style="font-size: 14px;">check</span>' : ''}
        </div>
        <div class="task-color" style="background-color: ${task.color}"></div>
        <div class="task-content">
          <div class="task-text">${this.escapeHTML(task.text)}</div>
          <div class="task-meta">
            <span class="priority-badge priority-${task.priority}">${task.priority}</span>
            <span>${timeAgo}</span>
          </div>
        </div>
        <div class="task-actions">
          <button class="task-btn edit" data-action="edit" title="Edit task">
            <span class="material-icons-outlined" style="font-size: 16px;">edit</span>
          </button>
          <button class="task-btn delete" data-action="delete" title="Delete task">
            <span class="material-icons-outlined" style="font-size: 16px;">delete</span>
          </button>
        </div>
      </li>
    `;
  }

  setupTaskEventListeners(taskElement, task) {
    taskElement.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      
      switch (action) {
        case 'toggle':
          this.toggleTask(task.id);
          break;
        case 'edit':
          this.editTask(task.id);
          break;
        case 'delete':
          this.deleteTask(task.id);
          break;
      }
    });
  }

  updateStats() {
    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.completed).length;
    const pending = total - completed;

    this.totalTasks.textContent = total;
    this.completedTasks.textContent = completed;
    this.pendingTasks.textContent = pending;
    this.taskCount.textContent = total;

    // Update page title with pending count
    //document.title = `TaskFlow Pro ${pending > 0 ? `(${pending})` : ''}`;
  }

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
    this.applyTheme();
    localStorage.setItem('darkTheme', this.isDarkTheme);
  }

  applyTheme() {
    document.body.classList.toggle('light-theme', !this.isDarkTheme);
    const icon = this.themeToggle.querySelector('.material-icons-outlined');
    icon.textContent = this.isDarkTheme ? 'light_mode' : 'dark_mode';
  }

  focusInput() {
    this.taskInput.focus();
  }

  handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + K to focus input
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      this.focusInput();
    }
    
    // Ctrl/Cmd + D to toggle theme
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      this.toggleTheme();
    }
  }

  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    this.toastContainer.appendChild(toast);
    
    
    setTimeout(() => {
      toast.style.animation = 'toastSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  save() {
    localStorage.setItem('tasks', JSON.stringify(this.tasks));
  }
}


document.addEventListener('DOMContentLoaded', () => {
  new TaskManager();
});


const style = document.createElement('style');
style.textContent = `
  .task-item {
    transform: translateX(0);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .task-item.removing {
    transform: translateX(-100%);
    opacity: 0;
  }
`;
document.head.appendChild(style);
