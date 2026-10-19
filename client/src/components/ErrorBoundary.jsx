import { Component } from "react";

/**
 * Catches render errors in a page so one broken module cannot take down the
 * whole application (important for a site used by hospital staff).
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="max-w-md rounded-xl bg-rose-50 p-6 ring-1 ring-rose-200">
          <p className="text-sm font-semibold text-rose-800">This page could not be displayed</p>
          <p className="mt-2 text-sm text-rose-700">
            {error.message || "An unexpected error occurred while loading the page."}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="rounded-lg bg-surface px-4 py-2 text-sm font-medium text-rose-700 shadow-sm ring-1 ring-rose-300 transition hover:bg-rose-100"
            >
              Try again
            </button>
            <a
              href="/"
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
}
