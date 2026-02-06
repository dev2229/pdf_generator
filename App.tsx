
import React, { useState, useRef, useMemo } from 'react';
import { ProcessStatus, ProcessingState, QuestionItem, AcademicContext } from './types.ts';
import { GeminiService } from './services/geminiService.ts';
import { PdfService } from './services/pdfService.ts'; // Correctly importing from services/
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

  const handleFieldChange = (newField: string) => {
    setContext({
      ...context,
      field: newField,
      subField: ACADEMIC_STRUCTURE[newField][0]
    });
  };

  const handleProcess = async (file: File) => {
    try {
      setProcessing({ status: ProcessStatus.EXTRACTING, progress: 10, message: 'Ingesting Document...' });
      const rawText = await pdfProcessor.extractText(file);
      
      setProcessing({ status: ProcessStatus.ANALYZING, progress: 30, message: 'Parsing Question Structure...' });
      const questions = await gemini.extractQuestions(rawText);
      
      if (!questions || questions.length === 0) {
        throw new Error("No clear questions detected.");
      }

      setProcessing({ status: ProcessStatus.GENERATING, progress: 60, message: 'Solving via AI Engines...' });
      let solved = await gemini.solveQuestions(questions, context);

      setProcessing({ status: ProcessStatus.GENERATING_DIAGRAMS, progress: 85, message: 'Generating Technical Visuals...' });
      const solvedWithDiagrams = await Promise.all(solved.map(async (q) => {
        if (q.diagramPrompt) {
          try {
            const imgUrl = await gemini.generateTechnicalDiagram(q.diagramPrompt);
            return { ...q, diagramDataUrl: imgUrl };
          } catch (e) {
            return q;
          }
        }
        return q;
      }));

      setResults(solvedWithDiagrams);

      setProcessing({ status: ProcessStatus.CREATING_PDF, progress: 95, message: 'Exporting Comprehensive Guide...' });
      const pdfBlob = await pdfProcessor.generateAnswerPdf(solvedWithDiagrams);
      
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      const newUrl = URL.createObjectURL(pdfBlob);
      setDownloadUrl(newUrl);

      setProcessing({ status: ProcessStatus.COMPLETED, progress: 100, message: 'Process Finished' });
    } catch (e: any) {
      console.error("Workflow Error:", e);
      setProcessing({ status: ProcessStatus.ERROR, progress: 0, message: e.message || 'System Error' });
    }
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!context.subject.trim()) {
        alert("Subject Title is mandatory.");
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

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col relative overflow-x-hidden font-sans">
      <div className="mesh-blob bg-blue-600 top-[-10%] left-[-10%] opacity-[0.2]"></div>
      <div className="mesh-blob bg-indigo-600 bottom-[-10%] right-[-10%] opacity-[0.2]"></div>

      <header className="relative z-50 border-b border-white/5 bg-slate-950/40 backdrop-blur-2xl py-8 px-6 text-center">
        <div className="max-w-7xl mx-auto">
          <span className="font-black text-3xl md:text-4xl tracking-tighter gradient-text uppercase">ACEEXAM PRO</span>
          <p className="text-[10px] font-black tracking-[0.4em] text-slate-500 uppercase mt-1">Universal Academic Engine</p>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-6 py-12">
        {processing.status === ProcessStatus.IDLE && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center mb-16 space-y-6">
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.85] gradient-text uppercase">
                SOLVE <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500 italic">INSTANTLY.</span>
              </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto">
              <div className="lg:col-span-6 glass-card rounded-[2.5rem] p-10 border border-white/5">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-8">Configuration</h3>
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Primary Field</label>
                    <select className="w-full input-field rounded-2xl px-6 py-4 text-white" value={context.field} onChange={e => handleFieldChange(e.target.value)}>
                      {FIELDS.map(f => <option key={f} value={f} className="bg-slate-950">{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Course Name</label>
                    <input ref={subjectInputRef} className="w-full input-field rounded-2xl px-6 py-4 text-white" placeholder="e.g. Organic Chemistry" value={context.subject} onChange={e => setContext({...context, subject: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6">
                <input type="file" id="pdf-upload" className="hidden" onChange={onFileSelected} accept="application/pdf" />
                <label htmlFor="pdf-upload" className={`flex flex-col h-full glass-card rounded-[2.5rem] border-2 border-dashed flex items-center justify-center p-12 group ${context.subject.trim() ? 'border-blue-500/40 cursor-pointer hover:bg-blue-500/5' : 'opacity-40 cursor-not-allowed'}`}>
                  <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mb-6 text-white"><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg></div>
                  <h4 className="text-2xl font-black text-white uppercase mb-2">Injection Port</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Drop Question Bank PDF to Start</p>
                </label>
              </div>
            </div>
          </div>
        )}

        <ProcessSteps state={processing} />

        {processing.status === ProcessStatus.ERROR && (
          <div className="max-w-2xl mx-auto text-center p-12 glass-card rounded-[3rem] border-red-500/20">
            <h3 className="text-3xl font-black text-white mb-4 uppercase">Engine Failure</h3>
            <p className="text-slate-400 mb-8 font-medium">{processing.message}</p>
            <button onClick={reset} className="w-full btn-gradient py-5 rounded-2xl font-black text-white uppercase tracking-widest">Reboot Engine</button>
          </div>
        )}

        {processing.status === ProcessStatus.COMPLETED && downloadUrl && (
          <div className="max-w-5xl mx-auto space-y-12 animate-in slide-in-from-bottom-12">
            <div className="glass-card rounded-[3rem] p-16 text-center shadow-2xl">
              <h2 className="text-6xl font-black mb-8 gradient-text uppercase leading-none">TARGET <br/> SOLVED.</h2>
              <div className="flex gap-4 justify-center">
                <a href={downloadUrl} download={`AceExam_${context.subject}.pdf`} className="btn-gradient px-12 py-6 rounded-2xl font-black text-white shadow-xl hover:scale-105 transition-transform">DOWNLOAD GUIDE</a>
                <button onClick={reset} className="px-12 py-6 rounded-2xl font-black uppercase tracking-widest border border-white/10 hover:bg-white/5 transition-colors text-white">New Session</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
