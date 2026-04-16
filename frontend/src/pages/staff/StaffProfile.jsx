import { useState, useEffect } from 'react';
import { staffAPI } from '../../services/api';
import { User, Save, Shield, Calendar, CreditCard, Building2, Briefcase, Mail } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import Alert from '../../components/Alert';
import { formatDate } from '../../utils/helpers';

const StaffProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    designation: '',
    aadhaarNumber: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await staffAPI.getProfile();
      const data = response.data.data;
      setProfile(data);
      setFormData({
        fullName: data.fullName || '',
        designation: data.designation || '',
        aadhaarNumber: data.aadhaarNumber || '',
      });
    } catch (err) {
      setError('Failed to load profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    try {
      await staffAPI.updateProfile(formData);
      setSuccess('Profile updated successfully');
      fetchProfile();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="font-['Poppins'] text-slate-900 space-y-8 max-w-5xl mx-auto py-4">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-light tracking-tight text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-500 mt-2 font-medium">
          View and manage your personal information
        </p>
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Identity Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 flex flex-col items-center text-center shadow-sm">
             <div className="w-24 h-24 rounded-full border border-slate-200 p-1 mb-6">
               <div className="w-full h-full rounded-full bg-slate-50 flex items-center justify-center">
                  <User size={32} className="text-slate-400" />
               </div>
             </div>

             <h2 className="text-xl font-semibold text-slate-900">{profile?.fullName}</h2>
             <p className="text-sm text-slate-500 mt-1">{profile?.designation || 'Staff Member'}</p>

             <div className="w-full mt-8 space-y-0 text-left border-t border-slate-100 divide-y divide-slate-100">
               <div className="flex items-center gap-4 py-4">
                 <Building2 size={18} className="text-slate-400" />
                 <div>
                   <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Entity</p>
                   <p className="text-sm font-medium text-slate-900">{profile?.entity?.name || 'KIAL Staff'}</p>
                 </div>
               </div>

               <div className="flex items-center gap-4 py-4">
                 <Shield size={18} className="text-slate-400" />
                 <div>
                   <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">AEP Number</p>
                   <p className="text-sm font-medium text-slate-900">{profile?.aepNumber || 'Not Assigned'}</p>
                 </div>
               </div>

               <div className="flex items-center gap-4 py-4">
                 <Mail size={18} className="text-slate-400" />
                 <div className="overflow-hidden">
                   <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Email Account</p>
                   <p className="text-sm font-medium text-slate-900 truncate">{profile?.user?.email || 'N/A'}</p>
                 </div>
               </div>
             </div>
          </div>

          {/* AEP Validity Block */}
          {profile?.certificates?.find(c => c.type === 'AEP' && c.status === 'APPROVED') && (
            <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-md">
              <div className="flex items-center gap-3 mb-6">
                <Calendar size={18} className="text-slate-400"/>
                <h3 className="font-medium text-sm text-slate-100">AEP Validity</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                    <p className="text-xs text-slate-400 uppercase font-semibold">Valid From</p>
                    <p className="text-sm font-medium text-slate-200">
                      {(() => { const aepCert = profile?.certificates?.find(c => c.type === 'AEP' && c.status === 'APPROVED'); return aepCert?.validFrom ? formatDate(aepCert.validFrom) : 'N/A'; })()}
                    </p>
                </div>
                <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-400 uppercase font-semibold">Valid To</p>
                    <p className="text-sm font-medium text-slate-200">
                      {(() => { const aepCert = profile?.certificates?.find(c => c.type === 'AEP' && c.status === 'APPROVED'); return aepCert?.validTo ? formatDate(aepCert.validTo) : 'N/A'; })()}
                    </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Edit Form */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm h-full">
            <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-6">
               <Briefcase size={20} className="text-slate-400" />
               <div>
                 <h3 className="text-base font-semibold text-slate-900">Personal Information</h3>
                 <p className="text-xs text-slate-500 mt-1">Keep your details up to date</p>
               </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors placeholder:text-slate-300"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Designation</label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors placeholder:text-slate-300"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2.5 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Aadhaar Number</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors placeholder:text-slate-300"
                      value={formData.aadhaarNumber}
                      onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value })}
                      maxLength="12"
                      placeholder="XXXX-XXXX-XXXX"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Used securely for background verification purposes only.
                  </p>
                </div>
              </div>

              <div className="pt-8 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 px-8 py-3 bg-red-700 text-white rounded-lg text-sm font-semibold hover:bg-red-800 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 min-w-[160px] shadow-sm shadow-red-900/20"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <LoadingSpinner size="sm" color="white" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffProfile;
