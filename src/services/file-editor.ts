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

export type NormalizationLevel = 'strict' | 'moderate' | 'flexible' | 'aggressive';

// Text normalization functions
export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

export function normalizeUnicode(text: string): string {
  // Normalize to NFC (Canonical Composition)
  // This ensures é is always a single character, not e + combining accent
  let normalized = text.normalize('NFC');
  
  // Remove common invisible characters that cause matching issues
  normalized = normalized
    .replace(/\u200B/g, '')     // Zero-width space
    .replace(/\u200C/g, '')     // Zero-width non-joiner
    .replace(/\u200D/g, '')     // Zero-width joiner
    .replace(/\uFEFF/g, '');    // Byte order mark
  
  return normalized;
}

// For aggressive normalization when fuzzy matching fails
export function normalizeAggressively(text: string): string {
  return text
    .normalize('NFKD')              // Decompose and use compatibility mappings
    .replace(/\p{M}/gu, '')         // Remove all combining marks (accents, etc.)
    .replace(/[^\p{L}\p{N}\p{P}\p{S}\s]/gu, '') // Keep only letters, numbers, punctuation, symbols, whitespace
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeForMatching(
  text: string, 
  level: NormalizationLevel = 'moderate'
): string {
  let normalized = text;
  
  // Step 1: Unicode normalization (always apply)
  normalized = normalizeUnicode(normalized);
  
  // Step 2: Line ending normalization
  normalized = normalizeLineEndings(normalized);
  
  // Step 3: Level-specific normalization
  switch (level) {
    case 'strict':
      return normalized.trim();
    case 'moderate':
      return normalized
        .trim()
        .replace(/\t/g, '  ')          // Tabs to spaces
        .replace(/[ \u00A0]+/g, ' ')   // Collapse spaces + non-breaking spaces
        .replace(/\u200B/g, '');       // Remove zero-width spaces
    case 'flexible':
      return normalized
        .trim()
        .replace(/\s+/g, ' ')          // All whitespace to single space
        .replace(/[""]/g, '"')         // Smart quotes to ASCII
        .replace(/['']/g, "'")         // Smart apostrophes to ASCII
        .replace(/[—–]/g, '-')         // Em/en dashes to ASCII
        .replace(/…/g, '...')          // Ellipsis to dots
        .replace(/\u200B/g, '');       // Remove zero-width spaces
    case 'aggressive':
      return normalizeAggressively(text);
  }
}

// Position-based matching functions
export function findExactMatchAtPosition(
  content: string, 
  target: string, 
  expectedPosition: number,
  tolerance: number = 100
): { start: number; end: number } | null {
  const searchStart = Math.max(0, expectedPosition - tolerance);
  const searchEnd = Math.min(content.length, expectedPosition + target.length + tolerance);
  const searchArea = content.substring(searchStart, searchEnd);
  
  const relativeIndex = searchArea.indexOf(target);
  if (relativeIndex !== -1) {
    const absoluteStart = searchStart + relativeIndex;
    return {
      start: absoluteStart,
      end: absoluteStart + target.length
    };
  }
  
  return null;
}

// Similarity calculation functions
export function calculateSimilarity(lines1: string[], lines2: string[]): number {
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
  expectedPosition?: number
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
        const proximityBonus = Math.max(0, (maxDistance - distance) / maxDistance) * 0.1;
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
  normalizedMatch: MatchResult
): MatchResult | null {
  // For simple normalization, positions should be very close
  // This is a simplified mapping - for complex cases we'd need character-by-character mapping
  const ratio = originalContent.length / normalizedContent.length;
  const originalStart = Math.round(normalizedMatch.start * ratio);
  const originalEnd = Math.round(normalizedMatch.end * ratio);
  
  // Validate the mapping by checking nearby content
  const originalLength = originalEnd - originalStart;
  const maxSearchRange = Math.min(100, Math.max(originalLength, 50));
  
  for (let offset = -maxSearchRange; offset <= maxSearchRange; offset += 10) {
    const testStart = Math.max(0, originalStart + offset);
    const testEnd = Math.min(originalContent.length, testStart + originalLength);
    const testContent = originalContent.substring(testStart, testEnd);
    
    // Check if this mapped position contains similar content
    if (testContent.length > 0 && calculateTextSimilarity(testContent, normalizedContent.substring(normalizedMatch.start, normalizedMatch.end)) > 0.8) {
      return { start: testStart, end: testEnd, score: normalizedMatch.score };
    }
  }
  
  // Fallback to approximate mapping
  return { 
    start: Math.max(0, originalStart), 
    end: Math.min(originalContent.length, originalEnd), 
    score: normalizedMatch.score * 0.9 // Reduce confidence due to mapping uncertainty
  };
}

export function findBestMatch(
  content: string,
  target: string,
  expectedPosition?: number
): MatchResult | null {
  
  // Try multiple normalization strategies with decreasing strictness
  const strategies = [
    { level: 'strict' as const, threshold: 1.0 },
    { level: 'moderate' as const, threshold: 0.95 },
    { level: 'flexible' as const, threshold: 0.90 },
    { level: 'aggressive' as const, threshold: 0.85 }
  ];
  
  for (const strategy of strategies) {
    let normalizedContent: string;
    let normalizedTarget: string;
    
    normalizedContent = normalizeForMatching(content, strategy.level);
    normalizedTarget = normalizeForMatching(target, strategy.level);
    
    const match = findMatchWithStrategy(normalizedContent, normalizedTarget, strategy.threshold, expectedPosition);
    if (match) {
      // Map positions back to original content
      return mapNormalizedPositionToOriginal(content, normalizedContent, match);
    }
  }
  
  return null;
}

// Edit conflict detection
export function detectEditConflicts(
  content: string,
  edits: EditOperationWithPosition[]
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

// Edit validation
export function validateEdits(
  content: string,
  edits: EditOperationWithPosition[]
): ValidationResult {
  const errors: string[] = [];
  
  // Test each edit can be found
  for (let i = 0; i < edits.length; i++) {
    const edit = edits[i];
    const normalizedOld = normalizeForMatching(edit.old_text);
    
    // Try exact match first
    if (edit.position !== undefined) {
      const exactMatch = findExactMatchAtPosition(content, normalizedOld, edit.position);
      if (exactMatch) continue;
    }
    
    // Try fuzzy match
    const fuzzyMatch = findBestMatch(content, normalizedOld, edit.position);
    if (!fuzzyMatch) {
      errors.push(`Edit ${i + 1}: Cannot find match for "${edit.old_text.substring(0, 50)}..."`);
    } else if (fuzzyMatch.score < 0.8) {
      errors.push(`Edit ${i + 1}: Low confidence match (${(fuzzyMatch.score * 100).toFixed(1)}%) for "${edit.old_text.substring(0, 50)}..."`);
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
    const normalizedOld = normalizeForMatching(edit.old_text);
    let position = content.indexOf(normalizedOld);

    if (position === -1) {
      // Try fuzzy matching to find position
      const match = findBestMatch(content, normalizedOld);
      position = match ? match.start : -1;
      if (position === -1) {
        Logger.warning(
          "Could not find exact or fuzzy match for edit text during sort",
          { old_text: edit.old_text },
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

// Core edit application
export function applyFuzzyEdit(
  content: string,
  edit: EditOperationWithPosition,
): string {
  const normalizedOld = normalizeForMatching(edit.old_text);
  const normalizedNew = edit.new_text;

  // Try exact match at expected position first if position is known
  if (edit.position !== undefined) {
    const exactMatch = findExactMatchAtPosition(content, normalizedOld, edit.position);
    if (exactMatch) {
      Logger.debug("Applying exact edit at expected position", {
        old_text: edit.old_text,
        position: edit.position,
      });
      return content.substring(0, exactMatch.start) +
        normalizedNew +
        content.substring(exactMatch.end);
    }
  }

  // Try exact match anywhere in content
  const exactIndex = content.indexOf(normalizedOld);
  if (exactIndex !== -1) {
    // If we have multiple matches, verify this is the right one by checking context
    const allMatches = [];
    let searchIndex = 0;
    while (searchIndex < content.length) {
      const index = content.indexOf(normalizedOld, searchIndex);
      if (index === -1) break;
      allMatches.push(index);
      searchIndex = index + 1;
    }
    
    if (allMatches.length === 1 || edit.position === undefined) {
      // Use first match if only one exists or no position preference
      return content.substring(0, exactIndex) + normalizedNew + content.substring(exactIndex + normalizedOld.length);
    } else {
      // Multiple matches - choose closest to expected position
      const bestMatch = allMatches.reduce((best, current) => 
        Math.abs(current - edit.position!) < Math.abs(best - edit.position!) ? current : best
      );
      return content.substring(0, bestMatch) + normalizedNew + content.substring(bestMatch + normalizedOld.length);
    }
  }

  // Try fuzzy matching with position preference
  const match = findBestMatch(content, normalizedOld, edit.position);
  if (match) {
    Logger.debug("Applying fuzzy edit", {
      old_text: edit.old_text,
      new_text: edit.new_text,
      match_score: match.score,
      expected_position: edit.position,
      actual_position: match.start,
    });
    return content.substring(0, match.start) +
      normalizedNew +
      content.substring(match.end);
  }
  
  Logger.error("Failed to apply fuzzy edit, no match found", {
    old_text: edit.old_text,
    expected_position: edit.position,
  });
  throw new Error(
    `Could not find match for:\n${edit.old_text}\n\n` +
      `Context: ${getSurroundingContext(content, normalizedOld)}`,
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

  // Sort edits by position (reverse order to avoid offset issues)
  const sortedEdits = sortEditsByPosition(content, edits);

  // Validate edits before applying
  const validation = validateEdits(content, sortedEdits);
  if (!validation.valid) {
    Logger.warning("Edit validation failed", { 
      filePath, 
      errors: validation.errors 
    });
    // Log warnings but continue - let individual edits fail if needed
    validation.errors.forEach(error => Logger.warning("Edit validation warning", { error }));
  }

  // Detect potential conflicts
  const conflicts = detectEditConflicts(content, sortedEdits);
  if (conflicts.length > 0) {
    Logger.warning("Detected potential edit conflicts", { 
      filePath, 
      conflictCount: conflicts.length,
      conflicts: conflicts.map(c => ({ 
        edit1_text: sortedEdits[c.edit1].old_text.substring(0, 50),
        edit2_text: sortedEdits[c.edit2].old_text.substring(0, 50)
      }))
    });
  }

  // Apply edits in reverse order
  let modifiedContent = content;
  for (const edit of sortedEdits.reverse()) {
    modifiedContent = applyFuzzyEdit(modifiedContent, edit);
  }

  const diff = createUnifiedDiff(content, modifiedContent, filePath);
  await Deno.writeTextFile(filePath, modifiedContent);
  Logger.debug("File edits applied and written", { filePath });

  return formatDiffOutput(diff);
}