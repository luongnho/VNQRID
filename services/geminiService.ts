import { GoogleGenAI, Type } from "@google/genai";
import { ParsedResponse } from "../types";

// Helper to format date from ddmmyyyy to dd/mm/yyyy
const formatDateString = (dateStr: string): string => {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  return `${dateStr.slice(0, 2)}/${dateStr.slice(2, 4)}/${dateStr.slice(4)}`;
};

// Local parser specifically for Vietnam CCCD QR format
// Format: ID|OldID|Name|DOB|Gender|Address|DateOfIssue
const attemptLocalCCCDParsing = (rawText: string): ParsedResponse | null => {
  if (!rawText.includes('|')) return null;

  const parts = rawText.split('|');
  
  // Standard CCCD usually has 6 or 7 parts
  // We check if it looks like a CCCD (1st part is 12 digits, 3rd part is likely a name)
  const isLikelyCCCD = /^\d{12}$/.test(parts[0]);

  if (parts.length >= 6 && isLikelyCCCD) {
    return {
      fields: [
        { key: "Số CCCD", value: parts[0] },
        { key: "Số CMND (Cũ)", value: parts[1] || "Không có" },
        { key: "Họ và tên", value: parts[2] },
        { key: "Ngày sinh", value: formatDateString(parts[3]) },
        { key: "Giới tính", value: parts[4] },
        { key: "Địa chỉ thường trú", value: parts[5] },
        { key: "Ngày cấp", value: formatDateString(parts[6] || "") },
      ]
    };
  }

  return null;
};

const parseWithGemini = async (rawText: string): Promise<ParsedResponse> => {
  // 1. Try local parsing first (Instant speed)
  const localResult = attemptLocalCCCDParsing(rawText);
  if (localResult) {
    console.log("Local parsing successful (Instant)");
    return localResult;
  }

  // 2. If local parsing fails (unstructured data), fallback to Gemini AI
  if (!process.env.API_KEY) {
    console.warn("API_KEY is missing, using raw fallback.");
    return fallbackParser(rawText);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
      Analyze the following text extracted from a QR Code. 
      It is likely from a Vietnamese Citizen Identity Card (CCCD) which usually follows a pipe-separated format (ID|OldID|Name|DOB|Gender|Address|Date).
      
      However, it might be unstructured text.
      
      Task: Extract meaningful information and return it as a list of key-value pairs. 
      Use Vietnamese for keys (e.g., "Họ và tên", "Số CCCD", "Ngày sinh").
      Format dates nicely if possible.
      
      Raw Text: "${rawText}"
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fields: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  key: { type: Type.STRING, description: "The label of the field in Vietnamese" },
                  value: { type: Type.STRING, description: "The extracted value" },
                },
                required: ["key", "value"],
              },
            },
          },
          required: ["fields"],
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");

    return JSON.parse(jsonText) as ParsedResponse;

  } catch (error) {
    console.error("Gemini parsing failed:", error);
    return fallbackParser(rawText);
  }
};

// A fallback parser if AI fails or no key is provided
const fallbackParser = (text: string): ParsedResponse => {
  return {
    fields: [
      { key: "Nội dung gốc", value: text }
    ]
  };
};

export { parseWithGemini };