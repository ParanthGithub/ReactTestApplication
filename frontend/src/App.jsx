import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Check, 
  CheckCircle, 
  Clock, 
  ListTodo, 
  Plus, 
  Server, 
  Trash2, 
  TrendingUp, 
  AlertTriangle 
} from 'lucide-react';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('General');
  
  // Health & Connection Diagnostics
  const [isConnected, setIsConnected] = useState(false);
  const [healthData, setHealthData] = useState(null);
  const [latency, setLatency] = useState(null);
  const [latencyHistory, setLatencyHistory] = useState(Array(15).fill(0));
  
  // Ref to prevent overlapping fetches
  const isFetchingHealth = useRef(false);

  // Fetch all tasks
  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      setTasks(data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Check connection status & get server stats
  const checkServerHealth = async () => {
    if (isFetchingHealth.current) return;
    isFetchingHealth.current = true;
    
    const startTime = Date.now();
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      if (!response.ok) throw new Error('Health check response invalid');
      const data = await response.json();
      
      const endTime = Date.now();
      const currentLatency = endTime - startTime;
      
      setLatency(currentLatency);
      setLatencyHistory(prev => {
        const nextHistory = [...prev.slice(1), currentLatency];
        return nextHistory;
      });
      
      setHealthData(data);
      setIsConnected(true);
    } catch (err) {
      setIsConnected(false);
      setLatency(null);
      setHealthData(null);
      setLatencyHistory(prev => [...prev.slice(1), 0]);
      console.warn('Backend server is unreachable.');
    } finally {
      isFetchingHealth.current = false;
    }
  };

  // Initialize and schedule health checks and fetch initial data
  useEffect(() => {
    fetchTasks();
    checkServerHealth();
    
    // Poll server health every 3 seconds for diagnostic updates
    const healthInterval = setInterval(checkServerHealth, 3000);
    
    // Poll tasks occasionally in case of edits elsewhere
    const tasksInterval = setInterval(fetchTasks, 10000);

    return () => {
      clearInterval(healthInterval);
      clearInterval(tasksInterval);
    };
  }, []);

  // Sync tasks on connection restoration
  useEffect(() => {
    if (isConnected) {
      fetchTasks();
    }
  }, [isConnected]);

  // Add Task
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle,
          category: newTaskCategory
        })
      });

      if (!response.ok) throw new Error('Failed to create task');
      const createdTask = await response.json();
      setTasks(prev => [...prev, createdTask]);
      setNewTaskTitle('');
    } catch (err) {
      alert('Error adding task. Is the server running?');
    }
  };

  // Toggle Task Completion Status
  const handleToggleTask = async (id, currentCompleted) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !currentCompleted })
      });

      if (!response.ok) throw new Error('Failed to toggle task');
      const updatedTask = await response.json();
      setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
    } catch (err) {
      alert('Error updating task. Is the server running?');
    }
  };

  // Delete Task
  const handleDeleteTask = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete task');
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      alert('Error deleting task. Is the server running?');
    }
  };

  // Calculate Metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // Format uptime to hh:mm:ss
  const formatUptime = (seconds) => {
    if (!seconds) return '00:00:00';
    const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  // Format latency values for rendering
  const maxHistoryLatency = Math.max(...latencyHistory, 50) || 50;
  const averageLatency = Math.round(
    latencyHistory.filter(l => l > 0).reduce((acc, curr) => acc + curr, 0) / 
    (latencyHistory.filter(l => l > 0).length || 1)
  );

  return (
    <div className="app-wrapper">
      {/* Header section */}
      <header className="dashboard-header">
        <div className="header-title-section">
          <h1>
            <Activity size={32} /> Quantum Hub
          </h1>
          <p>Task Control & Server Diagnostics Dashboard</p>
        </div>
        
        <div className={`connection-badge ${isConnected ? 'connected' : 'disconnected'}`}>
          <span className="status-dot"></span>
          <span>{isConnected ? 'API CONNECTED' : 'OFFLINE'}</span>
          {isConnected && latency !== null && (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '0.25rem' }}>
              ({latency}ms)
            </span>
          )}
        </div>
      </header>

      {/* Grid structure */}
      <main className="dashboard-grid">
        
        {/* Stats Cards Section */}
        <section className="stats-container">
          <div className="glass-card stat-card">
            <div className="stat-info">
              <span className="stat-label">Total Tasks</span>
              <span className="stat-value">{loading ? '...' : totalTasks}</span>
            </div>
            <div className="stat-icon-wrapper">
              <ListTodo size={24} />
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-info">
              <span className="stat-label">Completed</span>
              <span className="stat-value">{loading ? '...' : completedTasks}</span>
            </div>
            <div className="stat-icon-wrapper">
              <CheckCircle size={24} />
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-info">
              <span className="stat-label">Pending</span>
              <span className="stat-value">{loading ? '...' : pendingTasks}</span>
            </div>
            <div className="stat-icon-wrapper">
              <Clock size={24} />
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-info">
              <span className="stat-label">Completion</span>
              <span className="stat-value">{loading ? '...' : `${completionRate}%`}</span>
            </div>
            <div className="stat-icon-wrapper">
              <TrendingUp size={24} />
            </div>
          </div>
        </section>

        {/* Server Health Panel */}
        <section className="glass-card health-panel">
          <div className="panel-header">
            <Server size={20} />
            <h2>Server Diagnostics</h2>
          </div>

          {isConnected && healthData ? (
            <div className="diagnostic-metrics">
              <div className="metric-row">
                <div className="metric-meta">
                  <span className="metric-name">Server Status</span>
                  <span className="metric-value" style={{ color: 'var(--accent-success)' }}>
                    {healthData.status.toUpperCase()}
                  </span>
                </div>
                <div className="metric-bar-bg">
                  <div className="metric-bar-fill" style={{ width: '100%', background: 'var(--accent-success)' }}></div>
                </div>
              </div>

              <div className="metric-row">
                <div className="metric-meta">
                  <span className="metric-name">Uptime</span>
                  <span className="metric-value">{formatUptime(healthData.uptime)}</span>
                </div>
              </div>

              <div className="metric-row">
                <div className="metric-meta">
                  <span className="metric-name">Mock CPU Usage</span>
                  <span className="metric-value">{healthData.cpuUsage}</span>
                </div>
                <div className="metric-bar-bg">
                  <div 
                    className="metric-bar-fill" 
                    style={{ 
                      width: healthData.cpuUsage, 
                      background: parseFloat(healthData.cpuUsage) > 75 ? 'var(--accent-danger)' : 'linear-gradient(90deg, var(--accent-secondary), var(--accent-primary))' 
                    }}
                  ></div>
                </div>
              </div>

              <div className="metric-row">
                <div className="metric-meta">
                  <span className="metric-name">RAM Usage</span>
                  <span className="metric-value">{healthData.memoryUsage}</span>
                </div>
              </div>

              {/* Latency History */}
              <div className="latency-history-section">
                <div className="latency-title-row">
                  <span className="latency-history-label">Ping History</span>
                  <span className="latency-avg">avg: {averageLatency}ms</span>
                </div>
                
                <div className="latency-bars">
                  {latencyHistory.map((val, idx) => {
                    const heightPercent = val > 0 ? (val / maxHistoryLatency) * 100 : 2;
                    return (
                      <div 
                        key={idx} 
                        className="latency-bar" 
                        style={{ 
                          height: `${Math.max(heightPercent, 4)}%`,
                          opacity: val > 0 ? 0.35 + (heightPercent / 150) : 0.1,
                          backgroundColor: val === 0 ? 'var(--accent-danger)' : 'var(--accent-primary)'
                        }}
                        title={val > 0 ? `${val}ms` : 'No Ping'}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <AlertTriangle size={36} color="var(--accent-danger)" />
              <p style={{ fontWeight: 600 }}>Diagnostics Unreachable</p>
              <p style={{ fontSize: '0.85rem' }}>Start the Node.js backend to restore real-time polling.</p>
            </div>
          )}
        </section>

        {/* Tasks Panel */}
        <section className="glass-card tasks-panel">
          <div className="panel-header">
            <ListTodo size={20} />
            <h2>Task Operations</h2>
          </div>

          {/* Add Task Form */}
          <form className="task-form" onSubmit={handleAddTask}>
            <div className="task-input-wrapper">
              <input 
                type="text" 
                className="task-input" 
                placeholder="Create new task..."
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                disabled={!isConnected}
              />
            </div>
            
            <select 
              className="task-select"
              value={newTaskCategory}
              onChange={e => setNewTaskCategory(e.target.value)}
              disabled={!isConnected}
            >
              <option value="General">General</option>
              <option value="Frontend">Frontend</option>
              <option value="Backend">Backend</option>
              <option value="Diagnostics">Diagnostics</option>
              <option value="Security">Security</option>
            </select>

            <button type="submit" className="btn-add" disabled={!isConnected || !newTaskTitle.trim()}>
              <Plus size={18} />
              <span>Add</span>
            </button>
          </form>

          {/* Task List */}
          {loading ? (
            <div className="spinner-container">
              <div className="spinner"></div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              <ListTodo size={40} />
              <p>No tasks configured yet</p>
              <p style={{ fontSize: '0.85rem' }}>Create one above to get started.</p>
            </div>
          ) : (
            <div className="tasks-list-container">
              {tasks.map(task => (
                <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                  <div className="task-item-left">
                    <div 
                      className="checkbox-custom" 
                      onClick={() => handleToggleTask(task.id, task.completed)}
                    >
                      <Check size={12} strokeWidth={3} style={{ display: task.completed ? 'block' : 'none' }} />
                    </div>
                    <div className="task-content">
                      <span 
                        className="task-title"
                        onClick={() => handleToggleTask(task.id, task.completed)}
                      >
                        {task.title}
                      </span>
                      <span className="task-category">{task.category}</span>
                    </div>
                  </div>

                  <div className="task-actions">
                    <button 
                      className="btn-delete" 
                      onClick={() => handleDeleteTask(task.id)}
                      title="Delete task"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      <footer className="footer-text">
        Quantum Hub &bull; Powered by React, Express, and Vanilla CSS &bull; {import.meta.env.DEV ? 'Local Environment Mode' : 'Production Environment Mode'}
      </footer>
    </div>
  );
}

export default App;
