import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, Shield, User } from 'lucide-react';

export default function AdminPanel({ API_URL, token, currentUser, onBackToBoard }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users list.');
      }
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, currentRole) => {
    setError('');
    setSuccess('');
    const newRole = currentRole === 'admin' ? 'member' : 'admin';

    if (userId === currentUser.id) {
      setError('You cannot demote yourself from the admin role.');
      return;
    }

    const confirmChange = window.confirm(`Are you sure you want to change this user's role to ${newRole}?`);
    if (!confirmChange) return;

    try {
      const response = await fetch(`${API_URL}/api/users/${userId}/role`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user role.');
      }

      setSuccess('User role updated successfully.');
      // Refresh local list state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    setError('');
    setSuccess('');

    if (userId === currentUser.id) {
      setError('You cannot delete your own admin account.');
      return;
    }

    const confirmDelete = window.confirm(`Are you sure you want to permanently delete the user account: "${userName}"? This will also remove any cards created by this user.`);
    if (!confirmDelete) return;

    try {
      const response = await fetch(`${API_URL}/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user account.');
      }

      setSuccess('User account deleted successfully.');
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-panel-card">
      <div className="admin-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn-link" onClick={onBackToBoard} aria-label="Go back to board dashboard">
            <ArrowLeft size={20} /> Back to Board
          </button>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800 }}>User Management Panel</h2>
        </div>
        <span className="user-role-tag admin" style={{ fontSize: '0.8rem' }}>Admin Settings</span>
      </div>

      {error && (
        <div style={{ 
          background: 'var(--priority-high-bg)', 
          color: 'var(--priority-high)', 
          padding: '0.75rem 1rem', 
          borderRadius: '10px', 
          fontSize: '0.85rem',
          fontWeight: 500,
          marginBottom: '1.25rem',
          border: '1px solid hsla(351, 89%, 60%, 0.2)'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ 
          background: 'var(--priority-low-bg)', 
          color: 'var(--priority-low)', 
          padding: '0.75rem 1rem', 
          borderRadius: '10px', 
          fontSize: '0.85rem',
          fontWeight: 500,
          marginBottom: '1.25rem',
          border: '1px solid hsla(210, 80%, 45%, 0.2)'
        }}>
          {success}
        </div>
      )}

      {loading && users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          Loading users list...
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
          <table className="users-list-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Privileges</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td data-label="Username" style={{ fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {u.role === 'admin' ? <Shield size={16} className="text-secondary" style={{ color: 'hsl(280, 85%, 55%)' }} /> : <User size={16} />}
                      {u.username} {u.id === currentUser.id && <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(You)</span>}
                    </div>
                  </td>
                  <td data-label="Role">
                    <span className={`user-role-tag ${u.role}`}>
                      {u.role}
                    </span>
                  </td>
                  <td data-label="Privileges">
                    {u.id === currentUser.id ? (
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Protected Account</span>
                    ) : (
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={() => handleRoleChange(u.id, u.role)}
                      >
                        Promote / Demote
                      </button>
                    )}
                  </td>
                  <td data-label="Actions" style={{ textAlign: 'right' }}>
                    {u.id !== currentUser.id && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn-danger"
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          title={`Delete account of ${u.username}`}
                        >
                          <Trash2 size={14} /> Delete Account
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
