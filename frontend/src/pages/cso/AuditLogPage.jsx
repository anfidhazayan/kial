import { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";
import {
  Clock,
  User,
  Activity,
  Filter,
  Search,
  ChevronDown,
  Shield,
  Trash2,
  Edit,
  PlusCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import LoadingSpinner from "../../components/LoadingSpinner";
import Alert from "../../components/Alert";
import { formatDate } from "../../utils/helpers";

const AuditLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, searchTerm, filterUser, filterAction, dateFrom, dateTo]);

  const fetchLogs = async () => {
    try {
      const response = await adminAPI.getDashboard();
      // Assuming the API returns activity in 'recentActivities' based on your previous code context
      const auditLogs = response.data.data?.recentActivities || [];
      setLogs(auditLogs);
    } catch (err) {
      setError("Failed to load audit logs");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.action?.toLowerCase().includes(lower) ||
          log.user?.email?.toLowerCase().includes(lower) ||
          log.user?.fullName?.toLowerCase().includes(lower)
      );
    }

    if (filterUser) {
      filtered = filtered.filter(
        (log) =>
          log.user?.email?.toLowerCase().includes(filterUser.toLowerCase()) ||
          log.user?.fullName?.toLowerCase().includes(filterUser.toLowerCase())
      );
    }

    if (filterAction) {
      filtered = filtered.filter((log) =>
        log.action?.toLowerCase().includes(filterAction.toLowerCase())
      );
    }

    if (dateFrom) {
      filtered = filtered.filter(
        (log) => new Date(log.timestamp) >= new Date(dateFrom)
      );
    }
    if (dateTo) {
      filtered = filtered.filter(
        (log) => new Date(log.timestamp) <= new Date(dateTo + "T23:59:59")
      );
    }

    setFilteredLogs(filtered);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterUser("");
    setFilterAction("");
    setDateFrom("");
    setDateTo("");
  };

  // --- Dynamic UI Helpers ---

  const getActionConfig = (action) => {
    const lower = action?.toLowerCase() || "";

    if (lower.includes("creat") || lower.includes("add")) {
      return {
        icon: PlusCircle,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        border: "border-emerald-100",
      };
    }
    if (
      lower.includes("updat") ||
      lower.includes("modif") ||
      lower.includes("edit")
    ) {
      return {
        icon: Edit,
        color: "text-blue-600",
        bg: "bg-blue-50",
        border: "border-blue-100",
      };
    }
    if (lower.includes("delet") || lower.includes("remov")) {
      return {
        icon: Trash2,
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-100",
      };
    }
    if (lower.includes("approv")) {
      return {
        icon: CheckCircle,
        color: "text-slate-600",
        bg: "bg-slate-50",
        border: "border-slate-100",
      };
    }
    if (lower.includes("reject")) {
      return {
        icon: XCircle,
        color: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-100",
      };
    }
    return {
      icon: Activity,
      color: "text-slate-600",
      bg: "bg-slate-50",
      border: "border-slate-100",
    };
  };

  // Calculate Dynamic Stats
  const todayCount = logs.filter(
    (l) => new Date(l.timestamp).toDateString() === new Date().toDateString()
  ).length;
  const uniqueUsers = new Set(logs.map((l) => l.user?.id)).size;

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="font-['Poppins'] text-slate-900 space-y-6">
      {/* 1. Header & Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Track system changes and user activities
          </p>
        </div>

        <div className="flex gap-3">
          <div className="bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Activity size={16} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">
                Today
              </p>
              <p className="text-sm font-bold text-slate-900">
                {todayCount} Events
              </p>
            </div>
          </div>
          <div className="bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <User size={16} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">
                Active Users
              </p>
              <p className="text-sm font-bold text-slate-900">{uniqueUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}

      {/* 2. Filter Bar */}
      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 transition-all duration-300">
        <div className="flex flex-col gap-4">
          {/* Main Search Row */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search audit logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 text-sm font-medium text-slate-900 placeholder:text-slate-400 pl-12 pr-4 py-3.5 rounded-2xl border border-transparent focus:bg-white focus:border-blue-100 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
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

          {/* Expandable Filter Grid */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  User
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="w-full bg-slate-50 text-sm font-medium p-3 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-blue-50 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Action Type
                </label>
                <input
                  type="text"
                  placeholder="e.g. Created, Deleted"
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="w-full bg-slate-50 text-sm font-medium p-3 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-blue-50 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  From Date
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full bg-slate-50 text-sm font-medium p-3 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-blue-50 outline-none"
                />
              </div>
              <div className="flex flex-col justify-end">
                <button
                  onClick={clearFilters}
                  className="w-full py-3 bg-red-50 text-red-600 font-bold text-sm rounded-xl hover:bg-red-100 transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Logs List (Modern Table) */}
      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 min-h-[400px]">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Shield size={32} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No logs found</h3>
            <p className="text-sm text-slate-400 mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-4 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-6">
                    Activity
                  </th>
                  <th className="px-4 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-4 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider pr-6">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredLogs.map((log, index) => {
                  const style = getActionConfig(log.action);
                  const Icon = style.icon;

                  return (
                    <tr
                      key={log.id || index}
                      className="group hover:bg-slate-50 transition-colors"
                    >
                      {/* Activity Column */}
                      <td className="px-4 py-4 whitespace-nowrap pl-6">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center border ${style.bg} ${style.color} ${style.border}`}
                          >
                            <Icon size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {log.action}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              System Event
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* User Column */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                            {log.user?.fullName?.charAt(0) || "U"}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-900">
                              {log.user?.fullName || "Unknown"}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {log.user?.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Column */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                          {log.user?.role || "System"}
                        </span>
                      </td>

                      {/* Timestamp Column */}
                      <td className="px-4 py-4 whitespace-nowrap text-right pr-6">
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-bold text-slate-900">
                            {formatDate(log.timestamp)}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(log.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer (Visual only based on design req) */}
        {filteredLogs.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Showing {filteredLogs.length} recent activities</span>
            <span>Live Data</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogPage;
