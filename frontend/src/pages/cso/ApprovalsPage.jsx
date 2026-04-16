import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { CheckCircle, X, Clock, Eye, FileCheck, History, User, Building, FileText } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import DocumentPreview from '../../components/DocumentPreview';
import { formatDate } from '../../utils/helpers';

const ApprovalsPage = () => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [docPreviewUrl, setDocPreviewUrl] = useState(null);

  useEffect(() => {
    fetchApprovals();
  }, [activeTab]);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const response = activeTab === 'pending'
        ? await adminAPI.getPendingApprovals()
        : await adminAPI.getApprovalHistory();
      setApprovals(response.data.data || []);
    } catch (err) {
      setError('Failed to load approvals');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id, approve) => {
    try {
      const status = approve ? 'APPROVED' : 'REJECTED';
      await adminAPI.approveCertificate(id, { status }); // Updated endpoint route but same client method
      setSuccess(`Request ${approve ? 'approved' : 'rejected'} successfully`);
      setIsModalOpen(false);
      fetchApprovals();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process approval');
      setTimeout(() => setError(''), 3000);
    }
  };

  const openModal = (approval) => {
    setSelectedApproval(approval);
    setIsModalOpen(true);
  };

  const getEntityIcon = (entityType) => {
    switch(entityType) {
      case 'Staff': return <User size={18} />;
      case 'Entity': return <Building size={18} />;
      case 'Certificate': return <FileText size={18} />;
      default: return <FileCheck size={18} />;
    }
  };

  const getPrimaryDetail = (req) => {
    if (req.entityType === 'Certificate' || req.entityType === 'EntityCertificate') {
      return req.payload?.type || req.currentData?.type || `${req.entityType} #${req.entityId}`;
    }
    if (req.entityType === 'Staff') {
      return req.payload?.fullName || req.currentData?.fullName || `Staff #${req.entityId}`;
    }
    if (req.entityType === 'Entity') {
      return req.payload?.name || req.currentData?.name || `Entity #${req.entityId}`;
    }
    return `${req.entityType} #${req.entityId}`;
  };

  const getSecondaryDetail = (req) => {
    if (req.entityType === 'Certificate') {
      const staffName = req.currentData?.staff?.fullName || 'Unknown Staff';
      const orgName = req.currentData?.staff?.entity?.name || (req.currentData?.staff?.isKialStaff ? 'KIAL' : '');
      return orgName ? `${staffName} • ${orgName}` : staffName;
    }
    if (req.entityType === 'EntityCertificate') {
      const entityName = req.currentData?.entity?.name || 'Unknown Entity';
      return entityName;
    }
    if (req.entityType === 'Staff') {
      return req.payload?.email || req.currentData?.email || req.payload?.department || req.currentData?.department || 'Profile Update';
    }
    if (req.entityType === 'Entity') {
      return req.payload?.category || req.currentData?.category || 'Entity Profile Update';
    }
    return req.payload ? "Contains updated fields" : "Standard operation";
  };
  const getActionColor = (action) => {
    switch(action) {
      case 'CREATE': return 'bg-green-100 text-green-700 border-green-200';
      case 'UPDATE': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'DELETE': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading && approvals.length === 0) return <LoadingSpinner fullScreen />;

  return (
    <div className="font-['Poppins'] text-slate-900 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Approvals</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Review and approve platform changes (Staff, Entities, Certificates)
          </p>
        </div>

        {/* Count Badge */}
        <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2">
          <FileCheck size={16} className="text-blue-500" />
          <span className="text-xs font-bold text-slate-600">
            {activeTab === 'pending' ? 'Pending Requests:' : 'History:'}
          </span>
          <span className="text-sm font-bold text-slate-900">{approvals.length}</span>
        </div>
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Tabs */}
      <div className="bg-white rounded-[32px] p-2 shadow-sm border border-slate-100 inline-flex gap-1">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
            activeTab === 'pending'
              ? 'bg-red-700 text-white shadow-lg shadow-red-700/20'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Clock size={16} />
          Pending Approvals
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-red-700 text-white shadow-lg shadow-red-700/20'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <History size={16} />
          History
        </button>
      </div>

      {/* Approvals Table */}
      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 min-h-[400px]">
        {loading ? (
             <div className="flex justify-center items-center h-[300px]">
                <LoadingSpinner />
             </div>
        ) : approvals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={32} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {activeTab === 'pending' ? 'No pending requests' : 'No approval history'}
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              {activeTab === 'pending'
                ? 'All system requests have been processed. You are all caught up!'
                : 'No approvals have been processed yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-4 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-6">
                    Request Target
                  </th>
                  <th className="px-4 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Requested By
                  </th>
                  <th className="px-4 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Target Type
                  </th>
                  <th className="px-4 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-4 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-4 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider pr-6">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {approvals.map((req) => (
                  <tr key={req.id} className="group hover:bg-slate-50 transition-colors">
                    {/* Details Column */}
                    <td className="px-4 py-4 whitespace-nowrap pl-6">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center font-bold text-sm shadow-sm border border-slate-100">
                          {getEntityIcon(req.entityType)}
                        </div>
                        <div className="flex flex-col">
                           <span className="text-sm font-bold text-slate-900">
                             {getPrimaryDetail(req)}
                           </span>
                           <span className="text-[10px] font-medium text-slate-400 max-w-[200px] truncate">
                              {getSecondaryDetail(req)}
                           </span>
                        </div>
                      </div>
                    </td>

                    {/* Requester Column */}
                    <td className="px-4 py-4 whitespace-nowrap">
                       <div className="flex flex-col">
                         <span className="text-sm font-bold text-slate-900">
                           {req.requester?.fullName || "System Admin"}
                         </span>
                         <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full w-fit">
                           {req.requester?.role || "AUTO"}
                         </span>
                       </div>
                    </td>

                    {/* Target Type */}
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-slate-600">
                      {req.entityType}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getActionColor(req.action)}`}>
                        {req.action}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-4 whitespace-nowrap text-xs font-medium text-slate-500">
                      {formatDate(req.createdAt)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <StatusBadge status={req.status} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 whitespace-nowrap text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openModal(req)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors tooltip flex items-center gap-2 text-xs font-bold bg-white border border-slate-100 px-3"
                          title="View Details"
                        >
                          <Eye size={14} /> Review
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Review Request"
      >
        {selectedApproval && (() => {
          const d = selectedApproval.currentData || {};
          const p = selectedApproval.payload || {};
          const isCert = selectedApproval.entityType === 'Certificate' || selectedApproval.entityType === 'EntityCertificate';
          const isStaff = selectedApproval.entityType === 'Staff';
          const docUrl = p.docUrl || d.docUrl;
          const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';

          return (
          <div className="space-y-5 font-['Poppins']">
            {/* Header Banner */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm ${
                    selectedApproval.action === 'CREATE' ? 'bg-green-500' :
                    selectedApproval.action === 'DELETE' ? 'bg-red-500' : 'bg-blue-500'
                  }`}>
                    {getEntityIcon(selectedApproval.entityType)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{getPrimaryDetail(selectedApproval)}</h4>
                    <p className="text-[11px] font-medium text-slate-500">{getSecondaryDetail(selectedApproval)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getActionColor(selectedApproval.action)}`}>
                    {selectedApproval.action}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-200/60">
                <div className="flex items-center gap-1.5">
                  <User size={12} className="text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-600">
                    {selectedApproval.requester?.fullName || 'Unknown'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                    {selectedApproval.requester?.role}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="text-slate-400" />
                  <span className="text-[11px] font-medium text-slate-500">
                    {formatDate(selectedApproval.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Certificate Details Card */}
            {isCert && (
              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Certificate Details</h4>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Type</p>
                      <p className="text-sm font-bold text-slate-900">{p.type || d.type || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Department</p>
                      <p className="text-sm font-bold text-slate-900">{p.department || d.department || '—'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Valid From</p>
                      <p className="text-sm font-medium text-slate-700">{formatDate(p.validFrom || d.validFrom)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Valid To</p>
                      <p className="text-sm font-medium text-slate-700">{formatDate(p.validTo || d.validTo)}</p>
                    </div>
                  </div>
                  {d.staff && (
                    <div className="pt-3 border-t border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Staff Member</p>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-100">
                          {d.staff.fullName?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{d.staff.fullName}</p>
                          <p className="text-[11px] text-slate-500">
                            {d.staff.designation || '—'} {d.staff.isKialStaff ? '• KIAL' : d.staff.entity?.name ? `• ${d.staff.entity.name}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {d.entity && !d.staff && (
                    <div className="pt-3 border-t border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Entity</p>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-100">
                          {d.entity.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{d.entity.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {d.entity.category || '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Staff Details Card */}
            {isStaff && (
              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Staff Details</h4>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Full Name</p>
                      <p className="text-sm font-bold text-slate-900">{p.fullName || d.fullName || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Designation</p>
                      <p className="text-sm font-medium text-slate-700">{p.designation || d.designation || '—'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Department</p>
                      <p className="text-sm font-medium text-slate-700">{p.department || d.department || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Employee Code</p>
                      <p className="text-sm font-medium text-slate-700">{p.empCode || d.empCode || '—'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">AEP Number</p>
                      <p className="text-sm font-medium text-slate-700">{p.aepNumber || d.aepNumber || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Organization</p>
                      <p className="text-sm font-medium text-slate-700">
                        {d.isKialStaff ? 'KIAL Staff' : d.entity?.name || '—'}
                      </p>
                    </div>
                  </div>
                  {(p.email || d.user?.email) && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email</p>
                      <p className="text-sm font-medium text-blue-600">{p.email || d.user?.email}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Proposed Changes (for UPDATE actions) */}
            {selectedApproval.action === 'UPDATE' && selectedApproval.payload && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                  <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Proposed Changes</h4>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(selectedApproval.payload).filter(([k]) => !['id', 'staffId', 'entityId', 'userId', 'status'].includes(k)).map(([key, val]) => (
                      <div key={key}>
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-sm font-medium text-blue-900">
                          {val === null ? '—' : typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/) ? formatDate(val) : String(val)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Attached Document — always visible for Certificate type */}
            {isCert && (
              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Attached Document</h4>
                </div>
                <div className="p-4">
                  {docUrl ? (
                    <button
                      onClick={() => {
                        const fullUrl = docUrl.startsWith('http') ? docUrl : `${API_BASE}${docUrl}`;
                        setDocPreviewUrl(fullUrl);
                      }}
                      className="inline-flex items-center gap-3 px-4 py-3 bg-blue-50 text-sm font-bold text-blue-600 rounded-xl hover:bg-blue-100 transition-colors border border-blue-200 w-full cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <FileText size={20} className="text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-blue-700">View Document</p>
                        <p className="text-[10px] font-medium text-blue-500 truncate max-w-[250px]">{docUrl.split('/').pop()}</p>
                      </div>
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 w-full">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <FileText size={20} className="text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-500">No document attached</p>
                        <p className="text-[10px] font-medium text-slate-400">The requester did not upload a file with this certificate</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {selectedApproval.status === 'PENDING' && (
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleApprove(selectedApproval.id, true)}
                  className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 shadow-lg shadow-green-600/20 transition-all flex justify-center items-center gap-2 text-sm"
                >
                  <CheckCircle size={18} /> Approve
                </button>
                <button
                  onClick={() => handleApprove(selectedApproval.id, false)}
                  className="flex-1 bg-white text-red-600 border border-red-200 font-bold py-3 rounded-xl hover:bg-red-50 transition-all flex justify-center items-center gap-2 text-sm"
                >
                  <X size={18} /> Reject
                </button>
              </div>
            )}
            
            {selectedApproval.status !== 'PENDING' && (
               <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
                 <p className="text-center text-sm font-medium text-slate-500 bg-slate-50 py-3 rounded-xl border border-slate-100">
                    This request was {selectedApproval.status.toLowerCase()} on {formatDate(selectedApproval.updatedAt)}.
                 </p>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-all text-sm shadow-lg shadow-slate-900/20"
                  >
                    Close
                  </button>
               </div>
            )}
          </div>
          );
        })()}
      </Modal>

      <DocumentPreview url={docPreviewUrl} onClose={() => setDocPreviewUrl(null)} />
    </div>
  );
};

export default ApprovalsPage;
