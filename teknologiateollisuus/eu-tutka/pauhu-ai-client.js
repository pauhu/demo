/**
 * Pauhu AI Client - Connect demo to REAL Cloudflare Workers AI
 *
 * Endpoint: https://eu-monitor-ai-analysis.pauhu.workers.dev
 * Worker: eu-monitor-ai-analysis (deployed to Cloudflare)
 */

class PauhuAIClient {
  constructor(apiBase = 'https://eu-monitor-ai-analysis.pauhu.workers.dev') {
    this.apiBase = apiBase;
  }

  /**
   * Get Dual Core status (Language + Semantic models)
   */
  async getDualCoreStatus() {
    const response = await fetch(`${this.apiBase}/api/dual-core-status`);
    return await response.json();
  }

  /**
   * Generate semantic embeddings for a document
   */
  async getEmbeddings(text) {
    const response = await fetch(`${this.apiBase}/api/semantic-similarity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    return await response.json();
  }

  /**
   * Summarize document in Finnish or English
   */
  async summarize(text, language = 'fi') {
    const response = await fetch(`${this.apiBase}/api/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language })
    });
    return await response.json();
  }

  /**
   * Classify document topic
   */
  async classifyTopic(text) {
    const response = await fetch(`${this.apiBase}/api/classify-topic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    return await response.json();
  }

  /**
   * Translate text between languages
   */
  async translate(text, sourceLang, targetLang) {
    const response = await fetch(`${this.apiBase}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sourceLang, targetLang })
    });
    return await response.json();
  }

  /**
   * Calculate semantic similarity between documents
   */
  async findSimilarDocuments(document, allDocuments) {
    // Get embedding for target document
    const targetEmbedding = await this.getEmbeddings(
      document.title + ' ' + (document.description || '')
    );

    if (!targetEmbedding.success) {
      throw new Error('Failed to get embeddings');
    }

    // Get embeddings for all documents (cache these in production)
    const similarities = [];
    for (const doc of allDocuments) {
      if (doc.id === document.id) continue;

      const docEmbedding = await this.getEmbeddings(
        doc.title + ' ' + (doc.description || '')
      );

      if (docEmbedding.success) {
        const similarity = this.cosineSimilarity(
          targetEmbedding.embeddings,
          docEmbedding.embeddings
        );

        similarities.push({ document: doc, similarity });
      }
    }

    // Return top 3 most similar
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Get AI-powered contextual suggestions based on current filter state
   */
  async getContextualSuggestions(filters, documentCount, resultCount) {
    const response = await fetch(`${this.apiBase}/api/contextual-suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filters,
        documentCount,
        resultCount
      })
    });
    return await response.json();
  }
}

// Global instance
const pauhuAI = new PauhuAIClient();
