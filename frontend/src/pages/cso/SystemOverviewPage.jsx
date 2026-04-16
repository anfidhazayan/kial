import { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";
import {
  Users,
  Building2,
  FileText,
  AlertTriangle,
  CheckCircle,
  MoreHorizontal,
  TrendingUp,
  Trophy,
  Award,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  RadialBarChart, 
  RadialBar, 
  Legend,
  Sector 
} from "recharts";
import LoadingSpinner from "../../components/LoadingSpinner";
import Alert from "../../components/Alert";

const SystemOverviewPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  const renderActiveShape = (props) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-midAngle * RADIAN);
    const cos = Math.cos(-midAngle * RADIAN);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';
  
    return (
      <g>
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="text-sm font-bold">
          {payload.name}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 6}
          outerRadius={outerRadius + 10}
          fill={fill}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333" className="text-xs font-bold">{`Count ${value}`}</text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999" className="text-[10px]">
          {`(${(percent * 100).toFixed(0)}%)`}
        </text>
      </g>
    );
  };
  const [timeRange, setTimeRange] = useState("month");

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await adminAPI.getDashboard();
      setStats(response.data.data);
    } catch (err) {
      setError("Failed to load system overview data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;
  if (error) return <Alert type="error">{error}</Alert>;

  // --- Data Preparation for Recharts ---

  const totalCerts =
    (stats?.compliance?.expired || 0) +
    (stats?.compliance?.expiringSoon || 0) +
    (stats?.compliance?.valid || 0);

  // Muted Professional Red/Slate Color Palette for charts
  const chartColors = [
    "#ef4444", // red-500
    "#f87171", // red-400
    "#fca5a5", // red-300
    "#64748b", // slate-500
    "#94a3b8", // slate-400
    "#cbd5e1", // slate-300
    "#0f172a", // slate-900
    "#334155", // slate-700
  ];

  // Colors specifically for Compliance Pie Chart (Valid, Expiring, Expired)
  const complianceColors = {
    valid: "#64748b", // slate-500 (Valid, but unobtrusive)
    expiringSoon: "#f87171", // red-400 (Warning)
    expired: "#ef4444", // red-500 (Critical)
  };

  // 1. Certificate Status (Pie) — uses real compliance data
  const pieData = [
    { name: "Valid", value: stats?.compliance?.valid || 0, color: complianceColors.valid },
    { name: "Expiring Soon", value: stats?.compliance?.expiringSoon || 0, color: complianceColors.expiringSoon },
    { name: "Expired", value: stats?.compliance?.expired || 0, color: complianceColors.expired },
  ].filter(d => d.value > 0);

  // 2. Entity Distribution — uses real backend data
  const entityData = (stats?.entityDistribution || []).map((item, i) => ({
    ...item,
    color: chartColors[i % chartColors.length],
  }));

  // 3. Staff Distribution — uses real backend data
  const staffData = (stats?.staffDistribution || []).map((item, i) => ({
    ...item,
    color: chartColors[i % chartColors.length],
  }));

  // 4. Computed compliance rate
  const complianceRate = totalCerts > 0
    ? Math.round(((stats?.compliance?.valid || 0) / totalCerts) * 100)
    : 0;

  // Key Metrics Config — Strict Red Palette
  const keyMetrics = [
    {
      title: "Active Entities",
      value: stats?.totals?.entities || 0,
      icon: Building2,
      colorClass: "text-red-500 bg-red-50",
    },
    {
      title: "Total Staff",
      value: stats?.totals?.staff || 0,
      icon: Users,
      colorClass: "text-red-500 bg-red-50",
    },
    {
      title: "Certificates",
      value: stats?.totals?.certificates || 0,
      icon: FileText,
      colorClass: "text-red-500 bg-red-50",
    },
    {
      title: "Compliance Rate",
      value: `${complianceRate}%`,
      icon: CheckCircle,
      colorClass: "text-red-500 bg-red-50",
    },
  ];

  return (
    <div className="font-['Poppins'] text-slate-900 space-y-6">
      {/* 1. Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Overview</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Analytics and insights
          </p>
        </div>

        {/* Time Range Pills */}
        <div className="bg-white p-1 rounded-2xl border border-slate-100 flex items-center shadow-sm">
          {["Week", "Month", "Year"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range.toLowerCase())}
              className={`
                px-4 py-2 text-xs font-bold rounded-xl transition-all
                ${
                  timeRange === range.toLowerCase()
                    ? "bg-slate-900 text-white shadow-md"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }
              `}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {keyMetrics.map((metric, index) => (
          <div
            key={index}
            className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${metric.colorClass} transition-transform group-hover:scale-110`}
              >
                <metric.icon size={22} />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-slate-900 mb-1">
              {metric.value}
            </h3>
            <p className="text-xs text-slate-400 font-medium">{metric.title}</p>
          </div>
        ))}
      </div>

      {/* 3. Main Charts Row (Trends & Entity Dist) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Overview - Spans 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Compliance Overview
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Current certificate status breakdown
              </p>
            </div>
          </div>

          <div className="h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart 
                cx="50%" 
                cy="50%" 
                innerRadius="10%" 
                outerRadius="100%" 
                barSize={20} 
                data={pieData.map(d => ({ ...d, fill: d.color }))}
              >
                <RadialBar
                  minAngle={15}
                  label={{ position: 'insideStart', fill: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                  background
                  clockWise
                  dataKey="value"
                  cornerRadius={10}
                />
                <Legend 
                  iconSize={10} 
                  layout="vertical" 
                  verticalAlign="middle" 
                  wrapperStyle={{
                    top: '50%',
                    right: 0,
                    transform: 'translate(0, -50%)',
                    lineHeight: '24px',
                  }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc", borderRadius: "8px" }}
                  itemStyle={{ color: "#f8fafc" }} 
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Entity Distribution (Bar) - Spans 1 col */}
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-900">Entities</h3>
            <MoreHorizontal className="text-slate-300 cursor-pointer" />
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={entityData} layout="vertical" margin={{ left: 40 }}>
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: "#64748b" }} 
                  width={60} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9', radius: 4 }}
                  contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc", borderRadius: "8px" }}
                  wrapperStyle={{ outline: 'none' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                  {entityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Circular Charts & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Certificate Status (Pie) */}
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col items-center">
          <h3 className="text-lg font-bold text-slate-900 w-full mb-4">
            Certificate Status
          </h3>
          <div className="h-[220px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#f1f5f9", color: "#0f172a", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  itemStyle={{ color: "#0f172a" }} 
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
              <p className="text-2xl font-bold text-slate-900">{totalCerts}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Total
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4 mt-2">
            {pieData.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs font-medium text-slate-500">
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts & Warnings Panel */}
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle className="text-red-500" size={20} />
            <h3 className="text-lg font-bold text-slate-900">System Alerts</h3>
          </div>

          <div className="space-y-4 flex-grow">
            {/* Alert 1 */}
            <div className="p-4 bg-white rounded-2xl border border-red-100 flex items-start justify-between group hover:border-red-200 transition-colors">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
                  Critical
                </span>
                <p className="text-sm font-bold text-slate-900">
                  Expired Certificates
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Requires immediate resolution.
                </p>
              </div>
              <div className="text-lg font-bold text-red-500 bg-red-50 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                {stats?.compliance?.expired || 0}
              </div>
            </div>

            {/* Alert 2 */}
            <div className="p-4 bg-white rounded-2xl border border-red-100 flex items-start justify-between group hover:border-red-200 transition-colors">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
                  Warning
                </span>
                <p className="text-sm font-bold text-slate-900">Expiring Soon</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Action needed within 30 days.
                </p>
              </div>
              <div className="text-lg font-bold text-red-400 bg-red-50 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                {stats?.compliance?.expiringSoon || 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Action Items Leaderboards - Professional */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        
        {/* KIAL Departments Leaderboard */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
                <Users size={16} />
              </div>
              <h3 className="text-base font-bold text-slate-900">KIAL Departments</h3>
            </div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Top 5 by Risk</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[300px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-3 text-xs font-semibold text-slate-400 w-12 text-center">Rank</th>
                  <th className="pb-3 text-xs font-semibold text-slate-400">Department</th>
                  <th className="pb-3 text-xs font-semibold text-slate-400 text-right">Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stats?.expirationRankingsKial?.slice(0, 5).map((rank, index) => (
                  <tr key={index} className="group hover:bg-slate-50 transition-colors">
                    <td className="py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${index === 0 ? 'bg-red-50 text-red-600' : 'text-slate-500'}`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3 pl-2">
                      <p className="text-sm font-semibold text-slate-900">{rank.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] font-medium text-red-500" title="Expired">{rank.expired} Expired</span>
                        <span className="text-[10px] font-medium text-slate-400" title="Expiring Soon">{rank.expiringSoon} Expiring Soon</span>
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-sm font-bold text-slate-900">{rank.totalIssues}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {(!stats?.expirationRankingsKial || stats.expirationRankingsKial.length === 0) && (
              <div className="py-10 flex flex-col items-center justify-center text-center">
                <CheckCircle className="text-slate-300 mb-2" size={24} />
                <p className="text-sm font-medium text-slate-500">No departments with existing issues.</p>
              </div>
            )}
          </div>
        </div>

        {/* External Entities Leaderboard */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
                <Building2 size={16} />
              </div>
              <h3 className="text-base font-bold text-slate-900">External Entities</h3>
            </div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Top 5 by Risk</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[300px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-3 text-xs font-semibold text-slate-400 w-12 text-center">Rank</th>
                  <th className="pb-3 text-xs font-semibold text-slate-400">Entity</th>
                  <th className="pb-3 text-xs font-semibold text-slate-400 text-right">Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stats?.expirationRankingsEntities?.slice(0, 5).map((rank, index) => (
                  <tr key={index} className="group hover:bg-slate-50 transition-colors">
                    <td className="py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${index === 0 ? 'bg-red-50 text-red-600' : 'text-slate-500'}`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3 pl-2">
                      <p className="text-sm font-semibold text-slate-900">{rank.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] font-medium text-red-500" title="Expired">{rank.expired} Expired</span>
                        <span className="text-[10px] font-medium text-slate-400" title="Expiring Soon">{rank.expiringSoon} Expiring Soon</span>
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-sm font-bold text-slate-900">{rank.totalIssues}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {(!stats?.expirationRankingsEntities || stats.expirationRankingsEntities.length === 0) && (
              <div className="py-10 flex flex-col items-center justify-center text-center">
                <CheckCircle className="text-slate-300 mb-2" size={24} />
                <p className="text-sm font-medium text-slate-500">No entities with existing issues.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. Bottom Quick Stats (Progress Bars) */}
      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-900 mb-6">
          Performance Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Metric 1 */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">
                Compliance Rate
              </span>
              <span className="text-xs font-bold text-slate-900">
                {complianceRate}%
              </span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${complianceRate}%` }}
              />
            </div>
          </div>

          {/* Metric 2 */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">
                Pending Approvals
              </span>
              <span className="text-xs font-bold text-slate-900">
                {stats?.pendingApprovals || 0}
              </span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{
                  width: `${totalCerts > 0 ? Math.min(100, ((stats?.pendingApprovals || 0) / totalCerts) * 100) : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Metric 3 */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">
                Expired Certificates
              </span>
              <span className="text-xs font-bold text-slate-900">{stats?.compliance?.expired || 0}</span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full"
                style={{ width: `${totalCerts > 0 ? ((stats?.compliance?.expired || 0) / totalCerts) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemOverviewPage;
