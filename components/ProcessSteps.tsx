
import React from 'react';
import { ProcessStatus, ProcessingState } from '../types';

interface ProcessStepsProps {
  state: ProcessingState;
}

const ProcessSteps: React.FC<ProcessStepsProps> = ({ state }) => {
  const steps = [
    { id: ProcessStatus.UPLOADING, label: 'Upload' },
    { id: ProcessStatus.EXTRACTING, label: 'Extract' },
    { id: ProcessStatus.ANALYZING, label: 'Analyze' },
    { id: ProcessStatus.GENERATING, label: 'Solve' },
    { id: ProcessStatus.GENERATING_DIAGRAMS, label: 'Diagrams' },
    { id: ProcessStatus.CREATING_PDF, label: 'Compile' },
  ];

  const getCurrentIndex = () => steps.findIndex(s => s.id === state.status);
  const currentIndex = getCurrentIndex();

  if (state.status === ProcessStatus.IDLE || state.status === ProcessStatus.COMPLETED || state.status === ProcessStatus.ERROR) {
    return null;
  }

  return (
    <div className="w-full max-w-3xl mx-auto mt-8 md:mt-12 p-6 md:p-10 glass-card rounded-2xl md:rounded-[2.5rem] border border-blue-500/10 animate-in fade-in zoom-in duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <h3 className="text-lg md:text-xl font-black text-white flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 rounded-full blur-sm animate-pulse"></div>
            <svg className="animate-spin h-5 w-5 text-blue-400 relative" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <span className="uppercase tracking-tight">{state.message}</span>
        </h3>
        <span className="text-xl md:text-3xl font-black text-blue-400 tabular-nums">
          {state.progress}%
        </span>
      </div>

      <div className="relative h-2 md:h-3 w-full bg-slate-900 rounded-full overflow-hidden mb-10 border border-white/5 shadow-inner">
        <div 
          style={{ width: `${state.progress}%` }} 
          className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(59,130,246,0.3)]"
        ></div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-4 md:gap-2">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex flex-col items-center">
            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center text-[10px] md:text-xs font-black mb-2 md:mb-3 transition-all duration-500 border ${
              idx < currentIndex ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' :
              idx === currentIndex ? 'bg-blue-600 border-blue-400 text-white shadow-lg scale-110' :
              'bg-slate-900 border-white/5 text-slate-700'
            }`}>
              {idx < currentIndex ? (
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              ) : idx + 1}
            </div>
            <span className={`text-[8px] md:text-[9px] uppercase tracking-widest font-black text-center ${
              idx <= currentIndex ? 'text-blue-400' : 'text-slate-700'
            }`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProcessSteps;
