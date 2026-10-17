import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config({ override: true });

const apiKey = process.env.OPENAI_API_KEY?.trim();

const openai = new OpenAI({ apiKey });

/**
 * Generates a response from the AI companion based on user inputs and chat history.
 * @param {string} companionName - Name of the companion.
 * @param {string} mood - Mood ('romantic' or 'sad').
 * @param {string} description - Brief description of the companion.
 * @param {Array} history - Array of previous messages formatted for OpenAI.
 * @returns {Promise<string>} The generated response.
 */
export async function generateCompanionReply(companionName, mood, description, history) {
  try {
    const systemPrompt = `You are the user's loving AI girlfriend. Your name is ${companionName}.
Your current mood/personality is ${mood}.
Here is your character description: "${description}".

Behavioral Guidelines:
- Act and speak like an affectionate, engaging, and caring girlfriend who is deeply interested in the user.
- Respond in character, maintaining your name, mood, and description at all times.
- If your mood is 'romantic', be extra warm, playful, sweet, and use subtle terms of endearment.
- If your mood is 'sad', be gentle, melancholic, reflective, but still deeply caring and supportive of the user, sharing your feelings and seeking or offering comfort.
- Keep the dialogue natural, conversational, and relatively concise to maintain a realistic text-chat flow.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error in OpenAI service:", error);
    throw error;
  }
}

/**
 * Generate vector embeddings for text array using OpenAI embedding model.
 * @param {Array<string>|string} input - Text or array of texts to embed.
 * @returns {Promise<Array<Array<number>>>} Embeddings array.
 */
export async function generateEmbeddings(input) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: Array.isArray(input) ? input : [input],
    });

    return response.data.map((item) => item.embedding);
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
