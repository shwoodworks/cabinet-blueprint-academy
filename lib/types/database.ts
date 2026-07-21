// Hand-written types mirroring supabase/schema.sql. Once the project is
// linked to a live Supabase instance, replace this with generated types:
// `supabase gen types typescript --linked > lib/types/database.ts`

export type UserRole = "learner" | "admin" | "employer";
export type MaterialType = "text" | "image" | "pdf";
export type QuestionType = "single_choice" | "multiple_choice" | "true_false";
export type AssessmentScope = "module_quiz" | "final_exam";
export type EnrollmentStatus = "in_progress" | "completed";
export type ModuleProgressStatus = "not_started" | "in_progress" | "completed";

export interface Organization {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  organization_id: string | null;
  created_at: string;
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  created_by: string;
  created_at: string;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  sequence_order: number;
  is_published: boolean;
  created_at: string;
}

export interface Material {
  id: string;
  module_id: string;
  type: MaterialType;
  body: string | null;
  file_url: string | null;
  sequence_order: number;
  created_at: string;
}

export interface Question {
  id: string;
  prompt: string;
  question_type: QuestionType;
  explanation: string | null;
  scope: AssessmentScope;
  module_id: string | null;
  course_id: string;
  is_active: boolean;
  created_at: string;
}

export interface AnswerOption {
  id: string;
  question_id: string;
  label: string;
  is_correct: boolean;
  sequence_order: number;
  created_at: string;
}

export interface Assessment {
  id: string;
  scope: AssessmentScope;
  module_id: string | null;
  course_id: string;
  passing_score_pct: number;
  question_count: number;
  max_attempts: number | null;
  time_limit_minutes: number | null;
  created_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  organization_id: string | null;
  enrolled_at: string;
  status: EnrollmentStatus;
}

export interface ModuleProgress {
  id: string;
  enrollment_id: string;
  module_id: string;
  status: ModuleProgressStatus;
  completed_at: string | null;
  created_at: string;
}

export interface AssessmentAttempt {
  id: string;
  assessment_id: string;
  user_id: string;
  enrollment_id: string;
  attempt_number: number;
  started_at: string;
  submitted_at: string | null;
  score_pct: number | null;
  passed: boolean | null;
  question_snapshot: unknown;
}

export interface Credential {
  id: string;
  credential_id: string;
  user_id: string;
  course_id: string;
  enrollment_id: string;
  issued_at: string;
  pdf_url: string | null;
  revoked_at: string | null;
}

// Minimal Database shape for @supabase/ssr typing. Expand per-table
// Row/Insert/Update definitions as the generated types replace this file.
export type Database = Record<string, unknown>;
