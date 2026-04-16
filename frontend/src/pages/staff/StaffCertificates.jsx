import { useState, useEffect } from 'react';
import { staffAPI, authAPI } from '../../services/api';
import { FileText, Calendar, Plus, ExternalLink, CalendarDays, Key, Trash2, Edit2 } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';
import Modal from '../../components/Modal';
import DocumentPreview from '../../components/DocumentPreview';
import { formatDate, getDaysUntilExpiry } from '../../utils/helpers';

const getBadgeStyle = (status, validTo) => {
  if (status !== 'APPROVED') return 'bg-slate-100 text-slate-600 border-slate-200';
  if (!validTo) return 'bg-slate-100 text-slate-600 border-slate-200';
  
  const days = getDaysUntilExpiry(validTo);
  if (days < 0) return 'bg-red-50 text-red-600 border-red-100';
  if (days <= 30) return 'bg-amber-50 text-amber-600 border-amber-100';
  return 'bg-emerald-50 text-emerald-600 border-emerald-100';
};

const getStatusLabel = (status, validTo) => {
  if (status !== 'APPROVED') return status;
  if (!validTo) return 'Valid';
  
  const days = getDaysUntilExpiry(validTo);
  if (days < 0) return 'Expired';
  if (days <= 30) return 'Expiring Soon';
  return 'Valid';
};

const StaffCertificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [certTypes, setCertTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingCertId, setEditingCertId] = useState(null);
  const [docPreviewUrl, setDocPreviewUrl] = useState(null);
  const [formData, setFormData] = useState({
    type: 'AVSEC',
    validFrom: '',
    validTo: '',
    document: null,
    department: '',
  });

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const [response, typesRes] = await Promise.all([
        staffAPI.getCertificates(),
        authAPI.getPublicCertificateTypes({ applicableTo: 'KIAL' }),
      ]);
      setCertificates(response.data.data || []);
      setCertTypes(typesRes.data.data || []);
    } catch (err) {
      setError('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  const defaultType = certTypes.length > 0 ? certTypes[0].name : '';

  const handleOpenModal = (cert = null) => {
    if (cert) {
      setEditingCertId(cert.id);
      setFormData({
        type: cert.type || defaultType,
        validFrom: cert.validFrom ? cert.validFrom.split('T')[0] : '',
        validTo: cert.validTo ? cert.validTo.split('T')[0] : '',
        document: null,
        department: cert.department || '',
      });
    } else {
      setEditingCertId(null);
      setFormData({ type: defaultType, validFrom: '', validTo: '', document: null, department: '' });
    }
    setIsModalOpen(true);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    setError('');
    
    try {
      const data = new FormData();
      data.append('type', formData.type);
      if (formData.validFrom) data.append('validFrom', formData.validFrom);
      if (formData.validTo) data.append('validTo', formData.validTo);
      if (formData.department) data.append('department', formData.department);
      if (formData.document) {
        data.append('document', formData.document);
      }

      if (editingCertId) {
        await staffAPI.updateCertificate(editingCertId, data);
        setSuccess('Certificate updated successfully');
      } else {
        await staffAPI.createCertificate(data);
        setSuccess('Certificate uploaded successfully');
      }
      
      fetchCertificates();
      setIsModalOpen(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to remove this certificate?')) return;
    try {
      await staffAPI.deleteCertificate(id);
      setSuccess('Certificate removed');
      fetchCertificates();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Failed to remove certificate');
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="font-['Poppins'] text-slate-900 space-y-8 max-w-6xl mx-auto py-4">
      <div className="border-b border-slate-200 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-slate-900">My Certificates</h1>
          <p className="text-sm text-slate-500 mt-2 font-medium">
            Manage your credentials and view training records
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-2.5 bg-red-700 text-white rounded-lg text-sm font-semibold hover:bg-red-800 transition-all active:scale-[0.98] shadow-sm shadow-red-900/20"
        >
          <Plus size={16} /> New Certificate
        </button>
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}

      {certificates.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center border border-slate-200 mb-4 shadow-sm">
            <FileText size={24} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No Certificates Found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            You haven't uploaded any certificates yet. Click the button above to add your first one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((cert) => (
            <div key={cert.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{cert.type}</h3>
                    <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">Certificate</p>
                  </div>
                </div>
                
                <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${getBadgeStyle(cert.status, cert.validTo)}`}>
                  {getStatusLabel(cert.status, cert.validTo)}
                </div>
              </div>

              <div className="space-y-4 mb-6 flex-1">
                <div className="flex items-center gap-3 text-sm">
                  <CalendarDays size={16} className="text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium tracking-wide">Issued On</p>
                    <p className="text-sm font-medium text-slate-900">{cert.validFrom ? formatDate(cert.validFrom) : 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar size={16} className="text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 font-medium tracking-wide">Valid Until</p>
                    <p className="text-sm font-medium text-slate-900">{cert.validTo ? formatDate(cert.validTo) : 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                {cert.docUrl ? (
                  <button
                    onClick={() => setDocPreviewUrl(cert.docUrl)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg"
                  >
                    <FileText size={14} /> View Document
                  </button>
                ) : (
                  <span className="text-xs font-medium text-slate-400">No Document Attached</span>
                )}

                <div className="flex items-center gap-1 border-l border-slate-100 pl-3">
                  <button
                    onClick={() => handleOpenModal(cert)}
                    className="text-slate-400 hover:text-red-700 transition-colors p-1"
                    title="Edit Certificate"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(cert.id)}
                    className="text-slate-400 hover:text-red-700 transition-colors p-1"
                    title="Remove Certificate"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCertId ? "Edit Certificate" : "Upload Certificate"}
      >
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Certificate Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 outline-none"
              required
            >
              {certTypes.map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Valid From</label>
              <input
                type="date"
                value={formData.validFrom}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 outline-none"
              />
            </div>
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Valid To</label>
              <input
                type="date"
                value={formData.validTo}
                onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Document Attachment</label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              onChange={(e) => setFormData({ ...formData, document: e.target.files[0] })}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:ring-1 focus:ring-red-700 focus:border-red-700 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
            />
            <p className="text-[11px] text-slate-500 font-medium">
              {editingCertId && !formData.document ? "Leave empty to keep existing document. Maximum file size: 10MB" : "Maximum file size: 10MB. Allowed: PDF, Images, Word."}
            </p>
          </div>

          <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-6 py-2.5 bg-red-700 text-white rounded-lg text-sm font-semibold hover:bg-red-800 transition-all active:scale-95 disabled:opacity-70 flex items-center gap-2"
            >
              {isUploading ? <LoadingSpinner size="sm" color="white" /> : null}
              {isUploading ? 'Saving...' : 'Save Certificate'}
            </button>
          </div>
        </form>
      </Modal>
      <DocumentPreview url={docPreviewUrl} onClose={() => setDocPreviewUrl(null)} />
    </div>
  );
};

export default StaffCertificates;
