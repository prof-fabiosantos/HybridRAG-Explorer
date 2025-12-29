# Hybrid RAG Explorer

Uma demonstração de RAG Híbrido combinando busca vetorial (Semântica) com filtragem estruturada (SQL) para resultados precisos.

## Resumo Técnico da Arquitetura

Aqui está um resumo técnico da arquitetura implementada e ativa nesta aplicação:

### Frontend (React + Vite)
*   Gerencia o estado da aplicação e a visualização do pipeline.
*   Simula o "Banco de Dados" (lógica SQLite) filtrando IDs localmente.
*   Realiza a matemática vetorial (Similaridade de Cosseno) no navegador para demonstrar transparência no cálculo.

### Backend (Vercel Serverless Functions)
*   `/api/embed`: Cria os vetores usando o modelo `text-embedding-004`. Protege a API Key, garantindo que ela nunca seja vazada para o navegador.
*   `/api/generate`: Gera a resposta final usando o `gemini-3-flash-preview`, recebendo apenas o contexto filtrado e validado.

### Fluxo Híbrido
*   A aplicação primeiro busca por **significado** (Vetor).
*   Depois, aplica uma restrição rígida de **negócio** (SQL/Client ID).
*   O Gemini só vê os dados que satisfazem **ambas** as condições, reduzindo alucinações e vazamento de dados entre clientes.
