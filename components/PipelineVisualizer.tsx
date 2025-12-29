import React from 'react';
import { Database, Search, Filter, Combine, FileText, ArrowDown, ArrowRight, BrainCircuit } from 'lucide-react';
import { AppStatus } from '../types';

interface Props {
  status: AppStatus;
  sqlQuery: string;
  vectorQuery: string;
}

const PipelineVisualizer: React.FC<Props> = ({ status, sqlQuery, vectorQuery }) => {
  const isActive = (check: AppStatus[]) => check.includes(status);

  // CSS classes for active/inactive states
  const getNodeClass = (active: boolean) => 
    `p-4 rounded-xl border-2 transition-all duration-500 flex flex-col items-center gap-2 shadow-sm ${
      active 
        ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-blue-100 scale-105' 
        : 'border-slate-200 bg-white text-slate-400'
    }`;

  const getArrowClass = (active: boolean) =>
    `transition-all duration-500 ${active ? 'text-blue-500' : 'text-slate-200'}`;

  return (
    <div className="w-full bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6 text-center">
        Fluxo de Recuperação Híbrida
      </h3>

      <div className="flex flex-col items-center relative">
        
        {/* User Query Node */}
        <div className={getNodeClass(status !== AppStatus.IDLE)}>
          <Search className="w-6 h-6" />
          <span className="font-medium text-sm">Consulta do Usuário</span>
        </div>

        {/* Fork Arrows */}
        <div className="flex w-full justify-center h-12 relative">
           <div className={`absolute top-0 bottom-0 left-[50%] w-0.5 -ml-[1px] ${getArrowClass(status !== AppStatus.IDLE)} h-6 bg-current`}></div>
           <div className={`absolute top-6 left-[25%] right-[25%] h-0.5 ${getArrowClass(status !== AppStatus.IDLE)} bg-current`}></div>
           <div className={`absolute top-6 bottom-0 left-[25%] w-0.5 ${getArrowClass(status !== AppStatus.IDLE)} bg-current`}></div>
           <div className={`absolute top-6 bottom-0 right-[25%] w-0.5 ${getArrowClass(status !== AppStatus.IDLE)} bg-current`}></div>
        </div>

        <div className="grid grid-cols-2 gap-8 w-full max-w-2xl">
          
          {/* Left Path: Vector Search */}
          <div className="flex flex-col items-center">
            <div className={getNodeClass(isActive([AppStatus.EMBEDDING, AppStatus.SEARCHING, AppStatus.GENERATING, AppStatus.COMPLETE])) + " w-full h-32 justify-center"}>
              <BrainCircuit className="w-8 h-8" />
              <div className="text-center">
                <span className="font-bold block text-sm">Busca Vetorial</span>
                <span className="text-xs opacity-75">Similaridade Semântica</span>
              </div>
              {isActive([AppStatus.SEARCHING, AppStatus.GENERATING, AppStatus.COMPLETE]) && (
                <div className="mt-2 text-[10px] bg-slate-800 text-white px-2 py-1 rounded font-mono">
                  cosine_sim(q, doc) &gt; 0.7
                </div>
              )}
            </div>
            <ArrowDown className={`my-2 h-6 w-6 ${getArrowClass(isActive([AppStatus.SEARCHING, AppStatus.GENERATING, AppStatus.COMPLETE]))}`} />
          </div>

          {/* Right Path: SQL Filter */}
          <div className="flex flex-col items-center">
             <div className={getNodeClass(isActive([AppStatus.SEARCHING, AppStatus.GENERATING, AppStatus.COMPLETE])) + " w-full h-32 justify-center"}>
              <Filter className="w-8 h-8" />
              <div className="text-center">
                <span className="font-bold block text-sm">Filtro SQL</span>
                <span className="text-xs opacity-75">Metadados Estruturados</span>
              </div>
              {sqlQuery && (
                <div className="mt-2 text-[10px] bg-slate-800 text-white px-2 py-1 rounded font-mono break-all max-w-[160px]">
                  {sqlQuery}
                </div>
              )}
            </div>
            <ArrowDown className={`my-2 h-6 w-6 ${getArrowClass(isActive([AppStatus.SEARCHING, AppStatus.GENERATING, AppStatus.COMPLETE]))}`} />
          </div>

        </div>

        {/* Merge Node */}
        <div className="w-full max-w-2xl px-8">
            <div className={getNodeClass(isActive([AppStatus.GENERATING, AppStatus.COMPLETE])) + " w-full flex-row justify-center gap-4 py-6"}>
              <Combine className="w-8 h-8" />
              <div className="text-left">
                <span className="font-bold text-lg block">(Similaridade) AND (Filtro SQL)</span>
                <span className="text-xs opacity-75">Intersecção de Resultados</span>
              </div>
            </div>
        </div>

        <ArrowDown className={`my-4 h-6 w-6 ${getArrowClass(isActive([AppStatus.GENERATING, AppStatus.COMPLETE]))}`} />

        {/* Final Result Node */}
        <div className={getNodeClass(isActive([AppStatus.COMPLETE, AppStatus.GENERATING])) + " border-green-500 bg-green-50 text-green-900"}>
          <FileText className="w-6 h-6" />
          <span className="font-bold text-sm">Resposta Gerada</span>
        </div>

      </div>
    </div>
  );
};

export default PipelineVisualizer;