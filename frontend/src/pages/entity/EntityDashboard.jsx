import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { entityAPI, authAPI, adminAPI } from "../../services/api";
import {
  Users,
  FileText,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  Clock,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  Share2,
  Building2,
  Phone,
  User,
  Mail,
  Calendar,
  Plus,
  Edit2,
  Eye,
  Trash2,
  Upload,
  Shield,
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis, BarChart, Bar, XAxis } from "recharts";
import LoadingSpinner from "../../components/LoadingSpinner";
import Alert from "../../components/Alert";
import Modal from "../../components/Modal";
import DocumentPreview from "../../components/DocumentPreview";
import {
  formatDate,
  getCertificateStatus,
  getDaysUntilExpiry,
} from "../../utils/helpers";
import { generateEntityDashboardPDF } from "../../utils/reportGenerator";

const StatusBadge = ({ status }) => {
  const getStyle = (s) => {
    const lower = s?.toLowerCase() || "";
    if (
      lower.includes("active") ||
      lower.includes("valid") ||
      lower.includes("approved")
    )
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (lower.includes("expir"))
      return "bg-amber-100 text-amber-700 border-amber-200";
    if (lower.includes("pending"))
      return "bg-blue-100 text-blue-700 border-blue-200";
    if (lower.includes("reject") || lower.includes("invalid"))
      return "bg-red-100 text-red-700 border-red-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  return (
    <span
      className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${getStyle(
        status
      )}`}
    >
      {status || "Unknown"}
    </span>
  );
};

const EntityDashboard = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [activeTab, setActiveTab] = useState("overview");
  const [availableCertTypes, setAvailableCertTypes] = useState([]);

  // Chart Data
  const [certData, setCertData] = useState([]);
  const [staffCertData, setStaffCertData] = useState([]);

  // Certificate Modal State
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [editingEntityCert, setEditingEntityCert] = useState(null);
  const [docPreviewUrl, setDocPreviewUrl] = useState(null);
  const [certificateFormData, setCertificateFormData] = useState({
    type: "",
    customType: "",
    validFrom: "",
    validTo: "",
    docUrl: "",
    file: null,
  });
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    fetchDashboard();
    fetchCertificateTypes();
  }, []);

  const fetchCertificateTypes = async () => {
    try {
      const res = await authAPI.getPublicCertificateTypes({ applicableTo: 'ENTITY' });
      setAvailableCertTypes(res.data.data.map(t => t.name));
    } catch (err) {
      console.error("Failed to fetch certificate types", err);
    }
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await entityAPI.getDashboard();
      const data = response.data.data;
      setDashboard(data);

      // --- GENERATE CHART DATA ---
      const totalCerts = data?.entity?.staffMembers?.reduce(
        (acc, staff) => acc + (staff.certificates?.length || 0),
        0
      ) || 0;

      const months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      setCertData(
        months.map((month, i) => {
          const randomVar = Math.floor(Math.random() * 20);
          return {
            name: month,
            value: Math.max(0, totalCerts - (5 - i) * 10 + randomVar),
          };
        })
      );

      const topStaff = data?.entity?.staffMembers
        ?.slice(0, 5)
        .map(s => ({
          name: s.fullName.split(' ')[0], 
          certificates: s.certificates?.length || 0
        })) || [];
      
      setStaffCertData(topStaff);

    } catch (err) {
      setError("Failed to load dashboard data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      // Even entity head uses adminAPI.uploadDocument for generic file upload
      const res = await adminAPI.uploadDocument(formData);
      setCertificateFormData((prev) => ({ ...prev, docUrl: res.data.data.url, file }));
    } catch (err) {
      setError("Failed to upload file");
      setTimeout(() => setError(""), 3000);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleAddCertificate = async (e) => {
    e.preventDefault();

    const submitData = {
      ...certificateFormData,
      type: certificateFormData.type === "Other" ? certificateFormData.customType : certificateFormData.type,
      docUrl: certificateFormData.docUrl || null,
    };

    try {
      if (editingEntityCert) {
        await entityAPI.updateEntityCertificate(editingEntityCert.id, submitData);
        setSuccess("Certificate update requested successfully");
      } else {
        await entityAPI.createEntityCertificate(submitData);
        setSuccess("Certificate creation requested successfully");
      }
      setCertificateModalOpen(false);
      setEditingEntityCert(null);
      setCertificateFormData({ type: "", customType: "", validFrom: "", validTo: "", docUrl: "", file: null });
      fetchDashboard();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit certificate request");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleEditEntityCert = (cert) => {
    setEditingEntityCert(cert);
    const isCustom = cert.type && !availableCertTypes.includes(cert.type);
    setCertificateFormData({
      type: isCustom ? "Other" : (cert.type || availableCertTypes[0] || ""),
      customType: isCustom ? cert.type : "",
      validFrom: cert.validFrom?.split("T")[0] || "",
      validTo: cert.validTo?.split("T")[0] || "",
      docUrl: cert.docUrl || "",
      file: null,
    });
    setCertificateModalOpen(true);
  };

  const handleOpenAddCertModal = () => {
    setEditingEntityCert(null);
    setCertificateFormData({
      type: availableCertTypes.length > 0 ? availableCertTypes[0] : "",
      customType: "",
      validFrom: "",
      validTo: "",
      docUrl: "",
      file: null,
    });
    setCertificateModalOpen(true);
  };

  const handleDeleteEntityCert = async (certId) => {
    if (!window.confirm("Submit request to delete this entity certificate?")) return;
    try {
      await entityAPI.deleteEntityCertificate(certId);
      setSuccess("Certificate deletion requested");
      fetchDashboard();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to submit deletion request");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleStaffClick = (staffId) => {
    navigate(`/entity-staff/${staffId}`);
  };

  if (loading) return <LoadingSpinner fullScreen />;
  
  const entity = dashboard?.entity;
  if (!entity) return <Alert type="error">Entity data not found</Alert>;

  const totalStaff = entity.staffMembers?.length || 0;
  const staffCertsCount = entity.staffMembers?.reduce((acc, staff) => acc + (staff.certificates?.length || 0), 0) || 0;
  const entityCertsCount = entity.certificates?.length || 0;
  const totalCerts = staffCertsCount + entityCertsCount;

  const staffCompliance = dashboard?.staffCompliance || { expired: 0, expiringSoon: 0, valid: 0 };
  const entityCompliance = dashboard?.entityCompliance || { expired: 0, expiringSoon: 0, valid: 0 };

  const expiringSoon = staffCompliance.expiringSoon + entityCompliance.expiringSoon;
  const expired = staffCompliance.expired + entityCompliance.expired;
  const valid = staffCompliance.valid + entityCompliance.valid;
  const validPercent = totalCerts > 0 ? ((valid / totalCerts) * 100).toFixed(0) : 0;
  
  const issuesCount = expiringSoon + expired;
  const isAllGood = issuesCount === 0;

  return (
    <div className="font-['Poppins'] text-slate-900 space-y-6 animate-in fade-in duration-500">
      {/* 1. Header Area with Entity Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {entity.name || 'Entity Dashboard'}
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            {entity.category || 'Category N/A'} • <StatusBadge status={entity.securityClearanceStatus} />
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => generateEntityDashboardPDF(dashboard, {
              totalStaff, total: totalCerts, valid, expiringSoon, expired
            })}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-all active:scale-95"
          >
            <Share2 size={16} />
            <span>Share Report</span>
          </button>
        </div>
      </div>

      {error && (
        <Alert type="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert type="success" onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-100 inline-flex shadow-sm overflow-x-auto max-w-full">
        {["Overview", "Entity Certificates", "Staff & Certificates"].map(
          (tab) => {
            let tabKey = "overview";
            if (tab.includes("Entity")) tabKey = "entity-certs";
            if (tab.includes("Staff")) tabKey = "staff";

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tabKey)}
                className={`
                  px-6 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap
                  ${
                    activeTab === tabKey
                      ? "bg-slate-900 text-white shadow-md"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }
                `}
              >
                {tab}
              </button>
            );
          }
        )}
      </div>

      {/* Tab Content */}
      
      {/* --- OVERVIEW TAB --- */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="lg:col-span-2 space-y-6">
            {/* Top Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center transition-transform group-hover:scale-110">
                    <Users size={20} />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-1">{totalStaff}</h3>
                <p className="text-xs text-slate-400 font-medium">Total Staff</p>
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl transform translate-x-8 translate-y-8" />
              </div>

              <div className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center transition-transform group-hover:scale-110">
                    <FileText size={20} />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-1">{staffCertsCount}</h3>
                <p className="text-xs text-slate-400 font-medium">Staff Certificates</p>
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl transform translate-x-8 translate-y-8" />
              </div>

              <div className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center transition-transform group-hover:scale-110">
                    <Building2 size={20} />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-1">{entityCertsCount}</h3>
                <p className="text-xs text-slate-400 font-medium">Entity Certificates</p>
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl transform translate-x-8 translate-y-8" />
              </div>

              <div className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center transition-transform group-hover:scale-110">
                    <CheckCircle size={20} />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-1">{valid}</h3>
                <p className="text-xs text-slate-400 font-medium">Valid Certificates</p>
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl transform translate-x-8 translate-y-8" />
              </div>
            </div>

            {/* Middle Row: Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 flex flex-col justify-between h-[280px]">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-slate-900">Certificate Trend</h3>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">
                      <ArrowUpRight size={12} /> +5%
                    </span>
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900">{totalCerts}</h2>
                  <p className="text-xs text-slate-400 mt-1">Total certificates issued</p>
                </div>

                <div className="h-32 w-full mt-4 -ml-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={certData}>
                      <defs>
                        <linearGradient id="colorIndigo" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#fff", borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                        itemStyle={{ color: "#6366f1", fontSize: "12px", fontWeight: "bold" }}
                        cursor={{ stroke: "#6366f1", strokeWidth: 1, strokeDasharray: "4 4" }}
                      />
                      <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorIndigo)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 flex flex-col justify-between h-[280px]">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-slate-900">Top Staff</h3>
                    <button className="text-[10px] font-bold text-slate-400 hover:text-slate-900">View All</button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">By certificate count</p>
                </div>

                <div className="h-40 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={staffCertData}>
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#fff", borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                        cursor={{ fill: "#f1f5f9" }}
                      />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <Bar dataKey="certificates" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className={`${isAllGood ? 'bg-[#10B981] shadow-emerald-500/20' : 'bg-[#EF4444] shadow-red-500/20'} rounded-[32px] p-8 text-white relative overflow-hidden shadow-lg h-[380px] flex flex-col transition-colors duration-300`}>
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl transform translate-x-10 -translate-y-10" />

              <div className="flex justify-between items-start mb-6 z-10">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                  {isAllGood ? <CheckCircle className="text-white" size={24} /> : <AlertTriangle className="text-white" size={24} />}
                </div>
                <MoreHorizontal className="text-white/60 cursor-pointer hover:text-white" />
              </div>

              <h2 className="text-4xl font-bold mb-2">{issuesCount}</h2>
              <p className="text-sm font-medium text-white/90 mb-8">{isAllGood ? 'Issues Found' : 'Attention Needed'}</p>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mt-auto border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 ${isAllGood ? 'bg-emerald-300' : 'bg-yellow-400'} rounded-full animate-pulse`} />
                  <span className="text-xs font-bold text-white">Status Update</span>
                </div>
                <p className="text-[10px] text-white/80 leading-relaxed">
                  {isAllGood 
                    ? "All certificates are up to date and valid. Excellent compliance!"
                    : `You have ${expiringSoon} certificates expiring soon and ${expired} already expired. Please renew immediately.`
                  }
                </p>
              </div>
            </div>

            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 text-sm">Compliance Breakdown</h3>
                <MoreHorizontal size={16} className="text-slate-300 cursor-pointer" />
              </div>

              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-500">Valid</span>
                    <span className="text-emerald-500">{valid}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${validPercent}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-500">Expiring</span>
                    <span className="text-orange-400">{expiringSoon}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-400 rounded-full" style={{ width: `${totalCerts > 0 ? (expiringSoon / totalCerts) * 100 : 0}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-500">Expired</span>
                    <span className="text-red-500">{expired}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${totalCerts > 0 ? (expired / totalCerts) * 100 : 0}%` }} />
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t border-slate-50">
                  <p className="text-[10px] text-center text-slate-400 font-medium">Compliance data updated just now.</p>
                </div>
              </div>
            </div>

            {/* Action Required: Expiring Certificates */}
            {!isAllGood && (
              <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <AlertTriangle size={16} className="text-orange-500" /> Action Required
                  </h3>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {[...(dashboard?.expiringEntityCertificates || []).map(c => ({...c, isEntity: true})), ...(dashboard?.expiringStaffCertificates || [])].map((cert, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-1">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-slate-900">{cert.type}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cert.status === 'Expired' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                          {cert.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {cert.isEntity ? 'Entity Certificate' : `Staff: ${cert.staffName}`}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1">
                        Valid to: {formatDate(cert.validTo)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- ENTITY CERTIFICATES TAB --- */}
      {activeTab === "entity-certs" && (
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 min-h-[400px] animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-900">
              Entity Certificates
            </h3>
            <button
              onClick={handleOpenAddCertModal}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center gap-2"
            >
              <Plus size={18} /> Request Certificate
            </button>
          </div>

          {entity.certificates && entity.certificates.length > 0 ? (
            <div className="space-y-4">
              {entity.certificates.map((cert) => {
                const days = getDaysUntilExpiry(cert.validTo);
                const status = getCertificateStatus(
                  cert.validFrom,
                  cert.validTo
                );

                return (
                  <div
                    key={cert.id}
                    className="group p-5 rounded-2xl border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all bg-white"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <FileText size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 flex items-center gap-2">
                            {cert.type}
                            {cert.status === "PENDING" && (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-600 rounded">PENDING CSO APPROVAL</span>
                            )}
                          </h4>
                          <div className="flex flex-wrap items-center gap-3 mt-1">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                              <Calendar size={14} />
                              {formatDate(cert.validFrom)} -{" "}
                              {formatDate(cert.validTo)}
                            </div>
                            {days !== null && days >= 0 && days <= 30 && (
                              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                                Expiring in {days} days
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <StatusBadge status={cert.status === "APPROVED" ? status : cert.status} />
                        {cert.docUrl && (
                          <button
                            onClick={() => setDocPreviewUrl(cert.docUrl)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
                            title="View Document"
                          >
                            <FileText size={16} />
                          </button>
                        )}
                        <button onClick={() => handleEditEntityCert(cert)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteEntityCert(cert.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              <Shield size={48} className="text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">
                No entity certificates uploaded yet.
              </p>
              <button
                onClick={handleOpenAddCertModal}
                className="mt-4 text-sm font-bold text-blue-600 hover:underline"
              >
                Add First Certificate
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- STAFF TAB --- */}
      {activeTab === "staff" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Entity Staff Members</h3>
            <button
              onClick={() => navigate(`/staff/new`)}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-sm font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all"
            >
              <Plus size={18} /> Add Staff
            </button>
          </div>
          {entity.staffMembers && entity.staffMembers.length > 0 ? (
            <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
              <div className="divide-y divide-slate-50">
                {entity.staffMembers.map((staff) => {
                  const certs = staff.certificates || [];
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

                  return (
                    <div
                      key={staff.id}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors cursor-pointer"
                      onClick={() => handleStaffClick(staff.id)}
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                        {staff.fullName.charAt(0)}
                      </div>

                      {/* Name + Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 truncate">{staff.fullName}</p>
                          {staff.empCode && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-500 border border-slate-200 shrink-0">
                              #{staff.empCode}
                            </span>
                          )}
                          {staff.status === "PENDING" && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-[10px] font-bold text-blue-600 border border-blue-200 shrink-0">
                              PENDING APPROVAL
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-blue-600 font-medium">{staff.designation || "No designation"}</span>
                          {staff.aadhaarNumber && (
                            <span className="text-[10px] text-slate-400 font-mono">ID: {staff.aadhaarNumber}</span>
                          )}
                        </div>
                      </div>

                      {/* Cert Summary Pills */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {certStats.valid > 0 && (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                            {certStats.valid} valid
                          </span>
                        )}
                        {certStats.expiring > 0 && (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                            {certStats.expiring} expiring
                          </span>
                        )}
                        {certStats.expired > 0 && (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red-50 text-red-600 border border-red-100">
                            {certStats.expired} expired
                          </span>
                        )}
                        {certs.length === 0 && (
                          <span className="text-[10px] text-slate-400 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100">
                            No certs
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleStaffClick(staff.id)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[32px] p-12 text-center shadow-sm border border-slate-100">
              <Users size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-900">
                No Staff Members
              </h3>
              <p className="text-slate-500">
                There are no staff members associated with this entity yet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 5. Add/Edit Entity Certificate Modal */}
      <Modal
        isOpen={certificateModalOpen}
        onClose={() => { setCertificateModalOpen(false); setEditingEntityCert(null); setCertificateFormData({ type: "", customType: "", validFrom: "", validTo: "", docUrl: "" }); }}
        title={editingEntityCert ? "Request Certificate Update" : "Request New Entity Certificate"}
      >
        <form
          onSubmit={handleAddCertificate}
          className="space-y-5 font-['Poppins']"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Certificate Type *
              </label>
              <select
                required
                value={certificateFormData.type}
                onChange={(e) =>
                  setCertificateFormData({
                    ...certificateFormData,
                    type: e.target.value,
                  })
                }
                className="w-full bg-slate-50 text-sm font-medium text-slate-900 p-3 rounded-xl border border-transparent focus:bg-white focus:border-blue-100 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
              >
                <option value="" disabled>Select Type</option>
                {availableCertTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
                <option value="Other">Other (Specify)</option>
              </select>
            </div>
            
            {certificateFormData.type === "Other" && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Specify Type *
                </label>
                <input
                  type="text"
                  required
                  value={certificateFormData.customType}
                  onChange={(e) =>
                    setCertificateFormData({
                      ...certificateFormData,
                      customType: e.target.value,
                    })
                  }
                  className="w-full bg-slate-50 text-sm font-medium text-slate-900 p-3 rounded-xl border border-transparent focus:bg-white focus:border-blue-100 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
                  placeholder="e.g., Security Clearance"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Valid From *
              </label>
              <input
                type="date"
                required
                value={certificateFormData.validFrom}
                onChange={(e) =>
                  setCertificateFormData({
                    ...certificateFormData,
                    validFrom: e.target.value,
                  })
                }
                className="w-full bg-slate-50 text-sm font-medium text-slate-900 p-3 rounded-xl border border-transparent focus:bg-white focus:border-blue-100 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Valid To *
              </label>
              <input
                type="date"
                required
                value={certificateFormData.validTo}
                onChange={(e) =>
                  setCertificateFormData({
                    ...certificateFormData,
                    validTo: e.target.value,
                  })
                }
                className="w-full bg-slate-50 text-sm font-medium text-slate-900 p-3 rounded-xl border border-transparent focus:bg-white focus:border-blue-100 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Document (PDF, Image)
            </label>
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
              {certificateFormData.docUrl && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                  <CheckCircle size={14} />
                  File uploaded
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={() => setCertificateModalOpen(false)}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all"
            >
              {editingEntityCert ? "Submit Update" : "Submit Request"}
            </button>
          </div>
        </form>
      </Modal>

      <DocumentPreview url={docPreviewUrl} onClose={() => setDocPreviewUrl(null)} />
    </div>
  );
};

export default EntityDashboard;
