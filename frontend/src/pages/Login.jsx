import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock, ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import Alert from "../components/Alert";
import logo from "../public/kial.svg"; // Imported exactly as requested

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        navigate("/");
      } else {
        setError(result.error || "Failed to sign in");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F2F3F5] p-4 font-['Poppins'] overflow-hidden relative">
      {/* Abstract Background Shapes for Depth */}
      <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-red-600/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-slate-300/30 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container - Wide "Access Card" Design */}
      <div className="w-full max-w-[900px] bg-white rounded-[40px] shadow-2xl shadow-slate-200/60 flex flex-col md:flex-row overflow-hidden relative z-10 min-h-[500px] animate-in fade-in zoom-in-95 duration-500 border border-white">
        {/* Left Side: Brand Identity (Red Gradient) */}
        <div className="md:w-[45%] bg-gradient-to-br from-red-600 to-red-700 relative p-10 flex flex-col justify-between text-white overflow-hidden">
          {/* Decorative Pattern Overlay */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          ></div>

          {/* Abstract Glow */}
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          {/* Logo & Title Area */}
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 mb-6 shadow-lg shadow-red-900/20">
              <img
                src={logo}
                alt="KIAL Logo"
                className="w-10 h-10 object-contain brightness-0 invert"
              />
            </div>
            <h1 className="text-3xl font-bold leading-tight tracking-tight">
              KIAL <br /> Secure Portal
            </h1>
            <p className="text-red-100 text-xs font-medium mt-4 leading-relaxed max-w-[200px] opacity-90">
              Advanced Aviation Security Management System.
            </p>
          </div>
        </div>

        {/* Right Side: Login Form (Clean White) */}
        <div className="md:w-[55%] p-10 md:p-12 flex flex-col justify-center bg-white relative">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Officer Login</h2>
            <p className="text-sm text-slate-400 font-medium mt-1">
              Please enter your credentials to continue.
            </p>
          </div>

          {error && (
            <Alert type="error" className="mb-6 py-2 text-sm">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="group">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                Email ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail
                    size={18}
                    className="text-slate-400 group-focus-within:text-red-600 transition-colors"
                  />
                </div>
                <input
                  type="email"
                  name="email"
                  placeholder="officer@kial.aero"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-50 text-sm font-medium text-slate-900 placeholder:text-slate-400 pl-11 pr-4 py-3.5 rounded-xl border border-transparent focus:bg-white focus:border-red-100 focus:ring-4 focus:ring-red-50/50 outline-none transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="group">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock
                    size={18}
                    className="text-slate-400 group-focus-within:text-red-600 transition-colors"
                  />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-50 text-sm font-medium text-slate-900 placeholder:text-slate-400 pl-11 pr-12 py-3.5 rounded-xl border border-transparent focus:bg-white focus:border-red-100 focus:ring-4 focus:ring-red-50/50 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Form Footer */}
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer group select-none">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-slate-300 shadow transition-all checked:border-red-600 checked:bg-red-600 hover:shadow-md"
                  />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700 transition-colors">
                  Keep me signed in
                </span>
              </label>

              <a
                href="#"
                className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline transition-colors"
              >
                Help?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-xl shadow-slate-900/20 hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Access Dashboard
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer Text */}
      <div className="absolute bottom-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">
        &copy; {new Date().getFullYear()} KIAL Security Dept.
      </div>
    </div>
  );
};

export default Login;
