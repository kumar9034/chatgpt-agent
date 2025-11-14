import OpenAI from "openai";
import "dotenv/config";
import { tavily } from "@tavily/core";
import NodeCache from "node-cache";
import { json } from "express";

// ✅ Tavily + OpenAI clients
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// ✅ Cache to store per-thread conversation
const myCache = new NodeCache({ stdTTL: 60 * 60 * 24 }); // 24h TTL

// 🧠 MAIN FUNCTION
export async function generateAi(userinput, threadId) {
  // Create base prompt (system message)
  const basePrompt = [
    {
      role: "system",
      content: `You are **Jarvis**, a friendly and smart AI assistant.
Current datetime: ${new Date().toLocaleString()}

🧩 You can use the "webSearch" tool when you need live data.
Keep your answers clean, Markdown formatted, and concise.`,
    },
  ];

  // 🆔 Ensure messages array exists (for each thread)
  const messages = myCache.get(threadId) ?? [...basePrompt];

  // Add user input to messages
  messages.push({ role: "user", content: userinput });

  const maxRetries = 10;
  for (let i = 0; i < maxRetries; i++) {
    try {
      // 🔹 Step 1: Send to LLM
      const response = await client.responses.create({
        model: "openai/gpt-oss-20b",
        input: messages,
        temperature: 0.3,
        max_output_tokens: 600,
        tools: [
          {
            type: "function",
            name: "webSearch",
            description: "Search the web for real-time information",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string", description: "Search query" },
              },
              required: ["query"],
            },
          },
        ],
        tool_choice: "auto",
      });

      // 🔹 Step 2: Parse LLM output
      const textOutput = response.output?.[1]?.content?.[0]?.text;
      // console.log(response.output);
      const toolCall = response.output.find((item) => item.type === "function_call");
      // console.log(toolCall);

      // If LLM requests a web search
      if (toolCall && toolCall.name === "webSearch") {
        const args = JSON.parse(toolCall.arguments);
        const webData = await webSearch(args.query);

        messages.push({
          role: "assistant",
          content: `🌐 Web info: ${webData}`,
        });

        // Continue the loop to reprocess with new data
        continue;
      }

      // If we got a text reply
      if (textOutput) {
        messages.push({ role: "assistant", content: textOutput });
        myCache.set(threadId, messages);
        // console.log(json.toString(myCache.data)) 
        // console.log(textOutput)// Save context per ID
        return textOutput;
      }

      break;
    } catch (error) {
      if (error.status === 429) {
        console.warn("⚠️ Rate limit hit. Retrying...");
        await new Promise((r) => setTimeout(r, 3000));
      } else {
        console.error("💥 Error:", error.message);
        if (i === maxRetries - 1) throw error;
      }
    }
  }

  return "❌ Failed after multiple attempts.";
}

// 🌍 Web search helper
async function webSearch(query) {
  try {
    const res = await tvly.search(query);
    return res.results.map((r) => r.content).join("\n\n");
  } catch (error) {
    console.error("Web search error:", error);
    return "No live data found.";
  }
}
