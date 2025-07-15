import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../hooks/useAuth';
import { Target } from 'lucide-react';
import { Button } from './ui/button';
import axios from 'axios';

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().min(3),
  displayName: z.string().min(1),
});

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
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
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<string | null>(null);

  const signUpForm = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: sharedEmail,
      password: sharedPassword,
      username: '',
      displayName: '',
    },
  });

  const signInForm = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: sharedEmail,
      password: sharedPassword,
    },
  });

  // Keep shared state in sync with form values
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSharedEmail(e.target.value);
    if (isSignUp) signUpForm.setValue('email', e.target.value);
    else signInForm.setValue('email', e.target.value);
  };
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSharedPassword(e.target.value);
    if (isSignUp) signUpForm.setValue('password', e.target.value);
    else signInForm.setValue('password', e.target.value);
  };

  // When switching forms, sync values
  const handleSwitch = () => {
    setIsSignUp((prev) => {
      const next = !prev;
      if (next) {
        // Going to sign up
        signUpForm.reset({
          email: sharedEmail,
          password: sharedPassword,
          username: '',
          displayName: '',
        });
      } else {
        // Going to sign in
        signInForm.reset({
          email: sharedEmail,
          password: sharedPassword,
        });
      }
      return next;
    });
    setError(null);
  };

  const handleSignUp = async (data: SignUpForm) => {
    setLoading(true);
    setError(null);
    try {
      await signUp(data.email, data.password, data.username, data.displayName);
      // After sign up, switch to sign in and autofill
      setSharedEmail(data.email);
      setSharedPassword(data.password);
      signInForm.reset({ email: data.email, password: data.password });
      setIsSignUp(false);
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

  const handleSignIn = async (data: SignInForm) => {
    setLoading(true);
    setError(null);
    try {
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
          {showForgot ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setForgotStatus(null);
                try {
                  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
                  const res = await axios.post(`${apiUrl}/auth/forgot-password`, { email: forgotEmail });
                  setForgotStatus('Password reset email sent. Please check your inbox.');
                } catch (err: any) {
                  setForgotStatus(err?.response?.data?.error || 'Failed to send reset email.');
                }
              }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">Email address</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              <Button type="submit" className="w-full">Send Reset Email</Button>
              {forgotStatus && (
                <div className="text-center text-sm mt-2 text-blue-600">{forgotStatus}</div>
              )}
              <Button type="button" variant="link" className="w-full" onClick={() => setShowForgot(false)}>
                Back to Sign In
              </Button>
            </form>
          ) : isSignUp ? (
            <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  {...signUpForm.register('email')}
                  type="email"
                  value={signUpForm.watch('email')}
                  onChange={handleEmailChange}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  {...signUpForm.register('username')}
                  type="text"
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Display Name
                </label>
                <input
                  {...signUpForm.register('displayName')}
                  type="text"
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  {...signUpForm.register('password')}
                  type="password"
                  value={signUpForm.watch('password')}
                  onChange={handlePasswordChange}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
              >
                {loading ? 'Creating account...' : 'Sign up'}
              </Button>
            </form>
          ) : (
            <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  {...signInForm.register('email')}
                  type="email"
                  value={signInForm.watch('email')}
                  onChange={handleEmailChange}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  {...signInForm.register('password')}
                  type="password"
                  value={signInForm.watch('password')}
                  onChange={handlePasswordChange}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
              <Button
                type="button"
                variant="link"
                className="w-full text-center text-sm text-blue-600 hover:text-purple-600 transition-colors"
                onClick={() => setShowForgot(true)}
              >
                Forgot password?
              </Button>
            </form>
          )}

          <div className="mt-6">
            <Button
              type="button"
              onClick={handleSwitch}
              variant="link"
              className="w-full text-center text-sm text-blue-600 hover:text-purple-600 transition-colors"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}