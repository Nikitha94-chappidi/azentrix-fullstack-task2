# Azentrix Task Collaboration System (Mini Trello)

A lightweight, self-hostable, multi-user task management and collaboration tool. Perfect for small remote teams looking for a simple, fast, and secure tool without bloating overhead or subscription fees.

## Features

- **Draggable Kanban Board**: Manage tasks through standard statuses (`To Do`, `In Progress`, `Done`) with fluid HTML5 drag-and-drop mechanics.
- **Detailed Card Customization**: Support for Title, Description, Priority Tag (`Low`, `Medium`, `High`), Due Date, and team assignees.
- **Secure Authentication**: User signup, login, and sessions powered by JSON Web Tokens (JWT) and `bcrypt` password hashing.
- **Role-Based Access Control (RBAC)**:
  - **Admins**: Can manage all tasks, view the team database, change member privilege levels, and delete user accounts.
  - **Members**: Can only edit task cards they created or are assigned to, and delete cards they created.
- **Real-Time Collaboration**: Near real-time synchronization between clients using active polling (3-second background updates).
- **Responsive Dark Mode**: Curated dark and light mode UI featuring custom Google Fonts (`Inter`, `Outfit`), gradients, and micro-animations.

---

## Tech Stack

- **Frontend**: React (Vite), Vanilla CSS (Custom Variable themes), Lucide Icons
- **Backend**: Node.js, Express, JSON Web Tokens (JWT), BcryptJS
- **Database**: SQLite3 (Local filesystem relational storage)

---

## Setup & Running Locally

Ensure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### 1. Run the Backend API Server
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm run dev
   ```
   *The server runs on **http://localhost:5000**. On startup, it automatically creates the SQLite database (`database.sqlite`) and seeds default test roles.*

### Seeded Credentials:
- **Admin Account**: `admin` / `admin123`
- **Member Account**: `member` / `member123`

---

### 2. Run the Frontend Development Server
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite server:
   ```bash
   npm run dev
   ```
   *Open **http://localhost:5173** (or the address printed in terminal) in your browser.*

---

## Technical Approach

### 1. Authentication
Authentication is session-based utilizing JWTs sent in the `Authorization: Bearer <TOKEN>` header of API queries. Credentials are encrypted using `bcrypt` (10 rounds). The frontend stores the token in `localStorage` so sessions persist across browser page reloads.

### 2. Real-Time Board Synchronization
Real-time board synchronization is accomplished using a background polling hook in the React root client. If a token is detected, the frontend triggers a silent fetch to `GET /api/tasks` every 3000ms. This keeps board state updated across clients without the complexity or connection state fragility of WebSockets.

### 3. Role-Based Permissions (RBAC)
Database schemas track a task's `creator_id` and `assignee_id`.
- The backend checks the user's role and ID before modifying data:
  - Updates require the requester to be an `admin`, the task's creator, or the assignee.
  - Deletions require the requester to be an `admin` or the task's creator.
- The frontend dynamically disables card dragging (`draggable={canEdit}`) and hides buttons based on permissions.
- Only users with the `admin` role can retrieve team lists (`GET /api/users`) and perform user role edits or deletions.

---

## Deployment

To host this application in production:
1. **Frontend**: Build the static assets using `npm run build` and deploy to a free CDN static host (e.g. Vercel, Netlify).
2. **Backend**: Deploy the Node/Express backend to Render or Railway. Set environment variables:
   - `PORT`: Server port
   - `JWT_SECRET`: Secure encryption key
3. Ensure the frontend connects to the deployed backend URL by adjusting the endpoint config.
