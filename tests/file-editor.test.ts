import { assertEquals, assertRejects, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { applyFileEdits, EditOperation } from "../src/services/file-editor.ts";
import { join } from "https://deno.land/std@0.208.0/path/mod.ts";

// Test utilities
async function createTempFile(content: string): Promise<string> {
  const tempDir = await Deno.makeTempDir();
  const filePath = join(tempDir, "test-file.ts");
  await Deno.writeTextFile(filePath, content);
  return filePath;
}

async function readTempFile(filePath: string): Promise<string> {
  return await Deno.readTextFile(filePath);
}

async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await Deno.remove(filePath);
    await Deno.remove(filePath.substring(0, filePath.lastIndexOf("/"))); 
  } catch {
    // Ignore cleanup errors
  }
}

Deno.test("applyFileEdits - Basic exact match replacement", async () => {
  const originalContent = `function hello() {
  console.log("Hello, World!");
  return true;
}`;

  const filePath = await createTempFile(originalContent);
  
  try {
    const edits: EditOperation[] = [{
      old_text: 'console.log("Hello, World!");',
      new_text: 'console.log("Hello, Universe!");'
    }];

    const diff = await applyFileEdits(filePath, edits);
    const modifiedContent = await readTempFile(filePath);

    assertStringIncludes(modifiedContent, "Hello, Universe!");
    assertStringIncludes(diff, "Hello, Universe!");
  } finally {
    await cleanupTempFile(filePath);
  }
});

Deno.test("applyFileEdits - Multiple edits in correct order", async () => {
  const originalContent = `export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
  
  subtract(a: number, b: number): number {
    return a - b;
  }
}`;

  const filePath = await createTempFile(originalContent);
  
  try {
    const edits: EditOperation[] = [
      {
        old_text: "add(a: number, b: number): number",
        new_text: "add(a: number, b: number, c: number = 0): number"
      },
      {
        old_text: "return a + b;",
        new_text: "return a + b + c;"
      },
      {
        old_text: "export class Calculator",
        new_text: "export class AdvancedCalculator"
      }
    ];

    const diff = await applyFileEdits(filePath, edits);
    const modifiedContent = await readTempFile(filePath);

    assertStringIncludes(modifiedContent, "AdvancedCalculator");
    assertStringIncludes(modifiedContent, "c: number = 0");
    assertStringIncludes(modifiedContent, "return a + b + c;");
  } finally {
    await cleanupTempFile(filePath);
  }
});

Deno.test("applyFileEdits - Unicode and emoji handling", async () => {
  const originalContent = `const message = "Héllo Wörld! 🌍";
const emoji = "👋 Wave";
const text = "Simple text";`;

  const filePath = await createTempFile(originalContent);
  
  try {
    const edits: EditOperation[] = [
      {
        old_text: "Héllo Wörld! 🌍",
        new_text: "Bonjour Monde! 🌎"
      },
      {
        old_text: "👋 Wave",
        new_text: "🤝 Handshake"
      }
    ];

    const diff = await applyFileEdits(filePath, edits);
    const modifiedContent = await readTempFile(filePath);

    assertStringIncludes(modifiedContent, "Bonjour Monde! 🌎");
    assertStringIncludes(modifiedContent, "🤝 Handshake");
    assertEquals(modifiedContent.includes("Héllo"), false);
    assertEquals(modifiedContent.includes("👋 Wave"), false);
  } finally {
    await cleanupTempFile(filePath);
  }
});

Deno.test("applyFileEdits - Large multiline replacement", async () => {
  const originalContent = `class DataProcessor {
  constructor() {
    this.data = [];
  }
  
  processItems(items) {
    for (let item of items) {
      if (item.valid) {
        this.data.push(item);
      }
    }
    return this.data;
  }
}`;

  const filePath = await createTempFile(originalContent);
  
  try {
    const edits: EditOperation[] = [{
      old_text: `  processItems(items) {
    for (let item of items) {
      if (item.valid) {
        this.data.push(item);
      }
    }
    return this.data;
  }`,
      new_text: `  async processItems(items: Item[]): Promise<Item[]> {
    const validItems = items.filter(item => item.valid && item.id);
    this.data.push(...validItems);
    await this.saveData();
    return this.data;
  }
  
  private async saveData(): Promise<void> {
    // Save implementation
  }`
    }];

    const diff = await applyFileEdits(filePath, edits);
    const modifiedContent = await readTempFile(filePath);

    assertStringIncludes(modifiedContent, "async processItems(items: Item[])");
    assertStringIncludes(modifiedContent, "filter(item => item.valid && item.id)");
    assertStringIncludes(modifiedContent, "private async saveData()");
    assertEquals(modifiedContent.includes("for (let item of items)"), false);
  } finally {
    await cleanupTempFile(filePath);
  }
});

Deno.test("applyFileEdits - Whitespace normalization", async () => {
  const originalContent = `function   processData() {
\t// Process the data
\tconsole.log( "Processing..."  );
\treturn   null;
}`;

  const filePath = await createTempFile(originalContent);
  
  try {
    const edits: EditOperation[] = [{
      old_text: 'console.log( "Processing..."  );',
      new_text: 'console.log("Processing data...");'
    }];

    const diff = await applyFileEdits(filePath, edits);
    const modifiedContent = await readTempFile(filePath);

    assertStringIncludes(modifiedContent, 'console.log("Processing data...");');
  } finally {
    await cleanupTempFile(filePath);
  }
});

Deno.test("applyFileEdits - Empty replacement (deletion)", async () => {
  const originalContent = `function calculateTotal() {
  // TODO: Remove this debug log
  console.log("Debug: calculating total");
  
  const total = items.reduce((sum, item) => sum + item.price, 0);
  return total;
}`;

  const filePath = await createTempFile(originalContent);
  
  try {
    const edits: EditOperation[] = [{
      old_text: `  // TODO: Remove this debug log
  console.log("Debug: calculating total");
  `,
      new_text: ""
    }];

    const diff = await applyFileEdits(filePath, edits);
    const modifiedContent = await readTempFile(filePath);

    assertEquals(modifiedContent.includes("TODO: Remove this debug log"), false);
    assertEquals(modifiedContent.includes('console.log("Debug:'), false);
    assertStringIncludes(modifiedContent, "const total = items.reduce");
  } finally {
    await cleanupTempFile(filePath);
  }
});

Deno.test("applyFileEdits - TypeScript interface modification", async () => {
  const originalContent = `interface User {
  id: number;
  name: string;
  email: string;
}

export function createUser(userData: Partial<User>): User {
  return {
    id: Math.random(),
    name: userData.name || "Anonymous",
    email: userData.email || ""
  };
}`;

  const filePath = await createTempFile(originalContent);
  
  try {
    const edits: EditOperation[] = [
      {
        old_text: `interface User {
  id: number;
  name: string;
  email: string;
}`,
        new_text: `interface User {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  roles: string[];
}`
      },
      {
        old_text: "Math.random()",
        new_text: "Date.now()"
      }
    ];

    const diff = await applyFileEdits(filePath, edits);
    const modifiedContent = await readTempFile(filePath);

    assertStringIncludes(modifiedContent, "isActive: boolean;");
    assertStringIncludes(modifiedContent, "roles: string[];");
    assertStringIncludes(modifiedContent, "Date.now()");
  } finally {
    await cleanupTempFile(filePath);
  }
});

Deno.test("applyFileEdits - Error case: Non-existent text", async () => {
  const originalContent = `function simpleFunction() {
  return "hello";
}`;

  const filePath = await createTempFile(originalContent);
  
  try {
    const edits: EditOperation[] = [{
      old_text: "this text does not exist in the file",
      new_text: "replacement text"
    }];

    await assertRejects(
      () => applyFileEdits(filePath, edits),
      Error
    );
  } finally {
    await cleanupTempFile(filePath);
  }
});