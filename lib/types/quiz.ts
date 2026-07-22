import type { QuestionType } from "@/lib/types/database";

// Shape frozen into assessment_attempts.question_snapshot at submission time,
// per PLAN.md §1 — so later question-bank edits never retroactively change
// historical results.
export interface QuestionSnapshotOption {
  id: string;
  label: string;
  is_correct: boolean;
  selected: boolean;
}

export interface QuestionSnapshotItem {
  question_id: string;
  prompt: string;
  question_type: QuestionType;
  explanation: string | null;
  correct: boolean;
  options: QuestionSnapshotOption[];
}
