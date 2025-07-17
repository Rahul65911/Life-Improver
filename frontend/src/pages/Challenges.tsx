import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth.tsx';
import { apiClient } from '../lib/api';
import { format } from 'date-fns';
import { Trophy, Clock, User, Plus, Check, X, List, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface Task {
  id: string;
  name: string;
  duration_hours: number;
  points: number;
  description?: string;
  progress?: number;
}

interface TaskList {
  id: string;
  tasks: Task[];
  total_progress: number;
}

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
  creator_task_list?: TaskList;
  challenger_task_list?: TaskList;
}

interface ChallengeForm {
  challenger_username: string;
  duration_type: 'day' | 'week' | 'month' | 'year';
  duration_count: number;
  task_list_id?: string;
  selected_tasks?: string[];
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
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [userTasks, setUserTasks] = useState<Task[]>([]);
  const [formData, setFormData] = useState<ChallengeForm>({
    challenger_username: '',
    duration_type: 'day',
    duration_count: 1,
    selected_tasks: [],
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
      loadUserTasks();
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

  const loadUserTasks = async () => {
    try {
      const response = await apiClient.getTasks();
      setUserTasks(response.tasks || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

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
    if (!selectedUser || !formData.selected_tasks?.length) return;
    try {
      await apiClient.createChallenge({
        ...formData,
        task_list: formData.selected_tasks,
      });
      setShowForm(false);
      setFormData({
        challenger_username: '',
        duration_type: 'day',
        duration_count: 1,
        selected_tasks: [],
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

  const respondToChallenge = async (challengeId: string, accept: boolean, taskListId?: string) => {
    try {
      await apiClient.respondToChallenge(challengeId, accept, taskListId);
      loadChallenges();
      setSelectedChallenge(null);
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

  const ChallengeDialog = ({ challenge }: { challenge: Challenge }) => {
    const [selectedTaskList, setSelectedTaskList] = useState<string>();
    const isCreator = user?.id === challenge.creator_id;
    const userProfile = isCreator ? challenge.creator_profile : challenge.challenger_profile;
    const opponentProfile = isCreator ? challenge.challenger_profile : challenge.creator_profile;
    const userTaskList = isCreator ? challenge.creator_task_list : challenge.challenger_task_list;
    const opponentTaskList = isCreator ? challenge.challenger_task_list : challenge.creator_task_list;

    return (
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Challenge Details</DialogTitle>
          <DialogDescription>
            {format(new Date(challenge.start_date), 'MMM d, yyyy')} - {format(new Date(challenge.end_date), 'MMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-8 mt-4">
          {/* Your Tasks */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Your Tasks
            </h3>
            {userTaskList ? (
              <div className="space-y-3">
                {userTaskList.tasks.map(task => (
                  <div key={task.id} className="bg-white p-4 rounded-lg shadow-sm border">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">{task.name}</h4>
                      <span className="text-sm text-gray-500">{task.progress}%</span>
                    </div>
                    <Progress value={task.progress} className="h-2" />
                  </div>
                ))}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Progress</span>
                    <span>{userTaskList.total_progress}%</span>
                  </div>
                  <Progress value={userTaskList.total_progress} className="h-3 mt-2" />
                </div>
              </div>
            ) : challenge.status === 'pending' && !isCreator ? (
              <div className="space-y-4">
                <select
                  className="w-full p-2 border rounded-lg"
                  value={selectedTaskList}
                  onChange={(e) => setSelectedTaskList(e.target.value)}
                >
                  <option value="">Select a task list</option>
                  {/* Add options for existing task lists */}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => respondToChallenge(challenge.id, true, selectedTaskList)}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Accept Challenge
                  </button>
                  <button
                    onClick={() => respondToChallenge(challenge.id, false)}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Opponent Tasks */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              {opponentProfile.display_name}'s Tasks
            </h3>
            {opponentTaskList ? (
              <div className="space-y-3">
                {opponentTaskList.tasks.map(task => (
                  <div key={task.id} className="bg-white p-4 rounded-lg shadow-sm border">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">{task.name}</h4>
                      <span className="text-sm text-gray-500">{task.progress}%</span>
                    </div>
                    <Progress value={task.progress} className="h-2" />
                  </div>
                ))}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Progress</span>
                    <span>{opponentTaskList.total_progress}%</span>
                  </div>
                  <Progress value={opponentTaskList.total_progress} className="h-3 mt-2" />
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No tasks selected yet
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    );
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
                      <div className="font-medium">{u.display_name}</div>
                      <div className="text-sm text-gray-500">@{u.username}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Select Tasks
              </label>
              <div className="mt-2 space-y-2">
                {userTasks.map(task => (
                  <label key={task.id} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.selected_tasks?.includes(task.id)}
                      onChange={(e) => {
                        const tasks = formData.selected_tasks || [];
                        setFormData(prev => ({
                          ...prev,
                          selected_tasks: e.target.checked
                            ? [...tasks, task.id]
                            : tasks.filter(id => id !== task.id)
                        }));
                      }}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                    <span>{task.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Duration Type
                </label>
                <select
                  value={formData.duration_type}
                  onChange={e => setFormData(prev => ({ ...prev, duration_type: e.target.value as any }))}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="day">Days</option>
                  <option value="week">Weeks</option>
                  <option value="month">Months</option>
                  <option value="year">Years</option>
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
                  onChange={e => setFormData(prev => ({ ...prev, duration_count: parseInt(e.target.value) || 1 }))}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({
                    challenger_username: '',
                    duration_type: 'day',
                    duration_count: 1,
                    selected_tasks: [],
                  });
                  setSelectedUser(null);
                  setUserSuggestions([]);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedUser || !formData.selected_tasks?.length}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Challenge
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Challenge List */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {challenges.map(challenge => (
          <div
            key={challenge.id}
            onClick={() => setSelectedChallenge(challenge)}
            className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200/50 hover:shadow-xl transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {challenge.creator_id === user?.id
                      ? challenge.challenger_profile.display_name
                      : challenge.creator_profile.display_name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {challenge.creator_id === user?.id ? 'Challenged by you' : 'Challenged you'}
                  </p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(challenge.status)}`}>
                {challenge.status}
              </span>
            </div>

            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>
                  {format(new Date(challenge.start_date), 'MMM d')} - {format(new Date(challenge.end_date), 'MMM d, yyyy')}
                </span>
              </div>
              {challenge.status === 'completed' && (
                <div className="flex items-center space-x-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span>Winner: {getWinnerDisplay(challenge)}</span>
                </div>
              )}
            </div>

            {challenge.status === 'pending' && challenge.creator_id === user?.id && (
              <div className="mt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelChallenge(challenge.id);
                  }}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Cancel Challenge
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Challenge Details Dialog */}
      <Dialog open={!!selectedChallenge} onOpenChange={(open) => !open && setSelectedChallenge(null)}>
        {selectedChallenge && <ChallengeDialog challenge={selectedChallenge} />}
      </Dialog>
    </div>
  );
}