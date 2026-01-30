
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { User, ATSJob, ATSApplication, ATSStage, FinalReport, Question, SignedTranscript, ParsedResume, RankingResult, SocketStatus } from './types';
import { GoogleGenAI, Type } from "@google/genai";

const STORAGE_KEYS = {
  USERS: 'evalion_users',
  JOBS: 'evalion_jobs',
  APPLICATIONS: 'evalion_applications',
  REPORTS: 'evalion_reports',
  INIT: 'evalion_initialized'
};

export interface AIKernelError extends Error {
  recoveryHint?: string;
}

/**
 * CIRCUIT BREAKER & RESILIENCY ENGINE
 */
enum BreakerState { CLOSED, OPEN, HALF_OPEN }

class ResiliencyBreaker {
    private state: BreakerState = BreakerState.CLOSED;
    private failureCount = 0;
    private lastFailureTime: number = 0;
    private readonly failureThreshold = 3;
    private readonly cooldownMs = 30000; // 30s lockdown
    private readonly retrySchedule = [1000, 3000, 7000]; // Exponential backoff intervals

    async execute<T>(action: () => Promise<T>): Promise<T> {
        if (this.state === BreakerState.OPEN) {
            if (Date.now() - this.lastFailureTime > this.cooldownMs) {
                this.state = BreakerState.HALF_OPEN;
            } else {
                throw { 
                    message: 'KERNEL_LINK_LOCKED', 
                    recoveryHint: 'Safety protocols active. AI Uplink is in cooldown due to previous failures. Wait 30s.' 
                } as AIKernelError;
            }
        }

        let lastErr: any;
        for (let attempt = 0; attempt <= this.retrySchedule.length; attempt++) {
            try {
                const result = await action();
                this.onSuccess();
                return result;
            } catch (err: any) {
                lastErr = err;
                const status = err?.status || 0;
                
                // Don't retry on Auth or Logic errors
                if (status === 401 || status === 403 || err?.message === 'API_KEY_INVALID') {
                    this.onFailure();
                    throw err;
                }

                if (attempt < this.retrySchedule.length) {
                    const delay = this.retrySchedule[attempt];
                    console.warn(`Kernel link unstable. Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
                    await new Promise(r => setTimeout(r, delay));
                }
            }
        }

        this.onFailure();
        throw { 
            message: 'AI_LINK_STABILITY_FAILURE', 
            recoveryHint: 'Multiple transmission attempts failed. Check network integrity or service quota.' 
        } as AIKernelError;
    }

    private onSuccess() {
        this.failureCount = 0;
        this.state = BreakerState.CLOSED;
    }

    private onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.failureCount >= this.failureThreshold) {
            this.state = BreakerState.OPEN;
            console.error("CRITICAL: AI Kernel Circuit Breaker OPENED.");
        }
    }
}

const flashBreaker = new ResiliencyBreaker();
const proBreaker = new ResiliencyBreaker();

const getAiClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw { message: 'API_KEY_INVALID', recoveryHint: 'Kernel environment variable API_KEY is undefined.' } as AIKernelError;
    }
    return new GoogleGenAI({ apiKey });
};

/**
 * AI ENGINE BACKEND SERVICE
 */
export const AiEngineService = {
    async parseResume(text: string): Promise<ParsedResume> {
        return flashBreaker.execute(async () => {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `INPUT_RESUME_DATA:\n${text}`,
                config: {
                    systemInstruction: "You are an elite Technical Talent Vectorizer. Parse raw resume text into structured technical vectors.",
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            skills: { type: Type.ARRAY, items: { type: Type.STRING } },
                            experience: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: { 
                                        company: { type: Type.STRING }, 
                                        role: { type: Type.STRING }, 
                                        duration: { type: Type.STRING }, 
                                        summary: { type: Type.STRING } 
                                    },
                                    required: ["company", "role", "duration", "summary"]
                                }
                            },
                            education: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["skills", "experience", "education"]
                    }
                }
            });
            if (!response.text) throw new Error("EMPTY_AI_RESPONSE");
            return JSON.parse(response.text);
        });
    },

    async rankCandidate(job: ATSJob, data: ParsedResume): Promise<RankingResult> {
        return proBreaker.execute(async () => {
            const ai = getAiClient();
            const prompt = `JOB_PROFILE:\n${job.title}\n${job.description}\n\nCANDIDATE_VECTORS:\n${JSON.stringify(data)}`;
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: prompt,
                config: {
                    systemInstruction: "Perform a multi-dimensional fit analysis. Assign a fit index and score.",
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            score: { type: Type.INTEGER },
                            justification: { type: Type.STRING },
                            gapAnalysis: { type: Type.ARRAY, items: { type: Type.STRING } },
                            fitIndex: { type: Type.STRING, enum: ['OPTIMAL', 'HIGH', 'MODERATE', 'LOW'] }
                        },
                        required: ["score", "justification", "fitIndex", "gapAnalysis"]
                    }
                }
            });
            if (!response.text) throw new Error("EMPTY_AI_RESPONSE");
            return JSON.parse(response.text);
        });
    },

    async generateNextQuestion(role: string, context: any[]): Promise<Question> {
        return flashBreaker.execute(async () => {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `ROLE_TARGET: ${role}\nSESSION_HISTORY: ${JSON.stringify(context)}`,
                config: {
                    systemInstruction: "Generate the next logical technical interview question based on history.",
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: { 
                            text: { type: Type.STRING }, 
                            category: { type: Type.STRING, enum: ['TECHNICAL', 'BEHAVIORAL', 'SYSTEM_DESIGN'] }, 
                            durationSeconds: { type: Type.INTEGER } 
                        },
                        required: ["text", "category", "durationSeconds"]
                    }
                }
            });
            if (!response.text) throw new Error("EMPTY_AI_RESPONSE");
            return { id: Date.now(), ...JSON.parse(response.text) };
        });
    },

    async generateFinalReport(transcript: string, role: string, history: any[]): Promise<FinalReport> {
        return proBreaker.execute(async () => {
            const ai = getAiClient();
            const prompt = `INTERVIEW_TRANSCRIPT:\n${transcript}\n\nQUESTION_HISTORY:\n${JSON.stringify(history)}`;
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: prompt,
                config: {
                    systemInstruction: "Synthesize the interview session into a comprehensive report.",
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            overallScore: { type: Type.INTEGER },
                            hiringDecision: { type: Type.STRING, enum: ['APPROVE', 'REJECT', 'REVIEW'] },
                            summary: { type: Type.STRING },
                            metrics: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: { label: { type: Type.STRING }, score: { type: Type.INTEGER }, delta: { type: Type.INTEGER } },
                                    required: ["label", "score", "delta"]
                                }
                            },
                            questionResults: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        questionId: { type: Type.INTEGER },
                                        questionText: { type: Type.STRING },
                                        category: { type: Type.STRING },
                                        detailedFeedback: {
                                            type: Type.OBJECT,
                                            properties: {
                                                scores: {
                                                    type: Type.OBJECT,
                                                    properties: { technicalAccuracy: { type: Type.NUMBER }, communicationClarity: { type: Type.NUMBER }, problemSolving: { type: Type.NUMBER } }
                                                },
                                                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                                                improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
                                                summary: { type: Type.STRING }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        required: ["overallScore", "hiringDecision", "summary", "metrics", "questionResults"]
                    }
                }
            });
            if (!response.text) throw new Error("EMPTY_AI_RESPONSE");
            return JSON.parse(response.text);
        });
    }
};

const getStorage = <T>(key: string, defaultVal: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultVal;
    } catch { return defaultVal; }
};

const setStorage = (key: string, value: any) => localStorage.setItem(key, JSON.stringify(value));

export const APIService = {
    async initialize() {
        if (!getStorage(STORAGE_KEYS.INIT, false)) {
            setStorage(STORAGE_KEYS.JOBS, [
                { id: '1', title: 'Senior Full Stack Engineer', department: 'Engineering', location: 'Remote', postedDate: '2d ago', activeCandidates: 14, description: "Deep React/Node.js expertise. System design focus at scale." },
                { id: '2', title: 'AI Research Scientist', department: 'R&D', location: 'Daska, PK', postedDate: '5d ago', activeCandidates: 8, description: "Focus on LLM fine-tuning and specialized RAG orchestration." }
            ]);
            setStorage(STORAGE_KEYS.APPLICATIONS, [
                { id: 'a1', jobId: '1', candidateName: 'Sarah Chen', candidateAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah', stageId: 's1', matchScore: 0, appliedDate: new Date().toISOString(), tags: ['Top Pick'], resumeText: "Expert lead with 8 years React experience. Previously at Netflix and Stripe. Specialized in distributed systems." },
                { id: 'a2', jobId: '1', candidateName: 'Marcus Volt', candidateAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=marcus', stageId: 's1', matchScore: 0, appliedDate: new Date().toISOString(), tags: ['Backend'], resumeText: "Go/Rust engineer with focus on high-throughput microservices." }
            ]);
            setStorage(STORAGE_KEYS.INIT, true);
        }
    },

    async login(email: string): Promise<User | null> {
        const users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
        return users.find(u => u.email === email) || null;
    },

    async register(user: User): Promise<User> {
        const users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
        users.push(user);
        setStorage(STORAGE_KEYS.USERS, users);
        return user;
    },

    async updateUser(user: User): Promise<void> {
        const users = getStorage<User[]>(STORAGE_KEYS.USERS, []);
        const index = users.findIndex(u => u.id === user.id);
        if (index !== -1) { users[index] = user; setStorage(STORAGE_KEYS.USERS, users); }
    },

    async getJobs(): Promise<ATSJob[]> { return getStorage<ATSJob[]>(STORAGE_KEYS.JOBS, []); },

    async getApplications(jobId?: string): Promise<ATSApplication[]> {
        const apps = getStorage<ATSApplication[]>(STORAGE_KEYS.APPLICATIONS, []);
        return jobId ? apps.filter(a => a.jobId === jobId) : apps;
    },

    async updateApplication(app: ATSApplication): Promise<void> {
        const apps = getStorage<ATSApplication[]>(STORAGE_KEYS.APPLICATIONS, []);
        const index = apps.findIndex(a => a.id === app.id);
        if (index !== -1) {
            apps[index] = app;
            setStorage(STORAGE_KEYS.APPLICATIONS, apps);
            socketService.broadcast('pipeline_update', { type: 'UPDATE', appId: app.id, jobId: app.jobId });
        }
    },

    async updateApplicationStage(appId: string, newStageId: string): Promise<void> {
        const apps = getStorage<ATSApplication[]>(STORAGE_KEYS.APPLICATIONS, []);
        const index = apps.findIndex(a => a.id === appId);
        if (index !== -1) {
            apps[index].stageId = newStageId;
            setStorage(STORAGE_KEYS.APPLICATIONS, apps);
            socketService.broadcast('pipeline_update', { type: 'MOVE', appId, stageId: newStageId, jobId: apps[index].jobId });
        }
    },

    getStages(): ATSStage[] {
        return [
            { id: 's1', name: 'APPLIED', color: 'border-evalion-textDim', order: 1 },
            { id: 's2', name: 'AI SCREENING', color: 'border-evalion-purple', order: 2 },
            { id: 's3', name: 'TECH INTERVIEW', color: 'border-evalion-teal', order: 3 },
            { id: 's4', name: 'OFFER', color: 'border-evalion-success', order: 4 }
        ];
    },
    
    async generateNextQuestion(role: string, context: any[]): Promise<Question> {
        return AiEngineService.generateNextQuestion(role, context);
    },

    async generateFinalReport(transcript: string, role: string, history: any[]): Promise<FinalReport> {
        return AiEngineService.generateFinalReport(transcript, role, history);
    },

    async getLatestReport(): Promise<FinalReport | null> {
        const reports = getStorage<FinalReport[]>(STORAGE_KEYS.REPORTS, []);
        if (reports.length > 0) return reports[reports.length - 1];
        return null;
    },

    async saveReport(report: FinalReport): Promise<void> {
        const reports = getStorage<FinalReport[]>(STORAGE_KEYS.REPORTS, []);
        reports.push({ ...report, id: Date.now().toString() });
        setStorage(STORAGE_KEYS.REPORTS, reports);
    },

    async refreshSecurityPosture(): Promise<string> {
        return Math.random().toString(36).substring(7);
    }
};

export const socketService = {
    listeners: {} as any,
    status: 'CONNECTING' as SocketStatus,
    on(event: string, cb: any) { (this.listeners[event] = this.listeners[event] || []).push(cb); },
    off(event: string, cb: any) { this.listeners[event] = this.listeners[event]?.filter((l: any) => l !== cb); },
    broadcast(event: string, data: any) { this.listeners[event]?.forEach((cb: any) => cb(data)); },
    updateStatus(newStatus: SocketStatus) { this.status = newStatus; this.broadcast('socket_status_update', newStatus); },
    startSimulation() {
        setTimeout(() => this.updateStatus('CONNECTED'), 1500);
        setInterval(() => {
            if (this.status !== 'CONNECTED') return;
            if (Math.random() > 0.85) {
                const apps = JSON.parse(localStorage.getItem(STORAGE_KEYS.APPLICATIONS) || '[]');
                if (apps.length > 0) {
                    const idx = Math.floor(Math.random() * apps.length);
                    const app = apps[idx];
                    const stages = ['s1', 's2', 's3', 's4'];
                    const currentIdx = stages.indexOf(app.stageId);
                    if (currentIdx < stages.length - 1) {
                        app.stageId = stages[currentIdx + 1];
                        localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps));
                        this.broadcast('pipeline_update', { type: 'MOVE', appId: app.id, stageId: app.stageId, jobId: app.jobId, simulated: true });
                    }
                }
            }
        }, 12000);
    }
};
socketService.startSimulation();
