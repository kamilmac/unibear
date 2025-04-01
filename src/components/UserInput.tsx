import React from "npm:react";
import { Text, useInput } from "npm:ink";
import { useStore } from "../store/index.ts";

export const UserInput = () => {
  const PREFIX = " > ";
  const CURSOR = "▌";
  const [input, setInput] = React.useState("");
  const submit = useStore((store) => store.onSubmitUserPrompt);

  useInput((_input, key) => {
    if (key.delete) {
      setInput(input.slice(0, -1));
      return;
    }
    if (key.return) {
      submit(input);
      setInput("");
      return;
    }
    setInput(input + _input);
  });

  return (
    <Text>
      {PREFIX}
      {input}
      {CURSOR}
    </Text>
  );
};
