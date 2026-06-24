// imali/Frontend/src/components/LoadingSpinner.jsx
import React from 'react';

const LoadingSpinner = ({ 
  size = 'medium',
  color = 'blue',
  fullScreen = false,
  text = 'Loading...',
  showText = true,
  className = '',
}) => {
  const sizes = {
    small: 'w-4 h-4 border-2',
    medium: 'w-8 h-8 border-3',
    large: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4'
  };

  const colors = {
    blue: 'border-blue-500',
    green: 'border-emerald-500',
    purple: 'border-purple-500',
    red: 'border-red-500',
    yellow: 'border-yellow-500',
    white: 'border-white',
    gray: 'border-gray-400'
  };

  const colorClass = colors[color] || colors.blue;

  const spinner = (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div 
        className={`${sizes[size]} ${colorClass} border-t-transparent rounded-full animate-spin`}
      />
      {showText && text && (
        <p className={`mt-3 text-sm ${color === 'white' ? 'text-white' : 'text-gray-400'}`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
};

// Page loader component
export const PageLoader = () => (
  <div className="min-h-screen bg-black flex flex-col items-center justify-center">
    <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    <p className="mt-4 text-gray-400">Loading...</p>
  </div>
);

export default LoadingSpinner;
