import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

const Alert = ({ type = 'info', children, onClose, className = '' }) => {
  const styles = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  };

  const icons = {
    success: <CheckCircle size={20} className="text-emerald-600" />,
    error: <AlertCircle size={20} className="text-red-600" />,
    warning: <AlertTriangle size={20} className="text-amber-600" />,
    info: <Info size={20} className="text-blue-600" />,
  };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${styles[type]} ${className}`}>
      <div className="flex-shrink-0 mt-0.5">
        {icons[type]}
      </div>
      <div className="flex-1 text-sm font-medium">
        {children}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded-md hover:bg-black/5 transition-colors"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default Alert;
