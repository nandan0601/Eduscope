"use client";
import React, { FC, useState, useEffect } from "react";
import { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { styles } from "@/app/styles/style";
import { ThemeSwitcher } from "@/app/utils/ThemeSwitcher";
import Link from "next/link";
import { useParams } from "next/navigation";
import Loader from "../Loader/Loader";

type Props = {
  videoName: string;
};

interface Message {
  text: string;
  role: "user" | "bot";
  timestamp: Date;
}

interface ChatSession {
  sendMessage: (message: string) => Promise<any>;
}

interface TranscriptData {
  segments: string[];
  courseName: string;
}

const AiChat: FC<Props> = ({ videoName }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [chat, setChat] = useState<ChatSession | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [courseName, setCourseName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileProcessed, setFileProcessed] = useState(false);

  const MODEL_NAME = "gemini-1.5-flash";
  const API_KEY = "AIzaSyC5TEcwOyvfHK68SIhfs5y1OpoypcUmWKU";
  const genAI = new GoogleGenerativeAI(API_KEY);
  const courseId = useParams();

  const generationConfig = {
    temperature: 0.9,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
  };

  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ];

  useEffect(() => {
    const initChat = async () => {
      try {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        const newChat = await model.startChat({
          generationConfig,
          safetySettings,
          history: messages.map((msg) => ({
            parts: [{ text: msg.text }],
            role: msg.role === "bot" ? "model" : "user",
          })),
        });
        setChat(newChat);
      } catch (err) {
        console.error("Chat initialization error:", err);
      }
    };

    initChat();
  }, [messages]);

  const handleFileUpload = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://127.0.0.1:8003/transcribe/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data: TranscriptData = await response.json();
      
      if (!data.segments || !data.segments.length) {
        throw new Error("No transcript data received");
      }

      setTranscript(data.segments.join(" "));
      setCourseName(data.courseName || videoName);
      setFileProcessed(true);

      // Send initial summary message
      if (chat) {
        const summaryPrompt = `Please provide a 3-4 line summary of the following transcript in context to ${videoName}: ${data.segments.join(" ")}`;
        const result = await chat.sendMessage(summaryPrompt);
        
        const botMessage: Message = {
          text: result.response.text(),
          role: "bot",
          timestamp: new Date(),
        };
        
        setMessages((prev) => [...prev, botMessage]);
      }
    } catch (err) {
      console.error("File upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to process the file");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    const trimmedInput = userInput.trim();
    if (!trimmedInput) return;

    try {
      const userMessage: Message = {
        text: trimmedInput,
        role: "user",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setUserInput("");

      if (chat) {
        const contextPrompt = `Question: ${trimmedInput}
          ${transcript ? `\nContext from transcript: ${transcript}` : ""}
          \nPlease provide an answer in context to ${videoName}${courseName ? ` or ${courseName}` : ""}.
          If the question is not related to the content, respond with "Please ask questions only related to ${videoName}."`;

        const result = await chat.sendMessage(contextPrompt);
        
        const botMessage: Message = {
          text: result.response.text(),
          role: "bot",
          timestamp: new Date(),
        };
        
        setMessages((prev) => [...prev, botMessage]);
      }
    } catch (err) {
      console.error("Message sending error:", err);
      setError("Failed to send message. Please try again.");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {loading ? (
        <Loader />
      ) : (
        <div className="flex flex-col h-screen p-4">
          <div className="flex justify-between items-center mb-4">
            <Link href="/" className={`${styles.title} !text-2xl`}>
              EduScope AI BOT 🤖
            </Link>
            <ThemeSwitcher />
          </div>

          <div className="mb-4">
            <input
              type="file"
              accept=".mp4,.mov"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setError(null);
              }}
              className="p-2 border rounded w-full"
            />
            {file && (
              <p className="text-sm text-gray-600 mt-1">
                Selected: {file.name}
              </p>
            )}
            <button
              className={`mt-2 p-2 rounded-full text-white transition-colors ${
                fileProcessed
                  ? "bg-green-500 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-400"
              }`}
              onClick={handleFileUpload}
              disabled={fileProcessed || !file}
            >
              {fileProcessed ? "✓ File Processed" : "Upload and Process File"}
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex-1 overflow-y-auto rounded-lg border p-4 mb-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`mb-4 ${
                  msg.role === "user" ? "text-right" : "text-left"
                }`}
              >
                <span
                  className={`inline-block max-w-[80%] px-4 py-2 rounded-lg ${
                    msg.role === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 dark:bg-gray-800"
                  }`}
                >
                  {msg.text}
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  {msg.role === "bot" ? "Bot" : "You"} -{" "}
                  {msg.timestamp.toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Type your message..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyPress}
              className={`${styles.input} !rounded-l-lg !flex-1 !p-2 !min-h-[50px] focus:outline-none focus:border-blue-500`}
              disabled={!fileProcessed}
            />
            <button
              onClick={handleSendMessage}
              disabled={!fileProcessed || !userInput.trim()}
              className={`p-3 rounded-r-lg text-white transition-colors ${
                fileProcessed && userInput.trim()
                  ? "bg-blue-500 hover:bg-blue-400"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AiChat;