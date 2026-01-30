
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export type UserRole = 'CANDIDATE' | 'RECRUITER' | 'INTERVIEWER';

export type SocketStatus = 'CONNECTED' | 'CONNECTING' | 'UNSTABLE' | 'DISCONNECTED';

export type AppState = 
  | 'LANDING'
  | 'PLATFORM'    
  | 'PRICING'     
  | 'ENTERPRISE'  
  | 'DOCS'
  | 'SOLUTIONS'
  | 'ABOUT'
  | 'CONTACT'
  | 'POLICY'
  | 'AUTH' 
  | 'BIOMETRIC_SCAN'
  | 'DASHBOARD' 
  | 'ATS'         
  | 'PROFILE' 
  | 'IDLE' 
  | 'VERIFICATION' 
  | 'INTERVIEW' 
  | 'ANALYSIS' 
  | 'REPORT'
  | 'DEMO_SESSION'
  | 'DEPLOY_PAGE'
  | 'FRONTEND_ARCH'
  | 'BACKEND_ARCH'
  | 'AI_ENGINE_ARCH'
  | 'SECURITY_ARCH'
  | 'BILLING'
  | 'STATUS';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  recoveryHint?: string;
}

export interface ActiveTask {
  id: string;
  type: 'INTERVIEW' | 'REVIEW' | 'RANKING';
  title: string;
  status: 'PENDING' | 'IN_PROGRESS';
  targetId: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyName?: string; 
  avatar?: string;
  biometricEnabled?: boolean;
  password?: string;
  activeTasks?: ActiveTask[];
}

export interface SignedTranscript {
    rawText: string;
    timestamp: string;
    signature: string; // SHA-256 HMAC
    kernelVersion: string;
}

export interface Question {
  id: number;
  text: string;
  durationSeconds: number;
  category: 'TECHNICAL' | 'BEHAVIORAL' | 'SYSTEM_DESIGN';
  errorState?: boolean;
}

export interface ParsedResume {
  skills: string[];
  experience: { company: string, role: string, duration: string, summary: string }[];
  education: string[];
}

export interface RankingResult {
  score: number;
  justification: string;
  gapAnalysis: string[];
  fitIndex: 'OPTIMAL' | 'HIGH' | 'MODERATE' | 'LOW';
}

export interface ATSApplication {
  id: string;
  jobId: string; 
  candidateName: string;
  candidateAvatar: string;
  stageId: string;
  matchScore: number; 
  appliedDate: string;
  tags: string[];
  resumeText?: string;
  parsedData?: ParsedResume;
  rankingReason?: string;
}

export interface ATSJob {
  id: string;
  title: string;
  department: string;
  location: string;
  postedDate: string;
  activeCandidates: number;
  description: string;
}

export interface ATSStage {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface EvaluationMetric {
  label: string;
  score: number;
  delta: number;
}

export interface QuestionResult {
  questionId: number;
  questionText: string;
  category: string;
  detailedFeedback: {
    scores: {
      technicalAccuracy: number;
      communicationClarity: number;
      problemSolving: number;
    };
    strengths: string[];
    improvements: string[];
    summary: string;
  };
}

export interface FinalReport {
  id?: string;
  candidateId?: string;
  jobId?: string;
  overallScore: number;
  metrics: EvaluationMetric[];
  questionResults: QuestionResult[];
  summary: string;
  hiringDecision: 'APPROVE' | 'REJECT' | 'REVIEW';
  generatedAt?: string;
  signedTranscript?: SignedTranscript;
}

export interface ProctoringMetrics {
  gaze: 'FOCUSED' | 'DISTRACTED' | 'ABSENT';
  expression: 'NEUTRAL' | 'CONFIDENT' | 'STRESSED' | 'UNCERTAIN';
  audioAnomaly: boolean;
  systemIntegrity: 'SECURE' | 'COMPROMISED'; 
}
