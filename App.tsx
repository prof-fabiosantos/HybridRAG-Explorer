import React, { useState, useEffect } from 'react';
import { Database, Search, Play, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { dbService } from './services/db';
import { getEmbedding, cosineSimilarity, generateRAGResponse } from './services/gemini';
import { Document, SearchResult, AppStatus } from './types';
import PipelineVisualizer from './components/PipelineVisualizer';

const App: React.FC = () => {
  // --- State ---
  // In a Vercel/Serverless setup, the API Key is on the server. 
  // We assume true here. If the server is missing the key, the API calls will fail gracefully.
  const [apiKeyAvailable, setApiKeyAvailable] = useState(true);
  
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [query, setQuery] = useState("Status do meu pagamento");
  const [clientIdFilter, setClientIdFilter] = useState<number>(101);
  const [logs, setLogs] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [finalAnswer, setFinalAnswer] = useState<string | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [dbDocs, setDbDocs] = useState<Document[]>([]);

  // --- Effects ---
  useEffect(() => {
    initializeDb();
  }, []);

  const initializeDb = async () => {
    await dbService.init();
    setDbDocs(dbService.getDocuments());
  };

  // --- Actions ---

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleIndexData = async () => {
    setIsIndexing(true);
    addLog("Iniciando indexação vetorial (criando embeddings para o banco de dados)...");
    
    await dbService.indexData((msg) => addLog(msg));
    
    setDbDocs([...dbService.getDocuments()]); // Force refresh
    setIsIndexing(false);
    addLog("Indexação concluída. Banco de dados pronto para busca semântica.");
  };

  const runHybridSearch = async () => {
    if (dbDocs.some(d => !d.embedding)) {
      addLog("Erro: O banco de dados precisa ser indexado primeiro.");
      alert("Por favor, clique em 'Indexar Banco de Dados' primeiro para gerar os vetores.");
      return;
    }

    setSearchResults([]);
    setFinalAnswer(null);
    setStatus(AppStatus.EMBEDDING);
    addLog(`Iniciando busca para: "${query}" com Client ID: ${clientIdFilter}`);

    try {
      // 1. Vector Path: Get Query Embedding
      addLog("Gerando embedding para a consulta do usuário...");
      const queryEmbedding = await getEmbedding(query);
      
      setStatus(AppStatus.SEARCHING);

      // 2. Vector Search (Simulated Vector DB scan)
      addLog("Calculando similaridade do cosseno com todos os documentos...");
      const vectorResults = dbDocs.map(doc => {
        if (!doc.embedding) return { ...doc, similarity: 0, passedSqlFilter: false };
        const similarity = cosineSimilarity(queryEmbedding, doc.embedding);
        return { ...doc, similarity, passedSqlFilter: false }; // Init false
      });

      // Sort by similarity (High to Low)
      vectorResults.sort((a, b) => b.similarity - a.similarity);

      // 3. SQL Path: Get allowed IDs
      addLog(`Executando SQL: SELECT id FROM documents WHERE client_id = ${clientIdFilter}`);
      const allowedIds = dbService.executeSQLFilter(clientIdFilter);
      
      // 4. Hybrid Merge (AND Logic)
      const hybridResults: SearchResult[] = vectorResults.map(doc => ({
        ...doc,
        passedSqlFilter: allowedIds.includes(doc.id)
      }));

      // Filter for final context: Must pass SQL filter AND have some relevance
      const relevantDocs = hybridResults.filter(r => r.passedSqlFilter && r.similarity > 0.45);
      
      setSearchResults(hybridResults);
      addLog(`Resultados encontrados: ${relevantDocs.length} documentos relevantes após filtro.`);

      // 5. Generate Answer
      if (relevantDocs.length > 0) {
        setStatus(AppStatus.GENERATING);
        const contextText = relevantDocs.map(d => `- [ID:${d.id}] ${d.content}`).join("\n");
        addLog("Enviando contexto para o Gemini gerar a resposta...");
        
        const answer = await generateRAGResponse(query, contextText);
        setFinalAnswer(answer);
      } else {
        setFinalAnswer("Nenhum documento relevante encontrado que corresponda aos critérios.");
      }

      setStatus(AppStatus.COMPLETE);
      addLog("Processo finalizado.");

    } catch (error: any) {
      console.error(error);
      addLog("Erro durante o processo: " + (error.message || "Erro desconhecido"));
      setStatus(AppStatus.ERROR);
      if (error.message?.includes("API Key missing")) {
        alert("Erro no Servidor: A API KEY não está configurada no Vercel. Adicione a variável de ambiente API_KEY nas configurações do projeto.");
      }
    }
  };

  // --- Render ---

  if (!apiKeyAvailable) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border border-red-100">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-800 mb-2">API Key Ausente</h1>
          <p className="text-slate-600">
            Configure a variável de ambiente no servidor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200">
               <Database className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Hybrid<span className="text-blue-600">RAG</span> Explorer
            </h1>
          </div>
          <div className="text-xs font-mono bg-slate-100 px-3 py-1 rounded text-slate-500">
            Powered by Gemini & SQLite Logic
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Controls & Visualizer */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Controls Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-500" />
                Configuração da Busca
              </h2>
              
              {!dbDocs[0]?.embedding && (
                <button 
                  onClick={handleIndexData}
                  disabled={isIndexing}
                  className="text-xs bg-amber-100 text-amber-800 hover:bg-amber-200 px-3 py-1.5 rounded-full font-medium transition-colors flex items-center gap-1"
                >
                  {isIndexing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
                  {isIndexing ? 'Indexando...' : 'Indexar Banco de Dados'}
                </button>
              )}
            </div>

            <div className="space-y-5">
              {/* Natural Language Query */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Consulta do Usuário (Busca Vetorial)
                </label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                  placeholder="Ex: Tive um problema com meu pagamento..."
                />
              </div>

              {/* SQL Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ID do Cliente (Filtro SQL)
                </label>
                <select
                  value={clientIdFilter}
                  onChange={(e) => setClientIdFilter(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value={101}>101 (Cliente com várias interações)</option>
                  <option value={102}>102 (Cliente com falha de pagamento)</option>
                  <option value={103}>103 (Cliente novo/Prospecção)</option>
                  <option value={999}>999 (Cliente inexistente)</option>
                </select>
                <p className="text-xs text-slate-500 mt-1 font-mono">
                  SQL Query: SELECT * FROM docs WHERE client_id = {clientIdFilter}
                </p>
              </div>

              <button
                onClick={runHybridSearch}
                disabled={status === AppStatus.EMBEDDING || status === AppStatus.SEARCHING || status === AppStatus.GENERATING || isIndexing}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {status !== AppStatus.IDLE && status !== AppStatus.COMPLETE && status !== AppStatus.ERROR ? (
                   <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                   <Play className="w-5 h-5 fill-current" />
                )}
                Executar Recuperação Híbrida
              </button>
            </div>
          </div>

          {/* Visualizer */}
          <PipelineVisualizer 
            status={status} 
            sqlQuery={`client_id = ${clientIdFilter}`}
            vectorQuery={query}
          />

          {/* Final Answer */}
          {finalAnswer && (
            <div className="bg-white rounded-2xl shadow-lg border border-green-200 overflow-hidden">
              <div className="bg-green-50 px-6 py-4 border-b border-green-100 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-green-900">Resultado Final (Gerado por IA)</h3>
              </div>
              <div className="p-6">
                <p className="text-slate-800 leading-relaxed text-lg">
                  {finalAnswer}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Data & Logs */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Database View */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col max-h-[400px]">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
              <h3 className="font-semibold text-sm text-slate-700">Banco de Dados (SQLite Simulado)</h3>
            </div>
            <div className="overflow-y-auto p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-2">ID</th>
                    <th className="px-4 py-2">Client ID</th>
                    <th className="px-4 py-2">Conteúdo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dbDocs.map((doc) => {
                    // Logic to highlight rows based on search
                    const isSqlMatch = searchResults.length > 0 && searchResults.find(r => r.id === doc.id)?.passedSqlFilter;
                    const isVectorMatch = searchResults.length > 0 && (searchResults.find(r => r.id === doc.id)?.similarity || 0) > 0.45;
                    const isFinalMatch = isSqlMatch && isVectorMatch;

                    let bgClass = "hover:bg-slate-50";
                    if (isFinalMatch) bgClass = "bg-green-50 hover:bg-green-100";
                    else if (isSqlMatch) bgClass = "bg-blue-50 hover:bg-blue-100";
                    else if (isVectorMatch) bgClass = "bg-amber-50 hover:bg-amber-100";

                    return (
                      <tr key={doc.id} className={`${bgClass} transition-colors`}>
                        <td className="px-4 py-3 font-mono text-slate-500">#{doc.id}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-600">{doc.client_id}</td>
                        <td className="px-4 py-3 text-slate-700 truncate max-w-[200px]" title={doc.content}>{doc.content}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {dbDocs.length === 0 && <div className="p-4 text-center text-slate-400">Nenhum dado</div>}
            </div>
            <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 text-xs text-slate-500 flex gap-4">
               <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span> SQL Match</span>
               <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Vector Match</span>
               <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Hybrid Match</span>
            </div>
          </div>

          {/* Search Logic Details */}
          {searchResults.length > 0 && (
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                 <h3 className="font-semibold text-sm text-slate-700">Detalhes da Pontuação Híbrida</h3>
               </div>
               <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-slate-500 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left">Doc ID</th>
                      <th className="px-4 py-2 text-right">Vector Score</th>
                      <th className="px-4 py-2 text-center">SQL Filter</th>
                      <th className="px-4 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.slice(0, 5).map(res => (
                      <tr key={res.id} className="border-b border-slate-50">
                        <td className="px-4 py-2 font-mono text-slate-600">#{res.id}</td>
                        <td className="px-4 py-2 text-right font-mono text-slate-600">{(res.similarity * 100).toFixed(1)}%</td>
                        <td className="px-4 py-2 text-center">
                          {res.passedSqlFilter 
                            ? <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">PASS</span>
                            : <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">FAIL</span>
                          }
                        </td>
                        <td className="px-4 py-2 text-center">
                           {res.passedSqlFilter && res.similarity > 0.45 
                             ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                             : <span className="text-slate-300">-</span>
                           }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
               </div>
             </div>
          )}

          {/* System Logs */}
          <div className="bg-slate-900 rounded-xl shadow-lg overflow-hidden flex flex-col h-64 font-mono text-xs">
             <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 text-slate-400 flex justify-between">
                <span>System Logs</span>
                <span className="text-green-500">● Live</span>
             </div>
             <div className="p-4 overflow-y-auto space-y-1.5 flex-1 scrollbar-thin scrollbar-thumb-slate-700">
               {logs.length === 0 && <span className="text-slate-600">Aguardando operações...</span>}
               {logs.map((log, i) => (
                 <div key={i} className="text-slate-300 border-l-2 border-slate-700 pl-2">
                   {log}
                 </div>
               ))}
             </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;