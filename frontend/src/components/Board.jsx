import React, { useState } from 'react';
import Card from './Card';
import { Plus, CheckSquare, Clock, ListTodo } from 'lucide-react';

const COLUMNS = [
  { id: 'todo', title: 'To Do', icon: <ListTodo size={18} /> },
  { id: 'inprogress', title: 'In Progress', icon: <Clock size={18} /> },
  { id: 'done', title: 'Done', icon: <CheckSquare size={18} /> }
];

export default function Board({ 
  tasks, 
  currentUser, 
  onCardStatusChange, 
  onAddTaskClick, 
  onEditCardClick, 
  onDeleteCardClick 
}) {
  const [activeOverCol, setActiveOverCol] = useState(null);

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    setActiveOverCol(colId);
  };

  const handleDragLeave = () => {
    setActiveOverCol(null);
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    setActiveOverCol(null);
    
    const cardIdStr = e.dataTransfer.getData('text/plain');
    const cardId = parseInt(cardIdStr);

    if (isNaN(cardId)) return;

    // Find the task to see if status actually changed
    const task = tasks.find(t => t.id === cardId);
    if (task && task.status !== targetStatus) {
      onCardStatusChange(cardId, targetStatus);
    }
  };

  // Group tasks by column status
  const getTasksByStatus = (status) => {
    return tasks.filter(t => t.status === status);
  };

  return (
    <div className="board-container">
      {COLUMNS.map((col) => {
        const colTasks = getTasksByStatus(col.id);
        const isOver = activeOverCol === col.id;

        return (
          <div 
            key={col.id} 
            className={`board-column ${isOver ? 'drag-over' : ''}`}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            {/* Column Title Header */}
            <div className="column-header">
              <div className="column-title-row">
                <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center' }}>
                  {col.icon}
                </span>
                <h3 className="column-title">{col.title}</h3>
                <span className="column-card-count">{colTasks.length}</span>
              </div>
              
              {col.id === 'todo' && (
                <button 
                  className="action-btn edit" 
                  onClick={onAddTaskClick} 
                  title="Create New Task Card"
                  style={{ width: '28px', height: '28px', borderRadius: '50%' }}
                >
                  <Plus size={16} />
                </button>
              )}
            </div>

            {/* Draggable Cards Wrapper */}
            <div className="column-cards-wrapper">
              {colTasks.length > 0 ? (
                colTasks.map((task) => (
                  <Card
                    key={task.id}
                    task={task}
                    currentUser={currentUser}
                    onEditClick={onEditCardClick}
                    onDeleteClick={onDeleteCardClick}
                  />
                ))
              ) : (
                <div className="column-empty-card-placeholder">
                  {col.id === 'todo' ? 'Click "+" above to add tasks' : 'Drag task cards here'}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
