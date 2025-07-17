import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../hooks/useAuth';
import { Target } from 'lucide-react';
import { Button } from './ui/button';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[@$!%*?&]/, 'Password must contain at least one Special Character')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  displayName: z.string().min(1, 'Display name is required'),
});

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

type SignUpForm = z.infer<typeof signUpSchema>;
type SignInForm = z.infer<typeof signInSchema>;

export function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signUp, signIn } = useAuth();

  // Shared state for autofill
  const [sharedEmail, setSharedEmail] = useState('');
  const [sharedPassword, setSharedPassword] = useState('');

  // New state for forgot password
  const [showForgot, setShowForgot] = useState(false);

  // Track if fields have been touched
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const signUpForm = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: sharedEmail,
      password: sharedPassword,
      username: '',
      displayName: '',
    },
    mode: 'onChange',
  });

  const signInForm = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: sharedEmail,
      password: sharedPassword,
    },
    mode: 'onChange',
  });

  const handleFieldTouch = (fieldName: string) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
  };

  // Keep shared state in sync with form values
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSharedEmail(value);
    if (isSignUp) {
      signUpForm.setValue('email', value, { shouldValidate: touchedFields['email'] });
    } else {
      signInForm.setValue('email', value, { shouldValidate: touchedFields['email'] });
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSharedPassword(value);
    if (isSignUp) {
      signUpForm.setValue('password', value, { shouldValidate: touchedFields['password'] });
    } else {
      signInForm.setValue('password', value, { shouldValidate: touchedFields['password'] });
    }
  };

  // When switching forms, reset touched states
  const handleSwitch = () => {
    setShowForgot(false);
    setTouchedFields({});
    setIsSignUp((prev) => {
      const next = !prev;
      if (next) {
        signUpForm.reset({
          email: sharedEmail,
          password: sharedPassword,
          username: '',
          displayName: '',
        });
      } else {
        signInForm.reset({
          email: sharedEmail,
          password: sharedPassword,
        });
      }
      return next;
    });
    setError(null);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    // Mark all fields as touched
    const fields = ['email', 'password', 'username', 'displayName'];
    const newTouched = fields.reduce((acc, field) => ({ ...acc, [field]: true }), {});
    setTouchedFields(newTouched);

    // Trigger validation for all fields
    const isValid = await signUpForm.trigger();
    if (!isValid) return;

    setLoading(true);
    setError(null);
    
    try {
      const data = signUpForm.getValues();
      await signUp(data.email, data.password, data.username, data.displayName);
      setSharedEmail(data.email);
      setSharedPassword(data.password);
      signInForm.reset({ 
        email: data.email, 
        password: data.password 
      });
      setIsSignUp(false);
      setTouchedFields({});
    } catch (err: unknown) {
      if (typeof err === 'object' && err && 'message' in err) {
        setError((err as { message: string }).message);
      } else {
        setError('An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    // Mark all fields as touched
    const fields = ['email', 'password'];
    const newTouched = fields.reduce((acc, field) => ({ ...acc, [field]: true }), {});
    setTouchedFields(newTouched);

    // Trigger validation for all fields
    const isValid = await signInForm.trigger();
    if (!isValid) return;

    setLoading(true);
    setError(null);
    
    try {
      const data = signInForm.getValues();
      await signIn(data.email, data.password);
    } catch (err: unknown) {
      if (typeof err === 'object' && err && 'message' in err) {
        setError((err as { message: string }).message);
      } else {
        setError('An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      await axios.post(`${apiUrl}/auth/forgot-password`, { email: sharedEmail });
      toast.success('Password reset email sent. Please check your inbox.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to send reset email.');
    } finally {
      setShowForgot(false);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Target className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Track your daily tasks and challenge your friends
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-md py-8 px-6 shadow-xl rounded-2xl border border-gray-200/50">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
          {isSignUp ? (
            <form onSubmit={handleSignUp} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  type="email"
                  value={sharedEmail}
                  onChange={handleEmailChange}
                  onBlur={() => handleFieldTouch('email')}
                  className={`mt-1 block w-full px-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    touchedFields['email'] && signUpForm.formState.errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {touchedFields['email'] && signUpForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {signUpForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  type="text"
                  {...signUpForm.register('username')}
                  onBlur={() => handleFieldTouch('username')}
                  className={`mt-1 block w-full px-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    touchedFields['username'] && signUpForm.formState.errors.username ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {touchedFields['username'] && signUpForm.formState.errors.username && (
                  <p className="mt-1 text-sm text-red-600">
                    {signUpForm.formState.errors.username.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Display Name
                </label>
                <input
                  type="text"
                  {...signUpForm.register('displayName')}
                  onBlur={() => handleFieldTouch('displayName')}
                  className={`mt-1 block w-full px-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    touchedFields['displayName'] && signUpForm.formState.errors.displayName ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {touchedFields['displayName'] && signUpForm.formState.errors.displayName && (
                  <p className="mt-1 text-sm text-red-600">
                    {signUpForm.formState.errors.displayName.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  value={sharedPassword}
                  onChange={handlePasswordChange}
                  onBlur={() => handleFieldTouch('password')}
                  className={`mt-1 block w-full px-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    touchedFields['password'] && signUpForm.formState.errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {touchedFields['password'] && signUpForm.formState.errors.password && (
                  <p className="mt-1 text-sm text-red-600">
                    {signUpForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
                    Creating account...
                  </span>
                ) : 'Sign up'}
              </Button>
            </form>
          ) : showForgot ? (
            <form
              onSubmit={handleForgotPassword}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">Email address</label>
                <input
                  type="email"
                  value={sharedEmail}
                  onChange={e => setSharedEmail(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
                    Sending reset link...
                  </span>
                ) : 'Send reset link'}
              </Button>
              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="mt-2 w-full text-sm text-gray-600 hover:text-gray-900"
              >
                Back to sign in
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignIn} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  type="email"
                  value={sharedEmail}
                  onChange={handleEmailChange}
                  onBlur={() => handleFieldTouch('email')}
                  className={`mt-1 block w-full px-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    touchedFields['email'] && signInForm.formState.errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {touchedFields['email'] && signInForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {signInForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  value={sharedPassword}
                  onChange={handlePasswordChange}
                  onBlur={() => handleFieldTouch('password')}
                  className={`mt-1 block w-full px-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    touchedFields['password'] && signInForm.formState.errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {touchedFields['password'] && signInForm.formState.errors.password && (
                  <p className="mt-1 text-sm text-red-600">
                    {signInForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Forgot your password?
                </button>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
                    Signing in...
                  </span>
                ) : 'Sign in'}
              </Button>
            </form>
          )}
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={handleSwitch}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            {isSignUp
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}