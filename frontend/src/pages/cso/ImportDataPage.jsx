import { useState } from 'react';
import { adminAPI } from '../../services/api';
import { Upload, FileSpreadsheet, Users, Building2, AlertCircle, Info } from 'lucide-react';
import Alert from '../../components/Alert';
import LoadingSpinner from '../../components/LoadingSpinner';

const ImportDataPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [importType, setImportType] = useState('entities');
  const [selectedFile, setSelectedFile] = useState(null);
  const [entityCode, setEntityCode] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        setError('Please select an Excel file (.xlsx or .xls)');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Please select a file to import');
      return;
    }

    if (importType === 'entity-staff' && !entityCode) {
      setError('Please enter an Entity ID (code) for entity staff import');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      let response;
      if (importType === 'entities') {
        response = await adminAPI.importEntities(formData);
      } else if (importType === 'kial-staff') {
        response = await adminAPI.importKialStaff(formData);
      } else if (importType === 'entity-staff') {
        response = await adminAPI.importEntityStaff(entityCode, formData);
      }

      console.log('--- RAW IMPORT API RESPONSE ---');
      console.log(response.data);
      console.log('-------------------------------');

      setSuccess(response.data.message || 'Data imported successfully');
      setSelectedFile(null);
      setEntityCode('');
      // Reset file input
      document.getElementById('file-input').value = '';
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to import data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const importTypes = [
    {
      value: 'entities',
      label: 'Import Entities',
      icon: Building2,
      description: 'Import security agencies and contractors from Excel',
      requiresEntityId: false,
      color: 'orange',
    },
    {
      value: 'kial-staff',
      label: 'Import KIAL Staff',
      icon: Users,
      description: 'Import KIAL staff members from Excel',
      requiresEntityId: false,
      color: 'blue',
    },
    {
      value: 'entity-staff',
      label: 'Import Entity Staff',
      icon: Users,
      description: 'Import staff members for a specific entity from Excel',
      requiresEntityId: true,
      color: 'emerald',
    },
  ];

  const colorMap = {
    orange: {
      bg: 'bg-orange-50',
      text: 'text-orange-500',
      border: 'border-orange-200',
      selectedBg: 'bg-orange-50',
      selectedBorder: 'border-orange-400',
      glow: 'bg-orange-500/5',
    },
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-500',
      border: 'border-blue-200',
      selectedBg: 'bg-blue-50',
      selectedBorder: 'border-blue-400',
      glow: 'bg-blue-500/5',
    },
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-500',
      border: 'border-emerald-200',
      selectedBg: 'bg-emerald-50',
      selectedBorder: 'border-emerald-400',
      glow: 'bg-emerald-500/5',
    },
  };

  const selectedImportType = importTypes.find(t => t.value === importType);

  return (
    <div className="font-['Poppins'] text-slate-900 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Import Data</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Bulk upload entities and staff from Excel files
          </p>
        </div>

        {/* File Format Badge */}
        <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2">
          <FileSpreadsheet size={16} className="text-emerald-500" />
          <span className="text-xs font-bold text-slate-600">Supported:</span>
          <span className="text-xs font-bold text-slate-900">.xlsx, .xls</span>
        </div>
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Import Type Selection */}
      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
        <h2 className="font-bold text-slate-900 text-lg mb-6">Select Import Type</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {importTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = importType === type.value;
            const colors = colorMap[type.color];
            
            return (
              <button
                key={type.value}
                onClick={() => setImportType(type.value)}
                className={`relative overflow-hidden p-6 rounded-2xl border-2 text-left transition-all duration-200 group ${
                  isSelected 
                    ? `${colors.selectedBorder} ${colors.selectedBg}` 
                    : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'
                }`}
              >
                <div className={`w-10 h-10 rounded-2xl ${colors.bg} ${colors.text} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                  <Icon size={20} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  {type.label}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                  {type.description}
                </p>
                {/* Glow decoration */}
                <div className={`absolute bottom-0 right-0 w-24 h-24 ${colors.glow} rounded-full blur-2xl transform translate-x-8 translate-y-8`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Upload Form */}
      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
        <h2 className="font-bold text-slate-900 text-lg mb-6">Upload File</h2>

        <form onSubmit={handleImport} className="space-y-6">
          {selectedImportType?.requiresEntityId && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Entity ID (Code) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={entityCode}
                onChange={(e) => setEntityCode(e.target.value)}
                placeholder="Enter the Entity ID code (e.g., ENT001)"
                required
                className="w-full bg-slate-50 text-sm font-medium text-slate-900 placeholder:text-slate-400 px-4 py-3.5 rounded-2xl border border-transparent focus:bg-white focus:border-blue-100 focus:ring-2 focus:ring-blue-50 outline-none transition-all"
              />
              <p className="text-[10px] text-slate-400 font-medium mt-2">
                The Entity ID code is visible on the Entities page next to each entity name.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Excel File <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 group">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-50 transition-colors">
                <Upload size={28} className="text-slate-300 group-hover:text-blue-400 transition-colors" />
              </div>
              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="file-input"
                className="inline-block px-6 py-2.5 bg-slate-900 text-white rounded-2xl cursor-pointer font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-95"
              >
                Choose File
              </label>
              <p className="text-sm font-medium text-slate-600 mt-3">
                {selectedFile ? (
                  <span className="flex items-center justify-center gap-2">
                    <FileSpreadsheet size={16} className="text-emerald-500" />
                    {selectedFile.name}
                  </span>
                ) : (
                  'No file selected'
                )}
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-1">
                Drag & drop or click to browse. Supported: .xlsx, .xls
              </p>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-800">Important</p>
              <p className="text-[11px] text-amber-700 font-medium mt-0.5 leading-relaxed">
                Make sure your Excel file follows the correct format. Invalid data will be skipped and errors will be reported.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-50">
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                setEntityCode('');
                document.getElementById('file-input').value = '';
                setError('');
                setSuccess('');
              }}
              className="px-5 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={loading || !selectedFile}
              className={`px-6 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-2 text-white transition-all active:scale-95 ${
                loading || !selectedFile 
                  ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                  : 'bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-900/20'
              }`}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Importing...
                </>
              ) : (
                <>
                  <FileSpreadsheet size={18} />
                  Import Data
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Excel Format Guidelines */}
      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
            <Info size={20} />
          </div>
          <h2 className="font-bold text-slate-900 text-lg">Excel Format Guidelines</h2>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-slate-400 font-medium">
            Ensure your Excel file contains the correct columns based on the import type:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: 'Entities',
                items: 'Name, Category, Contract dates, ASCO details, etc.',
                color: 'orange',
              },
              {
                title: 'KIAL Staff',
                items: 'Full Name, Designation, Department, Aadhaar, etc.',
                color: 'blue',
              },
              {
                title: 'Entity Staff',
                items: 'Full Name, Designation, Aadhaar, AEP details, etc.',
                color: 'emerald',
              },
            ].map((guide) => (
              <div key={guide.title} className={`p-4 bg-${guide.color}-50/50 border border-${guide.color}-100 rounded-xl`}>
                <p className={`text-xs font-bold text-${guide.color}-600 mb-1`}>{guide.title}</p>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{guide.items}</p>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-slate-400 font-medium pt-2 border-t border-slate-50">
            Refer to the backend documentation for detailed column specifications.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImportDataPage;
