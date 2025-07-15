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
        challenger_profile:profiles!challenges_challenger_id_fkey(username, display_name)
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
    const { challenger_username, duration_type, duration_count } = req.body;

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

    const { data, error } = await supabase
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

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ challenge: data });
  } catch (error) {
    console.error('Create challenge error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Respond to challenge
router.put('/:id/respond', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { accept } = req.body;
    const status = accept ? 'active' : 'cancelled';

    const { data, error } = await supabase
      .from('challenges')
      .update({ status })
      .eq('id', id)
      .eq('challenger_id', req.user.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ challenge: data });
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

module.exports = router;