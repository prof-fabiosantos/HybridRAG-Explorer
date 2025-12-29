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

## Como Executar Localmente

Como este projeto utiliza **Vercel Serverless Functions** para o backend (API do Gemini), a maneira correta de rodá-lo localmente é utilizando a Vercel CLI.

### Pré-requisitos
1.  **Node.js** instalado (versão 18 ou superior).
2.  Uma **API Key do Google Gemini** (obtenha em [aistudio.google.com](https://aistudio.google.com/)).
3.  **Vercel CLI** instalada globalmente:
    ```bash
    npm install -g vercel
    ```

### Instalação

1.  Clone o repositório e entre na pasta:
    ```bash
    git clone https://github.com/seu-usuario/hybrid-rag-explorer.git
    cd hybrid-rag-explorer
    ```

2.  Instale as dependências:
    ```bash
    npm install
    ```

### Configuração

1.  Faça login na Vercel (se ainda não estiver logado):
    ```bash
    vercel login
    ```

2.  Configure a variável de ambiente `API_KEY`.
    
    A maneira mais fácil para desenvolvimento local com a Vercel é adicionar a chave ao projeto:
    ```bash
    vercel env add API_KEY
    # Cole sua chave quando solicitado e selecione os ambientes (Development, Preview, Production)
    ```
    
    Em seguida, baixe as variáveis para o ambiente local:
    ```bash
    vercel env pull .env.local
    ```

### Rodando a Aplicação

Para iniciar tanto o Frontend (Vite) quanto o Backend (Serverless Functions) simultaneamente:

```bash
vercel dev
```

A aplicação estará disponível em `http://localhost:3000`.

> **Nota Importante:** Se você rodar apenas `npm run dev`, o frontend será iniciado na porta 5173, mas as chamadas para `/api/embed` e `/api/generate` falharão, pois as Serverless Functions requerem o ambiente da Vercel para rodar.

### Deploy

Para colocar em produção na Vercel:

```bash
vercel deploy --prod
```
