import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI, authAPI } from '../../services/api';
import {
  ArrowLeft, User, FileText, Calendar, Shield, Mail,
  Edit2, Trash2, Plus, ChevronDown, Upload, CheckCircle
} from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import { formatDate, getDaysUntilExpiry, getCertificateStatus } from '../../utils/helpers';

const EntityStaffDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [staff, setStaff] = useState(null);
  const [certTypes, setCertTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Certificate Modal
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [editingCert, setEditingCert] = useState(null);
  const [certFormData, setCertFormData] = useState({
    type: '',
    validFrom: '',
    validTo: '',
    docUrl: '',
    department: '',
    file: null,
  });
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => { 
    fetchData(); 
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [staffRes, typesRes] = await Promise.all([
        adminAPI.getStaffById(id),
        authAPI.getPublicCertificateTypes({ applicableTo: 'ENTITY' })
      ]);
      setStaff(staffRes.data.data);
      setCertTypes(typesRes.data.data || []);
    } catch (err) {
      setError('Data not found');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await adminAPI.getStaffById(id);
      setStaff(response.data.data);
    } catch (err) {
      // Ignore inner catch if fetching again silently
    }
  };

  // --- Certificate CRUD ---
  const handleOpenCertModal = (cert = null) => {
    if (cert) {
      setEditingCert(cert);
      setCertFormData({
        type: cert.type || (certTypes.length > 0 ? certTypes[0].name : ''),
        validFrom: cert.validFrom?.split('T')[0] || '',
        validTo: cert.validTo?.split('T')[0] || '',
        docUrl: cert.docUrl || '',
        department: cert.department || '',
        file: null,
      });
    } else {
      setEditingCert(null);
      setCertFormData({ type: certTypes.length > 0 ? certTypes[0].name : '', validFrom: '', validTo: '', docUrl: '', department: '', file: null });
    }
    setCertModalOpen(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await adminAPI.uploadDocument(formData);
      setCertFormData((prev) => ({ ...prev, docUrl: res.data.data.url, file }));
    } catch (err) {
      setError("Failed to upload file");
      setTimeout(() => setError(""), 3000);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleCertSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { 
        type: certFormData.type,
        validFrom: certFormData.validFrom,
        validTo: certFormData.validTo,
        docUrl: certFormData.docUrl || null,
        department: certFormData.department,
        staffId: parseInt(id) 
      };
      
      if (editingCert) {
        await adminAPI.updateCertificate(editingCert.id, payload);
        setSuccess('Certificate updated');
      } else {
        await adminAPI.createCertificate(payload);
        setSuccess('Certificate added');
      }
      setCertModalOpen(false);
      fetchStaff();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save certificate');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteCert = async (certId) => {
    if (!window.confirm('Delete this certificate?')) return;
    try {
      await adminAPI.deleteCertificate(certId);
      setSuccess('Certificate deleted');
      fetchStaff();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete certificate');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Certificate stats
  const certs = staff?.certificates || [];
  const certStats = certs.reduce(
    (acc, cert) => {
      const days = getDaysUntilExpiry(cert.validTo);
      if (days === null) return acc;
      if (days < 0) acc.expired++;
      else if (days <= 30) acc.expiring++;
      else acc.valid++;
      return acc;
    },
    { valid: 0, expiring: 0, expired: 0 }
  );

  const getVisibleZones = (zones) => {
    if (!zones || !Array.isArray(zones)) return [];
    return zones.filter(Boolean);
  };

  if (loading) return <LoadingSpinner fullScreen />;

  if (!staff) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center font-['Poppins']">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
          <User size={32} className="text-slate-300" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Staff member not found</h2>
        <button onClick={() => navigate(-1)} className="mt-6 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="font-['Poppins'] text-slate-900 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:shadow-md transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{staff.fullName}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-blue-600 font-medium">{staff.designation || 'No designation'}</span>
            {staff.entity && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-50 text-orange-600 border border-orange-100">
                {staff.entity.name}
              </span>
            )}
            {staff.empCode && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                #{staff.empCode}
              </span>
            )}
          </div>
        </div>
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Staff Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Personal Details</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Aadhaar</span>
              <span className="text-xs font-bold text-slate-700">{staff.aadhaarNumber || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Department</span>
              <span className="text-xs font-bold text-slate-700">{staff.department || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">AEP Number</span>
              <span className="text-xs font-bold text-slate-700">{staff.aepNumber || '—'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Access Details</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Terminals</span>
              <span className="text-xs font-bold text-slate-700">{staff.terminals || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Airports</span>
              <span className="text-xs font-bold text-slate-700">{staff.airportsGiven || '—'}</span>
            </div>
            {getVisibleZones(staff.zones).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {getVisibleZones(staff.zones).map((z, i) => (
                  <span key={i} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">{z}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Certificate Summary</p>
          <div className="flex gap-3 mt-2">
            <div className="flex-1 text-center p-2 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="block text-lg font-bold text-emerald-700">{certStats.valid}</span>
              <span className="text-[9px] font-bold text-emerald-600 uppercase">Valid</span>
            </div>
            <div className="flex-1 text-center p-2 bg-amber-50 rounded-xl border border-amber-100">
              <span className="block text-lg font-bold text-amber-700">{certStats.expiring}</span>
              <span className="text-[9px] font-bold text-amber-600 uppercase">Expiring</span>
            </div>
            <div className="flex-1 text-center p-2 bg-red-50 rounded-xl border border-red-100">
              <span className="block text-lg font-bold text-red-700">{certStats.expired}</span>
              <span className="text-[9px] font-bold text-red-600 uppercase">Expired</span>
            </div>
          </div>
        </div>
      </div>

      {/* Certificates Section */}
      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Shield size={20} className="text-blue-500" />
            Certificates ({certs.length})
          </h3>
          <button
            onClick={() => handleOpenCertModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-sm font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all"
          >
            <Plus size={18} /> Add Certificate
          </button>
        </div>

        {certs.length > 0 ? (
          <div className="space-y-3">
            {certs.map((cert) => {
              const status = getCertificateStatus(cert.validFrom, cert.validTo);
              const daysLeft = getDaysUntilExpiry(cert.validTo);
              return (
                <div key={cert.id} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50/60 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">{certTypes.find(t => t.name === cert.type)?.name || cert.type}</p>
                      {cert.department && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">
                          {cert.department}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar size={10} />
                        {formatDate(cert.validFrom)} — {formatDate(cert.validTo)}
                      </span>
                      {daysLeft !== null && daysLeft <= 30 && daysLeft >= 0 && (
                        <span className="text-[10px] font-bold text-red-500">Expires in {daysLeft} days</span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={status} />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenCertModal(cert)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteCert(cert.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-400">No certificates yet</p>
            <button
              onClick={() => handleOpenCertModal()}
              className="mt-3 text-sm font-bold text-blue-600 hover:underline"
            >
              Add first certificate
            </button>
          </div>
        )}
      </div>

      {/* Certificate Modal */}
      <Modal
        isOpen={certModalOpen}
        onClose={() => { setCertModalOpen(false); setEditingCert(null); }}
        title={editingCert ? 'Edit Certificate' : 'Add Certificate'}
      >
        <form onSubmit={handleCertSubmit} className="space-y-5 font-['Poppins']">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Certificate Type *</label>
              <select
                required
                value={certFormData.type}
                onChange={(e) => setCertFormData({ ...certFormData, type: e.target.value })}
                className="w-full bg-slate-50 text-sm font-medium text-slate-900 p-3 rounded-xl border border-transparent focus:bg-white focus:border-blue-100 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
              >
                {certTypes.map((t) => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
            {certFormData.type === 'KIAL_INTERNAL' && (
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Department *</label>
                <input
                  type="text" required
                  value={certFormData.department}
                  onChange={(e) => setCertFormData({ ...certFormData, department: e.target.value })}
                  className="w-full bg-slate-50 text-sm font-medium text-slate-900 p-3 rounded-xl border border-transparent focus:bg-white focus:border-blue-100 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
                  placeholder="e.g. Operations, Security"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Valid From</label>
              <input
                type="date"
                value={certFormData.validFrom}
                onChange={(e) => setCertFormData({ ...certFormData, validFrom: e.target.value })}
                className="w-full bg-slate-50 text-sm font-medium text-slate-900 p-3 rounded-xl border border-transparent focus:bg-white focus:border-blue-100 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Valid To</label>
              <input
                type="date"
                value={certFormData.validTo}
                onChange={(e) => setCertFormData({ ...certFormData, validTo: e.target.value })}
                className="w-full bg-slate-50 text-sm font-medium text-slate-900 p-3 rounded-xl border border-transparent focus:bg-white focus:border-blue-100 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Document (PDF, Image)</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                  <Upload size={16} />
                  {uploadingFile ? "Uploading..." : "Choose File"}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                  />
                </label>
                {certFormData.docUrl && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                    <CheckCircle size={14} />
                    File uploaded
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
            <button type="button" onClick={() => { setCertModalOpen(false); setEditingCert(null); }} className="px-5 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-6 py-2.5 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all">
              {editingCert ? 'Update' : 'Add Certificate'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EntityStaffDetailsPage;
