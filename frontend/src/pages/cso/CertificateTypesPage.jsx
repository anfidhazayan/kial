import { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";
import { Plus, Edit2, Trash2, FileText, CheckCircle, X } from "lucide-react";
import Alert from "../../components/Alert";
import LoadingSpinner from "../../components/LoadingSpinner";

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

const CertificateTypesPage = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" or "edit"
  const [currentId, setCurrentId] = useState(null);
  
  const [form, setForm] = useState({
    name: "",
    applicableTo: "ALL",
    department: "",
    description: "",
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getCertificateTypes();
      setTypes(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch certificate types");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (mode = "add", type = null) => {
    setModalMode(mode);
    setError("");
    setSuccess("");
    if (mode === "edit" && type) {
      setCurrentId(type.id);
      setForm({
        name: type.name,
        applicableTo: type.applicableTo,
        department: type.department || "",
        description: type.description || "",
      });
    } else {
      setCurrentId(null);
      setForm({
        name: "",
        applicableTo: "ALL",
        department: "",
        description: "",
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setForm({ name: "", applicableTo: "ALL", department: "", description: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Type name is required");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (modalMode === "add") {
        await adminAPI.createCertificateType(form);
        setSuccess("Certificate type added successfully!");
      } else {
        await adminAPI.updateCertificateType(currentId, form);
        setSuccess("Certificate type updated successfully!");
      }
      closeModal();
      fetchTypes();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${modalMode} type`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }
    
    setError("");
    try {
      await adminAPI.deleteCertificateType(id);
      setSuccess(`Deleted "${name}" certificate type`);
      fetchTypes();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete type");
    }
  };

  const inputClass = "w-full bg-slate-50 text-sm font-medium text-slate-900 p-3 rounded-xl border border-transparent focus:bg-white focus:border-slate-200 focus:ring-2 focus:ring-slate-100 outline-none transition-all";
  const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5";

  if (loading && types.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="font-['Poppins'] text-slate-900 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Certificate Types</h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Manage the list of available certificate types
          </p>
        </div>
        <button
          onClick={() => handleOpenModal("add")}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-sm font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95 whitespace-nowrap"
        >
          <Plus size={18} /> Add New Type
        </button>
      </div>

      {error && !isModalOpen && (
        <Alert type="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && !isModalOpen && (
        <Alert type="success" onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {/* Main Content Area */}
      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
        {types.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText size={24} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No certificate types</h3>
            <p className="text-sm text-slate-500 mb-6 font-medium">Get started by creating your first global certificate type.</p>
            <button
              onClick={() => handleOpenModal("add")}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 hover:text-slate-900 transition-all"
            >
              <Plus size={18} /> Add Type
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="px-4 py-3 border-b-2 border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 border-b-2 border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Applicable To
                  </th>
                  <th className="px-4 py-3 border-b-2 border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-4 py-3 border-b-2 border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 border-b-2 border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {types.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <FileText size={16} />
                        </div>
                        <span className="font-bold text-sm text-slate-900">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                        t.applicableTo === "ALL" ? "bg-slate-100 text-slate-600" :
                        t.applicableTo === "KIAL" ? "bg-blue-100 text-blue-700" :
                        "bg-emerald-100 text-emerald-700"
                      }`}>
                        {t.applicableTo}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-slate-500">
                        {t.department ? (t.department === "ALL" ? "All Departments" : t.department) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-slate-500">
                        {t.description || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenModal("edit", t)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id, t.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">
                {modalMode === "add" ? "Add Certificate Type" : "Edit Certificate Type"}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {error && isModalOpen && (
                <div className="mb-4">
                  <Alert type="error" onClose={() => setError("")}>{error}</Alert>
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className={labelClass}>Type Name *</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    className={inputClass}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., AvSec Basic Course"
                  />
                </div>

                <div>
                  <label className={labelClass}>Applicable To</label>
                  <select
                    className={inputClass}
                    value={form.applicableTo}
                    onChange={(e) => setForm({ ...form, applicableTo: e.target.value, department: e.target.value === "KIAL" ? form.department : "" })}
                  >
                    <option value="ALL">All Staff (Global)</option>
                    <option value="KIAL">KIAL Internal Staff Only</option>
                    <option value="ENTITY">Entity Staff Only</option>
                  </select>
                </div>

                {form.applicableTo === "KIAL" && (
                  <div>
                    <label className={labelClass}>Department</label>
                    <select
                      className={inputClass}
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                    >
                      <option value="">Select a department...</option>
                      <option value="ALL">All Departments</option>
                      {KIAL_DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className={labelClass}>Description (Optional)</label>
                  <textarea
                    rows={3}
                    className={`${inputClass} resize-none`}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Brief details about this type..."
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 bg-slate-50 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <LoadingSpinner />
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      {modalMode === "add" ? "Save Type" : "Update Type"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificateTypesPage;
