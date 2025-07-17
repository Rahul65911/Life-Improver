const express = require('express');
const supabase = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user's challenges
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('challenges')
      .select(`
        *,
        creator_profile:profiles!challenges_creator_id_fkey(username, display_name),
        challenger_profile:profiles!challenges_challenger_id_fkey(username, display_name),
        creator_task_list:challenge_task_lists!challenge_task_lists_challenge_id_fkey(
          id,
          tasks:challenge_tasks(
            id,
            name,
            duration_hours,
            points,
            description,
            progress
          ),
          total_progress
        ),
        challenger_task_list:challenge_task_lists!challenge_task_lists_challenge_id_fkey(
          id,
          tasks:challenge_tasks(
            id,
            name,
            duration_hours,
            points,
            description,
            progress
          ),
          total_progress
        )
      `)
      .or(`creator_id.eq.${req.user.id},challenger_id.eq.${req.user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ challenges: data });
  } catch (error) {
    console.error('Get challenges error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create challenge
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { challenger_username, duration_type, duration_count, task_list } = req.body;

    // Find challenger by username
    const { data: challengerData, error: challengerError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', challenger_username)
      .maybeSingle();

    if (challengerError || !challengerData) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (challengerData.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot challenge yourself' });
    }

    // Calculate end date
    const startDate = new Date();
    let endDate = new Date();

    switch (duration_type) {
      case 'day':
        endDate.setDate(startDate.getDate() + duration_count);
        break;
      case 'week':
        endDate.setDate(startDate.getDate() + (duration_count * 7));
        break;
      case 'month':
        endDate.setMonth(startDate.getMonth() + duration_count);
        break;
      case 'year':
        endDate.setFullYear(startDate.getFullYear() + duration_count);
        break;
    }

    // Start a transaction
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .insert({
        creator_id: req.user.id,
        challenger_id: challengerData.id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: 'pending',
      })
      .select()
      .single();

    if (challengeError) {
      return res.status(400).json({ error: challengeError.message });
    }

    // Create task list for creator
    const { data: taskList, error: taskListError } = await supabase
      .from('challenge_task_lists')
      .insert({
        challenge_id: challenge.id,
        user_id: req.user.id,
        total_progress: 0,
      })
      .select()
      .single();

    if (taskListError) {
      return res.status(400).json({ error: taskListError.message });
    }

    // Get tasks details
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .in('id', task_list);

    if (tasksError) {
      return res.status(400).json({ error: tasksError.message });
    }

    // Create challenge tasks
    const challengeTasks = tasksData.map(task => ({
      challenge_task_list_id: taskList.id,
      name: task.name,
      duration_hours: task.duration_hours,
      points: task.points,
      description: task.description,
      progress: 0,
    }));

    const { error: challengeTasksError } = await supabase
      .from('challenge_tasks')
      .insert(challengeTasks);

    if (challengeTasksError) {
      return res.status(400).json({ error: challengeTasksError.message });
    }

    res.status(201).json({ challenge });
  } catch (error) {
    console.error('Create challenge error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Respond to challenge
router.put('/:id/respond', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { accept, task_list_id } = req.body;

    if (accept && !task_list_id) {
      return res.status(400).json({ error: 'Task list is required to accept challenge' });
    }

    const status = accept ? 'active' : 'rejected';

    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .update({ status })
      .eq('id', id)
      .eq('challenger_id', req.user.id)
      .select()
      .single();

    if (challengeError) {
      return res.status(400).json({ error: challengeError.message });
    }

    if (accept) {
      // Get tasks from the selected task list
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', task_list_id);

      if (tasksError) {
        return res.status(400).json({ error: tasksError.message });
      }

      // Create task list for challenger
      const { data: taskList, error: taskListError } = await supabase
        .from('challenge_task_lists')
        .insert({
          challenge_id: challenge.id,
          user_id: req.user.id,
          total_progress: 0,
        })
        .select()
        .single();

      if (taskListError) {
        return res.status(400).json({ error: taskListError.message });
      }

      // Create challenge tasks
      const challengeTasks = tasksData.map(task => ({
        challenge_task_list_id: taskList.id,
        name: task.name,
        duration_hours: task.duration_hours,
        points: task.points,
        description: task.description,
        progress: 0,
      }));

      const { error: challengeTasksError } = await supabase
        .from('challenge_tasks')
        .insert(challengeTasks);

      if (challengeTasksError) {
        return res.status(400).json({ error: challengeTasksError.message });
      }
    }

    res.json({ challenge });
  } catch (error) {
    console.error('Respond to challenge error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel challenge (creator only, pending only)
router.put('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    // Only the creator can cancel, and only if pending
    const { data: challenge, error: fetchError } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchError || !challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    if (challenge.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the creator can cancel this challenge' });
    }
    if (challenge.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending challenges can be cancelled' });
    }
    const { data, error } = await supabase
      .from('challenges')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    res.json({ challenge: data });
  } catch (error) {
    console.error('Cancel challenge error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete challenges (run periodically)
router.post('/complete', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Get active challenges that have ended
    const { data: challenges, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('status', 'active')
      .lte('end_date', today);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    for (const challenge of challenges) {
      // Calculate average scores for both participants
      const { data: creatorScores } = await supabase
        .from('daily_scores')
        .select('percentage_score')
        .eq('user_id', challenge.creator_id)
        .gte('score_date', challenge.start_date)
        .lte('score_date', challenge.end_date);

      const { data: challengerScores } = await supabase
        .from('daily_scores')
        .select('percentage_score')
        .eq('user_id', challenge.challenger_id)
        .gte('score_date', challenge.start_date)
        .lte('score_date', challenge.end_date);

      const creatorAvg = creatorScores.length > 0 
        ? creatorScores.reduce((sum, s) => sum + s.percentage_score, 0) / creatorScores.length 
        : 0;

      const challengerAvg = challengerScores.length > 0 
        ? challengerScores.reduce((sum, s) => sum + s.percentage_score, 0) / challengerScores.length 
        : 0;

      let winnerId = null;
      if (creatorAvg > challengerAvg) {
        winnerId = challenge.creator_id;
      } else if (challengerAvg > creatorAvg) {
        winnerId = challenge.challenger_id;
      }

      // Update challenge status
      await supabase
        .from('challenges')
        .update({ 
          status: 'completed',
          winner_id: winnerId 
        })
        .eq('id', challenge.id);

      // Update user win/loss counts
      if (winnerId) {
        const loserId = winnerId === challenge.creator_id ? challenge.challenger_id : challenge.creator_id;
        
        await supabase.rpc('increment_wins', { user_id: winnerId });
        await supabase.rpc('increment_losses', { user_id: loserId });
      }
    }

    res.json({ message: `Completed ${challenges.length} challenges` });
  } catch (error) {
    console.error('Complete challenges error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update task progress
router.put('/tasks/:taskId/progress', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { progress } = req.body;

    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
      return res.status(400).json({ error: 'Progress must be a number between 0 and 100' });
    }

    // Verify user owns this task
    const { data: task, error: taskError } = await supabase
      .from('challenge_tasks')
      .select('challenge_task_lists!inner(user_id)')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.challenge_task_lists.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this task' });
    }

    // Update task progress
    const { data: updatedTask, error: updateError } = await supabase
      .from('challenge_tasks')
      .update({ progress })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    res.json({ task: updatedTask });
  } catch (error) {
    console.error('Update task progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;