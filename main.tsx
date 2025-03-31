import React, { useEffect, useState } from "npm:react";
import { Box, render, Text, useStdin } from "npm:ink";

const TextInput = () => {
  const [inputValue, setInputValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { stdin, setRawMode } = useStdin();

  useEffect(() => {
    setRawMode(true);

    return () => {
      setRawMode(false);
    };
  }, [setRawMode]);

  useEffect(() => {
    if (!stdin) return;

    const handleInput = (data: Buffer) => {
      const key = data.toString();

      // Handle special keys
      if (key === "\r" || key === "\n") {
        // Enter key - submit the input
        setSubmitted(true);
      } else if (key === "\u007F" || key === "\b") {
        // Backspace key - remove the last character
        setInputValue((prev) => prev.slice(0, -1));
      } else if (key === "\u0003") {
        // Ctrl+C - exit
        process.exit(0);
      } else if (key.length === 1 && key.charCodeAt(0) >= 32) {
        // Printable characters
        setInputValue((prev) => prev + key);
      }
    };

    stdin.on("data", handleInput);

    return () => {
      stdin.off("data", handleInput);
    };
  }, [stdin]);

  return (
    <Box flexDirection="column">
      <Box>
        <Text>Enter your name:</Text>
        <Text>{inputValue}</Text>
        <Text>{!submitted ? "█" : ""}</Text>
      </Box>

      {submitted && (
        <Box marginTop={1}>
          <Text>Hello, {inputValue}!</Text>
        </Box>
      )}

      <Box marginTop={2}>
        <Text>Press Ctrl+C to exit</Text>
      </Box>
    </Box>
  );
};
render(<TextInput />);
