import { GoogleGenAI, Type } from "@google/genai";
import { BaseShape } from "../types";
import { v4 as uuidv4 } from 'uuid';

// Helper to interact with Gemini
export const generateShapesFromPrompt = async (prompt: string): Promise<BaseShape[]> => {
  if (!process.env.API_KEY) {
    console.warn("No API Key found for Gemini");
    return [];
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    You are a 3D modeling assistant. 
    Convert the user's text description into a list of 2D shapes that can be extruded.
    The coordinate system is X-Z plane for the ground, Y is up.
    'extrusionDepth' determines the 3D height.
    'points' are [x, z] coordinates for polygons.
    For rectangles, use width/height. For circles, use radius.
    Colors should be hex strings.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ["rectangle", "circle", "polygon"] },
              name: { type: Type.STRING },
              position: { 
                type: Type.ARRAY, 
                items: { type: Type.NUMBER },
                description: "x, y, z position. Usually y is 0 for ground"
              },
              rotation: {
                type: Type.ARRAY,
                items: { type: Type.NUMBER },
                description: "Euler rotation angles in radians"
              },
              color: { type: Type.STRING },
              extrusionDepth: { type: Type.NUMBER },
              // Rect props
              width: { type: Type.NUMBER },
              height: { type: Type.NUMBER },
              // Circle props
              radius: { type: Type.NUMBER },
              // Poly props
              points: {
                type: Type.ARRAY,
                items: {
                  type: Type.ARRAY,
                  items: { type: Type.NUMBER },
                }
              }
            },
            required: ["type", "name", "position", "color", "extrusionDepth"]
          }
        }
      }
    });

    if (response.text) {
      const rawShapes = JSON.parse(response.text);
      return rawShapes.map((s: any) => ({
        ...s,
        id: uuidv4(),
        visible: true,
        // Ensure defaults
        rotation: s.rotation || [0, 0, 0],
        points: s.points || [],
      }));
    }
  } catch (error) {
    console.error("Gemini generation error:", error);
  }

  return [];
};
