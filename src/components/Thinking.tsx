import React from "react";
import { Box, Text } from "ink";

export const framesSets: Record<string, string[]> = {
  line: ["-", "\\", "|", "/"],
  dots: ["·", "··", "···", "····", "···", "··", "·"],
  circle: ["◐", "◓", "◑", "◒"],
  moon: ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"],
  arrow: ["←", "↖", "↑", "↗", "→", "↘", "↓", "↙"],
  bouncingBar: ["▁", "▃", "▅", "▇", "▅", "▃"],
  bouncingBall: ["⠁", "⠂", "⠄", "⡀", "⢀", "⠠", "⠐", "⠈"],
  triangle: ["◢", "◣", "◤", "◥"],
  dots2: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
  toggle: ["✔", "✖"],
  square: ["▖", "▘", "▝", "▗"],
  dance: ["💃", "🕺"],
  squareCorners: ["◰", "◳", "◲", "◱"],
  pipe: ["┤", "┘", "┴", "└", "├", "┌", "┬", "┐"],
  times: ["✶", "✸", "✹", "✺", "✹", "✷"],
  waves: ["🌊", "💧", "🌊", "💧"],
  eyes: ["◡◡", "⊙⊙", "◠◠"],
  // Bear-themed animations! 🐻
  bear: ["🐻", "🐻‍❄️", "🧸", "🐻"],
  bearFaces: ["🐻", "🐻‍😊", "🐻‍🤔", "🐻‍😴"],
  bearThinking: [
    "🐻💭",
    "🐻 💭",
    "🐻  💭",
    "🐻  💭",
    "🐻   💭",
    "🐻    💭",
    "🐻   💭",
    "🐻  💭",
    "🐻 💭",
  ],
  bearHoney: ["🐻", "🐻🍯", "🐻", "🐻🍯"],
  bearSleep: ["🐻😴", "🐻💤", "🧸💤", "🐻😴"],
  bearDance: ["🐻💃", "🧸🕺", "🐻‍❄️💃", "🐻🕺"],
  cubs: ["🐻", "🧸", "🐻‍❄️", "🧸"],
};

export const Thinking: React.FC = () => {
  const bearAnimations = ["bearThinking", "moon"];

  const frames = React.useMemo(
    () => {
      const randomAnimation =
        bearAnimations[Math.floor(Math.random() * bearAnimations.length)];
      return framesSets[randomAnimation];
    },
    [],
  );
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(
      () => setI((j: number) => (j + 1) % frames.length),
      64,
    );
    return () => clearInterval(id);
  }, [frames.length]);
  return (
    <Box>
      <Text color="cyan">{frames[i]}</Text>
    </Box>
  );
};
