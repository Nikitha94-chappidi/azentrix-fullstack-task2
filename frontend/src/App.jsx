import React, { useState, useEffect } from 'react';
import { 
  Sun, 
  Moon, 
  LogOut, 
  Users, 
  Layers, 
  X, 
  Plus, 
  FolderGit2 
} from 'lucide-react';
import Login from './components/Login';
import Register from './components/Register';
import Board from './components/Board';
import AdminPanel from './components/AdminPanel';

// Automatically detect host to communicate with Express server
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000'
  : 'https://azentrix-trello-backend.onrender.com';

export default function App() {
  // Authentication State
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [currentUser, setCurrentUser] = useState(() => {
    const cached = localStorage.getItem('user');
    return cached ? JSON.parse(cached) : null;
  });

  // Navigation State ('login' | 'register' | 'board' | 'admin')
  const [currentView, setCurrentView] = useState(() => {
    return token ? 'board' : 'login';
  });

  // App Theme State ('light' | 'dark')
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  // Tasks & Users State
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);

  // Modal Control State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [modalError, setModalError] = useState('');

  // Modal Form State
  const [modalTitle, setModalTitle] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [modalStatus, setModalStatus] = useState('todo');
  const [modalPriority, setModalPriority] = useState('medium');
  const [modalDueDate, setModalDueDate] = useState('');
  const [modalAssigneeId, setModalAssigneeId] = useState('');

  // Initialize Theme on Mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Fetch Tasks from API
  const fetchTasks = async (silent = false) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/tasks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setTasks(data);
      } else if (response.status === 401 || response.status === 403) {
        // Automatically logout on expired or invalid token
        handleLogout();
      }
    } catch (err) {
      if (!silent) {
        console.error('Error fetching tasks:', err);
      }
    }
  };

  // Fetch Users (needed for assignees dropdown)
  const fetchUsers = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setUsers(data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  // Trigger data load on mount or token changes
  useEffect(() => {
    if (token) {
      fetchTasks();
      fetchUsers();
    }
  }, [token]);

  // Real-Time Sync Polling Loop (fetches board cards every 3 seconds)
  useEffect(() => {
    if (!token) return;

    const intervalId = setInterval(() => {
      fetchTasks(true); // silent fetch to prevent visual clutter
    }, 3000);

    return () => clearInterval(intervalId);
  }, [token]);

  // Handle successful login
  const handleLoginSuccess = (newToken, user) => {
    setToken(newToken);
    setCurrentUser(user);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(user));
    setCurrentView('board');
  };

  // Handle Logout
  const handleLogout = () => {
    setToken('');
    setCurrentUser(null);
    setTasks([]);
    setUsers([]);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentView('login');
  };

  // Toggle Dark/Light Theme
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Card status updates (drag and drop)
  const handleCardStatusChange = async (cardId, newStatus) => {
    // Optimistic Update locally
    setTasks(prev => prev.map(t => t.id === cardId ? { ...t, status: newStatus } : t));

    try {
      const response = await fetch(`${API_URL}/api/tasks/${cardId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update task status.');
      }
      
      // Update with final server value (to ensure assignee/creator names are accurate)
      setTasks(prev => prev.map(t => t.id === cardId ? data : t));
    } catch (err) {
      alert(err.message);
      // Revert status by fetching latest board state
      fetchTasks();
    }
  };

  // Open modal in Add mode
  const handleAddTaskClick = () => {
    setEditingTask(null);
    setModalError('');
    setModalTitle('');
    setModalDescription('');
    setModalStatus('todo');
    setModalPriority('medium');
    setModalDueDate('');
    setModalAssigneeId('');
    setShowTaskModal(true);
  };

  // Open modal in Edit mode
  const handleEditCardClick = (task) => {
    setEditingTask(task);
    setModalError('');
    setModalTitle(task.title);
    setModalDescription(task.description || '');
    setModalStatus(task.status);
    setModalPriority(task.priority);
    setModalDueDate(task.due_date || '');
    setModalAssigneeId(task.assignee_id ? task.assignee_id.toString() : '');
    setShowTaskModal(true);
  };

  // Delete Card Handler
  const handleDeleteCardClick = async (taskId) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this task card?');
    if (!confirmDelete) return;

    try {
      const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete task card.');
      }

      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      alert(err.message);
    }
  };

  // Submit Modal Form (Add or Edit)
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!modalTitle.trim()) {
      setModalError('Task title is required.');
      return;
    }

    const payload = {
      title: modalTitle.trim(),
      description: modalDescription,
      status: modalStatus,
      priority: modalPriority,
      due_date: modalDueDate || null,
      assignee_id: modalAssigneeId ? parseInt(modalAssigneeId) : null
    };

    try {
      let response;
      if (editingTask) {
        // Edit Task
        response = await fetch(`${API_URL}/api/tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        // Create Task
        response = await fetch(`${API_URL}/api/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save task card.');
      }

      if (editingTask) {
        setTasks(prev => prev.map(t => t.id === editingTask.id ? data : t));
      } else {
        setTasks(prev => [...prev, data]);
      }

      setShowTaskModal(false);
    } catch (err) {
      setModalError(err.message);
    }
  };

  return (
    <div className="app-container">
      {/* 1. Header Section */}
      {token && currentUser && (
        <header className="app-header">
          <div className="logo-section">
            <div className="logo-icon">
              <Layers size={22} />
            </div>
            <h1 className="logo-text">Azentrix Board</h1>
          </div>

          <div className="header-controls">
            {/* View Selector (Admin Panel Toggle) */}
            {currentUser.role === 'admin' && (
              currentView === 'admin' ? (
                <button 
                  className="btn-secondary" 
                  onClick={() => setCurrentView('board')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <FolderGit2 size={16} /> Collaboration Board
                </button>
              ) : (
                <button 
                  className="btn-secondary" 
                  onClick={() => setCurrentView('admin')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Users size={16} /> Admin Panel
                </button>
              )
            )}

            {/* Dark Mode Selector */}
            <button 
              className="theme-toggle-btn" 
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              aria-label="Toggle application theme"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* User Profile info */}
            <div className="user-badge-info">
              <div className="assignee-avatar-icon" title={`Username: ${currentUser.username}`}>
                {currentUser.username.substring(0, 2)}
              </div>
              <span style={{ fontWeight: 700 }}>{currentUser.username}</span>
              <span className={`user-role-tag ${currentUser.role}`}>
                {currentUser.role}
              </span>
            </div>

            {/* Logout button */}
            <button 
              className="btn-secondary" 
              onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <LogOut size={15} /> Logout
            </button>
          </div>
        </header>
      )}

      {/* 2. Authentication Pages (If Not Authenticated) */}
      {!token && (
        currentView === 'register' ? (
          <Register 
            API_URL={API_URL} 
            onRegisterSuccess={() => setCurrentView('login')} 
            onSwitchToLogin={() => setCurrentView('login')} 
          />
        ) : (
          <Login 
            API_URL={API_URL} 
            onLoginSuccess={handleLoginSuccess} 
            onSwitchToRegister={() => setCurrentView('register')} 
          />
        )
      )}

      {/* 3. Dashboard views (If Authenticated) */}
      {token && currentUser && (
        currentView === 'admin' && currentUser.role === 'admin' ? (
          <AdminPanel 
            API_URL={API_URL} 
            token={token} 
            currentUser={currentUser} 
            onBackToBoard={() => setCurrentView('board')} 
          />
        ) : (
          <Board 
            tasks={tasks} 
            currentUser={currentUser} 
            onCardStatusChange={handleCardStatusChange} 
            onAddTaskClick={handleAddTaskClick} 
            onEditCardClick={handleEditCardClick} 
            onDeleteCardClick={handleDeleteCardClick} 
          />
        )
      )}

      {/* 4. Task Creator / Editor Modal Dialog */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingTask ? 'Edit Task Card' : 'Create New Task'}</h3>
              <button 
                className="modal-close-btn" 
                onClick={() => setShowTaskModal(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div style={{ 
                background: 'var(--priority-high-bg)', 
                color: 'var(--priority-high)', 
                padding: '0.75rem 1rem', 
                borderRadius: '10px', 
                fontSize: '0.85rem',
                fontWeight: 500,
                border: '1px solid hsla(351, 89%, 60%, 0.2)'
              }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleModalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div className="form-group">
                <label htmlFor="task-title" className="form-label">Task Title *</label>
                <input
                  type="text"
                  id="task-title"
                  className="form-input"
                  placeholder="What needs to be done?"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="task-desc" className="form-label">Description</label>
                <textarea
                  id="task-desc"
                  className="form-textarea"
                  placeholder="Add details, links, or notes..."
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                />
              </div>

              <div className="form-input-row">
                <div className="form-group">
                  <label htmlFor="task-status" className="form-label">Status</label>
                  <select
                    id="task-status"
                    className="form-select"
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value)}
                  >
                    <option value="todo">To Do</option>
                    <option value="inprogress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="task-priority" className="form-label">Priority</label>
                  <select
                    id="task-priority"
                    className="form-select"
                    value={modalPriority}
                    onChange={(e) => setModalPriority(e.target.value)}
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              </div>

              <div className="form-input-row">
                <div className="form-group">
                  <label htmlFor="task-due" className="form-label">Due Date</label>
                  <input
                    type="date"
                    id="task-due"
                    className="form-input"
                    value={modalDueDate}
                    onChange={(e) => setModalDueDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="task-assignee" className="form-label">Assignee</label>
                  <select
                    id="task-assignee"
                    className="form-select"
                    value={modalAssigneeId}
                    onChange={(e) => setModalAssigneeId(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowTaskModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingTask ? 'Save Changes' : 'Create Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
