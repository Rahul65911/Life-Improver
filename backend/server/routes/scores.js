const express = require('express');
const supabase = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get dashboard stats
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('total_wins, total_losses')
      .eq('id', req.user.id)
      .single();

    // Get today's score
    const { data: todayScore } = await supabase
      .from('daily_scores')
      .select('percentage_score')
      .eq('user_id', req.user.id)
      .eq('score_date', today)
      .maybeSingle();

    // Get active challenges count
    const { count: activeChallengesCount } = await supabase
      .from('challenges')
      .select('*', { count: 'exact', head: true })
      .or(`creator_id.eq.${req.user.id},challenger_id.eq.${req.user.id}`)
      .eq('status', 'active');

    // Get weekly average
    const { data: weeklyScores } = await supabase
      .from('daily_scores')
      .select('percentage_score')
      .eq('user_id', req.user.id)
      .gte('score_date', weekAgo.toISOString().split('T')[0]);

    const weeklyAverage = weeklyScores?.length 
      ? weeklyScores.reduce((sum, score) => sum + score.percentage_score, 0) / weeklyScores.length
      : 0;

    // Get today's tasks with completions
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('is_active', true);

    const { data: completions } = await supabase
      .from('task_completions')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('completion_date', today);

    const todayTasks = tasks?.map(task => {
      const completion = completions?.find(c => c.task_id === task.id);
      const completedDuration = completion?.actual_duration_hours || 0;
      const earnedPoints = completion?.earned_points || 0;
      const completionPercentage = task.duration_hours > 0 
        ? Math.min((completedDuration / task.duration_hours) * 100, 100)
        : 0;

      return {
        id: task.id,
        name: task.name,
        duration_hours: task.duration_hours,
        points: task.points,
        completed_duration: completedDuration,
        earned_points: earnedPoints,
        completion_percentage: completionPercentage,
      };
    }) || [];

    res.json({
      stats: {
        todayScore: todayScore?.percentage_score || 0,
        totalWins: profile?.total_wins || 0,
        totalLosses: profile?.total_losses || 0,
        activeChallenges: activeChallengesCount || 0,
        weeklyAverage,
      },
      todayTasks
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get calendar data
router.get('/calendar', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    const date = new Date(year, month - 1, 1);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    // Get daily scores for the month
    const { data: scores } = await supabase
      .from('daily_scores')
      .select('*')
      .eq('user_id', req.user.id)
      .gte('score_date', monthStart.toISOString().split('T')[0])
      .lte('score_date', monthEnd.toISOString().split('T')[0]);

    // Get challenge results for the month
    const { data: challenges } = await supabase
      .from('challenges')
      .select(`
        *,
        creator_profile:profiles!challenges_creator_id_fkey(username, display_name),
        challenger_profile:profiles!challenges_challenger_id_fkey(username, display_name)
      `)
      .or(`creator_id.eq.${req.user.id},challenger_id.eq.${req.user.id}`)
      .eq('status', 'completed')
      .gte('end_date', monthStart.toISOString().split('T')[0])
      .lte('end_date', monthEnd.toISOString().split('T')[0]);

    const challengeResults = challenges?.map(challenge => ({
      date: challenge.end_date,
      won: challenge.winner_id === req.user.id,
      opponent: challenge.creator_id === req.user.id 
        ? challenge.challenger_profile.display_name 
        : challenge.creator_profile.display_name,
      challenge_id: challenge.id,
    })) || [];

    // Calculate monthly stats
    const wins = challengeResults.filter(r => r.won).length;
    const losses = challengeResults.filter(r => !r.won).length;
    const avgScore = scores?.length 
      ? scores.reduce((sum, score) => sum + score.percentage_score, 0) / scores.length 
      : 0;
    const bestDay = scores?.reduce((best, current) => 
      !best || current.percentage_score > best.percentage_score ? current : best
    , null);

    res.json({
      dayScores: scores || [],
      challengeResults,
      monthlyStats: {
        totalWins: wins,
        totalLosses: losses,
        averageScore: avgScore,
        bestDay: bestDay ? { date: bestDay.score_date, score: bestDay.percentage_score } : null,
      }
    });
  } catch (error) {
    console.error('Get calendar error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;