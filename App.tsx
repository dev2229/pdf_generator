
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ProcessStatus, ProcessingState, QuestionItem, AcademicContext } from './types.ts';
import { GeminiService } from './services/geminiService.ts';
import { PdfService } from './api/pdfService.ts';
import ProcessSteps from './components/ProcessSteps.tsx';

const ACADEMIC_STRUCTURE: Record<string, string[]> = {
  "Engineering": ["Computer Science & IT", "Mechanical Engineering", "Electrical & Electronics", "Civil Engineering", "Chemical Engineering", "Aerospace Engineering"],
  "Commerce": ["Accounting & Finance", "Business Management", "Economics", "Marketing", "International Trade"],
  "MBA / Management": ["Strategic Management", "Corporate Finance", "Operations Management", "Human Resources", "Organizational Behavior"],
  "Arts & Humanities": ["Modern History", "Political Science", "Sociology", "Clinical Psychology", "English Literature"],
  "Natural Sciences": ["Theoretical Physics", "Organic Chemistry", "Molecular Biology", "Applied Mathematics", "Environmental Science"],
  "Legal Studies": ["Criminal Jurisprudence", "Constitutional Law", "Corporate Governance", "International Law"]
};

const FIELDS = Object.keys(ACADEMIC_STRUCTURE);

const App: React.FC = () => {
  // Check if API Key is available. In AI Studio, this is managed via process.env.API_KEY.
  const [hasKey, setHasKey] = useState<boolean>(true); 

  const [context, setContext] = useState<AcademicContext>({
    field: FIELDS[0],
    subField: ACADEMIC_STRUCTURE[FIELDS[0]][0],
    subject: ''
  });
  
  const [processing, setProcessing] = useState<ProcessingState>({
    status: ProcessStatus.IDLE,
    progress: 0,
    message: 'Engine Standby'
  });
  
  const [results, setResults] = useState<QuestionItem[]>([]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  
  const subjectInputRef = useRef<HTMLInputElement>(null);

  const gemini = useMemo(() => new GeminiService(), []);
  const pdfProcessor = useMemo(() => new PdfService(), []);

  // Initial Key verification logic
  useEffect(() => {
    const verifyAuth = async () => {
      if (process.env.API_KEY) {
        setHasKey(true);
        return;
      }
      
      const aistudio = (window as any).aistudio;
      if (aistudio?.hasSelectedApiKey) {
        try {
          const selected = await aistudio.hasSelectedApiKey();
          setHasKey(selected);
        } catch (e) {
          console.error("Auth check failed:", e);
          setHasKey(false);
        }
      }
    };
    verifyAuth();
  }, []);

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio?.openSelectKey) {
      try {
        await aistudio.openSelectKey();
        setHasKey(true); 
      } catch (e) {
        console.error("Key selection failed:", e);
      }
    } else {
      setHasKey(true);
    }
  };

  const handleFieldChange = (newField: string) => {
    setContext({
      ...context,
      field: newField,
      subField: ACADEMIC_STRUCTURE[newField][0]
    });
  };

  const handleProcess = async (file: File) => {
    try {
      setProcessing({ status: ProcessStatus.EXTRACTING, progress: 10, message: 'Extracting PDF content...' });
      
      const rawText = await pdfProcessor.extractText(file);
      
      setProcessing({ status: ProcessStatus.ANALYZING, progress: 30, message: 'Parsing exam structure...' });
      const questions = await gemini.extractQuestions(rawText);
      
      if (!questions || questions.length === 0) {
        throw new Error("No clear questions detected. Please ensure the PDF has readable text.");
      }

      setProcessing({ status: ProcessStatus.GENERATING, progress: 60, message: 'Synthesizing academic solutions...' });
      let solved = await gemini.solveQuestions(questions, context);

      setProcessing({ status: ProcessStatus.GENERATING_DIAGRAMS, progress: 85, message: 'Rendering technical visuals...' });
      const solvedWithDiagrams = await Promise.all(solved.map(async (q) => {
        if (q.diagramPrompt) {
          try {
            const imgUrl = await gemini.generateTechnicalDiagram(q.diagramPrompt);
            return { ...q, diagramDataUrl: imgUrl };
          } catch (e) {
            console.warn("Diagram render failed:", e);
            return q;
          }
        }
        return q;
      }));

      setResults(solvedWithDiagrams);

      setProcessing({ status: ProcessStatus.CREATING_PDF, progress: 95, message: 'Assembling study guide...' });
      const pdfBlob = await pdfProcessor.generateAnswerPdf(solvedWithDiagrams);
      
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      const newUrl = URL.createObjectURL(pdfBlob);
      setDownloadUrl(newUrl);

      setProcessing({ status: ProcessStatus.COMPLETED, progress: 100, message: 'Compilation Complete' });
    } catch (e: any) {
      console.error("Workflow Error:", e);
      
      // Force key selection UI if auth failure occurs
      if (e.message?.includes("API_KEY_MISSING") || e.message?.includes("401")) {
        setHasKey(false);
      }

      setProcessing({ 
        status: ProcessStatus.ERROR, 
        progress: 0, 
        message: e.message || 'The academic engine encountered an error.' 
      });
    }
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!context.subject.trim()) {
        alert("Please enter the Subject Name first.");
        subjectInputRef.current?.focus();
        e.target.value = '';
        return;
      }
      handleProcess(file);
      e.target.value = '';
    }
  };

  const reset = () => {
    setProcessing({ status: ProcessStatus.IDLE, progress: 0, message: 'Engine Standby' });
    setResults([]);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
  };

  if (!hasKey) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full glass-card p-12 rounded-[3rem] border border-blue-500/20 text-center animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto mb-10 border border-blue-500/20">
            <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="text-4xl font-black uppercase tracking-tight mb-4 leading-none">Authentication Needed</h2>
          <p className="text-slate-400 mb-10 font-medium">To use the Flash academic models, please connect your authorized API key.</p>
          <button 
            onClick={handleSelectKey}
            className="w-full btn-gradient py-6 rounded-2xl font-black text-xl uppercase tracking-widest shadow-2xl"
          >
            Connect API Key
          </button>
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="block mt-8 text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] hover:text-blue-500 transition-colors">Billing & Documentation</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col relative overflow-x-hidden font-sans">
      <div className="mesh-blob bg-blue-600 top-[-10%] left-[-10%] opacity-[0.2]"></div>
      <div className="mesh-blob bg-indigo-600 bottom-[-10%] right-[-10%] opacity-[0.2]"></div>

      <header className="relative z-50 border-b border-white/5 bg-slate-950/40 backdrop-blur-2xl py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-2xl shadow-xl">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2v-14a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="font-black text-3xl md:text-4xl tracking-tighter gradient-text uppercase">ACEEXAM <span className="text-blue-500 italic">PRO</span></span>
          </div>
          <p className="text-[10px] font-black tracking-[0.4em] text-slate-500 uppercase">Intelligent Question Solver</p>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-6 py-12">
        {processing.status === ProcessStatus.IDLE && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center mb-16 space-y-6">
              <h1 className="text-6xl md:text-8xl lg:text-[9rem] font-black tracking-tighter leading-[0.85] gradient-text uppercase">
                CRACK THE <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500 italic">EXAM CODE.</span>
              </h1>
              <p className="text-lg md:text-2xl text-slate-400 font-medium max-w-2xl mx-auto opacity-80">
                Transform scanned banks into clean study guides instantly.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto">
              <div className="lg:col-span-6 glass-card rounded-[2.5rem] p-10 md:p-14 border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                    <span className="font-black text-lg">01</span>
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">Configuration</h3>
                </div>
                
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Primary Field</label>
                    <div className="relative">
                      <select 
                        className="w-full input-field rounded-2xl px-6 py-5 text-lg font-black outline-none appearance-none text-white cursor-pointer"
                        value={context.field}
                        onChange={e => handleFieldChange(e.target.value)}
                      >
                        {FIELDS.map(f => <option key={f} value={f} className="bg-slate-950">{f}</option>)}
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Department</label>
                    <div className="relative">
                      <select 
                        className="w-full input-field rounded-2xl px-6 py-5 text-lg font-black outline-none appearance-none text-white cursor-pointer"
                        value={context.subField}
                        onChange={e => setContext({...context, subField: e.target.value})}
                      >
                        {ACADEMIC_STRUCTURE[context.field].map(sf => <option key={sf} value={sf} className="bg-slate-950">{sf}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Course Title</label>
                    <input 
                      ref={subjectInputRef}
                      className="w-full input-field rounded-2xl px-6 py-5 text-lg font-black outline-none placeholder:text-slate-800 text-white"
                      placeholder="e.g. Artificial Intelligence 101"
                      value={context.subject}
                      onChange={e => setContext({...context, subject: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6">
                <input 
                  type="file" 
                  id="pdf-upload"
                  className="hidden" 
                  onChange={onFileSelected} 
                  accept="application/pdf" 
                />
                
                <label 
                  htmlFor="pdf-upload"
                  className={`flex flex-col h-full glass-card rounded-[2.5rem] border-2 border-dashed flex items-center justify-center p-12 transition-all duration-500 group ${
                    context.subject.trim() 
                      ? 'border-blue-500/40 bg-blue-500/5 hover:border-blue-500 hover:bg-blue-500/10 cursor-pointer shadow-2xl' 
                      : 'border-slate-800 bg-slate-900/10 cursor-not-allowed opacity-40'
                  }`}
                >
                  <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-10 transition-all duration-500 ${
                    context.subject.trim() ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl group-hover:scale-110' : 'bg-slate-800 text-slate-600'
                  }`}>
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h4 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Injection Port</h4>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] text-center">
                    {context.subject.trim() ? "Drop Question Bank PDF to Start" : "Set Subject to Unlock"}
                  </p>
                </label>
              </div>
            </div>
          </div>
        )}

        <ProcessSteps state={processing} />

        {processing.status === ProcessStatus.ERROR && (
          <div className="max-w-2xl mx-auto text-center p-12 glass-card rounded-[3rem] border-red-500/20 shadow-2xl animate-in zoom-in">
            <h3 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter">System Error</h3>
            <p className="text-slate-400 mb-10 text-xl font-medium px-4">{processing.message}</p>
            <button onClick={reset} className="w-full btn-gradient h-16 rounded-2xl font-black text-xl text-white uppercase tracking-widest shadow-xl">Reset Engine</button>
          </div>
        )}

        {processing.status === ProcessStatus.COMPLETED && downloadUrl && (
          <div className="animate-in slide-in-from-bottom-12 duration-1000 max-w-5xl mx-auto">
            <div className="glass-card rounded-[3rem] p-12 md:p-24 text-center mb-16 relative overflow-hidden border-white/5 shadow-2xl">
              <div className="relative z-10">
                <div className="inline-block px-8 py-3 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-[10px] font-black tracking-[0.4em] uppercase mb-10">
                  Solutions Generated
                </div>
                <h2 className="text-6xl md:text-8xl font-black mb-10 tracking-tighter gradient-text uppercase leading-none">TARGET <br/> ACQUIRED.</h2>
                <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                  <a 
                    href={downloadUrl} 
                    download={`AceExam_Guide_${context.subject.replace(/\s+/g, '_')}.pdf`}
                    className="w-full sm:w-auto btn-gradient text-white px-12 py-8 rounded-[2rem] font-black text-2xl shadow-2xl flex items-center justify-center gap-4 transition-transform hover:scale-105"
                  >
                    GET STUDY GUIDE
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  </a>
                  <button onClick={reset} className="w-full sm:w-auto px-10 py-8 rounded-[2rem] font-black text-xl uppercase tracking-widest border border-white/10 hover:bg-white/5 transition-all">New Session</button>
                </div>
              </div>
            </div>

            <div className="space-y-12">
              <h3 className="text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.6em]">Live Preview</h3>
              {results.map((item, idx) => (
                <div key={idx} className="glass-card rounded-[2.5rem] overflow-hidden border border-white/5 shadow-xl transition-all duration-500 hover:border-blue-500/30">
                  <div className="p-8 md:p-12 border-b border-white/5 bg-slate-950/20 flex flex-col md:flex-row items-start gap-8">
                    <div className="h-14 w-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg flex-shrink-0">
                      {item.number}
                    </div>
                    <h3 className="text-2xl md:text-3xl font-black text-white leading-tight uppercase tracking-tight">{item.question}</h3>
                  </div>
                  
                  <div className="p-8 md:p-12 space-y-10">
                    {item.diagramDataUrl && (
                      <div className="rounded-[2rem] border border-white/10 overflow-hidden bg-white p-6 shadow-inner">
                        <img src={item.diagramDataUrl} alt="Visual Logic" className="w-full h-auto max-h-[400px] object-contain mx-auto" />
                      </div>
                    )}
                    
                    <div className="text-xl md:text-2xl text-slate-300 leading-relaxed whitespace-pre-line font-medium break-words border-l-4 border-blue-500/30 pl-8">
                      {item.answer}
                    </div>

                    <div className="flex flex-wrap gap-4 pt-8 border-t border-white/10">
                      {item.referenceDocUrl && (
                        <a href={item.referenceDocUrl} target="_blank" rel="noopener noreferrer" className="px-6 py-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-xs font-black uppercase tracking-widest hover:bg-blue-500/20">Article</a>
                      )}
                      {item.referenceVideoUrl && (
                        <a href={item.referenceVideoUrl} target="_blank" rel="noopener noreferrer" className="px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-black uppercase tracking-widest hover:bg-red-500/20">Video</a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="py-20 border-t border-white/5 bg-slate-950/60 mt-20 relative z-20">
        <div className="max-w-7xl mx-auto px-10 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] mb-4 text-slate-700">ACEEXAM INFRASTRUCTURE v3.0</p>
          <div className="text-[9px] font-bold text-slate-800 uppercase tracking-widest">
            &copy; {new Date().getFullYear()} ACADEMIC ENGINE SYSTEMS
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
