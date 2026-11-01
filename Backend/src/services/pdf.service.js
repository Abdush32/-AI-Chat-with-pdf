import { PDFParse } from "pdf-parse";
import { createRequire } from "module";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document as LangChainDocument } from "@langchain/core/documents";

const require = createRequire(import.meta.url);

/**
 * Extract raw text from a PDF buffer.
 * Supports both pdf-parse v2 (PDFParse class + Uint8Array) and pdf-parse v1 (function fallback).
 * @param {Buffer} pdfBuffer - The buffer of the uploaded PDF file.
 * @returns {Promise<string>} Plain text content of the PDF.
 */
export async function extractTextFromPDF(pdfBuffer) {
  try {
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error("Empty PDF buffer provided.");
    }

    const uint8Array = new Uint8Array(
      pdfBuffer.buffer,
      pdfBuffer.byteOffset,
      pdfBuffer.byteLength
    );

    // 1. Try pdf-parse v2 PDFParse class
    if (typeof PDFParse === "function") {
      const parser = new PDFParse(uint8Array);
      const res = await parser.getText();
      if (typeof res === "string") return res;
      if (res && typeof res.text === "string") return res.text;
    }

    // 2. Fallback to legacy pdf-parse function call if available
    const legacyPdfParse = require("pdf-parse");
    const parseFn =
      typeof legacyPdfParse === "function"
        ? legacyPdfParse
        : legacyPdfParse?.default || legacyPdfParse?.PDFParse;

    if (typeof parseFn === "function") {
      try {
        const data = await parseFn(pdfBuffer);
        if (data && typeof data.text === "string") return data.text;
      } catch (innerErr) {
        // If legacy call required new operator or Uint8Array
        const parser = new parseFn(uint8Array);
        const res = await parser.getText();
        if (typeof res === "string") return res;
        if (res && typeof res.text === "string") return res.text;
      }
    }

    throw new Error("Unable to initialize PDF parser function or class.");
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error("Failed to parse PDF file content: " + (error?.message || error));
  }
}

/**
 * Split text or LangChain Documents using LangChain's RecursiveCharacterTextSplitter.
 * @param {string} text - Raw text to split.
 * @param {object} [metadata={}] - Base metadata to attach to created documents.
 * @param {number} [chunkSize=1000] - Maximum chunk size.
 * @param {number} [chunkOverlap=200] - Overlap between chunks.
 * @returns {Promise<Array<LangChainDocument>>} Array of LangChain Document instances.
 */
export async function splitTextIntoDocuments(
  text,
  metadata = {},
  chunkSize = 1000,
  chunkOverlap = 200
) {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ["\n\n", "\n", " ", ""],
  });

  const doc = new LangChainDocument({
    pageContent: text,
    metadata,
  });

  const splitDocs = await splitter.splitDocuments([doc]);

  // Ensure consistent chunkIndex in metadata
  return splitDocs.map((splitDoc, index) => {
    splitDoc.metadata = {
      ...splitDoc.metadata,
      chunkIndex: index,
    };
    return splitDoc;
  });
}

/**
 * Legacy chunking function maintained for backward compatibility.
 * Delegates to splitTextIntoDocuments and returns raw string chunks.
 * @param {string} text - Raw text to split.
 * @param {number} chunkSize - Maximum characters per chunk (default 1000).
 * @param {number} overlap - Character overlap between consecutive chunks (default 200).
 * @returns {Array<string>} Array of text chunks.
 */
export function chunkText(text, chunkSize = 1000, overlap = 200) {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const cleanedText = text.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
  const chunks = [];
  let startIndex = 0;

  while (startIndex < cleanedText.length) {
    let endIndex = startIndex + chunkSize;

    if (endIndex < cleanedText.length) {
      const lastPeriod = cleanedText.lastIndexOf(".", endIndex);
      const lastSpace = cleanedText.lastIndexOf(" ", endIndex);

      if (lastPeriod > startIndex + chunkSize / 2) {
        endIndex = lastPeriod + 1;
      } else if (lastSpace > startIndex + chunkSize / 2) {
        endIndex = lastSpace;
      }
    }

    const chunk = cleanedText.slice(startIndex, endIndex).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    if (endIndex >= cleanedText.length) {
      break;
    }

    startIndex = endIndex - overlap;
  }

  return chunks;
}
