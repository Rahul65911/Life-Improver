/*
  # Daily Task Tracker & Challenge App - Initial Schema

  1. New Tables
    - `profiles` - User profiles with usernames and stats
    - `tasks` - User's daily tasks with points and duration
    - `task_completions` - Daily task completion records
    - `challenges` - Challenge records between users
    - `challenge_participants` - Participants in challenges
    - `daily_scores` - Daily aggregated scores for users

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for challenge participants to view each other's data

  3. Functions
    - Function to calculate daily scores
    - Function to determine challenge winners
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text NOT NULL,
  avatar_url text,
  total_wins integer DEFAULT 0,
  total_losses integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  duration_hours decimal(4,2) NOT NULL,
  points integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Task completions table
CREATE TABLE IF NOT EXISTS task_completions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  completion_date date NOT NULL,
  actual_duration_hours decimal(4,2) NOT NULL,
  earned_points decimal(6,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, task_id, completion_date)
);

-- Challenges table
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  challenger_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  winner_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Daily scores table
CREATE TABLE IF NOT EXISTS daily_scores (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  score_date date NOT NULL,
  total_possible_points integer NOT NULL,
  earned_points decimal(6,2) NOT NULL,
  percentage_score decimal(5,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, score_date)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_scores ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Tasks policies
CREATE POLICY "Users can manage own tasks" ON tasks FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Task completions policies
CREATE POLICY "Users can manage own completions" ON task_completions FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Challenge participants can view completions" ON task_completions FOR SELECT TO authenticated 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM challenges 
    WHERE (creator_id = auth.uid() OR challenger_id = auth.uid()) 
    AND (creator_id = user_id OR challenger_id = user_id)
    AND status = 'active'
  )
);

-- Challenges policies
CREATE POLICY "Users can view own challenges" ON challenges FOR SELECT TO authenticated 
USING (auth.uid() = creator_id OR auth.uid() = challenger_id);
CREATE POLICY "Users can create challenges" ON challenges FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can update own challenges" ON challenges FOR UPDATE TO authenticated 
USING (auth.uid() = creator_id OR auth.uid() = challenger_id);

-- Daily scores policies
CREATE POLICY "Users can manage own scores" ON daily_scores FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Challenge participants can view scores" ON daily_scores FOR SELECT TO authenticated 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM challenges 
    WHERE (creator_id = auth.uid() OR challenger_id = auth.uid()) 
    AND (creator_id = user_id OR challenger_id = user_id)
    AND status = 'active'
  )
);

-- Function to calculate daily score
CREATE OR REPLACE FUNCTION calculate_daily_score(p_user_id uuid, p_date date)
RETURNS void AS $$
DECLARE
  v_total_possible integer;
  v_earned_points decimal(6,2);
  v_percentage decimal(5,2);
BEGIN
  -- Calculate total possible points for the day
  SELECT COALESCE(SUM(points), 0) INTO v_total_possible
  FROM tasks 
  WHERE user_id = p_user_id AND is_active = true;
  
  -- Calculate earned points for the day
  SELECT COALESCE(SUM(earned_points), 0) INTO v_earned_points
  FROM task_completions 
  WHERE user_id = p_user_id AND completion_date = p_date;
  
  -- Calculate percentage
  v_percentage := CASE 
    WHEN v_total_possible > 0 THEN (v_earned_points / v_total_possible) * 100
    ELSE 0
  END;
  
  -- Insert or update daily score
  INSERT INTO daily_scores (user_id, score_date, total_possible_points, earned_points, percentage_score)
  VALUES (p_user_id, p_date, v_total_possible, v_earned_points, v_percentage)
  ON CONFLICT (user_id, score_date) 
  DO UPDATE SET 
    total_possible_points = EXCLUDED.total_possible_points,
    earned_points = EXCLUDED.earned_points,
    percentage_score = EXCLUDED.percentage_score,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update challenge winner
CREATE OR REPLACE FUNCTION update_challenge_winner(p_challenge_id uuid)
RETURNS void AS $$
DECLARE
  v_creator_id uuid;
  v_challenger_id uuid;
  v_start_date date;
  v_end_date date;
  v_creator_avg decimal(5,2);
  v_challenger_avg decimal(5,2);
  v_winner_id uuid;
BEGIN
  -- Get challenge details
  SELECT creator_id, challenger_id, start_date, end_date
  INTO v_creator_id, v_challenger_id, v_start_date, v_end_date
  FROM challenges WHERE id = p_challenge_id;
  
  -- Calculate average scores for creator
  SELECT COALESCE(AVG(percentage_score), 0) INTO v_creator_avg
  FROM daily_scores 
  WHERE user_id = v_creator_id 
  AND score_date BETWEEN v_start_date AND v_end_date;
  
  -- Calculate average scores for challenger
  SELECT COALESCE(AVG(percentage_score), 0) INTO v_challenger_avg
  FROM daily_scores 
  WHERE user_id = v_challenger_id 
  AND score_date BETWEEN v_start_date AND v_end_date;
  
  -- Determine winner
  IF v_creator_avg > v_challenger_avg THEN
    v_winner_id := v_creator_id;
  ELSIF v_challenger_avg > v_creator_avg THEN
    v_winner_id := v_challenger_id;
  ELSE
    v_winner_id := NULL; -- Tie
  END IF;
  
  -- Update challenge
  UPDATE challenges 
  SET winner_id = v_winner_id, status = 'completed', updated_at = now()
  WHERE id = p_challenge_id;
  
  -- Update user stats if there's a winner
  IF v_winner_id IS NOT NULL THEN
    UPDATE profiles SET total_wins = total_wins + 1 WHERE id = v_winner_id;
    UPDATE profiles SET total_losses = total_losses + 1 
    WHERE id = CASE WHEN v_winner_id = v_creator_id THEN v_challenger_id ELSE v_creator_id END;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;