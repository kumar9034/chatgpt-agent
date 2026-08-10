import OpenAI from "openai";
import "dotenv/config";
import { tavily } from "@tavily/core";
import NodeCache from "node-cache";

// ✅ GLOBAL CACHE (Fix for ReferenceError)
export const myCache = new NodeCache({ stdTTL: 60 * 60 * 24 });

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY, 
  baseURL: "https://api.groq.com/openai/v1",
});

const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

// -------------------------------------------------------
// 🧠 MAIN AI FUNCTION
// -------------------------------------------------------
export async function generateAi(userinput, threadId) {
  const basePrompt = [
    {
      role: "system",
      content: `You are Rahul Founder's Personal AI Assistant.
Help Rahul with coding, AI, projects, learning, and general tasks.
Use conversation history to understand context and maintain continuity.
Always respond according to the user's language and communication style.
If the user speaks Hinglish, reply naturally in Hinglish.
Keep simple questions short and explain complex topics step-by-step.
Never invent information or pretend to remember unavailable context.
Be friendly, practical, accurate, and conversational.`,
    },
  ];

  // 🧠 LOAD OLD CONVERSATION OR START NEW
  let messages = myCache.get(threadId) ?? [...basePrompt];
  messages.push({ role: "user", content: userinput });

  // 🔥 CALL GROQ
  const response = await client.responses.create({
    model: "openai/gpt-oss-20b",
    input: messages,
    max_output_tokens: 500,
    temperature: 0.4,
    tools: [
      {
        type: "function",
        name: "webSearch",
        description: "Do real-time web search using Tavily",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string" },
          },
          required: ["query"],
        },
      },
    ],
    tool_choice: "auto",
  });

  // Get RAW Blocks
  const blocks = response.output;

  // Check for Tool Call
  const toolCall = blocks.find((b) => b.type === "function_call");

  if (toolCall) {
    const args = JSON.parse(toolCall.arguments);
    const data = await webSearch(args.query);

    messages.push({
      role: "assistant",
      content: `🌐 Web Search Result:\n${data}`,
    });

    myCache.set(threadId, messages);

    // Run again using recursion
    return await generateAi("Continue with this data.", threadId);
  }

  // Normal Text Response
  const finalText = response.output_text;
  messages.push({ role: "assistant", content: finalText });
  myCache.set(threadId, messages);

  return finalText;
}

// -------------------------------------------------------
// 🌍 TAVILY SEARCH WRAPPER
// -------------------------------------------------------
async function webSearch(query) {
  try {
    const res = await tvly.search(query);
    return res.results.map((r) => r.content).join("\n\n");
  } catch {
    return "No live data found.";
  }
}
