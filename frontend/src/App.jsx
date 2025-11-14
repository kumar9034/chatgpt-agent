import React, { useEffect, useRef, useState } from "react";
import { IoSend } from "react-icons/io5";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const App = () => {
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [id, setId] = useState("");
  const chatEndRef = useRef(null);
  const [showWelcome, setShowWelcome] = useState(true);


  // Scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Typing animation for AI messages
  useEffect(() => {
    if (messages.length === 0) return;

    const lastIndex = messages.length - 1;
    const lastMsg = messages[lastIndex];

    if (
      lastMsg.sender === "ai" &&
      lastMsg.fullText &&
      lastMsg.text.length < lastMsg.fullText.length
    ) {
      const timer = setTimeout(() => {
        setMessages((prev) => {
          const copy = [...prev];
          copy[lastIndex].text = lastMsg.fullText.slice(
            0,
            lastMsg.text.length + 2
          );
          return copy;
        });
      }, 40);

      return () => clearTimeout(timer);
    }
  }, [messages]);

  // Unique thread id
  useEffect(() => {
    const threadId =
      Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
    setId(threadId);
  }, []);

  // Send Message
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    setShowWelcome(false)
    const userMsg = inputText;
    setInputText("");

    setMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setIsThinking(true);


    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACK_URL}/chat`,
        { inputText: userMsg, id },
        { headers: { "Content-Type": "application/json" } }
      );

      const aiText = res.data.response || "No response from server.";

      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "", fullText: aiText },
      ]);
    } catch (error) {
      console.error("Error:", error);

      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "⚠️ Could not connect to AI server." },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSendMessage();
  };

  return (
    <div className="bg-neutral-900 w-full h-screen text-white sm:p-5 p-3 overflow-x-hidden">

      {/* Logo */}
      <div className="sm:w-27 sm:h-18 w-18 h-12 fixed">
        <img className="w-full h-full" src="chatgpt.png" alt="" />
      </div>

      <div className="container mx-auto max-w-3xl sm:h-[95%] h-[98%] sm:p-4 p-2">

        {/* Title */}
        <h1 className="sm:text-2xl text-lg font-bold text-center mb-3">
          Welcome to ChatGPT
        </h1>


        {/* Chat Box */}
        <div className="overflow-y-auto h-[calc(100%-100px)] mb-4 scrollbar-hide">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center ">
              <h1 className="text-neutral-500 sm:text-3xl text-xl font-bold">
                Welcome to ChatGPT
              </h1>
            </div>
          ) :
            (messages.map((msg, index) => (
              <div
                key={index}
                className={`sm:text-sm text-[13px] p-3 rounded-xl mb-3 max-w-fit ${msg.sender === "user"
                  ? "bg-neutral-700 ml-auto"
                  : "bg-neutral-900 mr-auto"
                  }`}
              >
                {msg.sender === "ai" ? (
                  <div
                    style={{
                      overflowX: "auto",
                    }}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ node, ...props }) => (
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                              marginTop: "10px",
                              marginBottom: "10px",
                              background: "#111",
                              border: "1px solid #444",
                              borderRadius: "8px",
                              overflow: "hidden",
                            }}
                            {...props}
                          />
                        ),
                        th: ({ node, ...props }) => (
                          <th
                            style={{
                              border: "1px solid #333",
                              padding: "10px",
                              background: "#1a1a1a",
                              fontWeight: "600",
                              textAlign: "left",
                            }}
                            {...props}
                          />
                        ),
                        td: ({ node, ...props }) => (
                          <td
                            style={{
                              border: "1px solid #333",
                              padding: "10px",
                              textAlign: "left",
                            }}
                            {...props}
                          />
                        ),
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <h1>{msg.text}</h1>
                )}
              </div>
            )))}

          {isThinking && (
            <div className="text-sm mr-auto p-3 rounded-xl max-w-fit">
              <h1 className="animate-pulse">Thinking...</h1>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Section */}
        <div className="fixed max-w-3xl mx-auto inset-x-0 pb-6 bottom-0 bg-neutral-900">
          <div className="bg-neutral-800 rounded-lg flex sm:py-4 py-2 px-3 gap-3 w-full">
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              type="text"
              className="w-full p-3 rounded-lg bg-neutral-800 text-white outline-none"
              placeholder="Ask anything..."
            />

            <button

              onClick={handleSendMessage}
              className="sm:px-4 px-3 py-1 bg-white rounded-2xl hover:bg-neutral-300 cursor-pointer"
            >
              <IoSend size={20} color="black" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;
