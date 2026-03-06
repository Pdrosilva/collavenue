import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

// Using standard Gemini Vision to demonstrate what it can do
export const analyzeImageWithGemini = async (base64Image, mimeType) => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                "Describe this image in 5 words or less.",
                { inlineData: { data: base64Image, mimeType: mimeType } }
            ]
        });
        return response.text();
    } catch (error) {
        console.error("Gemini Error:", error);
        return null;
    }
};
