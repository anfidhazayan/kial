import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authAPI, adminAPI } from "../../services/api";
import {
  ArrowLeft,
  User,
  FileText,
  Plus,
  Trash2,
  Upload,
  Save,
  CheckCircle,
} from "lucide-react";
import LoadingSpinner from "../../components/LoadingSpinner";
import Alert from "../../components/Alert";

const KIAL_DEPARTMENTS = [
  "MD Office",
  "Secretarial",
  "Finance",
  "COO Office",
  "Human Resource",
  "Land and Administration",
  "Engineering",
  "Security",
  "Operations",
  "ARFF",
  "Commercial",
  "Information Technology",
];

const KIAL_ZONES = ["A", "D", "Si", "Sd", "P", "B", "F", "Ft", "C", "Ci", "Cd", "Cs", "I", "Os"];

const AddStaffPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const entityId = searchParams.get("entityId");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [entities, setEntities] = useState([]);
  const [availableCertTypes, setAvailableCertTypes] = useState([]);

  // Staff form
  const [staffForm, setStaffForm] = useState({
    fullName: "",
    designation: "",
    department: "",
    customDepartment: "",
    empCode: "",
    aadhaarNumber: "",
    aepNumber: "",
    terminals: "",
    phoneNumber: "",
    email: "",
    entityId: entityId || "",
    isKialStaff: !entityId,
    airportsGiven: "",
    zones: [],
  });

  // Certificates to create alongside staff
  const [certificates, setCertificates] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(null);

  useEffect(() => {
    // Fetch certificate types based on entity and department
    const params = { applicableTo: entityId ? "ENTITY" : "KIAL" };
    if (!entityId && staffForm.department && staffForm.department !== "Other") {
      params.department = staffForm.department;
    }

    authAPI.getPublicCertificateTypes(params)
      .then((res) => {
        setAvailableCertTypes(res.data.data.map((t) => t.name));
      })
      .catch(() => {});

    if (!entityId) {
      adminAPI
        .getEntities()
        .then((r) => setEntities(r.data.data || []))
        .catch(() => {});
    }
  }, [entityId, staffForm.department]);

  const handleChange = (field, value) => {
    setStaffForm((prev) => ({ ...prev, [field]: value }));
  };

  const addCertificate = () => {
    setCertificates((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: availableCertTypes.length > 0 ? availableCertTypes[0] : "",
        validFrom: "",
        validTo: "",
        docUrl: "",
        customType: "",
      },
    ]);
  };

  const updateCertificate = (idx, field, value) => {
    setCertificates((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    );
  };

  const removeCertificate = (idx) => {
    setCertificates((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleFileUpload = async (idx, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFile(idx);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await adminAPI.uploadDocument(formData);
      updateCertificate(idx, "docUrl", res.data.data.url);
    } catch (err) {
      setError("Failed to upload file");
      setTimeout(() => setError(""), 3000);
    } finally {
      setUploadingFile(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!staffForm.fullName.trim()) {
      setError("Full name is required");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // 1. Create staff
      const payload = { ...staffForm };
      if (!payload.entityId) delete payload.entityId;
      if (payload.department === "Other") {
        payload.department = payload.customDepartment;
      }
      delete payload.customDepartment;

      const res = await adminAPI.createStaff(payload);
      const newStaffId = res.data.data.id;

      // 2. Create certificates
      for (const cert of certificates) {
        if (!cert.validFrom || !cert.validTo) continue;
        const certType = cert.type === "Other" ? cert.customType : cert.type;
        if (!certType) continue;
        await adminAPI.createCertificate({
          staffId: newStaffId,
          type: certType,
          validFrom: cert.validFrom,
          validTo: cert.validTo,
          docUrl: cert.docUrl || null,
        });
      }

      setSuccess("Staff member created successfully!");
      setTimeout(() => {
        navigate(`/staff/${newStaffId}`);
      }, 1000);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to create staff member"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full bg-slate-50 text-sm font-medium text-slate-900 p-3 rounded-xl border border-transparent focus:bg-white focus:border-slate-200 focus:ring-2 focus:ring-slate-100 outline-none transition-all";
  const labelClass =
    "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="font-['Poppins'] text-slate-900 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:shadow-md transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Add New Staff Member
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            {entityId
              ? "Adding staff to entity"
              : "Fill in details and certificates"}
          </p>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Personal Details */}
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <User size={20} className="text-blue-600" />
            Personal Details
          </h2>

          <div className="space-y-5">
            <div>
              <label className={labelClass}>Full Name *</label>
              <input
                type="text"
                required
                className={inputClass}
                value={staffForm.fullName}
                onChange={(e) => handleChange("fullName", e.target.value)}
                placeholder="Enter full name"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Designation</label>
                <input
                  type="text"
                  className={inputClass}
                  value={staffForm.designation}
                  onChange={(e) => handleChange("designation", e.target.value)}
                  placeholder="e.g., Security Officer"
                />
              </div>
              <div>
                <label className={labelClass}>Department</label>
                <select
                  className={inputClass}
                  value={staffForm.department}
                  onChange={(e) => handleChange("department", e.target.value)}
                >
                  <option value="" disabled>Select Department</option>
                  {KIAL_DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>
                {staffForm.department === "Other" && (
                  <input
                    type="text"
                    className={`${inputClass} mt-3`}
                    value={staffForm.customDepartment}
                    onChange={(e) => handleChange("customDepartment", e.target.value)}
                    placeholder="Specify custom department"
                    required
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Employee Code</label>
                <input
                  type="text"
                  className={inputClass}
                  value={staffForm.empCode}
                  onChange={(e) => handleChange("empCode", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Aadhaar Number</label>
                <input
                  type="text"
                  className={inputClass}
                  value={staffForm.aadhaarNumber}
                  onChange={(e) => handleChange("aadhaarNumber", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>AEP Number</label>
                <input
                  type="text"
                  className={inputClass}
                  value={staffForm.aepNumber}
                  onChange={(e) => handleChange("aepNumber", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Terminals</label>
                <input
                  type="text"
                  className={inputClass}
                  value={staffForm.terminals}
                  onChange={(e) => handleChange("terminals", e.target.value)}
                  placeholder="e.g., T1, T2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Phone Number</label>
                <input
                  type="text"
                  className={inputClass}
                  value={staffForm.phoneNumber}
                  onChange={(e) => handleChange("phoneNumber", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Email (for login)</label>
                <input
                  type="email"
                  className={inputClass}
                  value={staffForm.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="staff@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Airports Given</label>
                <input
                  type="text"
                  className={inputClass}
                  value={staffForm.airportsGiven}
                  onChange={(e) => handleChange("airportsGiven", e.target.value)}
                  placeholder="e.g., KANNUR"
                />
              </div>
            </div>

            {/* Zones Selection */}
            <div className="pt-2">
              <label className={labelClass}>Areas / Zones</label>
              <div className="flex flex-wrap gap-3 mt-3">
                {KIAL_ZONES.map(zone => (
                  <label key={zone} className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 hover:border-blue-200 transition-all">
                    <input 
                      type="checkbox" 
                      checked={staffForm.zones.includes(zone)}
                      onChange={(e) => {
                         const newZones = e.target.checked 
                            ? [...staffForm.zones, zone] 
                            : staffForm.zones.filter(z => z !== zone);
                         handleChange("zones", newZones);
                      }}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 accent-blue-600"
                    />
                    <span className="text-sm font-bold text-slate-700">{zone}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Certificates */}
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText size={20} className="text-emerald-600" />
              Certificates
            </h2>
            <button
              type="button"
              onClick={addCertificate}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold shadow hover:bg-slate-800 transition-all"
            >
              <Plus size={16} /> Add Certificate
            </button>
          </div>

          {certificates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <FileText size={40} className="text-slate-300 mb-3" />
              <p className="text-sm text-slate-500 font-medium">
                No certificates added yet.
              </p>
              <button
                type="button"
                onClick={addCertificate}
                className="mt-3 text-sm font-bold text-blue-600 hover:underline"
              >
                + Add first certificate
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {certificates.map((cert, idx) => (
                <div
                  key={cert.id}
                  className="p-5 bg-slate-50 rounded-2xl border border-slate-100 relative"
                >
                  <button
                    type="button"
                    onClick={() => removeCertificate(idx)}
                    className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove"
                  >
                    <Trash2 size={16} />
                  </button>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>
                          Certificate Type *
                        </label>
                        <select
                          className={inputClass}
                          value={cert.type}
                          onChange={(e) =>
                            updateCertificate(idx, "type", e.target.value)
                          }
                        >
                          <option value="" disabled>Select Type</option>
                          {availableCertTypes.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                          <option value="Other">Other (Specify)</option>
                        </select>
                      </div>
                      {cert.type === "Other" && (
                        <div>
                          <label className={labelClass}>Specify Type *</label>
                          <input
                            type="text"
                            required
                            className={inputClass}
                            value={cert.customType}
                            onChange={(e) =>
                              updateCertificate(
                                idx,
                                "customType",
                                e.target.value
                              )
                            }
                            placeholder="Enter certificate type"
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Valid From *</label>
                        <input
                          type="date"
                          required
                          className={inputClass}
                          value={cert.validFrom}
                          onChange={(e) =>
                            updateCertificate(idx, "validFrom", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Valid To *</label>
                        <input
                          type="date"
                          required
                          className={inputClass}
                          value={cert.validTo}
                          onChange={(e) =>
                            updateCertificate(idx, "validTo", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    {/* File Upload */}
                    <div>
                      <label className={labelClass}>
                        Document (PDF, Image)
                      </label>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                          <Upload size={16} />
                          {uploadingFile === idx
                            ? "Uploading..."
                            : "Choose File"}
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                            onChange={(e) => handleFileUpload(idx, e)}
                            disabled={uploadingFile === idx}
                          />
                        </label>
                        {cert.docUrl && (
                          <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                            <CheckCircle size={14} />
                            File uploaded
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4 pb-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-2xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white font-bold text-sm rounded-2xl hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all disabled:opacity-50"
          >
            <Save size={18} />
            {submitting ? "Creating..." : "Create Staff Member"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddStaffPage;
