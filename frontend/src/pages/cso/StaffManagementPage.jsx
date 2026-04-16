import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminAPI } from "../../services/api";
import {
  Trash2,
  Search,
  Users,
  Building2,
  FileText,
  Filter,
  User,
  Download,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  Plus,
  ChevronDown,
} from "lucide-react";
import LoadingSpinner from "../../components/LoadingSpinner";
import Alert from "../../components/Alert";
import { formatDate, getDaysUntilExpiry } from "../../utils/helpers";
import { downloadBlob } from "../../utils/reportGenerator";

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

const StaffManagementPage = () => {
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    entity: "",
    department: "",
    zone: "",
    status: "",
    certificateStatus: "",
  });
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [resettingId, setResettingId] = useState(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await adminAPI.getStaff();
      console.log('--- RAW STAFF API RESPONSE ---');
      console.log(response.data.data);
      console.log('------------------------------');
      setStaff(response.data.data || []);
    } catch (err) {
      setError("Failed to load staff");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    // Prevent the row click event (opening modal) when clicking delete
    e.stopPropagation();

    if (!window.confirm("Are you sure you want to delete this staff member?")) {
      return;
    }

    try {
      await adminAPI.deleteStaff(id);
      setSuccess("Staff member deleted successfully");
      fetchStaff();
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete staff member");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleViewDetails = (staffMember) => {
    navigate(`/staff/${staffMember.id}`);
  };

  const handleResetPassword = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to reset this staff member's password?")) return;
    setResettingId(id);
    try {
      const response = await adminAPI.resetStaffPassword(id);
      const newPassword = response.data.data.password;
      // Update local state
      setStaff((prev) =>
        prev.map((s) => (s.id === id ? { ...s, password: newPassword } : s))
      );
      setVisiblePasswords((prev) => ({ ...prev, [id]: true }));
      setSuccess(`Password reset successfully`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password");
      setTimeout(() => setError(""), 3000);
    } finally {
      setResettingId(null);
    }
  };

  const handleCopyPassword = (password, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(password);
    setSuccess("Password copied to clipboard");
    setTimeout(() => setSuccess(""), 2000);
  };

  const togglePasswordVisibility = (id, e) => {
    e.stopPropagation();
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper to filter and format zones
  const getVisibleZones = (zones) => {
    if (!zones || !Array.isArray(zones)) return [];
    return zones.filter(Boolean);
  };

  // Unique filter options
  const uniqueEntities = [...new Set(staff.map((s) => s.entity?.name).filter(Boolean))];
  const uniqueZones = ["A", "D", "Si", "Sd", "P", "B", "F", "Ft", "C", "Ci", "Cd", "Cs", "I", "Os"];

  // Helper to determine status
  const getStaffStatus = (staffMember) => {
    if (staffMember.dateOfSuperannuation && new Date(staffMember.dateOfSuperannuation) < new Date()) {
      return "Expired";
    }
    return "Active";
  };

  // Helper to calculate certificate stats
  const getCertificateExpiryStats = (staffMember) => {
    const stats = { valid: 0, expiring: 0, expired: 0 };
    if (!staffMember.certificates || !Array.isArray(staffMember.certificates)) return stats;

    staffMember.certificates.forEach((cert) => {
      if (cert.status === "APPROVED" && cert.validTo) {
        const days = getDaysUntilExpiry(cert.validTo);
        if (days < 0) stats.expired++;
        else if (days <= 30) stats.expiring++;
        else stats.valid++;
      }
    });
    return stats;
  };

  // Filter Logic
  const filteredStaff = staff.filter((s) => {
    const matchesSearch =
      s.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.entity?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.aadhaarNumber?.includes(searchTerm) ||
      s.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEntity = !filters.entity || s.entity?.name === filters.entity;
    const matchesDepartment = !filters.department || (s.department && s.department.toLowerCase() === filters.department.toLowerCase());
    const matchesZone = !filters.zone || getVisibleZones(s.zones).includes(filters.zone);
    const matchesStatus = !filters.status || getStaffStatus(s) === filters.status;

    let matchesCertStatus = true;
    if (filters.certificateStatus) {
      const stats = getCertificateExpiryStats(s);
      if (filters.certificateStatus === "expired") matchesCertStatus = stats.expired > 0;
      else if (filters.certificateStatus === "expiring") matchesCertStatus = stats.expiring > 0;
      else if (filters.certificateStatus === "valid") matchesCertStatus = stats.valid > 0 && stats.expiring === 0 && stats.expired === 0;
      else if (filters.certificateStatus === "none") matchesCertStatus = stats.valid === 0 && stats.expiring === 0 && stats.expired === 0;
    }

    return matchesSearch && matchesEntity && matchesDepartment && matchesZone && matchesStatus && matchesCertStatus;
  });

  const clearFilters = () => {
    setFilters({ entity: "", department: "", zone: "", status: "", certificateStatus: "" });
    setSearchTerm("");
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="font-['Poppins'] text-slate-900 space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Staff Management
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Manage personnel across all entities
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Total Count Badge */}
          <div className="bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2">
            <Users size={16} className="text-blue-500" />
            <span className="text-xs font-bold text-slate-600">Total Staff:</span>
            <span className="text-sm font-bold text-slate-900">
              {staff.length}
            </span>
          </div>
          <button
            onClick={async () => {
              try {
                // Construct filter params
                const params = {};
                if (searchTerm) params.searchTerm = searchTerm;
                if (filters.entity) params.entity = filters.entity;
                if (filters.department) params.department = filters.department;
                if (filters.zone) params.zone = filters.zone;
                if (filters.status) params.status = filters.status;
                if (filters.certificateStatus) params.certificateStatus = filters.certificateStatus;

                const res = await adminAPI.exportStaff(params);
                downloadBlob(res.data, `KIAL_Staff_${new Date().toISOString().split('T')[0]}.xlsx`);
              } catch (err) {
                setError('Failed to export staff data');
              }
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-2xl text-sm font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95"
          >
            <Download size={18} /> Export Excel
          </button>
          <button
            onClick={() => navigate('/staff/new')}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus size={18} /> Add Staff
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}
      {success && (
        <Alert type="success" className="mb-4">
          {success}
        </Alert>
      )}

      {/* 2. Search & Filter Bar */}
      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              type="text"
              className="w-full bg-slate-50 text-sm font-medium text-slate-900 placeholder:text-slate-400 pl-12 pr-4 py-3.5 rounded-2xl border border-transparent focus:bg-white focus:border-slate-200 focus:ring-2 focus:ring-slate-100 outline-none transition-all"
              placeholder="Search by name, designation, entity, or Aadhaar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold transition-all ${
              showFilters
                ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Filter size={18} />
            Filters
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${
                showFilters ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 mt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Entity
              </label>
              <select
                value={filters.entity}
                onChange={(e) => setFilters({ ...filters, entity: e.target.value })}
                className="w-full bg-slate-50 text-sm font-medium p-3 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-blue-50 outline-none"
              >
                <option value="">All Entities</option>
                {uniqueEntities.map((entity) => (
                  <option key={entity} value={entity}>
                    {entity}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Department
              </label>
              <select
                value={filters.department}
                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                className="w-full bg-slate-50 text-sm font-medium p-3 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-blue-50 outline-none"
              >
                <option value="">All Departments</option>
                {KIAL_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Access Zone
              </label>
              <select
                value={filters.zone}
                onChange={(e) => setFilters({ ...filters, zone: e.target.value })}
                className="w-full bg-slate-50 text-sm font-medium p-3 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-blue-50 outline-none"
              >
                <option value="">All Zones</option>
                {uniqueZones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full bg-slate-50 text-sm font-medium p-3 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-blue-50 outline-none"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Certificates
              </label>
              <select
                value={filters.certificateStatus}
                onChange={(e) => setFilters({ ...filters, certificateStatus: e.target.value })}
                className="w-full bg-slate-50 text-sm font-medium p-3 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-blue-50 outline-none"
              >
                <option value="">All Certificates</option>
                <option value="valid">All Valid</option>
                <option value="expiring">Has Expiring (≤30 days)</option>
                <option value="expired">Has Expired</option>
                <option value="none">No Valid Certificates</option>
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <button
                onClick={clearFilters}
                className="w-full py-3 bg-red-50 text-red-600 font-bold text-sm rounded-xl hover:bg-red-100 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Staff Table Container */}
      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 min-h-[400px]">
        {filteredStaff.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Users size={32} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No staff found</h3>
            <p className="text-sm text-slate-400 mt-1">
              {searchTerm
                ? `No results for "${searchTerm}"`
                : "Get started by adding staff members"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-4 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="px-4 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Access & Zones
                  </th>
                  <th className="px-4 py-4 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Password
                  </th>
                  <th className="px-4 py-4 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredStaff.map((staffMember) => (
                  <tr
                    key={staffMember.id}
                    onClick={() => handleViewDetails(staffMember)}
                    className="group hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    {/* Name Column with Avatar */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shadow-sm border border-blue-100">
                          {staffMember.fullName?.charAt(0) || (
                            <User size={18} />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            {staffMember.fullName}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {staffMember.empCode && (
                              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold text-[10px] border border-slate-200">
                                #{staffMember.empCode}
                              </span>
                            )}
                            <div className="text-[11px] font-medium text-slate-500">
                              {staffMember.isKialStaff ? "KIAL Staff" : "Contract Staff"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role / Designation */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-600">
                          {staffMember.designation || "-"}
                        </span>
                        <span className="text-xs text-slate-500 mt-0.5">
                          {staffMember.department || "General"}
                        </span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-slate-600">
                        {staffMember.user?.email || "-"}
                      </span>
                    </td>

                    {/* Entity Badge */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center border border-orange-100">
                          <Building2 size={12} />
                        </div>
                        <span className="text-sm font-medium text-slate-600">
                          {staffMember.entity?.name || "-"}
                        </span>
                      </div>
                    </td>

                    {/* Access Details */}
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1.5 w-max">
                        <div className="flex items-center gap-2">
                          {staffMember.aepNumber ? (
                            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                              {staffMember.aepNumber}
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-slate-400">No AEP</span>
                          )}
                          {(() => { const aepCert = staffMember.certificates?.find(c => c.type === 'AEP' && c.status === 'APPROVED'); return aepCert?.validTo ? (
                            <span className="text-[10px] font-medium text-slate-500">
                              Exp: {formatDate(aepCert.validTo)}
                            </span>
                          ) : null; })()}
                        </div>
                        
                        {/* Zones */}
                        {getVisibleZones(staffMember.zones).length > 0 && (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {getVisibleZones(staffMember.zones).map((zone, idx) => (
                              <span key={idx} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                                {zone}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Certificate Status Badge */}
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        {(() => {
                          const stats = getCertificateExpiryStats(staffMember);
                          const total = stats.valid + stats.expiring + stats.expired;
                          
                          if (total === 0) {
                            return (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200">
                                <FileText size={12} className="text-slate-400" />
                                <span className="text-xs font-bold text-slate-500">
                                  No Certs
                                </span>
                              </div>
                            );
                          }

                          return (
                            <div className="flex flex-col gap-1 w-full max-w-[120px]">
                              {stats.valid > 0 && (
                                <span className="inline-flex items-center justify-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 w-full" title={`${stats.valid} Valid`}>
                                  {stats.valid} Valid
                                </span>
                              )}
                              {stats.expiring > 0 && (
                                <span className="inline-flex items-center justify-center text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 w-full" title={`${stats.expiring} Expiring Soon`}>
                                  {stats.expiring} Expiring
                                </span>
                              )}
                              {stats.expired > 0 && (
                                <span className="inline-flex items-center justify-center text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100 w-full" title={`${stats.expired} Expired`}>
                                  {stats.expired} Expired
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </td>

                    {/* Password Column */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {staffMember.password ? (
                        <div className="flex items-center gap-1.5">
                          <code className="text-xs font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 select-all">
                            {visiblePasswords[staffMember.id]
                              ? staffMember.password
                              : "••••••••••"}
                          </code>
                          <button
                            onClick={(e) => togglePasswordVisibility(staffMember.id, e)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"
                            title={visiblePasswords[staffMember.id] ? "Hide password" : "Show password"}
                          >
                            {visiblePasswords[staffMember.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            onClick={(e) => handleCopyPassword(staffMember.password, e)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-all"
                            title="Copy password"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={(e) => handleResetPassword(staffMember.id, e)}
                            disabled={resettingId === staffMember.id}
                            className="p-1 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-all disabled:opacity-50"
                            title="Reset password"
                          >
                            <RefreshCw size={14} className={resettingId === staffMember.id ? "animate-spin" : ""} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={(e) => handleDelete(staffMember.id, e)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Delete Staff"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffManagementPage;
