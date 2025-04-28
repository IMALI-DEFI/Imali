// components/ErrorBoundaryFallback.js
import React from "react";

class ErrorBoundaryFallback extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught in Error Boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center p-6 text-red-600">
          <h2 className="text-xl font-bold">Something went wrong 😢</h2>
          <p className="mt-2 text-sm">{this.state.error?.message || "An unknown error occurred."}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundaryFallback;