import React, { useEffect, useState } from "npm:react";
import { Box, render, Text, useStdin } from "npm:ink";

type Message = {
  id: number;
  text: string;
  sender: "user" | "system";
};

const ChatApp = () => {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, text: "Welcome to the chat! Type a message and press Shift+Enter to send.", sender: "system" }
  ]);
  const [nextId, setNextId] = useState(1);
  const { stdin, setRawMode } = useStdin();
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  useEffect(() => {
    setRawMode(true);
    
    return () => {
      setRawMode(false);
    };
  }, [setRawMode]);

  const sendMessage = () => {
    if (inputValue.trim() === "") return;
    
    setMessages(prev => [
      ...prev, 
      { id: nextId, text: inputValue, sender: "user" }
    ]);
    setNextId(prev => prev + 1);
    setInputValue("");
  };

  useEffect(() => {
    if (!stdin) return;

    const handleInput = (data: Buffer) => {
      const key = data.toString();
      
      // Check for Shift key
      if (key === "\u001B[1;2A" || key === "\u001B[1;2B" || 
          key === "\u001B[1;2C" || key === "\u001B[1;2D") {
        setIsShiftPressed(true);
        return;
      }
      
      // Handle special keys
      if ((key === "\r" || key === "\n") && isShiftPressed) {
        // Shift+Enter - send message
        sendMessage();
        setIsShiftPressed(false);
      } else if (key === "\r" || key === "\n") {
        // Regular Enter - add newline
        setInputValue(prev => prev + "\n");
      } else if (key === "\u007F" || key === "\b") {
        // Backspace - remove the last character
        setInputValue(prev => prev.slice(0, -1));
      } else if (key === "\u0003") {
        // Ctrl+C - exit
        process.exit(0);
      } else if (key.length === 1 && key.charCodeAt(0) >= 32) {
        // Printable characters
        setInputValue(prev => prev + key);
        setIsShiftPressed(false);
      } else {
        // Reset shift state for other keys
        setIsShiftPressed(false);
      }
    };

    stdin.on("data", handleInput);

    return () => {
      stdin.off("data", handleInput);
    };
  }, [stdin, isShiftPressed, inputValue]);

  return (
    <Box flexDirection="column" width={80}>
      <Box flexDirection="column" height={15} borderStyle="round" paddingX={1}>
        {messages.map(message => (
          <Box key={message.id} flexDirection="column" marginY={1}>
            <Text color={message.sender === "user" ? "green" : "blue"}>
              {message.sender === "user" ? "You:" : "System:"}
            </Text>
            <Text>{message.text}</Text>
          </Box>
        ))}
      </Box>

      <Box flexDirection="column" marginTop={1} borderStyle="round" paddingX={1}>
        <Text bold>Type your message (Shift+Enter to send):</Text>
        <Box flexDirection="column">
          <Text>{inputValue}</Text>
          <Text>█</Text>
        </Box>
      </Box>
      
      <Box marginTop={1}>
        <Text>Press Ctrl+C to exit</Text>
      </Box>
    </Box>
  );
};

render(<ChatApp />);
