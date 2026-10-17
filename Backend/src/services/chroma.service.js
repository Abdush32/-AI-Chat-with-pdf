import { CloudClient, ChromaClient } from "chromadb";
import dotenv from "dotenv";

dotenv.config({ override: true });

const apiKey =
  process.env.CHROMA_API_KEY ||
  "ck-FtPqQnCtRm4qya82qoywqvfK9hTs5b35Ev5988xkmf4u";
const tenant =
  process.env.CHROMA_TENANT || "0025f751-2726-4575-84e1-2911cb7d968b";
const database = process.env.CHROMA_DATABASE || "genai";

let client;

if (typeof CloudClient === "function" && apiKey) {
  client = new CloudClient({
    apiKey,
    tenant,
    database,
  });
} else {
  const chromaUrl = process.env.CHROMA_URL || "http://localhost:8000";
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
 * Query Chroma collection for nearest vector matches.
 * @param {string} collectionName
 * @param {Array<number>} queryEmbedding
 * @param {number} nResults
 * @returns {Promise<Array<{text: string, metadata: object, distance: number}>>}
 */
export async function queryChroma(
  collectionName,
  queryEmbedding,
  nResults = 4
) {
  try {
    const collection = await getOrCreateCollection(collectionName);
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
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
