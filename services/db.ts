import { Document } from '../types';
import { getEmbedding } from './gemini';

// Mock Data specifically designed to show collision scenarios where vector search alone fails
// without the SQL filter.
const INITIAL_DATA: Omit<Document, 'embedding'>[] = [
  {
    id: 1,
    client_id: 101,
    category: "Financeiro",
    content: "O pagamento da sua fatura de Janeiro foi processado com sucesso. Valor: R$ 150,00."
  },
  {
    id: 2,
    client_id: 102,
    category: "Financeiro",
    content: "O pagamento da sua fatura de Janeiro falhou. Por favor, atualize seu cartão de crédito."
  },
  {
    id: 3,
    client_id: 101,
    category: "Suporte Técnico",
    content: "Seu chamado sobre lentidão na internet foi resolvido. O modem foi reiniciado remotamente."
  },
  {
    id: 4,
    client_id: 103,
    category: "Vendas",
    content: "Oferecemos um upgrade para o plano Fibra 500MB com desconto especial."
  },
  {
    id: 5,
    client_id: 101,
    category: "Financeiro",
    content: "Confirmação de reembolso referente à cobrança indevida no mês passado."
  }
];

// Helper to simulate a "Wait" for UI effect
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class MockDatabaseService {
  private documents: Document[] = [];
  private isInitialized = false;

  async init() {
    if (this.isInitialized) return;

    // In a real app, we would load embeddings from a Vector DB.
    // Here, we generate them on the fly if needed, or use cached ones.
    // For this demo, we assume we need to calculate them once to "index" the data.
    // NOTE: This might hit API limits if data is huge.
    
    // We will simulate "Indexing"
    this.documents = [...INITIAL_DATA] as Document[];
    this.isInitialized = true;
  }

  // This function generates embeddings for the mock data
  // Only call this when user explicitly clicks "Index Database" to save API calls
  async indexData(onProgress: (msg: string) => void) {
    const docsWithEmbeddings: Document[] = [];
    
    for (const doc of this.documents) {
      if (!doc.embedding) {
        onProgress(`Indexando Doc ID ${doc.id}...`);
        // Add a small delay to avoid rate limits in demo
        await delay(500); 
        try {
            const embedding = await getEmbedding(doc.content);
            docsWithEmbeddings.push({ ...doc, embedding });
        } catch (e) {
            console.error("Failed to embed doc", doc.id, e);
            // Push without embedding or handle error
            docsWithEmbeddings.push(doc);
        }
      } else {
        docsWithEmbeddings.push(doc);
      }
    }
    this.documents = docsWithEmbeddings;
    onProgress("Indexação concluída!");
  }

  getDocuments() {
    return this.documents;
  }

  // Simulates: SELECT * FROM documents WHERE client_id = ?
  executeSQLFilter(clientId: number): number[] {
    return this.documents
      .filter(doc => doc.client_id === clientId)
      .map(doc => doc.id);
  }
}

export const dbService = new MockDatabaseService();