import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";

// Set up PDF.js worker with locally bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

/**
 * Extract text content from a PDF file
 * @param {File} file - PDF file object
 * @returns {Promise<string>} - Extracted text content
 */
async function extractTextFromPDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => item.str || "")
        .join(" ");
      fullText += pageText + "\n";
    }

    return fullText.trim();
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Extract text content from a DOCX file
 * @param {File} file - DOCX file object
 * @returns {Promise<string>} - Extracted text content
 */
async function extractTextFromDOCX(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  } catch (error) {
    console.error("Error extracting text from DOCX:", error);
    throw new Error(`Failed to extract text from DOCX: ${error.message}`);
  }
}

/**
 * Extract text from a resume file (PDF, DOC, or DOCX)
 * @param {File} file - Resume file
 * @returns {Promise<string>} - Extracted text content
 */
export async function extractResumeText(file) {
  if (!file) {
    throw new Error("No file provided");
  }

  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  // Handle PDF
  if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
    return extractTextFromPDF(file);
  }

  // Handle DOCX
  if (
    fileType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.endsWith(".docx")
  ) {
    return extractTextFromDOCX(file);
  }

  // Handle DOC (treated as DOCX since modern MS Word uses DOCX)
  if (
    fileType === "application/msword" ||
    fileType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.endsWith(".doc")
  ) {
    // Try DOCX format first since most modern docs are DOCX
    try {
      return await extractTextFromDOCX(file);
    } catch {
      // If DOCX fails, the DOC format is not directly supported
      throw new Error("DOC format is not supported. Please use PDF or DOCX.");
    }
  }

  throw new Error(
    `Unsupported file type: ${fileType}. Please use PDF, DOC, or DOCX.`
  );
}
