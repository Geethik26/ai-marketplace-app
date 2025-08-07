const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const fetch = require("node-fetch");
require('dotenv').config();

exports.generateListing = onRequest(async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).send({ error: "Missing imageBase64 in request" });
    }

    logger.info("Received base64 image (first 100 chars):", imageBase64.slice(0, 100) + "...");

    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).send({ error: "Gemini API key not configured" });
    }

    const promptText = `
You are a product listing assistant. Analyze this product image and return only a valid JSON object like:
{
  "title": "Product Name",
  "description": "Detailed product description",
  "price": 29.99,
  "category": "Electronics",
  "condition": "New"
}

IMPORTANT RULES:
- Price must ALWAYS be a valid number (never null or string)
- Estimate a reasonable market price in USD
- Category should be one of: Electronics, Video Games & Consoles, Home Appliances, Fashion, Health & Beauty, Sports
- Condition must be either "New" or "Used"
- DO NOT include any markdown, bullet points, or text outside the JSON block
- Return ONLY the JSON object
`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: promptText },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    const result = await geminiRes.json();
    console.log("Gemini response body:", result);

    const aiText = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!aiText) {
      logger.error("Empty AI response");
      return res.status(200).send({ error: "AI did not return valid JSON", raw: result });
    }

    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0].trim() : null;

    if (!jsonString) {
      logger.error("No JSON found in AI response:", aiText);
      return res.status(200).send({ error: "No JSON found", raw: aiText });
    }

    try {
      const parsed = JSON.parse(jsonString);
      
      // ✅ VALIDATE AND FIX THE RESPONSE
      const validatedResponse = {
        title: parsed.title || "Unknown Item",
        description: parsed.description || "Product description not available",
        price: typeof parsed.price === 'number' && parsed.price > 0 ? parsed.price : 25.00, // Default fallback price
        category: parsed.category || "Fashion", // Default category
        condition: (parsed.condition === "New" || parsed.condition === "Used") ? parsed.condition : "Used"
      };
      
      logger.info("Validated response:", validatedResponse);
      return res.status(200).send(validatedResponse);
      
    } catch (err) {
      logger.error("JSON parse error:", err);
      return res.status(200).send({ error: "Invalid JSON format", raw: jsonString });
    }
  } catch (error) {
    logger.error("Gemini API Error:", error);
    return res.status(500).send({ error: "Gemini request failed" });
  }
});