import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import { checkSession, getSignupsOpen, login, signup } from '../lib/auth';
import { useFinanceStore } from '../store/financeStore';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

type Status = 'checking' | 'authenticated' | 'unauthenticated';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('checking');
  const setHouseholdName = useFinanceStore((s) => s.setHouseholdName);
  const setHouseholdSlug = useFinanceStore((s) => s.setHouseholdSlug);
  const setIsAdmin = useFinanceStore((s) => s.setIsAdmin);

  useEffect(() => {
    checkSession().then((session) => {
      if (session.authenticated) {
        setHouseholdName(session.householdName || '');
        setHouseholdSlug(session.slug || '');
        setIsAdmin(session.isAdmin === true);
        setStatus('authenticated');
      } else {
        setStatus('unauthenticated');
      }
    });
  }, [setHouseholdName, setHouseholdSlug, setIsAdmin]);

  if (status === 'checking') {
    return (
      <div className="flex h-screen items-center justify-center bg-cream font-sans text-body">
        <div className="text-sm text-muted">Loading…</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <LoginSignupScreen
        onAuthenticated={(householdName, slug, isAdmin) => {
          setHouseholdName(householdName);
          setHouseholdSlug(slug);
          setIsAdmin(isAdmin);
          setStatus('authenticated');
        }}
      />
    );
  }

  return <>{children}</>;
}

function LoginSignupScreen({
  onAuthenticated,
}: {
  onAuthenticated: (householdName: string, slug: string, isAdmin: boolean) => void;
}) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [signupsOpen, setSignupsOpen] = useState(true);
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [householdName, setHouseholdNameField] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingHouseholdName, setPendingHouseholdName] = useState<string | null>(null);

  useEffect(() => {
    getSignupsOpen().then(setSignupsOpen);
  }, []);

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHouseholdNameField(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!slug.trim() || !password) {
      setError('Household ID and password are required.');
      return;
    }
    if (mode === 'signup') {
      if (!householdName.trim()) {
        setError('Household name is required.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setSubmitting(true);
    const result = mode === 'login' ? await login(slug, password) : await signup(slug, householdName, password);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error || 'Something went wrong.');
      return;
    }

    if (mode === 'signup') {
      setPendingHouseholdName((result as { householdName?: string }).householdName || householdName.trim());
      return;
    }

    const loginResult = result as { householdName?: string; isAdmin?: boolean };
    onAuthenticated(loginResult.householdName || slug, slug, loginResult.isAdmin === true);
  };

  if (pendingHouseholdName) {
    return (
      <div className="flex h-screen items-center justify-center bg-cream font-sans text-body px-4">
        <Card className="p-8 w-full max-w-[400px]">
          <div className="text-[15px] font-bold mb-1">Household Finance</div>
          <p className="text-sm mt-3 mb-0">
            <b>{pendingHouseholdName}</b> has been created and is awaiting approval. You'll be able to log in once
            it's approved.
          </p>
          <button
            onClick={() => {
              setPendingHouseholdName(null);
              setMode('login');
            }}
            className="text-xs text-accent underline mt-4 cursor-pointer bg-transparent border-none p-0"
          >
            Back to log in
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-cream font-sans text-body px-4">
      <Card className="p-8 w-full max-w-[400px]">
        <div className="text-[15px] font-bold mb-1">Household Finance</div>
        <p className="text-sm text-muted mt-0 mb-5">
          {mode === 'login' ? 'Log in to your household.' : 'Set up a new household.'}
        </p>
        {mode === 'signup' && !signupsOpen ? (
          <p className="text-sm m-0">New signups are currently closed. Check back later, or ask whoever invited you.</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {mode === 'signup' && (
              <div>
                <label className="text-xs text-muted block mb-1.5">Household name</label>
                <input
                  value={householdName}
                  onChange={handleNameChange}
                  placeholder="The Smiths"
                  className="w-full border border-inputborder rounded-md px-2.5 py-2 text-sm"
                />
              </div>
            )}
            <div>
              <label className="text-xs text-muted block mb-1.5">Household ID</label>
              <input
                value={slug}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setSlug(slugify(e.target.value));
                  setSlugTouched(true);
                }}
                placeholder="the-smiths"
                className="w-full border border-inputborder rounded-md px-2.5 py-2 text-sm font-mono"
              />
              {mode === 'signup' && <p className="text-xs text-subtle mt-1 mb-0">Lowercase letters, numbers, and hyphens only.</p>}
            </div>
            <div>
              <label className="text-xs text-muted block mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                className="w-full border border-inputborder rounded-md px-2.5 py-2 text-sm"
              />
            </div>
            {mode === 'signup' && (
              <div>
                <label className="text-xs text-muted block mb-1.5">Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                  className="w-full border border-inputborder rounded-md px-2.5 py-2 text-sm"
                />
              </div>
            )}
            {error && <p className="text-xs text-negative m-0">{error}</p>}
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create household'}
            </Button>
          </form>
        )}
        <button
          onClick={switchMode}
          className="text-xs text-accent underline mt-4 cursor-pointer bg-transparent border-none p-0 block"
        >
          {mode === 'login' ? "Don't have a household yet? Sign up" : 'Already have a household? Log in'}
        </button>
        <a
          href="/user-guide.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted underline mt-2.5 inline-block"
        >
          New here? Read the user guide
        </a>
      </Card>
    </div>
  );
}
