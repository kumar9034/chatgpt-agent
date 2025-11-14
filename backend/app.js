
import OpenAI from "openai";
import "dotenv/config";
import { tavily } from "@tavily/core";

const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
});
 export async function generateAi(userinput){
    

    const message = [
        {
            role: "system",
            content: `you are jarvis , a smart ai assistant , the following is a webSearch tool you can use to get information from the web output return one line current datetime ${new Date().toDateString()}  `
        },
        // {
        //     role:"user",
        //     content: "What is the latest news about AI advancements?"
        // }
    ]
    
        
        message.push({
            role: "user",
            content : userinput
        })

            const response = await client.responses.create(
                
            {
            temperature:0,
            model: "openai/gpt-oss-20b",
            input: message,
            tools:[
                {
              "type": "function",
              "name": "webSearch",
              "description": "Search the web for relevant information",
              "parameters": {
                  "type": "object",
                  "properties": {
                    "query": {
                      "type": "string",
                      "description": "The search query"
                    }
                  },
                  "required": ["query"]
                }
            }
            ],
            tool_choice: "auto",
        }
        );
          message.push(response.output[1])
        
        const toolcall = response.output[1];
        // If there's no tool call, print the assistant text and exit early.
        if (!toolcall) {
            return response.output[1].content
        }
        
        // Normalize to an array so we can iterate whether the assistant returned a single tool call or multiple.
        const toolCalls = Array.isArray(toolcall) ? toolcall : [toolcall];
        
        for (const tool of toolCalls) {
            const toolName = tool.name;
            let toolarguments = tool.arguments;
        
            // tool.arguments may already be an object or a JSON string; handle both.
            if (typeof toolarguments === "string") {
                try {
                    toolarguments = JSON.parse(toolarguments);
                } catch (e) {
                    console.warn("Could not parse tool.arguments as JSON, passing raw string:", toolarguments);
                }
            }
        
            if (toolName === "webSearch") {
                const toolResult = await webSearch(toolarguments || {});
                
        
                message.push({
                    role: "assistant",
                    content: `Based on the web search: ${toolResult}`
                });
            }
        }
        
    //     console.log( response.output[1].content.text, null , 2)
    const response2 = await client.responses.create(
        
        {
            model: "openai/gpt-oss-20b",
    input: message,
    tools:[
        {
      "type": "function",
      "name": "webSearch",
      "description": "Search the web for relevant information",
      "parameters": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "description": "The search query"
            }
          },
          "required": ["query"]
        }
    }
    ],
    tool_choice: "auto",
}
);
console.log('Assistant:', JSON.stringify(response2.output[1].content[0].text, null, 2));
}

generateAi("What is the latest news about AI advancements?")
async function webSearch({query}){
  console.log('tools calling...')

  const response = await tvly.search(query);

  const FinalResult = response.results.map((item) =>item.content).join("\n\n")
    return FinalResult
}