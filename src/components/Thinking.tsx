// WaveLoader.tsx
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
};

export const Thinking: React.FC = () => {
  const frames = React.useMemo(
    () => framesSets.times,
    [],
  );
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(
      () => setI((j: number) => (j + 1) % frames.length),
      100,
    );
    return () => clearInterval(id);
  }, [frames.length]);
  return (
    <Box>
      <Text color="cyan">{frames[i]}</Text>
    </Box>
  );
};
