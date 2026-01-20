import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Key, Calendar, Building2, CreditCard, Check, X, AlertTriangle, Clock, RefreshCw, Trash2, Edit, Eye, EyeOff, Copy, Shield, Lock, LogOut, FileText, Mail, MessageCircle } from 'lucide-react';

// ⚠️ IMPORTANT: Schimbă această parolă cu una proprie!
const ADMIN_PASSWORD = 'RevizioAdmin#2026!';

// Storage wrapper pentru localStorage (înlocuiește storage)
const storage = {
  async get(key) {
    const value = localStorage.getItem(key);
    return value ? { value } : null;
  },
  async set(key, value) {
    localStorage.setItem(key, value);
    return { key, value };
  },
  async delete(key) {
    localStorage.removeItem(key);
    return { key, deleted: true };
  },
  async list(prefix = '') {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keys.push(key);
      }
    }
    return { keys };
  }
};

export default function AdminDashboard() {
  // Admin authentication
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [licenses, setLicenses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showLicenseForm, setShowLicenseForm] = useState(false);
  const [editingLicenseId, setEditingLicenseId] = useState(null);
  const [showPassword, setShowPassword] = useState({});
  const [confirmDialog, setConfirmDialog] = useState({ show: false, message: '', onConfirm: null });
  const [copiedKey, setCopiedKey] = useState(null);

  // GDPR state
  const [showGdprModal, setShowGdprModal] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [gdprInactivityMonths, setGdprInactivityMonths] = useState(24);
  const [gdprAction, setGdprAction] = useState('anonymize');
  const [inactiveLicenses, setInactiveLicenses] = useState([]);
  
  const [licenseForm, setLicenseForm] = useState({
    companyName: '',
    ownerName: '',
    email: '',
    phone: '',
    cui: '',
    address: '',
    bankName: '',
    bankIban: '',
    trialDays: 30,
    notes: ''
  });

  // Check if already logged in (session)
  useEffect(() => {
    const session = sessionStorage.getItem('adminAuth');
    if (session === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Load licenses from storage
  useEffect(() => {
    if (isAuthenticated) {
      loadLicenses();
    }
  }, [isAuthenticated]);

  const handleAdminLogin = () => {
    if (loginPassword === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('adminAuth', 'true');
      setLoginError('');
      setLoginPassword('');
    } else {
      setLoginError('Parolă incorectă');
    }
  };

  const handleAdminLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('adminAuth');
  };

  const loadLicenses = async () => {
    try {
      const keys = await storage.list('license:');
      if (keys && keys.keys) {
        const loadedLicenses = [];
        for (const key of keys.keys) {
          const data = await storage.get(key);
          if (data && data.value) {
            loadedLicenses.push(JSON.parse(data.value));
          }
        }
        setLicenses(loadedLicenses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      }
    } catch (error) {
      console.error('Error loading licenses:', error);
    }
  };

  // Generate unique license key
  const generateLicenseKey = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let key = '';
    for (let i = 0; i < 4; i++) {
      if (i > 0) key += '-';
      for (let j = 0; j < 4; j++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    return key;
  };

  // Generate random password
  const generatePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const resetForm = () => {
    setLicenseForm({
      companyName: '',
      ownerName: '',
      email: '',
      phone: '',
      cui: '',
      address: '',
      bankName: '',
      bankIban: '',
      trialDays: 30,
      notes: ''
    });
    setEditingLicenseId(null);
    setShowLicenseForm(false);
  };

  const saveLicense = async () => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + licenseForm.trialDays * 24 * 60 * 60 * 1000);
    
    let license;
    
    if (editingLicenseId) {
      // Editing existing license
      const existing = licenses.find(l => l.id === editingLicenseId);
      license = {
        ...existing,
        companyName: licenseForm.companyName,
        ownerName: licenseForm.ownerName,
        email: licenseForm.email,
        phone: licenseForm.phone,
        cui: licenseForm.cui,
        address: licenseForm.address,
        bankName: licenseForm.bankName,
        bankIban: licenseForm.bankIban,
        notes: licenseForm.notes,
        updatedAt: now.toISOString()
      };
    } else {
      // Creating new license
      license = {
        id: `license:${Date.now()}`,
        licenseKey: generateLicenseKey(),
        password: generatePassword(),
        companyName: licenseForm.companyName,
        ownerName: licenseForm.ownerName,
        email: licenseForm.email,
        phone: licenseForm.phone,
        cui: licenseForm.cui,
        address: licenseForm.address,
        bankName: licenseForm.bankName,
        bankIban: licenseForm.bankIban,
        notes: licenseForm.notes,
        status: 'trial', // trial, active, expired, suspended
        trialDays: licenseForm.trialDays,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        activatedAt: null,
        lastLoginAt: null,
        loginCount: 0
      };
    }
    
    await storage.set(license.id, JSON.stringify(license));
    await loadLicenses();
    resetForm();
  };

  const editLicense = (license) => {
    setLicenseForm({
      companyName: license.companyName,
      ownerName: license.ownerName,
      email: license.email,
      phone: license.phone,
      cui: license.cui,
      address: license.address,
      bankName: license.bankName || '',
      bankIban: license.bankIban || '',
      trialDays: license.trialDays,
      notes: license.notes || ''
    });
    setEditingLicenseId(license.id);
    setShowLicenseForm(true);
  };

  const deleteLicense = (license) => {
    setConfirmDialog({
      show: true,
      message: `Sigur doriți să ștergeți licența pentru "${license.companyName}"?`,
      onConfirm: async () => {
        await storage.delete(license.id);
        await loadLicenses();
        setConfirmDialog({ show: false, message: '', onConfirm: null });
      }
    });
  };

  const extendLicense = async (license, days) => {
    const currentExpiry = new Date(license.expiresAt);
    const now = new Date();
    const baseDate = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    
    const updatedLicense = {
      ...license,
      expiresAt: newExpiry.toISOString(),
      status: 'active',
      isUnlimited: false,
      updatedAt: new Date().toISOString()
    };
    
    await storage.set(license.id, JSON.stringify(updatedLicense));
    await loadLicenses();
  };

  const setUnlimitedLicense = async (license) => {
    setConfirmDialog({
      show: true,
      message: `Sigur doriți să setați licența pentru "${license.companyName}" ca NELIMITATĂ? Operatorul va avea acces permanent până la reziliere.`,
      onConfirm: async () => {
        const updatedLicense = {
          ...license,
          status: 'active',
          isUnlimited: true,
          expiresAt: new Date('2099-12-31').toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await storage.set(license.id, JSON.stringify(updatedLicense));
        await loadLicenses();
        setConfirmDialog({ show: false, message: '', onConfirm: null });
      }
    });
  };

  const removeLimitedLicense = async (license) => {
    const now = new Date();
    const newExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    
    const updatedLicense = {
      ...license,
      status: 'active',
      isUnlimited: false,
      expiresAt: newExpiry.toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await storage.set(license.id, JSON.stringify(updatedLicense));
    await loadLicenses();
  };

  const toggleLicenseStatus = async (license) => {
    const newStatus = license.status === 'suspended' ? 'active' : 'suspended';
    
    const updatedLicense = {
      ...license,
      status: newStatus,
      updatedAt: new Date().toISOString()
    };
    
    await storage.set(license.id, JSON.stringify(updatedLicense));
    await loadLicenses();
  };

  const resetCredentials = async (license) => {
    setConfirmDialog({
      show: true,
      message: `Sigur doriți să resetați credențialele pentru "${license.companyName}"? Operatorul va primi o nouă cheie și parolă.`,
      onConfirm: async () => {
        const updatedLicense = {
          ...license,
          licenseKey: generateLicenseKey(),
          password: generatePassword(),
          updatedAt: new Date().toISOString()
        };
        
        await storage.set(license.id, JSON.stringify(updatedLicense));
        await loadLicenses();
        setConfirmDialog({ show: false, message: '', onConfirm: null });
      }
    });
  };

  const copyToClipboard = (text, keyId) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Send credentials functions
  const getCredentialsMessage = (license) => {
    const expiryText = license.isUnlimited 
      ? 'Acces: Nelimitat' 
      : `Trial: ${license.trialDays} zile de la prima accesare`;
    
    return `🔐 Acces RevizioApp

Bună ziua ${license.ownerName},

Ați primit acces la RevizioApp - Revizii organizate simplu.

📋 Credențiale:
Cheie licență: ${license.licenseKey}
Parolă: ${license.password}

🌐 Link acces: https://revizioapp.ro

⏱️ ${expiryText}

Pentru suport, contactați administratorul.`;
  };

  const sendViaEmail = (license) => {
    const subject = encodeURIComponent('Credențiale acces RevizioApp');
    const body = encodeURIComponent(getCredentialsMessage(license));
    window.open(`mailto:${license.email}?subject=${subject}&body=${body}`, '_blank');
  };

  const sendViaWhatsApp = (license) => {
    const message = encodeURIComponent(getCredentialsMessage(license));
    // Format phone number - remove spaces and ensure it starts with country code
    let phone = license.phone.replace(/\s/g, '').replace(/^0/, '40');
    if (!phone.startsWith('+') && !phone.startsWith('40')) {
      phone = '40' + phone;
    }
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  // GDPR Functions
  const getInactiveLicenses = (months) => {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    
    return licenses.filter(license => {
      // Skip unlimited active licenses
      if (license.isUnlimited && license.status !== 'suspended') return false;
      
      // Check last activity (last login or creation date)
      let lastActivityDate = new Date(0);
      
      if (license.lastLoginAt) {
        const loginDate = new Date(license.lastLoginAt);
        if (loginDate > lastActivityDate) lastActivityDate = loginDate;
      }
      
      if (license.updatedAt) {
        const updateDate = new Date(license.updatedAt);
        if (updateDate > lastActivityDate) lastActivityDate = updateDate;
      }
      
      if (license.createdAt && lastActivityDate.getTime() === 0) {
        lastActivityDate = new Date(license.createdAt);
      }
      
      return lastActivityDate < cutoffDate;
    });
  };

  const openGdprModal = () => {
    const inactive = getInactiveLicenses(gdprInactivityMonths);
    setInactiveLicenses(inactive);
    setShowGdprModal(true);
  };

  const anonymizeLicense = (license) => {
    return {
      ...license,
      companyName: 'Companie Anonimă',
      ownerName: 'Proprietar Anonim',
      email: 'anonim@anonim.ro',
      phone: '0000000000',
      address: 'Adresă anonimizată',
      cui: 'XXXXXXXXXX',
      bankName: '',
      bankIban: '',
      notes: '',
      anonymizedAt: new Date().toISOString()
    };
  };

  const executeGdprAction = async () => {
    if (inactiveLicenses.length === 0) {
      setShowGdprModal(false);
      return;
    }

    const actionText = gdprAction === 'delete' ? 'șterge' : 'anonimiza';
    
    setConfirmDialog({
      show: true,
      message: `Sigur doriți să ${actionText} ${inactiveLicenses.length} licențe inactive? Această acțiune nu poate fi anulată.`,
      onConfirm: async () => {
        if (gdprAction === 'delete') {
          // Delete licenses
          for (const license of inactiveLicenses) {
            await storage.delete(license.id);
          }
        } else {
          // Anonymize licenses
          for (const license of inactiveLicenses) {
            const anonymized = anonymizeLicense(license);
            await storage.set(license.id, JSON.stringify(anonymized));
          }
        }
        
        await loadLicenses();
        setInactiveLicenses([]);
        setShowGdprModal(false);
        setConfirmDialog({ show: false, message: '', onConfirm: null });
      }
    });
  };

  const getStatusBadge = (license) => {
    const now = new Date();
    const expiresAt = new Date(license.expiresAt);
    const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    
    if (license.status === 'suspended') {
      return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">Suspendat</span>;
    }
    
    // Check for unlimited license
    if (license.isUnlimited) {
      return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">✓ Nelimitat</span>;
    }
    
    if (daysLeft < 0) {
      return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Expirat</span>;
    }
    
    if (license.status === 'trial') {
      if (daysLeft <= 7) {
        return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">Trial - {daysLeft} zile</span>;
      }
      return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Trial - {daysLeft} zile</span>;
    }
    
    if (license.status === 'active') {
      if (daysLeft <= 30) {
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Activ - {daysLeft} zile</span>;
      }
      return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Activ</span>;
    }
    
    return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{license.status}</span>;
  };

  const filteredLicenses = licenses.filter(license => {
    const matchesSearch = !searchTerm || 
      license.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      license.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      license.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      license.cui.toLowerCase().includes(searchTerm.toLowerCase()) ||
      license.licenseKey.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!filterStatus) return matchesSearch;
    
    const now = new Date();
    const expiresAt = new Date(license.expiresAt);
    const isExpired = expiresAt < now && !license.isUnlimited;
    
    if (filterStatus === 'expired') return matchesSearch && isExpired;
    if (filterStatus === 'active') return matchesSearch && !isExpired && license.status === 'active' && !license.isUnlimited;
    if (filterStatus === 'unlimited') return matchesSearch && license.isUnlimited;
    if (filterStatus === 'trial') return matchesSearch && !isExpired && license.status === 'trial';
    if (filterStatus === 'suspended') return matchesSearch && license.status === 'suspended';
    
    return matchesSearch;
  });

  const stats = {
    total: licenses.length,
    unlimited: licenses.filter(l => l.isUnlimited && l.status !== 'suspended').length,
    active: licenses.filter(l => l.status === 'active' && !l.isUnlimited && new Date(l.expiresAt) > new Date()).length,
    trial: licenses.filter(l => l.status === 'trial' && new Date(l.expiresAt) > new Date()).length,
    expired: licenses.filter(l => new Date(l.expiresAt) < new Date() && !l.isUnlimited).length,
    suspended: licenses.filter(l => l.status === 'suspended').length
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md">
          <div className="text-center mb-6">
            {/* Logo */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220" className="h-16 mx-auto mb-4">
              <rect x="40" y="25" width="120" height="160" rx="10" ry="10" fill="#2563eb"/>
              <rect x="55" y="40" width="90" height="35" rx="5" ry="5" fill="#1e40af"/>
              <rect x="62" y="47" width="45" height="21" rx="3" ry="3" fill="#1e3a8a"/>
              <circle cx="120" cy="52" r="5" fill="#3b82f6"/>
              <circle cx="120" cy="65" r="5" fill="#3b82f6"/>
              <circle cx="135" cy="58" r="7" fill="#ef4444"/>
              <rect x="65" y="90" width="70" height="60" rx="5" ry="5" fill="#1e3a8a"/>
              <path d="M100 143 C100 143, 75 120, 75 105 C75 95, 83 88, 100 97 C117 88, 125 95, 125 105 C125 120, 100 143, 100 143Z" fill="#f97316"/>
              <path d="M100 136 C100 136, 85 120, 85 110 C85 103, 91 98, 100 104 C109 98, 115 103, 115 110 C115 120, 100 136, 100 136Z" fill="#fbbf24"/>
              <circle cx="148" cy="168" r="22" fill="#22c55e"/>
              <path d="M137 168 L145 177 L161 159" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            <h1 className="text-2xl font-bold text-blue-600">RevizioApp</h1>
            <p className="text-gray-500 mt-1">Panou Administrare</p>
          </div>

          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {loginError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Parolă Administrator</label>
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12"
                  placeholder="••••••••••••"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showLoginPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <button
              onClick={handleAdminLogin}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg transition min-h-[48px]"
            >
              Autentificare
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Acces restricționat doar pentru administratori
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Confirm Dialog */}
      {confirmDialog.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <p className="text-gray-700 mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDialog({ show: false, message: '', onConfirm: null })}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Anulare
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Confirmă
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GDPR Modal */}
      {showGdprModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Shield className="text-blue-600" size={24} />
                <h3 className="text-lg font-semibold">Setări GDPR - Licențe</h3>
              </div>
              <button 
                onClick={() => setShowGdprModal(false)} 
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 mb-2">
                  Conform GDPR, datele personale ale operatorilor inactivi pot fi șterse sau anonimizate după o perioadă de timp.
                </p>
                <button
                  onClick={() => {
                    setShowGdprModal(false);
                    setShowPrivacyPolicy(true);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 underline font-medium"
                >
                  📄 Vezi Politica de Confidențialitate
                </button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Perioada de inactivitate (luni)
                </label>
                <select
                  value={gdprInactivityMonths}
                  onChange={(e) => {
                    const months = parseInt(e.target.value);
                    setGdprInactivityMonths(months);
                    setInactiveLicenses(getInactiveLicenses(months));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={6}>6 luni</option>
                  <option value={12}>12 luni (1 an)</option>
                  <option value={24}>24 luni (2 ani)</option>
                  <option value={36}>36 luni (3 ani)</option>
                  <option value={60}>60 luni (5 ani)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Acțiune pentru licențele inactive
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="gdprAction"
                      value="anonymize"
                      checked={gdprAction === 'anonymize'}
                      onChange={() => setGdprAction('anonymize')}
                      className="w-4 h-4 mt-0.5"
                    />
                    <div>
                      <span className="font-medium">Anonimizare</span>
                      <p className="text-sm text-gray-500">Păstrează licența, dar înlocuiește datele personale</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="gdprAction"
                      value="delete"
                      checked={gdprAction === 'delete'}
                      onChange={() => setGdprAction('delete')}
                      className="w-4 h-4 mt-0.5"
                    />
                    <div>
                      <span className="font-medium">Ștergere completă</span>
                      <p className="text-sm text-gray-500">Șterge licența definitiv</p>
                    </div>
                  </label>
                </div>
              </div>
              
              {/* Results */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">Licențe inactive găsite:</span>
                  <span className={`text-lg font-bold ${inactiveLicenses.length > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {inactiveLicenses.length}
                  </span>
                </div>
                
                {inactiveLicenses.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto mb-4">
                    <p className="text-sm text-gray-600 mb-2">Licențe care vor fi afectate:</p>
                    <ul className="space-y-1">
                      {inactiveLicenses.slice(0, 10).map(license => (
                        <li key={license.id} className="text-sm text-gray-700 flex items-center gap-2">
                          <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                          {license.companyName} - {license.ownerName}
                        </li>
                      ))}
                      {inactiveLicenses.length > 10 && (
                        <li className="text-sm text-gray-500 italic">
                          ... și încă {inactiveLicenses.length - 10} licențe
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowGdprModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Închide
                </button>
                <button
                  onClick={executeGdprAction}
                  disabled={inactiveLicenses.length === 0}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg ${
                    inactiveLicenses.length === 0 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : gdprAction === 'delete'
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-orange-600 text-white hover:bg-orange-700'
                  }`}
                >
                  {gdprAction === 'delete' ? <Trash2 size={18} /> : <Shield size={18} />}
                  {gdprAction === 'delete' ? 'Șterge' : 'Anonimizează'} ({inactiveLicenses.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal - Full Screen Overlay */}
      {showPrivacyPolicy && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            overflow: 'hidden'
          }}
          onClick={() => setShowPrivacyPolicy(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '672px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid #e5e7eb',
              flexShrink: 0
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Politica de Confidențialitate</h3>
              <button 
                onClick={() => setShowPrivacyPolicy(false)}
                style={{
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={20} />
              </button>
            </div>
        
            {/* Scrollable Content */}
            <div style={{
              padding: '24px',
              overflowY: 'auto',
              flex: 1
            }}>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                Ultima actualizare: {new Date().toLocaleDateString('ro-RO')}
              </p>
          
              <h4 style={{ fontSize: '16px', fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>1. Introducere</h4>
              <p style={{ fontSize: '14px', color: '#374151', marginBottom: '12px' }}>
                Această Politică de Confidențialitate descrie modul în care colectăm, utilizăm și protejăm datele personale ale operatorilor (licențe) în conformitate cu Regulamentul General privind Protecția Datelor (GDPR - Regulamentul UE 2016/679).
              </p>

              <h4 style={{ fontSize: '16px', fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>2. Datele Colectate</h4>
              <ul style={{ fontSize: '14px', color: '#374151', marginBottom: '12px', paddingLeft: '20px' }}>
                <li><strong>Date companie:</strong> nume firmă, CUI/CIF, adresă</li>
                <li><strong>Date proprietar:</strong> nume, email, telefon</li>
                <li><strong>Date bancare:</strong> bancă, IBAN (pentru facturare)</li>
                <li><strong>Date utilizare:</strong> ultima accesare, număr login-uri</li>
              </ul>

              <h4 style={{ fontSize: '16px', fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>3. Scopul Prelucrării</h4>
              <ul style={{ fontSize: '14px', color: '#374151', marginBottom: '12px', paddingLeft: '20px' }}>
                <li>Furnizarea accesului la aplicația CRM</li>
                <li>Gestionarea licențelor și abonamentelor</li>
                <li>Facturare și contabilitate</li>
                <li>Suport tehnic</li>
              </ul>

              <h4 style={{ fontSize: '16px', fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>4. Durata Stocării</h4>
              <p style={{ fontSize: '14px', color: '#374151', marginBottom: '12px' }}>
                Datele sunt păstrate pe durata contractului și conform obligațiilor legale de arhivare (10 ani pentru documente fiscale). După expirare, datele pot fi anonimizate sau șterse.
              </p>

              <h4 style={{ fontSize: '16px', fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>5. Drepturile Operatorilor</h4>
              <ul style={{ fontSize: '14px', color: '#374151', marginBottom: '12px', paddingLeft: '20px' }}>
                <li>Dreptul de acces la date</li>
                <li>Dreptul la rectificare</li>
                <li>Dreptul la ștergere ("dreptul de a fi uitat")</li>
                <li>Dreptul la portabilitatea datelor</li>
              </ul>

              <h4 style={{ fontSize: '16px', fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>6. Politica de Retenție Automată</h4>
              <p style={{ fontSize: '14px', color: '#374151', marginBottom: '12px' }}>
                Acest panou de administrare include funcționalități GDPR care permit ștergerea sau anonimizarea automată a licențelor inactive după o perioadă configurabilă (implicit 24 de luni fără activitate).
              </p>

              <div style={{ backgroundColor: '#f3f4f6', borderRadius: '8px', padding: '16px', marginTop: '24px' }}>
                <p style={{ fontSize: '12px', color: '#4b5563', margin: 0 }}>
                  <strong>Contact GDPR:</strong> Pentru exercitarea drepturilor, contactați administratorul sistemului.
                </p>
              </div>
            </div>
            
            {/* Footer */}
            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              borderRadius: '0 0 12px 12px',
              flexShrink: 0
            }}>
              <button
                onClick={() => setShowPrivacyPolicy(false)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Am înțeles
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Logo */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220" className="h-12 w-12">
                <rect x="40" y="25" width="120" height="160" rx="10" ry="10" fill="#2563eb"/>
                <rect x="55" y="40" width="90" height="35" rx="5" ry="5" fill="#1e40af"/>
                <rect x="62" y="47" width="45" height="21" rx="3" ry="3" fill="#1e3a8a"/>
                <circle cx="120" cy="52" r="5" fill="#3b82f6"/>
                <circle cx="120" cy="65" r="5" fill="#3b82f6"/>
                <circle cx="135" cy="58" r="7" fill="#ef4444"/>
                <rect x="65" y="90" width="70" height="60" rx="5" ry="5" fill="#1e3a8a"/>
                <path d="M100 143 C100 143, 75 120, 75 105 C75 95, 83 88, 100 97 C117 88, 125 95, 125 105 C125 120, 100 143, 100 143Z" fill="#f97316"/>
                <path d="M100 136 C100 136, 85 120, 85 110 C85 103, 91 98, 100 104 C109 98, 115 103, 115 110 C115 120, 100 136, 100 136Z" fill="#fbbf24"/>
                <circle cx="148" cy="168" r="22" fill="#22c55e"/>
                <path d="M137 168 L145 177 L161 159" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              <div>
                <h1 className="text-2xl font-bold text-blue-600">RevizioApp</h1>
                <p className="text-sm text-gray-500">Panou Administrare Licențe</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openGdprModal}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                title="Setări GDPR"
              >
                <FileText size={20} />
                <span className="hidden sm:inline">GDPR</span>
              </button>
              <button
                onClick={handleAdminLogout}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Deconectare"
              >
                <LogOut size={20} />
                <span className="hidden sm:inline">Ieșire</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">Total</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Check className="text-emerald-600" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.unlimited}</p>
                <p className="text-sm text-gray-500">Nelimitate</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Check className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                <p className="text-sm text-gray-500">Active</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.trial}</p>
                <p className="text-sm text-gray-500">Trial</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.expired}</p>
                <p className="text-sm text-gray-500">Expirate</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <X className="text-gray-600" size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.suspended}</p>
                <p className="text-sm text-gray-500">Suspendate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm relative z-0">
          {/* Toolbar */}
          <div className="p-4 border-b relative z-0">
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Caută după nume, email, CUI, cheie..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none relative z-0"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Toate statusurile</option>
                  <option value="unlimited">✓ Nelimitate</option>
                  <option value="active">Active (limitate)</option>
                  <option value="trial">Trial</option>
                  <option value="expired">Expirate</option>
                  <option value="suspended">Suspendate</option>
                </select>
              </div>
              <button
                onClick={() => setShowLicenseForm(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px]"
              >
                <Plus size={20} />
                Licență Nouă
              </button>
            </div>
          </div>

          {/* License Form */}
          {showLicenseForm && (
            <div className="p-4 bg-gray-50 border-b">
              <h3 className="text-lg font-semibold mb-4">
                {editingLicenseId ? 'Editare Licență' : 'Licență Nouă'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nume Companie *</label>
                  <input
                    type="text"
                    value={licenseForm.companyName}
                    onChange={(e) => setLicenseForm({...licenseForm, companyName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="SC Termo Install SRL"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nume Proprietar *</label>
                  <input
                    type="text"
                    value={licenseForm.ownerName}
                    onChange={(e) => setLicenseForm({...licenseForm, ownerName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ion Popescu"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={licenseForm.email}
                    onChange={(e) => setLicenseForm({...licenseForm, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="contact@termoinstall.ro"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input
                    type="tel"
                    value={licenseForm.phone}
                    onChange={(e) => setLicenseForm({...licenseForm, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0721234567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CUI/CIF *</label>
                  <input
                    type="text"
                    value={licenseForm.cui}
                    onChange={(e) => setLicenseForm({...licenseForm, cui: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="RO12345678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresă</label>
                  <input
                    type="text"
                    value={licenseForm.address}
                    onChange={(e) => setLicenseForm({...licenseForm, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Str. Exemplu nr. 1, Constanța"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bancă</label>
                  <input
                    type="text"
                    value={licenseForm.bankName}
                    onChange={(e) => setLicenseForm({...licenseForm, bankName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Banca Transilvania"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
                  <input
                    type="text"
                    value={licenseForm.bankIban}
                    onChange={(e) => setLicenseForm({...licenseForm, bankIban: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="RO49AAAA1B31007593840000"
                  />
                </div>
                {!editingLicenseId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Perioada Trial (zile)</label>
                    <select
                      value={licenseForm.trialDays}
                      onChange={(e) => setLicenseForm({...licenseForm, trialDays: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={7}>7 zile</option>
                      <option value={14}>14 zile</option>
                      <option value={30}>30 zile</option>
                      <option value={60}>60 zile</option>
                      <option value={90}>90 zile</option>
                    </select>
                  </div>
                )}
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                  <textarea
                    value={licenseForm.notes}
                    onChange={(e) => setLicenseForm({...licenseForm, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="2"
                    placeholder="Note adiționale..."
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={saveLicense}
                  disabled={!licenseForm.companyName || !licenseForm.ownerName || !licenseForm.email || !licenseForm.cui}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300"
                >
                  {editingLicenseId ? 'Salvează Modificările' : 'Creează Licență'}
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Anulare
                </button>
              </div>
            </div>
          )}

          {/* Licenses List */}
          <div className="divide-y">
            {filteredLicenses.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Users className="mx-auto mb-4 text-gray-300" size={48} />
                <p>Nu există licențe{searchTerm || filterStatus ? ' care să corespundă criteriilor' : ''}</p>
              </div>
            ) : (
              filteredLicenses.map(license => (
                <div key={license.id} className="p-4 hover:bg-gray-50">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Company Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 size={18} className="text-gray-400 flex-shrink-0" />
                        <h3 className="font-semibold text-gray-900 truncate">{license.companyName}</h3>
                        {getStatusBadge(license)}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
                        <p><span className="text-gray-400">Proprietar:</span> {license.ownerName}</p>
                        <p><span className="text-gray-400">Email:</span> {license.email}</p>
                        <p><span className="text-gray-400">CUI:</span> {license.cui}</p>
                        <p><span className="text-gray-400">Telefon:</span> {license.phone || '-'}</p>
                      </div>
                    </div>

                    {/* License Key & Password */}
                    <div className="bg-gray-100 rounded-lg p-3 lg:w-64">
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 mb-1">Cheie Licență</p>
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-white px-2 py-1 rounded flex-1">{license.licenseKey}</code>
                          <button
                            onClick={() => copyToClipboard(license.licenseKey, `key-${license.id}`)}
                            className="p-1 hover:bg-gray-200 rounded"
                            title="Copiază"
                          >
                            {copiedKey === `key-${license.id}` ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-gray-400" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Parolă</p>
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-white px-2 py-1 rounded flex-1">
                            {showPassword[license.id] ? license.password : '••••••••'}
                          </code>
                          <button
                            onClick={() => setShowPassword({...showPassword, [license.id]: !showPassword[license.id]})}
                            className="p-1 hover:bg-gray-200 rounded"
                            title={showPassword[license.id] ? 'Ascunde' : 'Arată'}
                          >
                            {showPassword[license.id] ? <EyeOff size={16} className="text-gray-400" /> : <Eye size={16} className="text-gray-400" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(license.password, `pass-${license.id}`)}
                            className="p-1 hover:bg-gray-200 rounded"
                            title="Copiază"
                          >
                            {copiedKey === `pass-${license.id}` ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-gray-400" />}
                          </button>
                        </div>
                      </div>
                      {/* Send Buttons */}
                      <div className="flex gap-2 mt-2 pt-2 border-t border-gray-200">
                        <button
                          onClick={() => sendViaEmail(license)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                          title="Trimite pe Email"
                        >
                          <Mail size={14} />
                          Email
                        </button>
                        <button
                          onClick={() => sendViaWhatsApp(license)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 text-xs"
                          title="Trimite pe WhatsApp"
                        >
                          <MessageCircle size={14} />
                          WhatsApp
                        </button>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-sm text-gray-600 lg:w-40">
                      <p><span className="text-gray-400">Creat:</span> {new Date(license.createdAt).toLocaleDateString('ro-RO')}</p>
                      <p><span className="text-gray-400">Expiră:</span> {license.isUnlimited ? 'Nelimitat' : new Date(license.expiresAt).toLocaleDateString('ro-RO')}</p>
                      <p><span className="text-gray-400">Login-uri:</span> {license.loginCount}</p>
                      {license.lastLoginAt && (
                        <p><span className="text-gray-400">Ultima accesare:</span> {new Date(license.lastLoginAt).toLocaleDateString('ro-RO')}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 lg:w-auto">
                      <button
                        onClick={() => editLicense(license)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                        title="Editează"
                      >
                        <Edit size={14} />
                        <span className="hidden sm:inline">Editează</span>
                      </button>
                      {!license.isUnlimited ? (
                        <>
                          <button
                            onClick={() => extendLicense(license, 30)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
                            title="Prelungește cu 30 zile"
                          >
                            <Calendar size={14} />
                            <span className="hidden sm:inline">+30 zile</span>
                          </button>
                          <button
                            onClick={() => setUnlimitedLicense(license)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 text-sm"
                            title="Setează licență nelimitată"
                          >
                            <Check size={14} />
                            <span className="hidden sm:inline">Nelimitat</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => removeLimitedLicense(license)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 text-sm"
                          title="Convertește la licență limitată (30 zile)"
                        >
                          <Clock size={14} />
                          <span className="hidden sm:inline">→ Limitat</span>
                        </button>
                      )}
                      <button
                        onClick={() => resetCredentials(license)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 text-sm"
                        title="Resetează credențiale"
                      >
                        <RefreshCw size={14} />
                        <span className="hidden sm:inline">Reset</span>
                      </button>
                      <button
                        onClick={() => toggleLicenseStatus(license)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm ${
                          license.status === 'suspended' 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title={license.status === 'suspended' ? 'Reactivează' : 'Suspendă'}
                      >
                        {license.status === 'suspended' ? <Check size={14} /> : <X size={14} />}
                        <span className="hidden sm:inline">{license.status === 'suspended' ? 'Activează' : 'Suspendă'}</span>
                      </button>
                      <button
                        onClick={() => deleteLicense(license)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                        title="Șterge"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Bank Info & Notes (expandable or always visible) */}
                  {(license.bankName || license.bankIban || license.notes) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600">
                      {license.bankName && <span className="mr-4"><span className="text-gray-400">Bancă:</span> {license.bankName}</span>}
                      {license.bankIban && <span className="mr-4"><span className="text-gray-400">IBAN:</span> {license.bankIban}</span>}
                      {license.notes && <p className="mt-1 italic text-gray-500">{license.notes}</p>}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
