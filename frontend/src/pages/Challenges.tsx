import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth.tsx';
import { apiClient } from '../lib/api';
import { format } from 'date-fns';
import { Trophy, Clock, User, Plus, Check, X } from 'lucide-react';

interface Challenge {
  id: string;
  creator_id: string;
  challenger_id: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'rejected';
  winner_id: string | null;
  creator_profile: {
    username: string;
    display_name: string;
  };
  challenger_profile: {
    username: string;
    display_name: string;
  };
}

interface ChallengeForm {
  challenger_username: string;
  duration_type: 'day' | 'week' | 'month' | 'year';
  duration_count: number;
}

interface UserSuggestion {
  id: string;
  username: string;
  display_name: string;
}

export function Challenges() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<ChallengeForm>({
    challenger_username: '',
    duration_type: 'day',
    duration_count: 1,
  });
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSuggestion | null>(null);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadChallenges();
    }
  }, [user]);

  // Autofill challenger username from localStorage
  useEffect(() => {
    if (showForm) {
      const prefilled = localStorage.getItem('prefilledChallenger');
      if (prefilled) {
        setFormData((prev) => ({ ...prev, challenger_username: prefilled }));
        setSelectedUser(null); // Will be set after search
        localStorage.removeItem('prefilledChallenger');
      }
    }
  }, [showForm]);

  // Suggest users when typing
  useEffect(() => {
    if (!showForm) return;
    if (!formData.challenger_username.trim()) {
      setUserSuggestions([]);
      setSelectedUser(null);
      return;
    }
    setSearchLoading(true);
    const handler = setTimeout(async () => {
      try {
        const res = await apiClient.searchUsers(formData.challenger_username.trim());
        const suggestions = (res.users || []).slice(0, 5);
        setUserSuggestions(suggestions);
        // If autofilled, select if exact match
        const exact = suggestions.find(u => u.username === formData.challenger_username.trim());
        setSelectedUser(exact || null);
      } catch {
        setUserSuggestions([]);
        setSelectedUser(null);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [formData.challenger_username, showForm]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        suggestionRef.current &&
        !suggestionRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setSuggestionOpen(false);
      }
    }
    if (suggestionOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [suggestionOpen]);

  const loadChallenges = async () => {
    try {
      const response = await apiClient.getChallenges();
      setChallenges(response.challenges || []);
    } catch (error) {
      console.error('Error loading challenges:', error);
    }
    setLoading(false);
  };

  const createChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await apiClient.createChallenge(formData);
      setShowForm(false);
      setFormData({
        challenger_username: '',
        duration_type: 'day',
        duration_count: 1,
      });
      setSelectedUser(null);
      setUserSuggestions([]);
      loadChallenges();
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'message' in error) {
        console.error('Error creating challenge:', (error as { message: string }).message);
        alert((error as { message: string }).message || 'Failed to create challenge. Please try again.');
      } else {
        alert('Failed to create challenge. Please try again.');
      }
    }
  };

  const respondToChallenge = async (challengeId: string, accept: boolean) => {
    try {
      await apiClient.respondToChallenge(challengeId, accept);
      loadChallenges();
    } catch (error) {
      console.error('Error responding to challenge:', error);
    }
  };

  // Cancel challenge (creator only, pending only)
  const cancelChallenge = async (challengeId: string) => {
    if (!window.confirm('Are you sure you want to cancel this challenge?')) return;
    try {
      await apiClient.cancelChallenge(challengeId);
      loadChallenges();
    } catch {
      alert('Failed to cancel challenge.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'rejected': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getWinnerDisplay = (challenge: Challenge) => {
    if (!challenge.winner_id) return 'Tie';
    if (challenge.winner_id === challenge.creator_id) {
      return challenge.creator_profile.display_name;
    } else {
      return challenge.challenger_profile.display_name;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Challenges</h1>
          <p className="mt-2 text-gray-600">Challenge your friends and compete in daily tasks.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Challenge
        </button>
      </div>

      {/* Challenge Form */}
      {showForm && (
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200/50">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Challenge</h2>
          <form onSubmit={createChallenge} className="space-y-4" autoComplete="off">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700">
                Challenger Username
              </label>
              <input
                ref={inputRef}
                type="text"
                value={formData.challenger_username}
                onChange={e => {
                  setFormData(prev => ({ ...prev, challenger_username: e.target.value }));
                  setSuggestionOpen(true);
                  setSelectedUser(null);
                }}
                onFocus={() => setSuggestionOpen(true)}
                placeholder="Enter username to challenge"
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
                autoComplete="off"
              />
              {suggestionOpen && userSuggestions.length > 0 && (
                <div ref={suggestionRef} className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-56 overflow-y-auto">
                  {userSuggestions.map((u: UserSuggestion) => (
                    <div
                      key={u.id}
                      className={`px-4 py-2 cursor-pointer hover:bg-blue-100 ${selectedUser?.username === u.username ? 'bg-blue-50' : ''}`}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, challenger_username: u.username }));
                        setSelectedUser(u);
                        setSuggestionOpen(false);
                      }}
                    >
                      <span className="font-medium">{u.display_name}</span> <span className="text-gray-500">@{u.username}</span>
                    </div>
                  ))}
                </div>
              )}
              {searchLoading && <div className="absolute right-2 top-10 text-xs text-gray-400">Searching...</div>}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Duration Type
                </label>
                <select
                  value={formData.duration_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration_type: e.target.value as unknown as ChallengeForm['duration_type'] }))}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="day">Day(s)</option>
                  <option value="week">Week(s)</option>
                  <option value="month">Month(s)</option>
                  <option value="year">Year(s)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Duration Count
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.duration_count}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration_count: parseInt(e.target.value) }))}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
               className="px-6 py-3 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              {selectedUser && (
                <button
                  type="submit"
                  className="px-6 py-3 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all"
                >
                  Send Challenge
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Challenges List */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Your Challenges</h2>
        </div>
        <div className="p-6">
          {challenges.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No challenges yet. Create your first challenge to get started!
            </p>
          ) : (
            <div className="space-y-4">
              {challenges.map((challenge) => (
                <div key={challenge.id} className="border border-gray-200/50 rounded-xl p-4 bg-gray-50/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">
                          {challenge.creator_id === user?.id 
                            ? `You vs ${challenge.challenger_profile.display_name}`
                            : `${challenge.creator_profile.display_name} vs You`
                          }
                        </span>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(challenge.status)}`}>
                        {challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1)}
                      </span>
                    </div>
                    {/* Cancel button for creator if pending */}
                    {challenge.status === 'pending' && challenge.creator_id === user?.id && (
                      <button
                        onClick={() => cancelChallenge(challenge.id)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </button>
                    )}
                    {/* Accept/Decline for challenger if pending */}
                    {challenge.status === 'pending' && challenge.challenger_id === user?.id && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => respondToChallenge(challenge.id, true)}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 transition-all"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Accept
                        </button>
                        <button
                          onClick={() => respondToChallenge(challenge.id, false)}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Decline
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>
                        {format(new Date(challenge.start_date), 'MMM d')} - {format(new Date(challenge.end_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                    
                    {challenge.status === 'completed' && (
                      <div className="flex items-center">
                        <Trophy className="h-4 w-4 mr-1" />
                        <span>Winner: {getWinnerDisplay(challenge)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}