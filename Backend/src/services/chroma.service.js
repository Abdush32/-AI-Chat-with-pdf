import { CloudClient, ChromaClient } from "chromadb";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import dotenv from "dotenv";
import { langchainEmbeddings } from "./openai.service.js";

dotenv.config({ override: true });

const apiKey =
  process.env.CHROMA_API_KEY ||
  "ck-FtPqQnCtRm4qya82qoywqvfK9hTs5b35Ev5988xkmf4u";
const tenant =
  process.env.CHROMA_TENANT || "0025f751-2726-4575-84e1-2911cb7d968b";
const database = process.env.CHROMA_DATABASE || "genai";
const chromaUrl = process.env.CHROMA_URL || "http://localhost:8000";

let client;

if (typeof CloudClient === "function" && apiKey) {
  client = new CloudClient({
    apiKey,
    tenant,
    database,
  });
} else {
  client = new ChromaClient({
    path: chromaUrl,
    tenant,
    database,
    fetchOptions: apiKey
      ? {
          headers: {
            "x-chroma-token": apiKey,
            Authorization: `Bearer ${apiKey}`,
          },
        }
      : undefined,
  });
}

/**
 * Get or create a ChromaDB collection by name.
 * @param {string} collectionName
 */
export async function getOrCreateCollection(collectionName) {
  try {
    return await client.getOrCreateCollection({
      name: collectionName,
      metadata: { "hnsw:space": "cosine" },
    });
  } catch (error) {
    console.error(
      `Error getting/creating Chroma collection ${collectionName}:`,
      error
    );
    throw error;
  }
}

/**
 * Add document chunks with embeddings to a Chroma collection.
 * Preserved for existing ingestion & direct operations.
 * @param {string} collectionName
 * @param {Array<string>} chunks
 * @param {Array<Array<number>>} embeddings
 * @param {Array<object>} metadatas
 * @param {Array<string>} ids
 */
export async function storeChunksInChroma(
  collectionName,
  chunks,
  embeddings,
  metadatas,
  ids
) {
  try {
    const collection = await getOrCreateCollection(collectionName);
    await collection.add({
      ids,
      embeddings,
      documents: chunks,
      metadatas,
    });
    return true;
  } catch (error) {
    console.error(
      `Error storing chunks in Chroma collection ${collectionName}:`,
      error
    );
    throw error;
  }
}

/**
 * Get a LangChain Chroma vector store instance bound to an existing or new collection.
 * Uses the existing Chroma client and langchainEmbeddings without changing collection schema.
 * @param {string} collectionName
 * @returns {Chroma}
 */
export function getLangChainChromaStore(collectionName) {
  return new Chroma(langchainEmbeddings, {
    index: client,
    collectionName,
    collectionMetadata: { "hnsw:space": "cosine" },
  });
}

/**
 * Ingest LangChain Documents directly into Chroma using LangChain's Chroma vector store.
 * @param {string} collectionName
 * @param {Array<import("@langchain/core/documents").Document>} docs
 * @param {Array<string>} [ids]
 */
export async function storeDocumentsInChroma(collectionName, docs, ids) {
  try {
    const vectorStore = getLangChainChromaStore(collectionName);
    await vectorStore.addDocuments(docs, { ids });
    return true;
  } catch (error) {
    console.error(
      `Error storing LangChain documents in Chroma collection ${collectionName}:`,
      error
    );
    throw error;
  }
}

/**
 * Query Chroma collection for nearest vector matches using LangChain similarity search.
 * Returns text, metadata, and distance. Reads existing collections seamlessly.
 * @param {string} collectionName
 * @param {string|Array<number>} queryOrEmbedding
 * @param {number} nResults
 * @returns {Promise<Array<{text: string, metadata: object, distance: number}>>}
 */
export async function queryChroma(
  collectionName,
  queryOrEmbedding,
  nResults = 4
) {
  try {
    const vectorStore = getLangChainChromaStore(collectionName);

    if (typeof queryOrEmbedding === "string") {
      const resultsWithScore = await vectorStore.similaritySearchWithScore(
        queryOrEmbedding,
        nResults
      );
      return resultsWithScore.map(([doc, score]) => ({
        text: doc.pageContent,
        metadata: doc.metadata || {},
        distance: score,
      }));
    }

    // Direct embedding query fallback
    const collection = await getOrCreateCollection(collectionName);
    const results = await collection.query({
      queryEmbeddings: [queryOrEmbedding],
      nResults,
    });

    const documents = results.documents?.[0] || [];
    const metadatas = results.metadatas?.[0] || [];
    const distances = results.distances?.[0] || [];

    return documents.map((doc, idx) => ({
      text: doc,
      metadata: metadatas[idx] || {},
      distance: distances[idx] || 0,
    }));
  } catch (error) {
    console.error(
      `Error querying Chroma collection ${collectionName}:`,
      error
    );
    throw error;
  }
}

/**
 * Delete a Chroma collection.
 * @param {string} collectionName
 */
export async function deleteCollection(collectionName) {
  try {
    await client.deleteCollection({ name: collectionName });
    return true;
  } catch (error) {
    console.warn(
      `Warning deleting Chroma collection ${collectionName}:`,
      error.message
    );
    return false;
  }
}

export { client };
