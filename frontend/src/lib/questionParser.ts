export interface ParsedOption {
  letter: string;
  option_text: string;
  is_correct: boolean;
  explanation?: string | null;
  sort_order: number;
}

export interface ParsedQuestion {
  questionNumber?: number;
  question: string;
  difficulty: "easy" | "medium" | "hard" | "expert";
  explanation?: string | null;
  options: ParsedOption[];
  rawBlock: string;
  isValid: boolean;
  errors: string[];
}

export interface ParseResult {
  questions: ParsedQuestion[];
  validCount: number;
  errorCount: number;
}

export const BLANK_TEMPLATE = `Question 1: <Type your question text here>
Difficulty: Medium
Explanation: <Optional: General question explanation>
[A] <Option A text>
Explanation: <Optional: Explanation for option A>
[B] <Option B text>
Explanation: <Optional: Explanation for option B>
[C*] <Correct Option C text - asterisk * marks correct>
Explanation: <Optional: Explanation for option C>
[D] <Option D text>
Explanation: <Optional: Explanation for option D>
[E] <Optional: Additional Option E text>
Explanation: <Optional: Explanation for option E>
---
Question 2: <Type your next question text here>
[A] <Option A text>
[B*] <Correct Option B text>
[C] <Option C text>
[D] <Option D text>
---
`;

export const FILLED_SAMPLE_TEMPLATE = `Question 1: What is the primary function of mitochondria in eukaryotic cells?
Difficulty: Medium
[A] Protein synthesis
[B] Lipid storage
[C*] Cellular respiration and ATP production
Explanation: Mitochondria generate the cell's ATP via oxidative phosphorylation.
[D] Photosynthesis
[E] Cellular waste digestion
---
Question 2: Which blood group is known as the universal red blood cell donor?
Difficulty: Easy
[A] A Positive
[B] AB Positive
Explanation: AB+ is the universal plasma recipient.
[C] B Negative
[D*] O Negative
Explanation: O- lacks A, B, and Rh antigens, preventing transfusion reactions.
---
Question 3: What is the normal resting human heart rate in healthy adults?
[A] 30 - 45 bpm
[B*] 60 - 100 bpm
[C] 110 - 140 bpm
[D] 150 - 180 bpm
---
`;

export function parseBulkQuestions(
  rawText: string,
  defaultDifficulty: "easy" | "medium" | "hard" | "expert" = "medium"
): ParseResult {
  if (!rawText.trim()) {
    return { questions: [], validCount: 0, errorCount: 0 };
  }

  let rawBlocks: string[] = [];
  if (rawText.includes("---")) {
    rawBlocks = rawText
      .split(/\n\s*---\s*(?:\n|$)/)
      .map((b) => b.trim())
      .filter((b) => b.length > 0);
  } else {
    rawBlocks = rawText
      .split(/\n\s*(?=(?:Question\s+\d+|Q\d+|\d+[\.\)]\s+))/i)
      .map((b) => b.trim())
      .filter((b) => b.length > 0);
  }

  const parsedQuestions: ParsedQuestion[] = [];

  for (let blockIdx = 0; blockIdx < rawBlocks.length; blockIdx++) {
    const block = rawBlocks[blockIdx];
    const lines = block.split(/\r?\n/);

    let qNum: number | undefined;
    const questionLines: string[] = [];
    let difficulty: "easy" | "medium" | "hard" | "expert" | undefined;
    const generalExplanationLines: string[] = [];
    const options: ParsedOption[] = [];
    let currentOption: ParsedOption | null = null;
    let answerLetter: string | null = null;
    let inGeneralExplanation = false;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      const trimmed = line.trim();

      if (!trimmed) continue;

      const diffMatch = trimmed.match(/^Difficulty:\s*(easy|medium|hard|expert)$/i);
      if (diffMatch) {
        difficulty = diffMatch[1].toLowerCase() as any;
        continue;
      }

      const qNumMatch = trimmed.match(/^(?:Question\s+(\d+)[:\.]?|Q(\d+)[:\.]?|(\d+)[\.\)])\s*(.*)$/i);
      if (qNumMatch && options.length === 0) {
        qNum = parseInt(qNumMatch[1] || qNumMatch[2] || qNumMatch[3], 10);
        if (qNumMatch[4]) {
          questionLines.push(qNumMatch[4].trim());
        }
        continue;
      }

      const ansMatch = trimmed.match(/^(?:Answer|Ans|Correct):\s*([A-Za-z])/i);
      if (ansMatch) {
        answerLetter = ansMatch[1].toUpperCase();
        continue;
      }

      const expMatch = trimmed.match(/^(?:Explanation|Exp):\s*(.*)$/i);
      if (expMatch) {
        const expContent = expMatch[1].trim();
        if (currentOption) {
          currentOption.explanation = currentOption.explanation
            ? currentOption.explanation + " " + expContent
            : expContent;
        } else {
          inGeneralExplanation = true;
          if (expContent) generalExplanationLines.push(expContent);
        }
        continue;
      }

      const bracketMatch = trimmed.match(/^\[([A-Za-z])(\*?)\]\s*(.*)$/) || trimmed.match(/^\[\*([A-Za-z])\]\s*(.*)$/);
      if (bracketMatch) {
        inGeneralExplanation = false;
        const letter = (bracketMatch[1] || bracketMatch[2]).toUpperCase();
        const isCorrect = trimmed.startsWith("[*") || bracketMatch[0].includes("*");
        let optText = bracketMatch[3] !== undefined ? bracketMatch[3].trim() : (bracketMatch[2] ? bracketMatch[2].trim() : "");
        let optExp: string | null = null;

        if (optText.includes("|")) {
          const parts = optText.split("|");
          optText = parts[0].trim();
          optExp = parts.slice(1).join("|").trim();
        }

        const newOpt: ParsedOption = {
          letter,
          option_text: optText,
          is_correct: isCorrect,
          explanation: optExp,
          sort_order: options.length,
        };
        options.push(newOpt);
        currentOption = newOpt;
        continue;
      }

      const standardOptMatch = trimmed.match(/^(\*?)\s*([A-Za-z])[\.\)]\s+(.*)$/);
      if (standardOptMatch) {
        inGeneralExplanation = false;
        const isCorrect = Boolean(standardOptMatch[1]);
        const letter = standardOptMatch[2].toUpperCase();
        let optText = standardOptMatch[3].trim();
        let optExp: string | null = null;

        if (optText.includes("|")) {
          const parts = optText.split("|");
          optText = parts[0].trim();
          optExp = parts.slice(1).join("|").trim();
        }

        const newOpt: ParsedOption = {
          letter,
          option_text: optText,
          is_correct: isCorrect,
          explanation: optExp,
          sort_order: options.length,
        };
        options.push(newOpt);
        currentOption = newOpt;
        continue;
      }

      if (inGeneralExplanation) {
        generalExplanationLines.push(trimmed);
      } else if (currentOption && currentOption.explanation !== undefined) {
        currentOption.explanation = currentOption.explanation
          ? currentOption.explanation + " " + trimmed
          : trimmed;
      } else if (currentOption) {
        currentOption.option_text += " " + trimmed;
      } else {
        questionLines.push(trimmed);
      }
    }

    if (answerLetter) {
      options.forEach((opt) => {
        if (opt.letter === answerLetter) {
          opt.is_correct = true;
        }
      });
    }

    let cleanedPrompt = questionLines
      .join(" ")
      .replace(/^(?:Question\s+\d+[:\.]?\s*|\d+[\.\)]\s*|Q\d+[:\.]?\s*)/i, "")
      .trim();

    const generalExplanation = generalExplanationLines.join(" ").trim() || null;
    const errors: string[] = [];

    if (!cleanedPrompt) {
      errors.push("Question prompt is empty.");
    }

    if (options.length < 2) {
      errors.push(`At least 2 options are required (found ${options.length}).`);
    }

    const hasCorrect = options.some((o) => o.is_correct);
    if (!hasCorrect) {
      errors.push("No correct answer marked. Add an asterisk * to the correct choice (e.g. [C*]).");
    }

    parsedQuestions.push({
      questionNumber: qNum || blockIdx + 1,
      question: cleanedPrompt,
      difficulty: difficulty || defaultDifficulty,
      explanation: generalExplanation,
      options,
      rawBlock: block,
      isValid: errors.length === 0,
      errors,
    });
  }

  const validCount = parsedQuestions.filter((q) => q.isValid).length;
  const errorCount = parsedQuestions.length - validCount;

  return {
    questions: parsedQuestions,
    validCount,
    errorCount,
  };
}
