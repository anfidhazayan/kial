import { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";
import {
  Users,
  Building2,
  CheckCircle,
  Activity,
  MoreHorizontal,
  ArrowUpRight,
  Share2,
  AlertTriangle,
  Clock,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import LoadingSpinner from "../../components/LoadingSpinner";
import Alert from "../../components/Alert";
import { formatDate } from "../../utils/helpers";
import { generateDashboardPDF } from "../../utils/reportGenerator";

const CSODashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");



  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await adminAPI.getDashboard();
      const data = response.data.data;
      setStats(data);
    } catch (err) {
      setError("Failed to load dashboard data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;
  if (error) return <Alert type="error">{error}</Alert>;

  // --- Calculations ---
  const totalCerts =
    (stats?.compliance?.expired || 0) +
    (stats?.compliance?.expiringSoon || 0) +
    (stats?.compliance?.valid || 0);
  const validPercent =
    totalCerts > 0
      ? (((stats?.compliance?.valid || 0) / totalCerts) * 100).toFixed(0)
      : 0;

  return (
    <div className="font-['Poppins'] text-slate-900 space-y-6">
      {/* 1. Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Overview of security compliance
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => generateDashboardPDF(stats)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-all active:scale-95"
          >
            <Share2 size={16} />
            <span>Share Report</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN (Wide Content) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top Stats Row (3 Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stat 1: Entities */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center transition-transform group-hover:scale-110">
                  <Building2 size={20} />
                </div>
                <MoreHorizontal
                  size={20}
                  className="text-slate-300 cursor-pointer hover:text-slate-500"
                />
              </div>
              <h3 className="text-2xl font-bold mb-1">
                {stats?.totals?.entities || 0}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Active Entities
              </p>
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl transform translate-x-8 translate-y-8" />
            </div>

            {/* Stat 2: Staff */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center transition-transform group-hover:scale-110">
                  <Users size={20} />
                </div>
                <MoreHorizontal
                  size={20}
                  className="text-slate-300 cursor-pointer hover:text-slate-500"
                />
              </div>
              <h3 className="text-2xl font-bold mb-1">
                {stats?.totals?.staff || 0}
              </h3>
              <p className="text-xs text-slate-400 font-medium">Total Staff</p>
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl transform translate-x-8 translate-y-8" />
            </div>

            {/* Stat 3: Pending Approvals */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center transition-transform group-hover:scale-110">
                  <CheckCircle size={20} />
                </div>
                <MoreHorizontal
                  size={20}
                  className="text-slate-300 cursor-pointer hover:text-slate-500"
                />
              </div>
              <h3 className="text-2xl font-bold mb-1">
                {stats?.pendingApprovals || 0}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Pending Approvals
              </p>
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl transform translate-x-8 translate-y-8" />
            </div>
          </div>

          {/* Middle Row: Certificate Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Certificate Status Summary */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-1">Certificates</h3>
              <h2 className="text-3xl font-bold text-slate-900">
                {stats?.totals?.certificates || 0}
              </h2>
              <p className="text-xs text-slate-400 mt-1 mb-6">
                Total issued certificates
              </p>

              {/* Donut Chart for Certificate Distribution */}
              <div className="h-48 w-full mt-4 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Valid", value: stats?.compliance?.valid || 0, color: "#10b981" },
                        { name: "Expiring", value: stats?.compliance?.expiringSoon || 0, color: "#f59e0b" },
                        { name: "Expired", value: stats?.compliance?.expired || 0, color: "#ef4444" },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {[
                        { color: "#10b981" },
                        { color: "#f59e0b" },
                        { color: "#ef4444" },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc", borderRadius: "8px" }}
                      itemStyle={{ color: "#f8fafc" }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-slate-500 font-medium">Valid</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-[10px] text-slate-500 font-medium">Expiring</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[10px] text-slate-500 font-medium">Expired</span>
                </div>
              </div>
            </div>

            {/* Card 2: Compliance Rate */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-1">Compliance Rate</h3>
              <h2 className="text-3xl font-bold text-slate-900">
                {validPercent}%
              </h2>
              <p className="text-xs text-slate-400 mt-1 mb-6">
                Valid certificates ratio
              </p>

              {/* Animated Gauge Chart */}
              <div className="h-48 w-full mt-4 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Rate", value: parseInt(validPercent), color: parseInt(validPercent) >= 80 ? "#10b981" : parseInt(validPercent) >= 50 ? "#f59e0b" : "#ef4444" },
                        { name: "Rest", value: 100 - parseInt(validPercent), color: "#f1f5f9" },
                      ]}
                      cx="50%"
                      cy="70%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius={80}
                      outerRadius={100}
                      paddingAngle={0}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={10}
                    >
                      <Cell fill={parseInt(validPercent) >= 80 ? "#10b981" : parseInt(validPercent) >= 50 ? "#f59e0b" : "#ef4444"} />
                      <Cell fill="#f1f5f9" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Centered Percentage for Gauge */}
                <div className="absolute top-[60%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                  <span className="text-4xl font-bold text-slate-900">{validPercent}%</span>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">Score</p>
                </div>
              </div>

              <div className="text-center mt-[-20px]">
                <p className="text-xs font-medium text-slate-400">
                  {parseInt(validPercent) >= 80 ? 'System Healthy' : parseInt(validPercent) >= 50 ? 'Needs Attention' : 'Critical Action Required'}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Section: Expiring Certificates List */}
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">
                    Critical Certificates
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Expiring soon or already expired
                  </p>
                </div>
              </div>
              <button className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors">
                View All
              </button>
            </div>

            <div className="space-y-4">
              {stats?.expiringStaffCertificates?.slice(0, 5).map((cert, index) => (
                <Link
                  key={index}
                  to={`/staff/${cert.staffId}`}
                  className="group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-blue-100 hover:bg-blue-50/50 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4 mb-3 md:mb-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${cert.status === 'Expired' ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-amber-50 text-amber-500 border border-amber-100'}`}>
                      {cert.status === 'Expired' ? <AlertTriangle size={22} /> : <Clock size={22} />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {cert.staffName}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          {cert.type}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-[11px] font-medium text-slate-400 truncate max-w-[150px]">
                          {cert.entityName}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-none border-slate-100">
                    <div className="text-left md:text-right">
                      <div className={`text-xs font-bold px-2.5 py-1 rounded-lg inline-flex mb-1 ${cert.status === 'Expired' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {cert.status}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium md:block">
                        {cert.validTo ? `Valid till ${formatDate(cert.validTo)}` : 'No expiry date'}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all shadow-sm">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </Link>
              ))}

              {(!stats?.expiringStaffCertificates || stats.expiringStaffCertificates.length === 0) && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 mb-3">
                    <CheckCircle size={32} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">All Clear</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">There are no operational staff certificates that are expired or expiring soon.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (Narrow Sidebar) */}
        <div className="space-y-6">
          {/* 1. "Gold Card" - Critical Insights */}
          <div className="bg-[#F59E0B] rounded-[32px] p-8 text-white relative overflow-hidden shadow-lg shadow-orange-500/20 h-[380px] flex flex-col">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl transform translate-x-10 -translate-y-10" />

            <div className="flex justify-between items-start mb-6 z-10">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                <AlertTriangle className="text-white" size={24} />
              </div>
              <MoreHorizontal className="text-white/60 cursor-pointer hover:text-white" />
            </div>

            <h2 className="text-4xl font-bold mb-2">
              {stats?.compliance?.expiringSoon || 0}
            </h2>
            <p className="text-sm font-medium text-orange-50 mb-8 opacity-90">
              Certificates Expiring Soon
            </p>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mt-auto border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-white">
                  Critical Action
                </span>
              </div>
              <p className="text-[10px] text-orange-50 leading-relaxed opacity-80">
                {stats?.compliance?.expired || 0} certificates have already
                expired. Immediate renewal required.
              </p>
            </div>
          </div>

          {/* 2. Secondary List - Entities with Issues */}
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 flex flex-col flex-grow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm">Entity Issues</h3>
              <MoreHorizontal
                size={16}
                className="text-slate-300 cursor-pointer hover:text-slate-500"
              />
            </div>

            <div className="space-y-3 overflow-y-auto pr-1 pb-2 flex-grow">
              {stats?.expiringEntities?.slice(0, 4).map((entity, index) => {
                const totalIssues = entity.expiredIssues.length + entity.expiringSoonIssues.length;
                const hasExpired = entity.expiredIssues.length > 0;
                
                return (
                  <Link
                    key={index}
                    to={`/entities/${entity.id}`}
                    className="block group p-3 rounded-2xl border border-slate-50 hover:border-orange-100 hover:bg-orange-50/30 transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors truncate pr-2">
                        {entity.name}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap ${hasExpired ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                        {totalIssues} Issue{totalIssues > 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mt-2">
                      {entity.expiredIssues.map((issue, i) => (
                        <span key={`exp-${i}`} className="text-[9px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          Expired {issue}
                        </span>
                      ))}
                      {entity.expiringSoonIssues.map((issue, i) => (
                        <span key={`soon-${i}`} className="text-[9px] font-medium text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          Expiring {issue}
                        </span>
                      ))}
                    </div>
                  </Link>
                );
              })}

              {(!stats?.expiringEntities || stats.expiringEntities.length === 0) && (
                <div className="flex flex-col items-center justify-center py-8 text-center opacity-70">
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-2">
                    <CheckCircle size={20} />
                  </div>
                  <p className="text-xs font-medium text-slate-500">All entity documents are valid.</p>
                </div>
              )}
            </div>

            <div className="pt-3 mt-auto border-t border-slate-50">
              <Link to="/cso/entities" className="flex items-center justify-center gap-1 w-full text-xs font-bold text-slate-400 hover:text-amber-600 transition-colors group">
                View All Entities 
                <ArrowUpRight
                  size={10}
                  className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSODashboard;
