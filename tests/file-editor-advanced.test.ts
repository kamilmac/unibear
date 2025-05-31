import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { applyFileEdits, EditOperation } from "../src/services/file-editor.ts";
import { join } from "https://deno.land/std@0.208.0/path/mod.ts";

// Test utilities
async function createTempFile(content: string): Promise<string> {
  const tempDir = await Deno.makeTempDir();
  const filePath = join(tempDir, "test-file.ts");
  await Deno.writeTextFile(filePath, content);
  return filePath;
}

async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await Deno.remove(filePath);
    await Deno.remove(filePath.substring(0, filePath.lastIndexOf("/"))); 
  } catch {
    // Ignore cleanup errors
  }
}

Deno.test("applyFileEdits - Performance with large file", async () => {
  // Create a larger file for performance testing
  const largeContent = Array.from({ length: 1000 }, (_, i) => 
    `function func${i}() {\n  console.log("Function ${i}");\n  return ${i};\n}`
  ).join("\n\n");

  const filePath = await createTempFile(largeContent);
  
  try {
    const edits: EditOperation[] = [
      {
        old_text: 'console.log("Function 100");',
        new_text: 'console.log("Modified Function 100");'
      },
      {
        old_text: 'console.log("Function 500");',
        new_text: 'console.log("Modified Function 500");'
      },
      {
        old_text: 'console.log("Function 900");',
        new_text: 'console.log("Modified Function 900");'
      }
    ];

    const startTime = performance.now();
    const diff = await applyFileEdits(filePath, edits);
    const endTime = performance.now();
    
    // Should complete in reasonable time (less than 1 second)
    assertEquals((endTime - startTime) < 1000, true);
    
    const modifiedContent = await Deno.readTextFile(filePath);
    assertStringIncludes(modifiedContent, "Modified Function 100");
    assertStringIncludes(modifiedContent, "Modified Function 500");
    assertStringIncludes(modifiedContent, "Modified Function 900");
    
  } finally {
    await cleanupTempFile(filePath);
  }
});

Deno.test("applyFileEdits - Real-world React component edit", async () => {
  const reactComponent = `import React, { useState } from 'react';

interface Props {
  title: string;
  items: string[];
}

export function ItemList({ title, items }: Props) {
  const [filter, setFilter] = useState('');
  
  const filteredItems = items.filter(item => 
    item.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="item-list">
      <h2>{title}</h2>
      <input 
        type="text"
        placeholder="Filter items..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <ul>
        {filteredItems.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}`;

  const filePath = await createTempFile(reactComponent);
  
  try {
    const edits: EditOperation[] = [
      {
        old_text: "interface Props {\n  title: string;\n  items: string[];\n}",
        new_text: "interface Props {\n  title: string;\n  items: string[];\n  onItemClick?: (item: string) => void;\n}"
      },
      {
        old_text: "export function ItemList({ title, items }: Props) {",
        new_text: "export function ItemList({ title, items, onItemClick }: Props) {"
      },
      {
        old_text: "          <li key={index}>{item}</li>",
        new_text: "          <li \n            key={index}\n            onClick={() => onItemClick?.(item)}\n            className=\"cursor-pointer hover:bg-gray-100\"\n          >\n            {item}\n          </li>"
      }
    ];

    const diff = await applyFileEdits(filePath, edits);
    const modifiedContent = await Deno.readTextFile(filePath);

    assertStringIncludes(modifiedContent, "onItemClick?: (item: string) => void;");
    assertStringIncludes(modifiedContent, "{ title, items, onItemClick }");
    assertStringIncludes(modifiedContent, "onClick={() => onItemClick?.(item)}");
    assertStringIncludes(modifiedContent, "cursor-pointer hover:bg-gray-100");
    
  } finally {
    await cleanupTempFile(filePath);
  }
});

Deno.test("applyFileEdits - JSON configuration file edit", async () => {
  const jsonConfig = `{
  "name": "my-project",
  "version": "1.0.0",
  "scripts": {
    "dev": "npm run development",
    "build": "npm run production"
  },
  "dependencies": {
    "react": "^18.0.0",
    "typescript": "^4.9.0"
  }
}`;

  const filePath = await createTempFile(jsonConfig);
  
  try {
    const edits: EditOperation[] = [
      {
        old_text: '"version": "1.0.0",',
        new_text: '"version": "1.1.0",\n  "description": "Updated project with new features",'
      },
      {
        old_text: '    "dev": "npm run development",\n    "build": "npm run production"',
        new_text: '    "dev": "npm run development",\n    "build": "npm run production",\n    "test": "jest",\n    "lint": "eslint src/"'
      },
      {
        old_text: '    "typescript": "^4.9.0"',
        new_text: '    "typescript": "^4.9.0",\n    "jest": "^29.0.0",\n    "eslint": "^8.0.0"'
      }
    ];

    const diff = await applyFileEdits(filePath, edits);
    const modifiedContent = await Deno.readTextFile(filePath);

    assertStringIncludes(modifiedContent, '"version": "1.1.0"');
    assertStringIncludes(modifiedContent, '"description": "Updated project');
    assertStringIncludes(modifiedContent, '"test": "jest"');
    assertStringIncludes(modifiedContent, '"lint": "eslint src/"');
    assertStringIncludes(modifiedContent, '"jest": "^29.0.0"');
    
  } finally {
    await cleanupTempFile(filePath);
  }
});