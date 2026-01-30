
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { motion as framerMotion, AnimatePresence } from 'framer-motion';
import { AppState, User, UserRole, Notification, FinalReport, SocketStatus } from './types';
import { HexGridBackground } from './components/Visualizers';
import { FinalReportDashboard } from './components/Dashboard';
import { CandidateDashboard, RecruiterDashboard } from './components/RoleDashboards';
import { InterviewRoom } from './components/InterviewRoom';
import { Auth } from './components/Auth';
import { UserProfile } from './components/Profile';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LandingPage } from './components/LandingPage';
import { PlatformPage } from './components/pages/PlatformPage';
import { PricingPage } from './components/pages/PricingPage';
import { EnterprisePage } from './components/pages/EnterprisePage';
import { DocsPage } from './components/pages/DocsPage';
import { CompanyPage } from './components/pages/CompanyPage';
import { ContactPage } from './components/pages/ContactPage';
import { SolutionsPage } from './components/pages/SolutionsPage';
import { PolicyPage } from './components/pages/PolicyPage';
import { StatusPage } from './components/pages/StatusPage';
import { FrontendArchPage, BackendArchPage, AIEngineArchPage, SecurityArchPage } from './components/pages/arch';
import { ATSView } from './components/ATSView';
import { APIService, AIKernelError, socketService } from './services';
import { DemoSession } from './components/DemoSession';
import { DeployPage } from './components/DeployPage';
import { Intro } from './components/Intro';
import { NeuralCommandHub } from './components/NeuralCommandHub';
import { BillingPage } from './components/pages/BillingPage';
import { NetworkStatusGuard, ApiKeyGuard } from './components/SystemGuard';
import { BiometricGate } from './components/BiometricGate';
import { Cpu, RefreshCw, Activity, CheckCircle, AlertTriangle, X, Info } from 'lucide-react';

const motion = framerMotion as any;

const ROUTE_PERMISSIONS: Record<AppState, UserRole[] | 'PUBLIC'> = {
    'LANDING': 'PUBLIC', 'PLATFORM': 'PUBLIC', 'PRICING': 'PUBLIC', 'ENTERPRISE': 'PUBLIC',
    'DOCS': 'PUBLIC', 'SOLUTIONS': 'PUBLIC', 'ABOUT': 'PUBLIC', 'CONTACT': 'PUBLIC',
    'POLICY': 'PUBLIC', 'AUTH': 'PUBLIC', 'DEMO_SESSION': 'PUBLIC', 'DEPLOY_PAGE': 'PUBLIC',
    'STATUS': 'PUBLIC', 'FRONTEND_ARCH': 'PUBLIC', 'BACKEND_ARCH': 'PUBLIC',
    'AI_ENGINE_ARCH': 'PUBLIC', 'SECURITY_ARCH': 'PUBLIC', 'BIOMETRIC_SCAN': 'PUBLIC',
    'DASHBOARD': ['CANDIDATE', 'RECRUITER', 'INTERVIEWER'],
    'ATS': ['RECRUITER', 'INTERVIEWER'], 
    'PROFILE': ['CANDIDATE', 'RECRUITER', 'INTERVIEWER'], 
    'BILLING': ['RECRUITER'],
    'IDLE': ['CANDIDATE'], 'VERIFICATION': ['CANDIDATE'], 'INTERVIEW': ['CANDIDATE'],
    'ANALYSIS': ['CANDIDATE'], 
    'REPORT': ['CANDIDATE', 'RECRUITER', 'INTERVIEWER']
};

export const App: React.FC = () => {
  const [state, setState] = useState<AppState>('LANDING');
  const [history, setHistory] = useState<AppState[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isIntroing, setIsIntroing] = useState(true);
  const [currentReport, setCurrentReport] = useState<FinalReport | null>(null);
  const [isCommandHubOpen, setIsCommandHubOpen] = useState(false);
  const [lastInterviewContext, setLastInterviewContext] = useState<{ text: string, answer?: string }[]>([]);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('CONNECTING');
  const [isApiKeyInvalid, setIsApiKeyInvalid] = useState(false);

  useEffect(() => {
    APIService.initialize();
    const handleSocketStatus = (status: SocketStatus) => setSocketStatus(status);
    socketService.on('socket_status_update', handleSocketStatus);
    
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandHubOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeydown);

    return () => {
        socketService.off('socket_status_update', handleSocketStatus);
        window.removeEventListener('keydown', handleKeydown);
    };
  }, []);

  const addToast = (type: 'success' | 'error' | 'info', message: string, recoveryHint?: string) => {
    if (message === 'API_KEY_INVALID') setIsApiKeyInvalid(true);
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, type, message, recoveryHint }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 10000);
  };

  const navigateTo = (newState: AppState) => {
      if (newState === state) return;
      const allowed = ROUTE_PERMISSIONS[newState];
      if (allowed !== 'PUBLIC' && (!user || !allowed.includes(user.role))) {
          addToast('error', 'UNAUTHORIZED_ACCESS_BLOCKED', 'Security node permissions rejected the request.');
          if (!user) setState('AUTH');
          return;
      }
      setHistory(prev => [...prev, state]);
      setState(newState);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
      if (state === 'INTERVIEW' || state === 'VERIFICATION') {
          if (!confirm("CRITICAL: Terminating session will invalidate results. Terminate Uplink?")) return;
      }
      const newHistory = [...history];
      const prevState = newHistory.pop();
      if (prevState) {
          setHistory(newHistory);
          setState(prevState);
      } else {
          setState(user ? 'DASHBOARD' : 'LANDING');
      }
  };

  const handleLogout = () => {
      if (window.confirm("CONFIRM_SESSION_TERMINATION: Are you sure you want to log out?")) {
        setUser(null);
        setState('LANDING');
        setHistory([]);
        addToast('info', 'SESSION_TERMINATED');
      }
  };

  const handleLogin = async (u: User) => {
      try {
        let existing = await APIService.login(u.email);
        if (!existing) existing = await APIService.register(u);
        setUser(existing);
        setState('DASHBOARD');
        setHistory([]);
        addToast('success', `ACCESS_GRANTED: ${existing.name.toUpperCase()}`);
      } catch (e) {
          addToast('error', 'AUTHENTICATION_FAILED', 'Neural buffer mismatch. Check credentials.');
      }
  };

  const handleBiometricLoginSuccess = () => {
      const mockUser: User = {
          id: 'user_bio_772',
          name: 'Alex Rivera',
          email: 'alex.rivera@neural-nexus.io',
          role: 'CANDIDATE',
          biometricEnabled: true,
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex'
      };
      setUser(mockUser);
      setState('DASHBOARD');
      addToast('success', 'BIOMETRIC_IDENTITY_CONFIRMED');
  };

  const handleInterviewComplete = async (finalTranscript: string, context: { text: string, answer?: string }[]) => {
      setState('ANALYSIS');
      setLastInterviewContext(context);
      try {
          const report = await APIService.generateFinalReport(finalTranscript, 'Senior Full Stack Engineer', context);
          await APIService.saveReport(report);
          setCurrentReport(report);
          setState('REPORT');
          addToast('success', 'ANALYSIS_SYNCHRONIZED');
      } catch (e: any) {
          const err = e as AIKernelError;
          addToast('error', err.message || 'ANALYSIS_FAILED', err.recoveryHint);
          if (err.message !== 'API_KEY_INVALID') setState('DASHBOARD');
      }
  };

  const renderContent = () => {
    switch (state) {
        case 'LANDING': return <LandingPage onNavigate={navigateTo} />;
        case 'AUTH': return <Auth onLogin={handleLogin} onBiometricStart={() => setState('BIOMETRIC_SCAN')} />;
        case 'BIOMETRIC_SCAN': return <BiometricGate onSuccess={handleBiometricLoginSuccess} onCancel={goBack} title="Uplink_Identity_Verification" />;
        case 'DASHBOARD': 
            if (user?.role === 'CANDIDATE') return <div className="pt-32 pb-12 px-6"><CandidateDashboard user={user!} onNavigate={navigateTo} onStartInterview={() => navigateTo('IDLE')}/></div>;
            return <div className="pt-32 pb-24 px-6"><RecruiterDashboard user={user!} onNavigate={navigateTo}/></div>;
        case 'IDLE': return (
            <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto pt-24 min-h-screen p-6">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-24 h-24 mb-8 rounded-full border-4 border-evalion-teal flex items-center justify-center shadow-[0_0_30px_rgba(0,240,255,0.3)] animate-pulse">
                    <Cpu size={48} className="text-evalion-teal" />
                </motion.div>
                <h1 className="text-3xl md:text-5xl font-black mb-6 text-white tracking-tighter uppercase leading-none">OS_READY_FOR_BOOT<br/><span className="text-evalion-teal tracking-widest">EVALUATION PROTOCOL</span></h1>
                <p className="text-sm text-evalion-textDim mb-12 font-mono uppercase tracking-widest italic opacity-60">Liveness detection active. High-trust zone established.</p>
                <button onClick={() => navigateTo('VERIFICATION')} className="px-14 py-6 bg-evalion-teal text-evalion-bg font-black font-mono tracking-widest hover:bg-white transition-all shadow-[0_0_50px_rgba(0,240,255,0.4)] rounded-2xl active:scale-95 uppercase text-sm">
                    INITIATE_SESSION_KERNEL
                </button>
            </div>
        );
        case 'VERIFICATION': return <BiometricGate onSuccess={() => setState('INTERVIEW')} onCancel={goBack} title="Pre-Interview_Sentinel_Check" />;
        case 'INTERVIEW': return <InterviewRoom user={user!} onComplete={handleInterviewComplete} onNavigate={navigateTo} />;
        case 'ANALYSIS': return (
            <div className="flex flex-col items-center justify-center h-screen pt-24">
                <RefreshCw size={64} className="text-evalion-teal animate-spin mb-8" />
                <h2 className="text-3xl font-black text-white tracking-[0.4em] animate-pulse uppercase font-mono">Synthesizing_Intelligence</h2>
            </div>
        );
        case 'REPORT': return <div className="pt-32 pb-12 px-6">{currentReport && <FinalReportDashboard report={currentReport} />}</div>;
        case 'PLATFORM': return <PlatformPage onNavigate={navigateTo} />;
        case 'PRICING': return <PricingPage />;
        case 'ENTERPRISE': return <EnterprisePage />;
        case 'DOCS': return <DocsPage />;
        case 'SOLUTIONS': return <SolutionsPage onNavigate={navigateTo} />;
        case 'ABOUT': return <CompanyPage />;
        case 'CONTACT': return <ContactPage />;
        case 'POLICY': return <PolicyPage />;
        case 'PROFILE': return <div className="pt-32 px-6"><UserProfile user={user!} onUpdate={(u) => { setUser(u); APIService.updateUser(u); addToast('success', 'PROFILE_COMMITTED'); }} onCancel={goBack} /></div>;
        case 'ATS': return <ATSView onBack={goBack} notify={addToast} user={user!} />;
        case 'DEMO_SESSION': return <DemoSession onExit={goBack} />;
        case 'DEPLOY_PAGE': return <DeployPage onNavigate={navigateTo} />;
        case 'STATUS': return <StatusPage />;
        case 'FRONTEND_ARCH': return <FrontendArchPage onNavigate={navigateTo} />;
        case 'BACKEND_ARCH': return <BackendArchPage onNavigate={navigateTo} />;
        case 'AI_ENGINE_ARCH': return <AIEngineArchPage onNavigate={navigateTo} />;
        case 'SECURITY_ARCH': return <SecurityArchPage onNavigate={navigateTo} />;
        case 'BILLING': return <BillingPage user={user!} onNavigate={navigateTo} />;
        default: return <LandingPage onNavigate={navigateTo} />;
    }
  };

  if (isApiKeyInvalid) return <ApiKeyGuard />;
  if (isIntroing) return <Intro onComplete={() => setIsIntroing(false)} />;

  return (
    <div className="min-h-screen bg-evalion-bg text-evalion-text font-sans selection:bg-evalion-teal selection:text-evalion-bg">
      <NetworkStatusGuard />
      <HexGridBackground />
      <Header 
        user={user} 
        state={state} 
        historyLength={history.length}
        socketStatus={socketStatus}
        onNavigate={navigateTo} 
        onBack={goBack} 
        onLogout={handleLogout} 
        onProfile={() => navigateTo('PROFILE')} 
        onOpenCommandHub={() => setIsCommandHubOpen(true)}
      />
      
      {user && (
        <NeuralCommandHub 
          isOpen={isCommandHubOpen} 
          onClose={() => setIsCommandHubOpen(false)} 
          onNavigate={navigateTo}
          role={user.role}
        />
      )}

      <div className="fixed bottom-8 right-8 z-[110] flex flex-col gap-4 pointer-events-none w-full max-w-sm">
        <AnimatePresence>
            {notifications.map(n => (
                <motion.div 
                    key={n.id} 
                    initial={{ opacity: 0, x: 50, scale: 0.9, filter: 'blur(10px)' }} 
                    animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }} 
                    exit={{ opacity: 0, x: 50, scale: 0.9, filter: 'blur(10px)' }}
                    className={`pointer-events-auto p-5 rounded-2xl border-2 glass-panel flex flex-col gap-2 shadow-2xl ${n.type === 'error' ? 'border-evalion-danger/40' : n.type === 'success' ? 'border-evalion-teal/40' : 'border-evalion-purple/40'}`}
                >
                    <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-xl ${n.type === 'error' ? 'bg-evalion-danger/10 text-evalion-danger' : n.type === 'success' ? 'bg-evalion-teal/10 text-evalion-teal' : 'bg-evalion-purple/10 text-evalion-purple'}`}>
                                {n.type === 'success' ? <CheckCircle size={22} /> : n.type === 'error' ? <AlertTriangle size={22} /> : <Info size={22} />}
                            </div>
                            <span className={`text-xs font-mono font-black uppercase tracking-[0.15em] ${n.type === 'error' ? 'text-evalion-danger' : n.type === 'success' ? 'text-evalion-teal' : 'text-evalion-purple'}`}>{n.message}</span>
                        </div>
                        <button onClick={() => setNotifications(prev => prev.filter(not => not.id !== n.id))} className="hover:rotate-90 transition-transform p-1 pointer-events-auto text-white/40 hover:text-white">
                            <X size={16} />
                        </button>
                    </div>
                </motion.div>
            ))}
        </AnimatePresence>
      </div>

      <main className="min-h-screen flex flex-col relative z-10">
        <AnimatePresence mode="wait">
            <motion.div 
              key={state} 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5, ease: "circOut" }}
              className="w-full flex-1 flex flex-col"
            >
                {renderContent()}
            </motion.div>
        </AnimatePresence>
      </main>
      <Footer onNavigate={navigateTo} />
    </div>
  );
};
