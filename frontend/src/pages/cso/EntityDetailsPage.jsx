import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { adminAPI } from "../../services/api";
import {
  ArrowLeft,
  Building2,
  Users,
  FileText,
  Mail,
  Phone,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Plus,
  Shield,
  CreditCard,
  User,
  MoreHorizontal,
  Edit2,
  Eye,
  Trash2,
  Upload,
} from "lucide-react";
import LoadingSpinner from "../../components/LoadingSpinner";
import Alert from "../../components/Alert";
import Modal from "../../components/Modal";
import DocumentPreview from "../../components/DocumentPreview";
import {
  formatDate,
  getCertificateStatus,
  getDaysUntilExpiry,
} from "../../utils/helpers";
import { authAPI } from "../../services/api";

// Dynamic Badge Component based on status string
const StatusBadge = ({ status }) => {
  // Normalize status to lowercase for matching, then map to styles
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

const EntityDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entity, setEntity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [availableCertTypes, setAvailableCertTypes] = useState([]);

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

  // Add Staff form and modal state removed in favor of dedicated AddStaffPage
  useEffect(() => {
    fetchEntityDetails();
    fetchCertificateTypes();
  }, [id]);

  const fetchCertificateTypes = async () => {
    try {
      const res = await authAPI.getPublicCertificateTypes({ applicableTo: 'ENTITY' });
      setAvailableCertTypes(res.data.data.map(t => t.name));
    } catch (err) {
      console.error("Failed to fetch certificate types", err);
    }
  };

  const fetchEntityDetails = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getEntity(id);
      setEntity(response.data.data);
    } catch (err) {
      setError("Failed to load entity details");
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
        await adminAPI.updateEntityCertificate(editingEntityCert.id, submitData);
        setSuccess("Certificate updated successfully");
      } else {
        const data = { ...submitData, entityId: parseInt(id) };
        await adminAPI.createEntityCertificate(data);
        setSuccess("Certificate added successfully");
      }
      setCertificateModalOpen(false);
      setEditingEntityCert(null);
      setCertificateFormData({ type: "", customType: "", validFrom: "", validTo: "", docUrl: "", file: null });
      fetchEntityDetails();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save certificate");
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
    if (!window.confirm("Delete this entity certificate?")) return;
    try {
      await adminAPI.deleteEntityCertificate(certId);
      setSuccess("Certificate deleted");
      fetchEntityDetails();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to delete certificate");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (!window.confirm("Delete this staff member and all their certificates?")) return;
    try {
      await adminAPI.deleteStaff(staffId);
      setSuccess("Staff member deleted successfully");
      fetchEntityDetails();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete staff member");
      setTimeout(() => setError(""), 3000);
    }
  };

  // handleAddEntityStaff removed in favor of dedicated AddStaffPage
  // --- Real-time Calculations based on fetched data ---

  const entityCertStats = entity
    ? entity.certificates.reduce(
        (acc, cert) => {
          const days = getDaysUntilExpiry(cert.validTo);
          if (days === null) return acc;
          if (days < 0) acc.expired++;
          else if (days <= 30) acc.expiring++;
          else acc.valid++;
          return acc;
        },
        { valid: 0, expiring: 0, expired: 0 }
      )
    : { valid: 0, expiring: 0, expired: 0 };

  const staffCertStats = entity
    ? entity.staffMembers.reduce(
        (acc, staff) => {
          const staffCerts = staff.certificates || [];
          staffCerts.forEach((cert) => {
            const days = getDaysUntilExpiry(cert.validTo);
            if (days === null) return;
            if (days < 0) acc.expired++;
            else if (days <= 30) acc.expiring++;
            else acc.valid++;
          });
          return acc;
        },
        { valid: 0, expiring: 0, expired: 0 }
      )
    : { valid: 0, expiring: 0, expired: 0 };

  const totalExpiringIssues =
    entityCertStats.expiring +
    staffCertStats.expiring +
    entityCertStats.expired +
    staffCertStats.expired;

  if (loading) return <LoadingSpinner fullScreen />;

  if (!entity) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center font-['Poppins']">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
          <Building2 size={32} className="text-slate-300" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Entity not found</h2>
        <button
          onClick={() => navigate("/entities")}
          className="mt-6 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg"
        >
          Back to Entities
        </button>
      </div>
    );
  }

  return (
    <div className="font-['Poppins'] text-slate-900 space-y-6">
      {/* 1. Header */}
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => navigate("/entities")}
          className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:shadow-md transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {entity.name}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-600 border border-slate-300">
              {entity.category || "General"}
            </span>
            {entity.externalEntityCode && (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-600 border border-blue-100 font-mono">
                ID: {entity.externalEntityCode}
              </span>
            )}
          </div>
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

      {/* 2. Live Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 mb-1">
            {entity.staffMembers?.length || 0}
          </h3>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            Total Staff
          </p>
        </div>

        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
              <Shield size={20} />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 mb-1">
            {entity.certificates?.length || 0}
          </h3>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            Entity Certs
          </p>
        </div>

        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
              <FileText size={20} />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-slate-900 mb-1">
            {entity.staffMembers?.reduce(
              (sum, s) => sum + (s.certificates?.length || 0),
              0
            ) || 0}
          </h3>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            Staff Certs
          </p>
        </div>

        <div
          className={`rounded-[32px] p-6 shadow-sm border relative overflow-hidden group ${
            totalExpiringIssues > 0
              ? "bg-red-50 border-red-100"
              : "bg-white border-slate-100"
          }`}
        >
          <div className="flex justify-between items-start mb-4">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                totalExpiringIssues > 0
                  ? "bg-red-100 text-red-500"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <AlertTriangle size={20} />
            </div>
          </div>
          <h3
            className={`text-3xl font-bold mb-1 ${
              totalExpiringIssues > 0 ? "text-red-600" : "text-slate-900"
            }`}
          >
            {totalExpiringIssues}
          </h3>
          <p
            className={`text-xs font-bold uppercase tracking-wider ${
              totalExpiringIssues > 0 ? "text-red-400" : "text-slate-400"
            }`}
          >
            Attention Needed
          </p>
        </div>
      </div>

      {/* 3. Tab Switcher */}
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

      {/* 4. Tab Content */}

      {/* --- OVERVIEW TAB --- */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Left Panel: Entity Information */}
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 h-full">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Building2 size={20} className="text-blue-600" />
              Entity Information
            </h3>

            <div className="space-y-6">
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Clearance Status
                  </span>
                  {entity.securityClearanceValidTo && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Expires: {formatDate(entity.securityClearanceValidTo)}
                    </p>
                  )}
                </div>
                <StatusBadge status={entity.securityClearanceStatus} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Program Status
                  </p>
                  <p
                    className="text-sm font-bold text-slate-900 truncate"
                    title={entity.securityProgramStatus}
                  >
                    {entity.securityProgramStatus || "N/A"}
                  </p>
                  {entity.securityProgramValidTo && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      Expires: {formatDate(entity.securityProgramValidTo)}
                    </p>
                  )}
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    QCP Status
                  </p>
                  <p
                    className="text-sm font-bold text-slate-900 truncate"
                    title={entity.qcpStatus}
                  >
                    {entity.qcpStatus || "N/A"}
                  </p>
                  {entity.qcpValidTo && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      Expires: {formatDate(entity.qcpValidTo)}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Contract Period
                </p>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Calendar size={16} className="text-slate-400" />
                  <span>
                    {entity.contractValidFrom
                      ? formatDate(entity.contractValidFrom)
                      : "N/A"}
                  </span>
                  <span className="text-slate-400 font-normal mx-1">to</span>
                  <span>
                    {entity.contractValidTo
                      ? formatDate(entity.contractValidTo)
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Contact & Compliance */}
          <div className="space-y-6">
            {/* Contact Details */}
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Phone size={20} className="text-emerald-600" />
                Contact Details
              </h3>

              <div className="space-y-4">
                {/* ASCO */}
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">
                    ASCO (Security Officer)
                  </p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                      <User size={14} className="text-slate-400" />{" "}
                      {entity.ascoName || "N/A"}
                    </div>
                    {entity.ascoContactNo && (
                      <div className="flex items-center gap-2 text-slate-600 text-xs pl-6">
                        <Phone size={12} /> {entity.ascoContactNo}
                      </div>
                    )}
                    {entity.ascoEmail && (
                      <div className="flex items-center gap-2 text-slate-600 text-xs pl-6">
                        <Mail size={12} /> {entity.ascoEmail}
                      </div>
                    )}
                  </div>
                </div>

                {/* KIAL POC */}
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <p className="text-[10px] font-bold text-blue-400 uppercase mb-2">
                    KIAL Point of Contact
                  </p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 font-bold text-blue-900 text-sm">
                      <User size={14} className="text-blue-400" />{" "}
                      {entity.kialPocName || "N/A"}
                    </div>
                    {entity.kialPocNumber && (
                      <div className="flex items-center gap-2 text-blue-700 text-xs pl-6">
                        <Phone size={12} /> {entity.kialPocNumber}
                      </div>
                    )}
                    {entity.kialPocEmail && (
                      <div className="flex items-center gap-2 text-blue-700 text-xs pl-6">
                        <Mail size={12} /> {entity.kialPocEmail}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Combined Compliance Stats */}
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Certificate Health
              </h3>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <span className="block text-xs text-slate-500 font-medium mb-1">
                    Entity Valid
                  </span>
                  <span className="text-xl font-bold text-emerald-600">
                    {entityCertStats.valid}
                  </span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <span className="block text-xs text-slate-500 font-medium mb-1">
                    Staff Valid
                  </span>
                  <span className="text-xl font-bold text-emerald-600">
                    {staffCertStats.valid}
                  </span>
                </div>
              </div>
            </div>
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
              onClick={() => setCertificateModalOpen(true)}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center gap-2"
            >
              <Plus size={18} /> Add Certificate
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
                          <h4 className="font-bold text-slate-900">
                            {cert.type}
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
                        <StatusBadge status={status} />
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
              <FileText size={48} className="text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">
                No certificates uploaded yet.
              </p>
              <button
                onClick={() => setCertificateModalOpen(true)}
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
              onClick={() => navigate(`/staff/new?entityId=${id}`)}
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
                      onClick={() => navigate(`/entity-staff/${staff.id}`)}
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
                          onClick={() => navigate(`/entity-staff/${staff.id}`)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteStaff(staff.id)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="Delete Staff"
                        >
                          <Trash2 size={16} />
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

      {/* 5. Add/Edit Certificate Modal */}
      <Modal
        isOpen={certificateModalOpen}
        onClose={() => { setCertificateModalOpen(false); setEditingEntityCert(null); setCertificateFormData({ type: "", customType: "", validFrom: "", validTo: "", docUrl: "" }); }}
        title={editingEntityCert ? "Edit Entity Certificate" : "Add Entity Certificate"}
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
              {editingEntityCert ? "Update Certificate" : "Add Certificate"}
            </button>
          </div>
        </form>
      </Modal>

      {/* End Modals */}
      <DocumentPreview url={docPreviewUrl} onClose={() => setDocPreviewUrl(null)} />
    </div>
  );
};

export default EntityDetailsPage;
