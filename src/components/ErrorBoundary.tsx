import { Component, type ErrorInfo, type PropsWithChildren } from 'react';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Household Finance crashed:', error, info.componentStack);
  }

  handleResetData = () => {
    localStorage.removeItem('household-finance');
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex h-screen items-center justify-center bg-cream font-sans text-body p-8">
        <div className="max-w-md bg-card border border-border rounded-[10px] p-8 flex flex-col gap-4">
          <h1 className="text-xl font-bold m-0">Something went wrong</h1>
          <p className="text-sm text-muted m-0">
            Household Finance hit an unexpected error and couldn't continue rendering. Your data is still saved in
            this browser.
          </p>
          <p className="text-xs text-subtle font-mono m-0">{this.state.error.message}</p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-md border-none bg-accent text-white text-[13px] font-semibold cursor-pointer"
            >
              Reload
            </button>
            <button
              onClick={this.handleResetData}
              className="px-4 py-2 rounded-md border border-inputborder bg-tile text-tile-text text-[13px] cursor-pointer"
            >
              Reset app data &amp; reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
