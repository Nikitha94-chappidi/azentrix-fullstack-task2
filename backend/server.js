const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'azentrix-task2-trello-secret-token';

app.use(cors());
app.use(express.json());

// Initialize Database Connection
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    initializeTables();
  }
});

// Create tables and seed default users
function initializeTables() {
  db.serialize(() => {
    // 1. Users Table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'member'
      )
    `);

    // 2. Tasks Table
    db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'todo',
        priority TEXT DEFAULT 'medium',
        due_date TEXT,
        creator_id INTEGER NOT NULL,
        assignee_id INTEGER,
        FOREIGN KEY(creator_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(assignee_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Seed default Admin & Member if users table is empty
    db.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
      if (err) return console.error('Error seeding check:', err.message);
      
      if (row.count === 0) {
        console.log('Seeding initial database roles...');
        const salt = bcrypt.genSaltSync(10);
        
        // Admin user: admin / admin123
        const adminHash = bcrypt.hashSync('admin123', salt);
        db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['admin', adminHash, 'admin']);
        
        // Member user: member / member123
        const memberHash = bcrypt.hashSync('member123', salt);
        db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['member', memberHash, 'member']);
        
        console.log('Database seeded successfully:');
        console.log(' -> Admin: admin / admin123');
        console.log(' -> Member: member / member123');
      }
    });
  });
}

// ==========================================
// Authentication Middleware
// ==========================================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <TOKEN>
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ error: 'Token is invalid or expired. Please re-authenticate.' });
    }
    req.user = decodedUser;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden: Admin privilege is required.' });
  }
}

// ==========================================
// Auth Routes
// ==========================================

// Register
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password || username.trim().length < 3 || password.length < 5) {
    return res.status(400).json({ error: 'Username (min 3 chars) and password (min 5 chars) are required.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);

  db.run(
    "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
    [username.trim().toLowerCase(), hash, 'member'],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Username is already taken.' });
        }
        return res.status(500).json({ error: 'Database error. Please try again.' });
      }
      res.status(201).json({ message: 'Registration successful! You can now log in.' });
    }
  );
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  db.get(
    "SELECT * FROM users WHERE username = ?",
    [username.trim().toLowerCase()],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Server error during database query.' });
      }
      
      if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    }
  );
});

// ==========================================
// User Management Routes (Admin Only)
// ==========================================

// List Users (needed for assignee dropdowns & Admin panel)
app.get('/api/users', authenticateToken, (req, res) => {
  db.all("SELECT id, username, role FROM users ORDER BY username ASC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to retrieve users.' });
    }
    res.json(rows);
  });
});

// Update User Role (Admin Only)
app.put('/api/users/:id/role', authenticateToken, requireAdmin, (req, res) => {
  const { role } = req.body;
  const targetUserId = parseInt(req.params.id);

  if (targetUserId === req.user.id) {
    return res.status(400).json({ error: 'You cannot change your own role.' });
  }

  if (role !== 'admin' && role !== 'member') {
    return res.status(400).json({ error: 'Invalid role specifier.' });
  }

  db.run(
    "UPDATE users SET role = ? WHERE id = ?",
    [role, targetUserId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update user role.' });
      }
      res.json({ message: 'User role updated successfully.' });
    }
  );
});

// Delete User (Admin Only)
app.delete('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const targetUserId = parseInt(req.params.id);

  if (targetUserId === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own admin account.' });
  }

  db.run("DELETE FROM users WHERE id = ?", [targetUserId], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete user.' });
    }
    res.json({ message: 'User deleted successfully.' });
  });
});

// ==========================================
// Task / Card Routes
// ==========================================

// Get all tasks (collaboration dashboard)
app.get('/api/tasks', authenticateToken, (req, res) => {
  const query = `
    SELECT 
      t.id, t.title, t.description, t.status, t.priority, t.due_date,
      t.creator_id, u1.username as creator_name,
      t.assignee_id, u2.username as assignee_name
    FROM tasks t
    JOIN users u1 ON t.creator_id = u1.id
    LEFT JOIN users u2 ON t.assignee_id = u2.id
    ORDER BY t.id ASC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to retrieve task cards.' });
    }
    res.json(rows);
  });
});

// Create task
app.post('/api/tasks', authenticateToken, (req, res) => {
  const { title, description, status, priority, due_date, assignee_id } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Task title is required.' });
  }

  const taskStatus = status || 'todo';
  const taskPriority = priority || 'medium';
  const creatorId = req.user.id;

  db.run(
    `INSERT INTO tasks (title, description, status, priority, due_date, creator_id, assignee_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title.trim(), description || '', taskStatus, taskPriority, due_date || '', creatorId, assignee_id || null],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create task card.' });
      }
      
      const newTaskId = this.lastID;
      // Fetch the full task with user mappings to send back
      const fetchQuery = `
        SELECT 
          t.id, t.title, t.description, t.status, t.priority, t.due_date,
          t.creator_id, u1.username as creator_name,
          t.assignee_id, u2.username as assignee_name
        FROM tasks t
        JOIN users u1 ON t.creator_id = u1.id
        LEFT JOIN users u2 ON t.assignee_id = u2.id
        WHERE t.id = ?
      `;
      db.get(fetchQuery, [newTaskId], (err, row) => {
        if (err) return res.status(201).json({ id: newTaskId });
        res.status(201).json(row);
      });
    }
  );
});

// Update task card (drag, edit values)
app.put('/api/tasks/:id', authenticateToken, (req, res) => {
  const taskId = parseInt(req.params.id);
  const { title, description, status, priority, due_date, assignee_id } = req.body;

  // Retrieve the task first for RBAC verification
  db.get("SELECT * FROM tasks WHERE id = ?", [taskId], (err, task) => {
    if (err) {
      return res.status(500).json({ error: 'Database lookup failure.' });
    }
    if (!task) {
      return res.status(404).json({ error: 'Task card not found.' });
    }

    // RBAC: Members can ONLY manage task cards they created or are assigned to
    const isAdmin = req.user.role === 'admin';
    const isCreator = task.creator_id === req.user.id;
    const isAssignee = task.assignee_id === req.user.id;

    if (!isAdmin && !isCreator && !isAssignee) {
      return res.status(403).json({ 
        error: 'Access Denied: Members can only update cards they created or are assigned to.' 
      });
    }

    // Build update parameters (fallback to current database values if not provided)
    const newTitle = title !== undefined ? title.trim() : task.title;
    const newDesc = description !== undefined ? description : task.description;
    const newStatus = status !== undefined ? status : task.status;
    const newPriority = priority !== undefined ? priority : task.priority;
    const newDueDate = due_date !== undefined ? due_date : task.due_date;
    const newAssigneeId = assignee_id !== undefined ? (assignee_id || null) : task.assignee_id;

    if (!newTitle) {
      return res.status(400).json({ error: 'Task title cannot be empty.' });
    }

    const updateQuery = `
      UPDATE tasks 
      SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, assignee_id = ?
      WHERE id = ?
    `;

    db.run(
      updateQuery,
      [newTitle, newDesc, newStatus, newPriority, newDueDate, newAssigneeId, taskId],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to update task card.' });
        }

        // Fetch and return the updated task
        const fetchQuery = `
          SELECT 
            t.id, t.title, t.description, t.status, t.priority, t.due_date,
            t.creator_id, u1.username as creator_name,
            t.assignee_id, u2.username as assignee_name
          FROM tasks t
          JOIN users u1 ON t.creator_id = u1.id
          LEFT JOIN users u2 ON t.assignee_id = u2.id
          WHERE t.id = ?
        `;
        db.get(fetchQuery, [taskId], (err, row) => {
          if (err) return res.json({ id: taskId });
          res.json(row);
        });
      }
    );
  });
});

// Delete task card
app.delete('/api/tasks/:id', authenticateToken, (req, res) => {
  const taskId = parseInt(req.params.id);

  db.get("SELECT * FROM tasks WHERE id = ?", [taskId], (err, task) => {
    if (err) {
      return res.status(500).json({ error: 'Database lookup failure.' });
    }
    if (!task) {
      return res.status(404).json({ error: 'Task card not found.' });
    }

    // RBAC: Members can ONLY delete task cards they created
    const isAdmin = req.user.role === 'admin';
    const isCreator = task.creator_id === req.user.id;

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ 
        error: 'Access Denied: Members can only delete task cards that they created.' 
      });
    }

    db.run("DELETE FROM tasks WHERE id = ?", [taskId], function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete task card.' });
      }
      res.json({ message: 'Task card deleted successfully.' });
    });
  });
});

// Start express server listener
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`Azentrix Task Collaboration Backend API Server`);
  console.log(`Running on: http://localhost:${PORT}`);
  console.log(`SQLite DB:  ${dbPath}`);
  console.log(`===================================================`);
});
