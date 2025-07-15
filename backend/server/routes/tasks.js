const express = require('express');
const supabase = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user's tasks
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ tasks: data });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create task
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, duration_hours, points } = req.body;

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: req.user.id,
        name,
        duration_hours,
        points,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ task: data });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update task
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, duration_hours, points } = req.body;

    const { data, error } = await supabase
      .from('tasks')
      .update({ name, duration_hours, points })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ task: data });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete task (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('tasks')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get today's completions
router.get('/completions/today', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('task_completions')
      .select('task_id, actual_duration_hours')
      .eq('user_id', req.user.id)
      .eq('completion_date', today);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const completions = {};
    data.forEach(completion => {
      completions[completion.task_id] = completion.actual_duration_hours;
    });

    res.json({ completions });
  } catch (error) {
    console.error('Get completions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update task completion
router.post('/completions', authenticateToken, async (req, res) => {
  try {
    const { task_id, actual_duration_hours } = req.body;
    const today = new Date().toISOString().split('T')[0];

    // Get task details to calculate earned points
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('duration_hours, points')
      .eq('id', task_id)
      .eq('user_id', req.user.id)
      .single();

    if (taskError) {
      return res.status(400).json({ error: taskError.message });
    }

    const earnedPoints = task.duration_hours > 0 
      ? (actual_duration_hours / task.duration_hours) * task.points 
      : 0;

    // Upsert completion
    const { data, error } = await supabase
      .from('task_completions')
      .upsert({
        user_id: req.user.id,
        task_id,
        completion_date: today,
        actual_duration_hours,
        earned_points: Math.min(earnedPoints, task.points),
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Calculate and update daily score
    await calculateDailyScore(req.user.id, today);

    res.json({ completion: data });
  } catch (error) {
    console.error('Update completion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to calculate daily score
async function calculateDailyScore(userId, date) {
  try {
    // Get all user's active tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, points')
      .eq('user_id', userId)
      .eq('is_active', true);

    // Get completions for the date
    const { data: completions } = await supabase
      .from('task_completions')
      .select('earned_points')
      .eq('user_id', userId)
      .eq('completion_date', date);

    const totalPossiblePoints = tasks.reduce((sum, task) => sum + task.points, 0);
    const earnedPoints = completions.reduce((sum, completion) => sum + completion.earned_points, 0);
    const percentageScore = totalPossiblePoints > 0 ? (earnedPoints / totalPossiblePoints) * 100 : 0;

    // Upsert daily score
    await supabase
      .from('daily_scores')
      .upsert({
        user_id: userId,
        score_date: date,
        total_possible_points: totalPossiblePoints,
        earned_points: earnedPoints,
        percentage_score: percentageScore,
      });
  } catch (error) {
    console.error('Calculate daily score error:', error);
  }
}

module.exports = router;