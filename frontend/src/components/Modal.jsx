import { X } from "lucide-react";
import { useEffect } from "react";

const Modal = ({ isOpen, onClose, title, children, footer }) => {
  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    // Backdrop: Semi-transparent slate with blur
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 transition-all duration-300 font-['Poppins']"
      onClick={onClose}
    >
      {/* Modal Container: White, heavily rounded (32px), soft shadow */}
      <div
        className="bg-white w-full max-w-lg max-h-[90vh] flex flex-col rounded-[32px] shadow-2xl shadow-slate-900/20 animate-in fade-in zoom-in-95 duration-200 border border-white/50 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="flex items-center justify-between p-6 pb-0 pl-8 pr-6">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all duration-200"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-8 overflow-y-auto no-scrollbar">{children}</div>

        {/* Footer Section (Optional) */}
        {footer && (
          <div className="p-6 pt-4 bg-slate-50/50 border-t border-slate-50 rounded-b-[32px] flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
