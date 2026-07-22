import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// In-memory Task Database
let tasks = [
  { id: '1', title: 'Design Glassmorphic UI Dashboard', completed: true, category: 'Frontend' },
  { id: '2', title: 'Establish Express API Gateway', completed: true, category: 'Backend' },
  { id: '3', title: 'Implement Latency Diagnostics Monitor', completed: false, category: 'Diagnostics' },
  { id: '4', title: 'Verify Cross-Origin Resource Sharing (CORS)', completed: false, category: 'Security' }
];

// Helper to calculate mock CPU usage
const getMockCpuUsage = () => {
  return (15 + Math.random() * 15).toFixed(1); // Mock CPU between 15% and 30%
};

// Log requests
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health/Status endpoint providing real-time statistics
app.get('/api/health', (req, res) => {
  const memory = process.memoryUsage();
  res.json({
    status: 'healthy',
    uptime: Math.floor(process.uptime()),
    cpuUsage: `${getMockCpuUsage()}%`,
    memoryUsage: `${(memory.heapUsed / 1024 / 1024).toFixed(1)} MB / ${(memory.heapTotal / 1024 / 1024).toFixed(1)} MB`,
    timestamp: Date.now()
  });
});

// GET all tasks
app.get('/api/tasks', (req, res) => {
  res.json(tasks);
});

// POST add a new task
app.post('/api/tasks', (req, res) => {
  const { title, category } = req.body;
  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Task title is required.' });
  }

  const newTask = {
    id: Date.now().toString(),
    title: title.trim(),
    completed: false,
    category: category || 'General'
  };

  tasks.push(newTask);
  res.status(201).json(newTask);
});

// PUT toggle or update a task
app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { title, completed, category } = req.body;

  const taskIndex = tasks.findIndex(t => t.id === id);
  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  const task = tasks[taskIndex];
  if (title !== undefined) task.title = title.trim();
  if (completed !== undefined) task.completed = !!completed;
  if (category !== undefined) task.category = category;

  res.json(task);
});

// DELETE a task
app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const taskIndex = tasks.findIndex(t => t.id === id);

  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  const deletedTask = tasks.splice(taskIndex, 1)[0];
  res.json({ success: true, message: `Task '${deletedTask.title}' was successfully deleted.`, id });
});

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 Backend server successfully started`);
  console.log(`📡 Listening on: http://localhost:${PORT}`);
  console.log(`=========================================`);
});
