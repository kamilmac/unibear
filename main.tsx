import React, { useEffect, useState } from "npm:react";
import { Box, render, Text, useStdin } from "npm:ink";

const Counter = () => {
  const [counter, setCounter] = useState(0);
  const { stdin, setRawMode } = useStdin();

  useEffect(() => {
    const timer = setInterval(() => {
      setCounter((previousCounter: number) => previousCounter + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

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
      
      if (key === 'q') {
        process.exit(0);
      } else if (key === 'r') {
        setCounter(0);
      } else if (key === '+') {
        setCounter(prev => prev + 10);
      } else if (key === '-') {
        setCounter(prev => Math.max(0, prev - 10));
      }
    };

    stdin.on('data', handleInput);

    return () => {
      stdin.off('data', handleInput);
    };
  }, [stdin]);

  return (
    <Box flexDirection="column">
      <Text>Counter: {counter}</Text>
      <Box marginTop={1}>
        <Text>Controls:</Text>
      </Box>
      <Text>  q: Quit</Text>
      <Text>  r: Reset counter</Text>
      <Text>  +: Add 10</Text>
      <Text>  -: Subtract 10</Text>
    </Box>
  );
};

const Hello = () => <Text>yoyoyo</Text>;

render(<Counter />);
