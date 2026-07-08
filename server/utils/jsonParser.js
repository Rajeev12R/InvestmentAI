/**
 * Clean and parse JSON returned from LLMs. Handles trailing commas, comments,
 * and extracts the core JSON object if surrounded by markdown wrapper text.
 */
export function cleanAndParseJSON(text) {
  if (!text) {
    throw new Error("JSON parser received empty text input");
  }

  // 1. Remove markdown backticks if present
  let cleaned = text.replace(/```json|```/g, "").trim();

  // 2. Remove trailing commas before closing braces/brackets
  // e.g. [1, 2, 3, ] -> [1, 2, 3] and { "a": 1, "b": 2, } -> { "a": 1, "b": 2 }
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    // If direct parse fails, try to isolate the first JSON brace match
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        let isolatedJson = jsonMatch[0].replace(/,\s*([\]}])/g, '$1');
        return JSON.parse(isolatedJson);
      } catch (subError) {
        console.error("JSON isolation failed:", subError.message);
      }
    }
    console.error("Failed to parse JSON string. Raw input:\n", text);
    throw error;
  }
}
