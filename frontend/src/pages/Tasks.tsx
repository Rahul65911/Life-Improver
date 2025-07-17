import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.tsx';
import { apiClient } from '../lib/api';
import { useForm } from 'react-hook-form';
import { Plus, Edit2, Trash2, Clock, Award, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'react-toastify';

interface Task {
  id: string;
  name: string;
  duration_hours: number;
  points: number;
  description?: string;
  is_active: boolean;
}

interface TaskForm {
  name: string;
  duration_hours: number;
  points: number;
  description?: string;
}

export function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [completions, setCompletions] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [tempProgress, setTempProgress] = useState<number>(0);

  const { register, handleSubmit, reset, setValue } = useForm<TaskForm>();

  useEffect(() => {
    if (user) {
      loadTasks();
      loadTodayCompletions();
    }
  }, [user]);

  useEffect(() => {
    if (selectedTask) {
      setTempProgress(completions[selectedTask.id] || 0);
    }
  }, [selectedTask, completions]);

  const loadTasks = async () => {
    try {
      const response = await apiClient.getTasks();
      setTasks(response.tasks || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
    setLoading(false);
  };

  const loadTodayCompletions = async () => {
    try {
      const response = await apiClient.getTodayCompletions();
      setCompletions(response.completions || {});
    } catch (error) {
      console.error('Error loading completions:', error);
    }
  };

  const onSubmit = async (data: TaskForm) => {
    try {
      if (editingTask) {
        await apiClient.updateTask(editingTask.id, data);
      } else {
        await apiClient.createTask(data);
      }

      reset();
      setShowForm(false);
      setEditingTask(null);
      loadTasks();
      toast.success(editingTask ? 'Task updated successfully' : 'Task created successfully');
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Failed to save task. Please try again.');
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await apiClient.deleteTask(taskId);
      loadTasks();
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }
      toast.success('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task. Please try again.');
    }
  };

  const updateCompletion = async () => {
    if (!selectedTask) return;
    
    try {
      await apiClient.updateTaskCompletion(selectedTask.id, tempProgress);
      setCompletions(prev => ({ ...prev, [selectedTask.id]: tempProgress }));
      setSelectedTask(null);
      toast.success('Progress updated successfully');
    } catch (error) {
      console.error('Error updating completion:', error);
      toast.error('Failed to update progress. Please try again.');
    }
  };

  const startEdit = (task: Task) => {
    setEditingTask(task);
    setValue('name', task.name);
    setValue('duration_hours', task.duration_hours);
    setValue('points', task.points);
    setValue('description', task.description || '');
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingTask(null);
    setShowForm(false);
    reset();
  };

  const handleAddNewTask = () => {
    if (editingTask) {
      toast.warning('Please save or cancel your current changes before creating a new task');
      return;
    }
    setEditingTask(null);
    reset();
    setShowForm(true);
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
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
          <p className="mt-2 text-gray-600">Manage your daily tasks and track your progress.</p>
        </div>
        <Button onClick={handleAddNewTask} className="inline-flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Task Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</CardTitle>
            <CardDescription>Fill in the task details below.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Task Name</label>
                  <input
                    {...register('name', { required: true })}
                    type="text"
                    placeholder="e.g., Gym, Study, Web Dev"
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duration (hours)</label>
                  <input
                    {...register('duration_hours', { required: true, min: 0.1 })}
                    type="number"
                    step="0.1"
                    placeholder="e.g., 1.5"
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Points</label>
                  <input
                    {...register('points', { required: true, min: 1 })}
                    type="number"
                    placeholder="e.g., 20"
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <Textarea
                  {...register('description')}
                  placeholder="Add a description for your task..."
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTask ? 'Update Task' : 'Create Task'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tasks List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No tasks yet. Create your first task to get started!</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{task.name}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(task)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {task.duration_hours}h
                  </span>
                  <span className="flex items-center">
                    <Award className="h-4 w-4 mr-1" />
                    {task.points} points
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Today's Progress</span>
                    <span className="text-gray-900">
                      {completions[task.id] || 0}h / {task.duration_hours}h
                    </span>
                  </div>
                  <Progress value={Math.min(((completions[task.id] || 0) / task.duration_hours) * 100, 100)} />
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full mt-2"
                        onClick={() => setSelectedTask(task)}
                      >
                        View Details
                      </Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>{task.name}</SheetTitle>
                        <SheetDescription>
                          <div className="flex items-center space-x-4 text-sm mt-2">
                            <span className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {task.duration_hours}h
                            </span>
                            <span className="flex items-center">
                              <Award className="h-4 w-4 mr-1" />
                              {task.points} points
                            </span>
                          </div>
                        </SheetDescription>
                      </SheetHeader>
                      <div className="mt-6 space-y-6">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Description</h4>
                          <p className="text-sm text-gray-600">
                            {task.description || 'No description provided.'}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-2">Progress</h4>
                          <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max={task.duration_hours * 2}
                                value={tempProgress}
                                onChange={(e) => setTempProgress(parseFloat(e.target.value) || 0)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="Hours completed"
                              />
                              <span className="text-sm text-gray-600">hours</span>
                            </div>
                            <Progress value={Math.min((tempProgress / task.duration_hours) * 100, 100)} />
                            <Button onClick={updateCompletion} className="w-full">
                              Save Progress
                            </Button>
                          </div>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}