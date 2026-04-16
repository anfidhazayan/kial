import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { entityAPI, authAPI } from '../../services/api';
import {
  Users, Plus, Edit2, Search, FileText, Trash2,
  ChevronDown, ChevronRight, Calendar, Shield, X, Upload, Download
} from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';
import Modal from '../../components/Modal';
import { formatDate, getCertificateStatus } from '../../utils/helpers';
import { downloadBlob } from '../../utils/reportGenerator';

const EntityStaffPage = () => {
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [certTypes, setCertTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedStaff, setExpandedStaff] = useState({});

  // Staff Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    designation: '',
    aadhaarNumber: '',
    department: '',
    aepNumber: '',
    email: '',
  });

  // New Certificates being created along with staff
  const [newCertificates, setNewCertificates] = useState([]);

  // Certificate Modal
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [editingCert, setEditingCert] = useState(null);
  const [certStaffId, setCertStaffId] = useState(null);
  const [certFormData, setCertFormData] = useState({
    type: '',
    validFrom: '',
    validTo: '',
    docUrl: '',
    department: '',
    file: null,
  });

  useEffect(() => { 
    fetchData(); 
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [staffRes, typesRes] = await Promise.all([
        entityAPI.getStaff(),
        authAPI.getPublicCertificateTypes({ applicableTo: 'ENTITY' })
      ]);
      setStaff(staffRes.data.data || []);
      setCertTypes(typesRes.data.data || []);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await entityAPI.getStaff();
      setStaff(response.data.data || []);
    } catch (err) {
      setError('Failed to load staff');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- Staff CRUD ---
  const handleOpenModal = (staffMember = null) => {
    if (staffMember) {
      setEditingStaff(staffMember);
      setFormData({
        fullName: staffMember.fullName || '',
        designation: staffMember.designation || '',
        aadhaarNumber: staffMember.aadhaarNumber || '',
        department: staffMember.department || '',
        aepNumber: staffMember.aepNumber || '',
        email: staffMember.user?.email || '',
      });
    } else {
      setEditingStaff(null);
      setFormData({ fullName: '', designation: '', aadhaarNumber: '', department: '', aepNumber: '', email: '' });
    }
    setNewCertificates([]);
    setIsModalOpen(true);
  };

  const addCertificate = () => {
    setNewCertificates(prev => [
      ...prev,
      {
        id: Date.now(),
        type: certTypes.length > 0 ? certTypes[0].name : '',
        validFrom: '',
        validTo: '',
        department: '',
        file: null,
        docUrl: ''
      }
    ]);
  };

  const updateCertificate = (index, field, value) => {
    setNewCertificates(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const handleFileChange = (index, event) => {
    const file = event.target.files[0];
    if (file && file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      setTimeout(() => setError(''), 3000);
      return;
    }
    setNewCertificates(prev => {
      const updated = [...prev];
      updated[index].file = file;
      return updated;
    });
  };

  const removeCertificate = (index) => {
    setNewCertificates(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let staffIdToUse;
      if (editingStaff) {
        await entityAPI.updateStaff(editingStaff.id, formData);
        staffIdToUse = editingStaff.id;
        setSuccess('Staff updated successfully');
      } else {
        const res = await entityAPI.createStaff(formData);
        staffIdToUse = res.data.data.id;
        setSuccess('Staff created successfully');
      }

      // Handle new certificates
      for (const cert of newCertificates) {
        if (!cert.type) continue;
        const certData = new FormData();
        certData.append('staffId', staffIdToUse);
        certData.append('type', cert.type);
        if (cert.validFrom) certData.append('validFrom', cert.validFrom);
        if (cert.validTo) certData.append('validTo', cert.validTo);
        if (cert.department) certData.append('department', cert.department);
        if (cert.file) {
          certData.append('document', cert.file);
        } else if (cert.docUrl) {
          certData.append('docUrl', cert.docUrl);
        }
        await entityAPI.createCertificate(certData);
      }

      setIsModalOpen(false);
      setNewCertificates([]);
      fetchStaff();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save staff');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm('Delete this staff member and all their certificates?')) return;
    try {
      await entityAPI.deleteStaff(id);
      setSuccess('Staff deleted successfully');
      fetchStaff();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete staff');
      setTimeout(() => setError(''), 3000);
    }
  };

  // --- Certificate CRUD ---
  const handleOpenCertModal = (staffId, cert = null) => {
    setCertStaffId(staffId);
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

  const handleCertFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      setTimeout(() => setError(''), 3000);
      return;
    }
    setCertFormData(prev => ({ ...prev, file }));
  };

  const handleCertSubmit = async (e) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('type', certFormData.type);
      if (certFormData.validFrom) formDataToSend.append('validFrom', certFormData.validFrom);
      if (certFormData.validTo) formDataToSend.append('validTo', certFormData.validTo);
      if (certFormData.department) formDataToSend.append('department', certFormData.department);
      
      if (certFormData.file) {
        formDataToSend.append('document', certFormData.file);
      } else if (certFormData.docUrl) {
        formDataToSend.append('docUrl', certFormData.docUrl);
      }

      if (editingCert) {
        await entityAPI.updateCertificate(editingCert.id, formDataToSend);
        setSuccess('Certificate updated');
      } else {
        formDataToSend.append('staffId', certStaffId);
        await entityAPI.createCertificate(formDataToSend);
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
      await entityAPI.deleteCertificate(certId);
      setSuccess('Certificate deleted');
      fetchStaff();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete certificate');
      setTimeout(() => setError(''), 3000);
    }
  };

  const toggleExpand = (id) => {
    setExpandedStaff(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- Search ---
  const filteredStaff = staff.filter(s =>
    s.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.aadhaarNumber?.includes(searchTerm) ||
    s.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    if (!status) return 'bg-slate-100 text-slate-500 border-slate-200';
    const s = status.toLowerCase();
    if (s === 'valid' || s === 'active') return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    if (s === 'expiring') return 'bg-amber-50 text-amber-600 border-amber-200';
    if (s === 'expired') return 'bg-red-50 text-red-600 border-red-200';
    return 'bg-slate-100 text-slate-500 border-slate-200';
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="font-['Poppins'] text-slate-900 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Manage your personnel and their certificates
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2">
            <Users size={16} className="text-blue-500" />
            <span className="text-xs font-bold text-slate-600">Total:</span>
            <span className="text-sm font-bold text-slate-900">{staff.length}</span>
          </div>
          <button
            onClick={async () => {
              try {
                const params = {};
                if (searchTerm) params.searchTerm = searchTerm;
                const res = await entityAPI.exportStaff(params);
                downloadBlob(res.data, `Entity_Staff_${new Date().toISOString().split('T')[0]}.xlsx`);
              } catch (err) {
                setError('Failed to export staff list');
              }
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-2xl text-sm font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95"
          >
            <Download size={18} /> Export Excel
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-sm font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95"
          >
            <Plus size={18} />
            Add Staff
          </button>
        </div>
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Search Bar */}
      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, designation, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 text-sm font-medium text-slate-900 placeholder:text-slate-400 pl-12 pr-4 py-3.5 rounded-2xl border border-transparent focus:bg-white focus:border-blue-100 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
          />
        </div>
      </div>

      {/* Staff List */}
      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 min-h-[400px]">
        {filteredStaff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Users size={32} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No staff found</h3>
            <p className="text-sm text-slate-500 mt-1">
              {searchTerm ? 'Try adjusting your search' : 'Get started by adding a staff member'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredStaff.map((member) => {
              const isExpanded = expandedStaff[member.id];
              const certs = member.certificates || [];
              const validCerts = certs.filter(c => {
                const s = getCertificateStatus(c.validFrom, c.validTo);
                return s === 'Valid' || s === 'Active';
              }).length;
              const expiringCerts = certs.filter(c => getCertificateStatus(c.validFrom, c.validTo) === 'Expiring Soon').length;
              const expiredCerts = certs.filter(c => getCertificateStatus(c.validFrom, c.validTo) === 'Expired').length;

              return (
                <div key={member.id} className="border border-slate-100 rounded-2xl overflow-hidden hover:border-slate-200 transition-all">
                  {/* Staff Row */}
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
                    onClick={() => toggleExpand(member.id)}
                  >
                    {/* Expand Arrow */}
                    <button className="p-1 text-slate-400 hover:text-slate-600 shrink-0">
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                      {member.fullName?.charAt(0) || '?'}
                    </div>

                    {/* Name + Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 truncate">{member.fullName}</p>
                        {member.empCode && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-500 border border-slate-200 shrink-0">
                            #{member.empCode}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-slate-500">{member.designation || 'No designation'}</span>
                        {member.user?.email && (
                          <span className="text-xs text-slate-400 truncate max-w-[180px]">{member.user.email}</span>
                        )}
                      </div>
                    </div>

                    {/* Certificate Summary Pills */}
                    <div className="flex items-center gap-2 shrink-0">
                      {certs.length > 0 ? (
                        <>
                          {validCerts > 0 && (
                            <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                              {validCerts} valid
                            </span>
                          )}
                          {expiringCerts > 0 && (
                            <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                              {expiringCerts} expiring
                            </span>
                          )}
                          {expiredCerts > 0 && (
                            <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red-50 text-red-600 border border-red-100">
                              {expiredCerts} expired
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100">
                          No certs
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenModal(member)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="Edit staff"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteStaff(member.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Delete staff"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded: Certificates */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 bg-slate-50/50 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Shield size={14} className="text-blue-500" />
                          Certificates ({certs.length})
                        </h4>
                        <button
                          onClick={() => handleOpenCertModal(member.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-sm"
                        >
                          <Plus size={14} /> Add Certificate
                        </button>
                      </div>

                      {certs.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {certs.map((cert) => {
                            const status = getCertificateStatus(cert.validFrom, cert.validTo);
                            return (
                              <div key={cert.id} className="p-3.5 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                                    <FileText size={16} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-900 truncate">
                                      {certTypes.find(t => t.name === cert.type)?.name || cert.type}
                                    </p>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <Calendar size={10} className="text-slate-400" />
                                      <span className="text-[10px] text-slate-500">
                                        {cert.validTo ? formatDate(cert.validTo) : 'No expiry'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${getStatusColor(status)}`}>
                                    {status || 'N/A'}
                                  </span>
                                  <button
                                    onClick={() => handleOpenCertModal(member.id, cert)}
                                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                    title="Edit"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCert(cert.id)}
                                    className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    title="Delete"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-white rounded-xl border border-dashed border-slate-200">
                          <FileText size={24} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-xs text-slate-400 font-medium">No certificates yet</p>
                          <button
                            onClick={() => handleOpenCertModal(member.id)}
                            className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                          >
                            Add first certificate
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Staff Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStaff ? 'Edit Staff Member' : 'Add New Staff'}
      >
        <form onSubmit={handleSubmit} className="space-y-5 font-['Poppins']">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Full Name *</label>
              <input
                type="text" required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full bg-slate-50 text-sm font-medium text-slate-900 p-3 rounded-xl border border-transparent focus:bg-white focus:border-blue-100 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
                placeholder="e.g. John Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Designation</label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full bg-slate-50 text-sm font-medium text-slate-900 p-3 rounded-xl border border-transparent focus:bg-white focus:border-blue-100 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
                placeholder="e.g. Security Officer"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Aadhaar Number</label>
              <input
                type="text"
                value={formData.aadhaarNumber}
                onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value })}
                className="w-full bg-slate-50 text-sm font-medium text-slate-900 p-3 rounded-xl border border-transparent focus:bg-white focus:border-blue-100 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
                placeholder="12-digit number"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full bg-slate-50 text-sm font-medium text-slate-900 p-3 rounded-xl border border-transparent focus:bg-white focus:border-blue-100 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
                placeholder="e.g. Operations"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">AEP Number</label>
              <input
                type="text"
                value={formData.aepNumber}
                onChange={(e) => setFormData({ ...formData, aepNumber: e.target.value })}
                className="w-full bg-slate-50 text-sm font-medium text-slate-900 p-3 rounded-xl border border-transparent focus:bg-white focus:border-blue-100 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
                placeholder="AEP number"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-50 text-sm font-medium text-slate-900 p-3 rounded-xl border border-transparent focus:bg-white focus:border-blue-100 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
                placeholder="staff@example.com"
              />
            </div>
          </div>

          {!editingStaff && (
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">Certificates <span className="text-xs font-medium text-slate-400 font-normal">(Optional)</span></h3>
                <button
                  type="button"
                  onClick={addCertificate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
                >
                  <Plus size={14} /> Add Certificate
                </button>
              </div>

              {newCertificates.length === 0 ? (
                <div className="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400 font-medium tracking-wide">No certificates added yet.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {newCertificates.map((cert, idx) => (
                    <div key={cert.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 relative">
                      <button
                        type="button"
                        onClick={() => removeCertificate(idx)}
                        className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="grid grid-cols-2 gap-3 pr-8">
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Type *</label>
                          <select
                            required
                            value={cert.type}
                            onChange={(e) => updateCertificate(idx, 'type', e.target.value)}
                            className="w-full bg-white text-xs font-medium text-slate-900 p-2.5 rounded-lg border border-slate-200 outline-none"
                          >
                            <option value="" disabled>Select Type</option>
                            {certTypes.map(t => (
                              <option key={t.id} value={t.name}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                        {cert.type === 'KIAL_INTERNAL' && (
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Department *</label>
                            <input
                              type="text"
                              required
                              value={cert.department}
                              onChange={(e) => updateCertificate(idx, 'department', e.target.value)}
                              className="w-full bg-white text-xs font-medium text-slate-900 p-2.5 rounded-lg border border-slate-200 outline-none"
                              placeholder="e.g. Operations"
                            />
                          </div>
                        )}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Valid From</label>
                          <input
                            type="date"
                            value={cert.validFrom}
                            onChange={(e) => updateCertificate(idx, 'validFrom', e.target.value)}
                            className="w-full bg-white text-xs font-medium text-slate-900 p-2.5 rounded-lg border border-slate-200 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Valid To</label>
                          <input
                            type="date"
                            value={cert.validTo}
                            onChange={(e) => updateCertificate(idx, 'validTo', e.target.value)}
                            className="w-full bg-white text-xs font-medium text-slate-900 p-2.5 rounded-lg border border-slate-200 outline-none"
                          />
                        </div>
                        
                        <div className="col-span-2 mt-1 flex items-center gap-3">
                          <div className="flex-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Document</label>
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                                <Upload size={14} />
                                {cert.file ? 'Change File' : 'Choose File'}
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                                  onChange={(e) => handleFileChange(idx, e)}
                                />
                              </label>
                              {cert.file && (
                                <span className="text-[10px] font-bold text-emerald-600 truncate max-w-[150px]">
                                  {cert.file.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-6 py-2.5 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all">
              {editingStaff ? 'Update Staff' : 'Create Staff'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Certificate Add/Edit Modal */}
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
                {certTypes.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
            {certFormData.type === 'KIAL_INTERNAL' && (
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Department *</label>
                <input
                  type="text"
                  required
                  value={certFormData.department}
                  onChange={(e) => setCertFormData({ ...certFormData, department: e.target.value })}
                  className="w-full bg-slate-50 text-sm font-medium text-slate-900 p-3 rounded-xl border border-transparent focus:bg-white focus:border-blue-100 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
                  placeholder="e.g. Operations, Security, Maintenance"
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
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Document</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                  <Upload size={16} />
                  {certFormData.file ? 'File Selected' : 'Choose File'}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                    onChange={handleCertFileChange}
                  />
                </label>
                {certFormData.file && (
                  <span className="text-xs font-bold text-emerald-600 truncate max-w-[200px]">
                    {certFormData.file.name}
                  </span>
                )}
                {!certFormData.file && certFormData.docUrl && (
                  <a
                    href={certFormData.docUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                  >
                    View Current Document
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
            <button type="button" onClick={() => { setCertModalOpen(false); setEditingCert(null); }} className="px-5 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-6 py-2.5 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all">
              {editingCert ? 'Update Certificate' : 'Add Certificate'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EntityStaffPage;
