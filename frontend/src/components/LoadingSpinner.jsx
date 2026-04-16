const LoadingSpinner = ({ size = 'md', fullScreen = false }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-[3px]',
    lg: 'w-10 h-10 border-4',
  };

  const spinner = (
    <div
      className={`${sizeClasses[size]} border-slate-200 border-t-red-600 rounded-full animate-spin`}
    />
  );

  if (fullScreen) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
