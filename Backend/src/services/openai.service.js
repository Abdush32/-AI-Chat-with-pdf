import dotenv from "dotenv";
import OpenAI from "openai";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";

dotenv.config({ override: true });

const apiKey = process.env.OPENAI_API_KEY?.trim();

const openai = new OpenAI({ apiKey });

/**
 * Singleton LangChain ChatOpenAI instance for document and general chat.
 * Uses the existing gpt-4o-mini model and OPENAI_API_KEY.
 */
export const langchainChatModel = new ChatOpenAI({
  apiKey,
  model: "gpt-4o-mini",
  temperature: 0.3,
});

/**
 * Singleton LangChain OpenAIEmbeddings instance.
 * Uses the existing text-embedding-3-small model and OPENAI_API_KEY.
 */
export const langchainEmbeddings = new OpenAIEmbeddings({
  apiKey,
  model: "text-embedding-3-small",
});

/**
 * Generate vector embeddings for text array using OpenAI embedding model.
 * @param {Array<string>|string} input - Text or array of texts to embed.
 * @returns {Promise<Array<Array<number>>>} Embeddings array.
 */
export async function generateEmbeddings(input) {
  try {
    const texts = Array.isArray(input) ? input : [input];
    return await langchainEmbeddings.embedDocuments(texts);
  } catch (error) {
    console.error("Error generating OpenAI embeddings:", error);
    throw error;
  }
}

/**
 * Generate AI chat reply for RAG mode (with document data context) or standard mode (without data context).
 * @param {object} params
 * @param {string} params.prompt - User message
 * @param {Array<{text: string}>} [params.contextChunks] - Retrieved text chunks from ChromaDB
 * @param {Array<{role: string, content: string}>} [params.history] - Recent chat history
 * @param {'with_data'|'without_data'} [params.mode] - Chat mode
 * @returns {Promise<string>}
 */
export async function generateDocumentChatReply({ prompt, contextChunks = [], history = [], mode = "without_data" }) {
  try {
    let systemPrompt = "";

    if (mode === "with_data" && contextChunks.length > 0) {
      const contextText = contextChunks.map((chunk, idx) => `[Snippet ${idx + 1}]: ${chunk.text}`).join("\n\n");
      systemPrompt = `You are a helpful AI assistant capable of answering questions based on the user's uploaded document.
Use the following relevant context extracted from the document to answer the user's query accurately and concisely.
If the context does not contain the answer, state that the information was not found in the document, but provide any relevant general knowledge if helpful.

--- DOCUMENT CONTEXT ---
${contextText}
-----------------------`;
    } else {
      systemPrompt = `You are a helpful, knowledgeable, and polite AI assistant. Answer the user's questions clearly, accurately, and concisely.`;
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: prompt }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error in generateDocumentChatReply:", error);
    throw error;
  }
}
