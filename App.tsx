
import React, { useState, useRef, useMemo } from 'react';
import { ProcessStatus, ProcessingState, QuestionItem, AcademicContext } from './types';
import { GeminiService } from './services/geminiService';
import { PdfService } from './services/pdfService';
import ProcessSteps from './components/ProcessSteps';

const ACADEMIC_STRUCTURE: Record<string, string[]> = {
  "Engineering": [
    "Computer Science & IT",
    "Mechanical Engineering",
    "Electrical & Electronics",
    "Civil Engineering",
    "Chemical Engineering",
    "Aerospace Engineering"
  ],
  "Commerce": [
    "Accounting & Finance",
    "Business Management",
    "Economics",
    "Marketing",
    "International Trade"
  ],
  "MBA / Management": [
    "Strategic Management",
    "Corporate Finance",
    "Operations Management",
    "Human Resources",
    "Organizational Behavior"
  ],
  "Arts & Humanities": [
    "Modern History",
    "Political Science",
    "Sociology",
    "Clinical Psychology",
    "English Literature"
  ],
  "Natural Sciences": [
    "Theoretical Physics",
    "Organic Chemistry",
    "Molecular Biology",
    "Applied Mathematics",
    "Environmental Science"
  ],
  "Legal Studies": [
    "Criminal Jurisprudence",
    "Constitutional Law",
    "Corporate Governance",
    "International Law"
  ]
};

const FIELDS = Object.keys(ACADEMIC_STRUCTURE);

const App: React.FC = () => {
  const [context, setContext] = useState<AcademicContext>({
    field: FIELDS[0],
    subField: ACADEMIC_STRUCTURE[FIELDS[0]][0],
    subject: ''
  });
  
  const [processing, setProcessing] = useState<ProcessingState>({
    status: ProcessStatus.IDLE,
    progress: 0,
    message: 'System Ready'
  });
  
  const [results, setResults] = useState<QuestionItem[]>([]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);

  const gemini = useMemo(() => new GeminiService(), []);
  const pdfProcessor = useMemo(() => new PdfService(), []);

  const handleFieldChange = (newField: string) => {
    setContext({
      ...context,
      field: newField,
      subField: ACADEMIC_STRUCTURE[newField][0]
    });
  };

  const handleProcess = async (file: File) => {
    try {
      setProcessing({ status: ProcessStatus.EXTRACTING, progress: 10, message: 'Extracting Academic Data...' });
      
      const rawText = await pdfProcessor.extractText(file);
      
      setProcessing({ status: ProcessStatus.ANALYZING, progress: 25, message: 'Classifying Questions...' });
      const questions = await gemini.extractQuestions(rawText);
      
      if (!questions || questions.length === 0) {
        throw new Error("No exam questions were detected in this document. Please verify your PDF content.");
      }

      setProcessing({ status: ProcessStatus.GENERATING, progress: 50, message: 'Synthesizing Solutions...' });
      let solved = await gemini.solveQuestions(questions, context);

      setProcessing({ status: ProcessStatus.GENERATING_DIAGRAMS, progress: 75, message: 'Generating Logic Diagrams...' });
      const solvedWithDiagrams = await Promise.all(solved.map(async (q) => {
        if (q.diagramPrompt) {
          try {
            const imgUrl = await gemini.generateTechnicalDiagram(q.diagramPrompt);
            return { ...q, diagramDataUrl: imgUrl };
          } catch (e) {
            console.warn("Diagram generation failed for a question", e);
            return q;
          }
        }
        return q;
      }));

      setResults(solvedWithDiagrams);

      setProcessing({ status: ProcessStatus.CREATING_PDF, progress: 95, message: 'Compiling Study Guide...' });
      const pdfBlob = await pdfProcessor.generateAnswerPdf(solvedWithDiagrams);
      
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(URL.createObjectURL(pdfBlob));

      setProcessing({ status: ProcessStatus.COMPLETED, progress: 100, message: 'Analysis Complete' });
    } catch (e: any) {
      console.error("Engine Fault:", e);
      setProcessing({ 
        status: ProcessStatus.ERROR, 
        progress: 0, 
        message: e.message || 'Fatal System Error' 
      });
    } finally {
      // Always reset file input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!context.subject.trim()) {
        alert("Action Required: Please enter the Specific Subject name first.");
        subjectInputRef.current?.focus();
        e.target.value = '';
        return;
      }
      handleProcess(file);
    }
  };

  const reset = () => {
    setProcessing({ status: ProcessStatus.IDLE, progress: 0, message: 'System Ready' });
    setResults([]);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col relative overflow-x-hidden selection:bg-blue-500/30">
      {/* Dynamic Background */}
      <div className="mesh-blob bg-blue-600 top-[-10%] left-[-10%] opacity-[0.2]"></div>
      <div className="mesh-blob bg-indigo-600 bottom-[-10%] right-[-10%] opacity-[0.2]"></div>

      <header className="relative z-50 border-b border-white/5 bg-slate-950/40 backdrop-blur-2xl py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-2xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="font-black text-3xl md:text-4xl tracking-tighter gradient-text uppercase">ACEEXAM <span className="text-blue-500 italic">PRO</span></span>
          </div>
          <p className="text-[10px] font-black tracking-[0.4em] text-slate-500 uppercase">Cross-Disciplinary AI Engine</p>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-6 py-12">
        {processing.status === ProcessStatus.IDLE && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center mb-16 space-y-6">
              <h1 className="text-6xl md:text-8xl lg:text-[9rem] font-black tracking-tighter leading-[0.85] gradient-text uppercase">
                ACADEMIC <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500 italic">MASTERY.</span>
              </h1>
              <p className="text-lg md:text-2xl text-slate-400 font-medium max-w-2xl mx-auto opacity-80">
                Transform any question bank into a <span className="text-white font-bold">professional guide</span> using advanced multi-model intelligence.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto">
              {/* Context Section */}
              <div className="lg:col-span-6 glass-card rounded-[2.5rem] p-10 md:p-14 border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                    <span className="font-black text-lg">01</span>
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">System Context</h3>
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
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Specialization</label>
                    <div className="relative">
                      <select 
                        className="w-full input-field rounded-2xl px-6 py-5 text-lg font-black outline-none appearance-none text-white cursor-pointer"
                        value={context.subField}
                        onChange={e => setContext({...context, subField: e.target.value})}
                      >
                        {ACADEMIC_STRUCTURE[context.field].map(sf => <option key={sf} value={sf} className="bg-slate-950">{sf}</option>)}
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Specific Subject Name</label>
                    <input 
                      ref={subjectInputRef}
                      className="w-full input-field rounded-2xl px-6 py-5 text-lg font-black outline-none placeholder:text-slate-800 text-white"
                      placeholder="e.g. Microeconomics"
                      value={context.subject}
                      onChange={e => setContext({...context, subject: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Upload Section */}
              <div className="lg:col-span-6 flex flex-col gap-4">
                <input 
                  type="file" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={onFileSelected} 
                  accept="application/pdf" 
                />
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex-1 glass-card rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center p-12 transition-all duration-500 ${
                    context.subject.trim() 
                      ? 'border-blue-500/40 bg-blue-500/5 hover:border-blue-500 hover:bg-blue-500/10 cursor-pointer shadow-2xl' 
                      : 'border-slate-800 bg-slate-900/10 cursor-not-allowed opacity-40'
                  }`}
                >
                  <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-10 transition-all duration-500 ${
                    context.subject.trim() ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl' : 'bg-slate-800 text-slate-600'
                  }`}>
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <h4 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Add PDF Bank</h4>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                    {context.subject.trim() ? "Click to upload Question Set" : "Define Subject above to unlock"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <ProcessSteps state={processing} />

        {processing.status === ProcessStatus.ERROR && (
          <div className="max-w-2xl mx-auto text-center p-12 glass-card rounded-[3rem] border-red-500/20 shadow-2xl animate-in zoom-in">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/20">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter">Processing Halted</h3>
            <p className="text-slate-400 mb-10 text-xl font-medium">{processing.message}</p>
            <button onClick={reset} className="w-full btn-gradient h-16 rounded-2xl font-black text-xl text-white uppercase tracking-widest">Restart Engine</button>
          </div>
        )}

        {processing.status === ProcessStatus.COMPLETED && downloadUrl && (
          <div className="animate-in slide-in-from-bottom-12 duration-1000 max-w-5xl mx-auto">
            <div className="glass-card rounded-[3rem] p-12 md:p-24 text-center mb-16 relative overflow-hidden border-white/5 shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
              
              <div className="relative z-10">
                <div className="inline-block px-8 py-3 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-[10px] font-black tracking-[0.4em] uppercase mb-10">
                  Solutions Optimized
                </div>
                <h2 className="text-6xl md:text-8xl font-black mb-10 tracking-tighter gradient-text uppercase">DOCUMENTS <br/> READY.</h2>
                <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                  <a 
                    href={downloadUrl} 
                    download={`Solved_${context.subject.replace(/\s+/g, '_')}.pdf`}
                    className="w-full sm:w-auto btn-gradient text-white px-12 py-8 rounded-[2rem] font-black text-2xl shadow-2xl flex items-center justify-center gap-4"
                  >
                    DOWNLOAD PDF
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  </a>
                  <button onClick={reset} className="w-full sm:w-auto btn-secondary text-white px-10 py-8 rounded-[2rem] font-black text-xl uppercase tracking-widest border border-white/10">Process Next</button>
                </div>
              </div>
            </div>

            <div className="space-y-16">
              <h3 className="text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.6em]">Solution Stream Preview</h3>
              {results.map((item, idx) => (
                <div key={idx} className="glass-card rounded-[2.5rem] overflow-hidden border border-white/5 shadow-xl">
                  <div className="p-8 md:p-14 border-b border-white/5 bg-slate-950/20 flex flex-col md:flex-row items-start gap-8">
                    <div className="h-16 w-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg flex-shrink-0">
                      {item.number}
                    </div>
                    <h3 className="text-2xl md:text-4xl font-black text-white leading-tight uppercase tracking-tight">{item.question}</h3>
                  </div>
                  
                  <div className="p-8 md:p-14 space-y-12">
                    {item.diagramDataUrl && (
                      <div className="rounded-[2rem] border border-white/10 overflow-hidden bg-white p-6 md:p-12 shadow-inner">
                        <img src={item.diagramDataUrl} alt="Visual Aid" className="w-full h-auto max-h-[500px] object-contain mx-auto rounded-xl" />
                      </div>
                    )}
                    
                    <div className="relative pl-0 md:pl-10">
                      <div className="hidden md:block absolute left-0 top-0 w-1 h-full bg-blue-500/20 rounded-full"></div>
                      <div className="text-xl md:text-2xl text-slate-300 leading-relaxed whitespace-pre-line font-medium">
                        {item.answer}
                      </div>

                      <div className="mt-12 flex flex-wrap gap-4 pt-10 border-t border-white/10">
                        {item.referenceDocUrl && (
                          <a href={item.referenceDocUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-6 py-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-sm font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                            Article
                          </a>
                        )}
                        {item.referenceVideoUrl && (
                          <a href={item.referenceVideoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-black uppercase tracking-widest hover:bg-red-500/20 transition-all">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12.03a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Video
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="py-20 border-t border-white/5 bg-slate-950/60 mt-20">
        <div className="max-w-7xl mx-auto px-10 text-center opacity-40">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] mb-4">ACEEXAM INTEL CORE v5.2</p>
          <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
            &copy; {new Date().getFullYear()} UNIVERSAL RIGOR SYSTEMS
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
