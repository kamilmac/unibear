import { StateCreator } from "npm:zustand";

export interface UiState {
  textArea: string;
  dimensions: { cols: number; rows: number };
  operationMode: "insert" | "normal";
  setText: (t: string) => void;
  setOp: (m: "insert" | "normal") => void;
  init: () => void;
}

export const createUiSlice: StateCreator<
  UiState,
  [],
  [],
  UiState
> = (set, get) => ({
  textArea: "",
  dimensions: { cols: 0, rows: 0 },
  operationMode: "insert",

  setText(text) {
    set({ textArea: text });
  },
  setOp(operationMode) {
    set({ operationMode });
  },

  init() {
    Deno.stdout.writeSync(
      new TextEncoder().encode("\x1b[?1049h"),
    );
    const resize = () => {
      const { columns: cols, rows } = Deno.consoleSize();
      set({ dimensions: { cols, rows } });
    };
    Deno.addSignalListener("SIGWINCH", resize);
    resize();
  },
});

// // src/store/index.ts
// import create from "npm:zustand";
// import { combine, devtools } from "npm:zustand/middleware";
// import { createChatSlice } from "./chatSlice";
// import { createFileSlice } from "./fileSlice";
// import { createCommandSlice } from "./commandSlice";
// import { createUiSlice } from "./uiSlice";

// export const useStore = create(
//   devtools(
//     combine(
//       {},
//       (...a) => ({
//         ...createChatSlice(...a),
//         ...createFileSlice(...a),
//         ...createCommandSlice(...a),
//         ...createUiSlice(...a),
//       }),
//     ),
//   ),
// );
