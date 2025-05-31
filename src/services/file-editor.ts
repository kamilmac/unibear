import { createTwoFilesPatch } from "npm:diff";
import { Logger } from "./logging.ts";

// Types for file editing operations
export interface EditOperation {
  old_text: string;
  new_text: string;
}

export interface EditOperationWithPosition extends EditOperation {
  position: number;
}

export interface MatchResult {
  start: number;
  end: number;
  score: number;
}

export interface EditConflict {
  edit1: number;
  edit2: number;
  overlap: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export type NormalizationLevel =
  | "strict"
  | "moderate"
  | "flexible"
  | "aggressive";

// Text normalization functions
export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

export function normalizeUnicode(text: string): string {
  // Normalize to NFC (Canonical Composition)
  // This ensures é is always a single character, not e + combining accent
  let normalized = text.normalize("NFC");

  // Remove common invisible characters that cause matching issues
  normalized = normalized
    .replace(/\u200B/g, "") // Zero-width space
    .replace(/\u200C/g, "") // Zero-width non-joiner
    .replace(/\u200D/g, "") // Zero-width joiner
    .replace(/\uFEFF/g, ""); // Byte order mark

  return normalized;
}

// For aggressive normalization when fuzzy matching fails
export function normalizeAggressively(text: string): string {
  return text
    .normalize("NFKD") // Decompose and use compatibility mappings
    .replace(/\p{M}/gu, "") // Remove all combining marks (accents, etc.)
    .replace(/[^\p{L}\p{N}\p{P}\p{S}\s]/gu, "") // Keep only letters, numbers, punctuation, symbols, whitespace
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeForMatching(
  text: string,
  level: NormalizationLevel = "strict",
): string {
  let normalized = text;

  // Step 1: Unicode normalization (always apply)
  normalized = normalizeUnicode(normalized);

  // Step 2: Line ending normalization
  normalized = normalizeLineEndings(normalized);

  // Step 3: Level-specific normalization
  switch (level) {
    case "strict":
      return normalized.trim();
    case "moderate":
      return normalized
        .trim()
        .replace(/\t/g, "  ") // Tabs to spaces
        .replace(/[ \u00A0]+/g, " ") // Collapse spaces + non-breaking spaces
        .replace(/\u200B/g, ""); // Remove zero-width spaces
    case "flexible":
      return normalized
        .trim()
        .replace(/\s+/g, " ") // All whitespace to single space
        .replace(/[""]/g, '"') // Smart quotes to ASCII
        .replace(/['']/g, "'") // Smart apostrophes to ASCII
        .replace(/[—–]/g, "-") // Em/en dashes to ASCII
        .replace(/…/g, "...") // Ellipsis to dots
        .replace(/\u200B/g, ""); // Remove zero-width spaces
    case "aggressive":
      return normalizeAggressively(text);
  }
}

// Position-based matching functions
export function findExactMatchAtPosition(
  content: string,
  target: string,
  expectedPosition: number,
  tolerance: number = 100,
): { start: number; end: number } | null {
  const searchStart = Math.max(0, expectedPosition - tolerance);
  const searchEnd = Math.min(
    content.length,
    expectedPosition + target.length + tolerance,
  );
  const searchArea = content.substring(searchStart, searchEnd);

  const relativeIndex = searchArea.indexOf(target);
  if (relativeIndex !== -1) {
    const absoluteStart = searchStart + relativeIndex;
    return {
      start: absoluteStart,
      end: absoluteStart + target.length,
    };
  }

  return null;
}

// Similarity calculation functions
export function calculateSimilarity(
  lines1: string[],
  lines2: string[],
): number {
  if (lines1.length !== lines2.length) return 0;

  let matches = 0;
  for (let i = 0; i < lines1.length; i++) {
    const line1 = lines1[i].trim();
    const line2 = lines2[i].trim();

    if (line1 === line2) {
      matches++;
    } else if (line1.replace(/\s+/g, " ") === line2.replace(/\s+/g, " ")) {
      matches += 0.9; // Partial match for whitespace differences
    }
  }

  return matches / lines1.length;
}

export function calculateTextSimilarity(text1: string, text2: string): number {
  const lines1 = text1.split("\n");
  const lines2 = text2.split("\n");
  return calculateSimilarity(lines1, lines2);
}

// Fuzzy matching with multiple strategies
export function findMatchWithStrategy(
  content: string,
  target: string,
  threshold: number,
  expectedPosition?: number,
): MatchResult | null {
  const contentLines = content.split("\n");
  const targetLines = target.split("\n");

  let bestMatch = null;
  let bestScore = 0;

  for (let i = 0; i <= contentLines.length - targetLines.length; i++) {
    const candidateLines = contentLines.slice(i, i + targetLines.length);
    const score = calculateSimilarity(candidateLines, targetLines);

    if (score > bestScore && score > threshold) {
      const startPos = contentLines.slice(0, i).join("\n").length +
        (i > 0 ? 1 : 0);
      const endPos = startPos + candidateLines.join("\n").length;

      // Prefer matches closer to expected position if provided
      let adjustedScore = score;
      if (expectedPosition !== undefined) {
        const distance = Math.abs(startPos - expectedPosition);
        const maxDistance = Math.max(content.length / 10, 500); // 10% of content or 500 chars
        const proximityBonus =
          Math.max(0, (maxDistance - distance) / maxDistance) * 0.1;
        adjustedScore += proximityBonus;
      }

      if (adjustedScore > bestScore) {
        bestMatch = { start: startPos, end: endPos, score: adjustedScore };
        bestScore = adjustedScore;
      }
    }
  }

  return bestMatch;
}

export function mapNormalizedPositionToOriginal(
  originalContent: string,
  normalizedContent: string,
  normalizedMatch: MatchResult,
): MatchResult | null {
  // If content lengths are similar, positions should be close
  if (Math.abs(originalContent.length - normalizedContent.length) < 50) {
    return normalizedMatch;
  }

  // For significant differences, we need character-by-character mapping
  let originalPos = 0;
  let normalizedPos = 0;
  const mappings: number[] = [];

  while (
    originalPos < originalContent.length &&
    normalizedPos < normalizedContent.length
  ) {
    mappings[normalizedPos] = originalPos;

    // Skip characters that were removed during normalization
    const origChar = originalContent[originalPos];
    const normChar = normalizedContent[normalizedPos];

    if (origChar === normChar) {
      originalPos++;
      normalizedPos++;
    } else {
      // Character was removed or changed during normalization
      originalPos++;
    }
  }

  // Map the match positions
  const originalStart = mappings[normalizedMatch.start] ||
    normalizedMatch.start;
  const originalEnd = mappings[normalizedMatch.end] || normalizedMatch.end;

  return {
    start: originalStart,
    end: originalEnd,
    score: normalizedMatch.score,
  };
}

export function findBestMatch(
  content: string,
  target: string,
  expectedPosition?: number,
): MatchResult | null {
  // Try multiple normalization strategies with decreasing strictness
  const strategies = [
    { level: "strict" as const, threshold: 1.0 },
    { level: "moderate" as const, threshold: 0.95 },
    { level: "flexible" as const, threshold: 0.90 },
    { level: "aggressive" as const, threshold: 0.85 },
  ];

  for (const strategy of strategies) {
    const normalizedContent = normalizeForMatching(content, strategy.level);
    const normalizedTarget = normalizeForMatching(target, strategy.level);

    const match = findMatchWithStrategy(
      normalizedContent,
      normalizedTarget,
      strategy.threshold,
      expectedPosition,
    );
    if (match) {
      // Map positions back to original content
      return mapNormalizedPositionToOriginal(content, normalizedContent, match);
    }
  }

  return null;
}

// Edit conflict detection
export function detectEditConflicts(
  _content: string,
  edits: EditOperationWithPosition[],
): EditConflict[] {
  const conflicts = [];

  for (let i = 0; i < edits.length; i++) {
    for (let j = i + 1; j < edits.length; j++) {
      const edit1 = edits[i];
      const edit2 = edits[j];

      // Skip if either edit doesn't have a valid position
      if (edit1.position === -1 || edit2.position === -1) continue;

      // Check if ranges overlap
      const end1 = edit1.position + edit1.old_text.length;
      const end2 = edit2.position + edit2.old_text.length;

      const overlap = !(end1 <= edit2.position || end2 <= edit1.position);

      if (overlap) {
        conflicts.push({ edit1: i, edit2: j, overlap: true });
      }
    }
  }

  return conflicts;
}

// Edit validation with content verification
export function validateEdits(
  content: string,
  edits: EditOperationWithPosition[],
): ValidationResult {
  const errors: string[] = [];

  // Test each edit can be found
  for (let i = 0; i < edits.length; i++) {
    const edit = edits[i];

    // First try exact match
    const exactIndex = content.indexOf(edit.old_text);
    if (exactIndex !== -1) {
      continue; // Found exact match
    }

    // Try with strict normalization
    const normalizedOld = normalizeForMatching(edit.old_text, "strict");
    const normalizedContent = normalizeForMatching(content, "strict");
    if (normalizedContent.includes(normalizedOld)) {
      continue; // Found with strict normalization
    }

    // Try fuzzy match as last resort
    const fuzzyMatch = findBestMatch(content, edit.old_text, edit.position);
    if (!fuzzyMatch) {
      errors.push(
        `Edit ${i + 1}: Cannot find match for "${
          edit.old_text.substring(0, 50)
        }..."`,
      );
    } else if (fuzzyMatch.score < 0.9) {
      errors.push(
        `Edit ${i + 1}: Low confidence match (${
          (fuzzyMatch.score * 100).toFixed(1)
        }%) for "${edit.old_text.substring(0, 50)}..."`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

// Position sorting
export function sortEditsByPosition(
  content: string,
  edits: EditOperation[],
): EditOperationWithPosition[] {
  const editsWithPositions = [];

  for (const edit of edits) {
    // First try exact match
    let position = content.indexOf(edit.old_text);

    if (position === -1) {
      // Try with basic normalization
      const normalizedOld = normalizeForMatching(edit.old_text, "strict");
      position = content.indexOf(normalizedOld);
    }

    if (position === -1) {
      // Try fuzzy matching to find position
      const match = findBestMatch(content, edit.old_text);
      position = match ? match.start : -1;
      if (position === -1) {
        Logger.warning(
          "Could not find exact or fuzzy match for edit text during sort",
          { old_text: edit.old_text.substring(0, 100) },
        );
      }
    }

    editsWithPositions.push({ ...edit, position });
  }

  // Sort by position (later positions first for reverse application)
  return editsWithPositions.sort((a, b) => b.position - a.position);
}

// Context helpers
export function getSurroundingContext(content: string, target: string): string {
  const lines = content.split("\n");
  const targetLines = target.split("\n");
  const firstTargetLine = targetLines[0].trim();

  // Find lines that partially match the first line of target
  const matches = lines
    .map((line, index) => ({ line: line.trim(), index }))
    .filter(({ line }) =>
      line.includes(
        firstTargetLine.substring(0, Math.min(20, firstTargetLine.length)),
      )
    )
    .slice(0, 3); // Show max 3 potential matches

  if (matches.length === 0) {
    return "No similar content found";
  }

  return matches
    .map(({ line, index }) => `Line ${index + 1}: ${line}`)
    .join("\n");
}

// Core edit application with better error handling
export function applyFuzzyEdit(
  content: string,
  edit: EditOperationWithPosition,
): string {
  // Always start with exact match attempt
  const exactIndex = content.indexOf(edit.old_text);
  if (exactIndex !== -1) {
    Logger.debug("Applying exact edit", {
      old_text: edit.old_text.substring(0, 50),
      position: exactIndex,
    });
    return content.substring(0, exactIndex) +
      edit.new_text +
      content.substring(exactIndex + edit.old_text.length);
  }

  // Try exact match at expected position if position is known
  if (edit.position !== undefined && edit.position >= 0) {
    const exactMatch = findExactMatchAtPosition(
      content,
      edit.old_text,
      edit.position,
    );
    if (exactMatch) {
      Logger.debug("Applying exact edit at expected position", {
        old_text: edit.old_text.substring(0, 50),
        position: edit.position,
      });
      return content.substring(0, exactMatch.start) +
        edit.new_text +
        content.substring(exactMatch.end);
    }
  }

  // Try with light normalization
  const normalizedOld = normalizeForMatching(edit.old_text, "strict");
  const normalizedIndex = content.indexOf(normalizedOld);
  if (normalizedIndex !== -1) {
    Logger.debug("Applying edit with strict normalization", {
      old_text: edit.old_text.substring(0, 50),
      position: normalizedIndex,
    });
    return content.substring(0, normalizedIndex) +
      edit.new_text +
      content.substring(normalizedIndex + normalizedOld.length);
  }

  // Try fuzzy matching as last resort
  const match = findBestMatch(content, edit.old_text, edit.position);
  if (match && match.score > 0.8) {
    Logger.warning("Applying fuzzy edit - potential accuracy issue", {
      old_text: edit.old_text.substring(0, 50),
      new_text: edit.new_text.substring(0, 50),
      match_score: match.score,
      expected_position: edit.position,
      actual_position: match.start,
    });
    return content.substring(0, match.start) +
      edit.new_text +
      content.substring(match.end);
  }

  Logger.error("Failed to apply edit - no reliable match found", {
    old_text: edit.old_text.substring(0, 100),
    expected_position: edit.position,
    context: getSurroundingContext(content, edit.old_text),
  });

  throw new Error(
    `Could not find reliable match for edit. This may indicate:\n` +
      `1. The content has already been modified\n` +
      `2. The old_text doesn't exactly match the file content\n` +
      `3. There are encoding or whitespace differences\n\n` +
      `Looking for: "${edit.old_text.substring(0, 100)}${
        edit.old_text.length > 100 ? "..." : ""
      }"\n\n` +
      `Similar content in file:\n${
        getSurroundingContext(content, edit.old_text)
      }`,
  );
}

// Diff generation
export function createUnifiedDiff(
  originalContent: string,
  newContent: string,
  filepath: string = "file",
): string {
  const normalizedOriginal = normalizeLineEndings(originalContent);
  const normalizedNew = normalizeLineEndings(newContent);

  return createTwoFilesPatch(
    filepath,
    filepath,
    normalizedOriginal,
    normalizedNew,
    "original",
    "modified",
  );
}

export function formatDiffOutput(diff: string): string {
  let numBackticks = 3;
  while (diff.includes("`".repeat(numBackticks))) {
    numBackticks++;
  }
  return `${"`".repeat(numBackticks)}diff\n${diff}${
    "`".repeat(numBackticks)
  }\n\n`;
}

// Main file editing orchestrator
export async function applyFileEdits(
  filePath: string,
  edits: EditOperation[],
): Promise<string> {
  Logger.debug("Applying file edits", { filePath, editCount: edits.length });

  const file = await Deno.readTextFile(filePath);
  const content = normalizeLineEndings(file);

  // Validate content length to prevent corruption
  if (content.length === 0 && file.length > 0) {
    throw new Error("File content appears to be corrupted during read");
  }

  // Sort edits by position (reverse order to avoid offset issues)
  const sortedEdits = sortEditsByPosition(content, edits);

  // Validate edits before applying
  const validation = validateEdits(content, sortedEdits);
  if (!validation.valid) {
    Logger.error("Edit validation failed - stopping to prevent corruption", {
      filePath,
      errors: validation.errors,
    });
    throw new Error(`Edit validation failed:\n${validation.errors.join("\n")}`);
  }

  // Detect potential conflicts
  const conflicts = detectEditConflicts(content, sortedEdits);
  if (conflicts.length > 0) {
    Logger.warning("Detected potential edit conflicts", {
      filePath,
      conflictCount: conflicts.length,
      conflicts: conflicts.map((c) => ({
        edit1_text: sortedEdits[c.edit1].old_text.substring(0, 50),
        edit2_text: sortedEdits[c.edit2].old_text.substring(0, 50),
      })),
    });
  }

  // Apply edits in reverse order (no double reverse!)
  let modifiedContent = content;
  for (const edit of sortedEdits) {
    try {
      modifiedContent = applyFuzzyEdit(modifiedContent, edit);

      // Sanity check after each edit
      if (modifiedContent.length < content.length * 0.5) {
        throw new Error("Content dramatically reduced - likely corruption");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      Logger.error("Failed to apply edit, reverting changes", {
        filePath,
        edit: edit.old_text.substring(0, 100),
        error: errorMessage,
      });
      throw new Error(`Edit application failed: ${errorMessage}`);
    }
  }

  // Final sanity check
  if (modifiedContent.length < 10 && content.length > 100) {
    throw new Error(
      "Modified content suspiciously short - likely corruption detected",
    );
  }

  const diff = createUnifiedDiff(content, modifiedContent, filePath);
  await Deno.writeTextFile(filePath, modifiedContent);
  Logger.debug("File edits applied and written", {
    filePath,
    originalLength: content.length,
    modifiedLength: modifiedContent.length,
  });

  return formatDiffOutput(diff);
}
