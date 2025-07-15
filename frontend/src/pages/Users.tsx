import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.tsx';
import { apiClient } from '../lib/api';
import { Search, User, Trophy, Target, Plus } from 'lucide-react';

interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  total_wins: number;
  total_losses: number;
  created_at: string;
}

export function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (user) {
      loadTopUsers();
    }
  }, [user]);

  useEffect(() => {
    if (searchTerm.trim()) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const loadTopUsers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getTopUsers();
      setUsers(response.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!searchTerm.trim()) return;

    try {
      const response = await apiClient.searchUsers(searchTerm);
      setSearchResults(response.users || []);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const createChallenge = async (challengerId: string) => {

    try {
      // Navigate to challenges page with pre-filled challenger
      const challengerProfile = [...users, ...searchResults].find(u => u.id === challengerId);
      if (challengerProfile) {
        // Store the challenger username in localStorage for the challenges page
        localStorage.setItem('prefilledChallenger', challengerProfile.username);
        window.location.href = '/challenges';
      }
    } catch (error) {
      console.error('Error creating challenge:', error);
    }
  };

  const getWinRate = (wins: number, losses: number) => {
    const total = wins + losses;
    return total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
  };

  const displayUsers = searchTerm.trim() ? searchResults : users;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Find Users</h1>
        <p className="mt-2 text-gray-600">Search for users and challenge them to compete.</p>
      </div>

      {/* Search */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-200/50">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by username or display name..."
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {searchTerm.trim() ? 'Search Results' : 'Top Users'}
          </h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : displayUsers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {searchTerm.trim() ? 'No users found matching your search.' : 'No users found.'}
            </p>
          ) : (
            <div className="space-y-4">
              {displayUsers.map((userProfile) => (
                <div key={userProfile.id} className="border border-gray-200/50 rounded-xl p-4 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                          <User className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {userProfile.display_name}
                        </h3>
                        <p className="text-sm text-gray-500">@{userProfile.username}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="flex items-center text-sm text-gray-600">
                          <Trophy className="h-4 w-4 mr-1 text-green-600" />
                          <span>{userProfile.total_wins} wins</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <Target className="h-4 w-4 mr-1 text-red-600" />
                          <span>{userProfile.total_losses} losses</span>
                        </div>
                      </div>

                      <div className="text-center">
                        <p className="text-sm text-gray-600">Win Rate</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {getWinRate(userProfile.total_wins, userProfile.total_losses)}%
                        </p>
                      </div>

                      <button
                        onClick={() => createChallenge(userProfile.id)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Challenge
                      </button>
                    </div>
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