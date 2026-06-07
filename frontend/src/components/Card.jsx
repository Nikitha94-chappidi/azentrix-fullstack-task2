import React from 'react';
import { Calendar, Edit3, Trash2, UserCheck } from 'lucide-react';

export default function Card({ task, currentUser, onEditClick, onDeleteClick }) {
  
  // Format Date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // RBAC Permission Checkers
  const isAdmin = currentUser.role === 'admin';
  const isCreator = task.creator_id === currentUser.id;
  const isAssignee = task.assignee_id === currentUser.id;

  // Members can edit cards they created OR are assigned to
  const canEdit = isAdmin || isCreator || isAssignee;
  // Members can ONLY delete cards they created
  const canDelete = isAdmin || isCreator;

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', task.id.toString());
    e.dataTransfer.effectAllowed = 'move';
    
    // Add dragging visual class after a tiny timeout so the dragged ghost image remains solid
    setTimeout(() => {
      e.target.classList.add('dragging');
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
  };

  return (
    <div 
      className={`task-card priority-${task.priority}`}
      draggable={canEdit} // Only draggable if user is allowed to edit it
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDoubleClick={() => canEdit && onEditClick(task)}
      style={{ cursor: canEdit ? 'grab' : 'not-allowed' }}
      title={canEdit ? 'Double-click to edit or drag to move' : 'View-only card'}
    >
      <div className="task-card-header">
        <span className={`task-priority-tag ${task.priority}`}>{task.priority}</span>
        
        <div style={{ display: 'flex', gap: '0.15rem' }}>
          {canEdit && (
            <button 
              className="action-btn edit" 
              onClick={(e) => {
                e.stopPropagation();
                onEditClick(task);
              }}
              title="Edit Task Details"
              style={{ width: '26px', height: '26px' }}
            >
              <Edit3 size={12} />
            </button>
          )}
          {canDelete && (
            <button 
              className="action-btn delete" 
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClick(task.id);
              }}
              title="Delete Task Card"
              style={{ width: '26px', height: '26px' }}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="task-card-title">{task.title}</div>
      
      {task.description && (
        <p className="task-card-desc">{task.description}</p>
      )}

      {/* Meta specs row */}
      <div className="task-card-meta">
        {task.due_date && (
          <div className="task-meta-item" title={`Due: ${formatDate(task.due_date)}`}>
            <Calendar size={11} />
            <span>{formatDate(task.due_date)}</span>
          </div>
        )}
        
        <div className="task-meta-item" title={`Created by: ${task.creator_name}`}>
          <span>By: {task.creator_name}</span>
        </div>
      </div>

      {/* Assignee / Footer */}
      <div className="task-card-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {task.assignee_id ? (
            <>
              <div 
                className="assignee-avatar-icon" 
                title={`Assigned to: ${task.assignee_name}`}
              >
                {task.assignee_name.substring(0, 2)}
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                {task.assignee_name}
              </span>
            </>
          ) : (
            <span className="assignee-empty-text">Unassigned</span>
          )}
        </div>
        
        {isAssignee && (
          <div 
            title="You are assigned to this task" 
            style={{ color: 'hsl(252, 90%, 65%)', display: 'flex', alignItems: 'center' }}
          >
            <UserCheck size={14} />
          </div>
        )}
      </div>
    </div>
  );
}
