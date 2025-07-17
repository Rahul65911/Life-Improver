const express = require('express');
const supabase = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Sign up
router.post('/signup', async (req, res) => {
  try {
    const { email, password, username, displayName } = req.body;

    // Check if username already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Create user with Supabase Auth (email verification enabled in Supabase dashboard)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.EMAIL_REDIRECT_URL || undefined,
      },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (data.user) {
      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          username,
          display_name: displayName,
        });

      if (profileError) {
        return res.status(400).json({ error: profileError.message });
      }
    }

    res.status(201).json({ 
      message: 'User created successfully. Please check your email to verify your account.',
      user: data.user 
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sign in
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Check if email is confirmed
    if (!data.user?.email_confirmed_at) {
      return res.status(403).json({ error: 'Please verify your email before signing in.' });
    }

    res.json({ 
      message: 'Signed in successfully',
      user: data.user,
      session: data.session
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Magic link/email verification handler
router.get('/verify-email', async (req, res) => {
  try {
    // Supabase will redirect here with access_token in the URL hash (handled by frontend)
    // This backend route is for SSR/static confirmation if needed
    // Optionally, you can use this to create the user profile if not present
    // For now, just redirect to a static page
    return res.redirect('/email-verified.html');
  } catch (error) {
    res.status(500).send('Verification failed.');
  }
});

// Sign out
router.post('/signout', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Signed out successfully' });
  } catch (error) {
    console.error('Signout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot password (send reset email)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: process.env.EMAIL_REDIRECT_URL || undefined,
    });
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    res.json({ message: 'Password reset email sent. Please check your inbox.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password (user clicks link in email, handled on frontend)
// The frontend should use supabase.auth.updateUser({ password: newPassword }) with the access token from the email link.
// No backend route needed unless you want to proxy this.

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ user: req.user, profile });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;