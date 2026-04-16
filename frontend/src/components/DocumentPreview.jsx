import { X, ExternalLink, FileText, Download } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';

export const getDocFullUrl = (docUrl) => {
  if (!docUrl) return null;
  return docUrl.startsWith('http') ? docUrl : `${API_BASE}${docUrl}`;
};

const DocumentPreview = ({ url, onClose }) => {
  if (!url) return null;

  const fullUrl = getDocFullUrl(url);
  const fileName = url.split('/').pop();

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <FileText size={16} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-800 truncate">{fileName}</h3>
              <p className="text-[10px] font-medium text-slate-400">Document Preview</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={fullUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-bold text-slate-500 hover:text-slate-700 px-3 py-1.5 bg-white rounded-lg hover:bg-slate-100 transition-colors border border-slate-200 flex items-center gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <Download size={13} /> Download
            </a>
            <button
              onClick={() => window.open(fullUrl, '_blank')}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 px-3 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200 flex items-center gap-1.5"
            >
              <ExternalLink size={13} /> New Tab
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Document Embed */}
        <div className="flex-1 bg-slate-100 overflow-hidden">
          <iframe
            src={fullUrl}
            className="w-full h-full border-0"
            title="Document Preview"
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentPreview;
