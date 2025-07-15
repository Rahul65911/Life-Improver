import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.tsx';
import { apiClient } from '../lib/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Trophy, Target, Calendar as CalendarIcon } from 'lucide-react';

interface DayScore {
  date: string;
  percentage_score: number;
  earned_points: number;
  total_possible_points: number;
}

interface ChallengeResult {
  date: string;
  won: boolean;
  opponent: string;
  challenge_id: string;
}

interface MonthlyStats {
  totalWins: number;
  totalLosses: number;
  averageScore: number;
  bestDay: { date: string; score: number } | null;
}

export function Calendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dayScores, setDayScores] = useState<DayScore[]>([]);
  const [challengeResults, setChallengeResults] = useState<ChallengeResult[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
    totalWins: 0,
    totalLosses: 0,
    averageScore: 0,
    bestDay: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadCalendarData();
    }
  }, [user, currentDate]);

  const loadCalendarData = async () => {
    try {
      const response = await apiClient.getCalendarData(
        currentDate.getMonth() + 1,
        currentDate.getFullYear()
      );
      
      setDayScores(response.dayScores || []);
      setChallengeResults(response.challengeResults || []);
      setMonthlyStats(response.monthlyStats);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDayScore = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return dayScores.find(score => score.score_date === dateStr);
  };

  const getDayChallengeResults = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return challengeResults.filter(result => result.date === dateStr);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 75) return 'bg-green-400';
    if (score >= 60) return 'bg-yellow-400';
    if (score >= 40) return 'bg-orange-400';
    return 'bg-red-400';
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
        <p className="mt-2 text-gray-600">Track your daily progress and challenge results.</p>
      </div>

      {/* Monthly Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/80 backdrop-blur-md px-4 py-6 rounded-2xl shadow-lg border border-gray-200/50">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center mr-3">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div className="ml-2">
              <p className="text-sm font-medium text-gray-600">Wins This Month</p>
              <p className="text-2xl font-bold text-gray-900">{monthlyStats.totalWins}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md px-4 py-6 rounded-2xl shadow-lg border border-gray-200/50">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center mr-3">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div className="ml-2">
              <p className="text-sm font-medium text-gray-600">Losses This Month</p>
              <p className="text-2xl font-bold text-gray-900">{monthlyStats.totalLosses}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md px-4 py-6 rounded-2xl shadow-lg border border-gray-200/50">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-3">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div className="ml-2">
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-2xl font-bold text-gray-900">{monthlyStats.averageScore.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md px-4 py-6 rounded-2xl shadow-lg border border-gray-200/50">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mr-3">
              <CalendarIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-2">
              <p className="text-sm font-medium text-gray-600">Best Day</p>
              <p className="text-lg font-bold text-gray-900">
                {monthlyStats.bestDay 
                  ? `${monthlyStats.bestDay.score.toFixed(1)}%`
                  : 'N/A'
                }
              </p>
              {monthlyStats.bestDay && (
                <p className="text-xs text-gray-500">
                  {format(new Date(monthlyStats.bestDay.date), 'MMM d')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={previousMonth}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Calendar Header */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map(day => {
              const dayScore = getDayScore(day);
              const challengeResults = getDayChallengeResults(day);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  // className={`min-h-[80px] p-2 border border-gray-200 rounded ${
                  //   !isSameMonth(day, currentDate) ? 'bg-gray-50' : 'bg-white'
                  // } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                  className={`min-h-[80px] p-2 border border-gray-200/50 rounded-lg ${
                    !isSameMonth(day, currentDate) ? 'bg-gray-50/50' : 'bg-white/50'
                  } ${isToday ? 'ring-2 ring-gradient-to-r from-blue-500 to-purple-500' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm ${
                      !isSameMonth(day, currentDate) ? 'text-gray-400' : 'text-gray-900'
                    }`}>
                      {format(day, 'd')}
                    </span>
                    {dayScore && (
                      <div
                        className={`w-3 h-3 rounded-full ${getScoreColor(dayScore.percentage_score)}`}
                        title={`Score: ${dayScore.percentage_score.toFixed(1)}%`}
                      />
                    )}
                  </div>

                  {/* Challenge Results */}
                  <div className="space-y-1">
                    {challengeResults.map((result, index) => (
                      <div
                        key={index}
                        className={`text-xs px-1 py-0.5 rounded ${
                          result.won 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}
                        title={`${result.won ? 'Won' : 'Lost'} vs ${result.opponent}`}
                      >
                        {result.won ? 'W' : 'L'} vs {result.opponent.split(' ')[0]}
                      </div>
                    ))}
                  </div>

                  {/* Score Display */}
                  {dayScore && (
                    <div className="mt-1">
                      <div className="text-xs text-gray-600">
                        {dayScore.percentage_score.toFixed(0)}%
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-gray-200/50">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Legend</h3>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
            <span>90-100% Score</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-400 mr-2"></div>
            <span>75-89% Score</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-yellow-400 mr-2"></div>
            <span>60-74% Score</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-orange-400 mr-2"></div>
            <span>40-59% Score</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-400 mr-2"></div>
            <span>0-39% Score</span>
          </div>
          <div className="flex items-center">
            <div className="px-2 py-0.5 bg-green-100 text-green-800 rounded mr-2 text-xs">W</div>
            <span>Challenge Win</span>
          </div>
          <div className="flex items-center">
            <div className="px-2 py-0.5 bg-red-100 text-red-800 rounded mr-2 text-xs">L</div>
            <span>Challenge Loss</span>
          </div>
        </div>
      </div>
    </div>
  );
}