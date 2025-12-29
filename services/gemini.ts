// Note: We removed the direct import of @google/genai from here because 
// the client browser should not load the SDK or the API Key.
// All logic is now handled by the /api/* endpoints.

// Calculate embedding by calling the secure API route
export const getEmbedding = async (text: string): Promise<number[]> => {
  try {
    const response = await fetch('/api/embed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch embedding');
    }

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
};

// Calculate Cosine Similarity between two vectors
// This is pure math, so it is safe and performant to keep on the client side.
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
  const magB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
  
  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (magA * magB);
};

// Generate final answer based on context by calling the secure API route
export const generateRAGResponse = async (query: string, context: string) => {
  const prompt = `
    Você é um assistente de suporte ao cliente inteligente.
    Use APENAS o contexto fornecido abaixo para responder à pergunta do usuário.
    Se a resposta não estiver no contexto, diga que não encontrou informações relevantes.
    Responda de forma profissional e concisa em Português.

    Contexto (Resultados do banco de dados):
    ${context}

    Pergunta do Usuário:
    ${query}
  `;

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate content');
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Error generating response:", error);
    throw error;
  }
};