import React, { useEffect, useState } from "npm:react";
import { Box, render, Text, useStdin } from "npm:ink";

const Counter = () => {
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCounter((previousCounter: number) => previousCounter + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <>
    </>
  );
};

const Hello = () => <Text>yoyoyo</Text>;

render(<Counter />);
