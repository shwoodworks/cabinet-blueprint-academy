"use client";

import { useState } from "react";
import type { QuestionType } from "@/lib/types/database";

export function QuestionForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [questionType, setQuestionType] = useState<QuestionType>("single_choice");
  const [options, setOptions] = useState(["", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [correctFlags, setCorrectFlags] = useState([false, false]);

  const isTrueFalse = questionType === "true_false";
  const isMultiple = questionType === "multiple_choice";
  const effectiveOptions = isTrueFalse ? ["True", "False"] : options;

  function addOption() {
    setOptions((o) => [...o, ""]);
    setCorrectFlags((f) => [...f, false]);
  }

  function removeOption(index: number) {
    setOptions((o) => o.filter((_, i) => i !== index));
    setCorrectFlags((f) => f.filter((_, i) => i !== index));
    if (correctIndex === index) setCorrectIndex(0);
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="option_count" value={effectiveOptions.length} />

      <label className="flex flex-col gap-1 text-sm">
        Prompt
        <textarea name="prompt" required rows={2} className="rounded border border-neutral-300 px-3 py-2" />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Type
        <select
          name="question_type"
          value={questionType}
          onChange={(e) => {
            const next = e.target.value as QuestionType;
            setQuestionType(next);
            if (next === "true_false") {
              setOptions(["True", "False"]);
              setCorrectFlags([false, false]);
              setCorrectIndex(0);
            }
          }}
          className="rounded border border-neutral-300 px-3 py-2"
        >
          <option value="single_choice">Single choice</option>
          <option value="multiple_choice">Multiple choice</option>
          <option value="true_false">True / False</option>
        </select>
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm">Options</span>
        {effectiveOptions.map((value, i) => (
          <div key={i} className="flex items-center gap-2">
            {isMultiple ? (
              <input type="checkbox" name={`option_correct_${i}`} defaultChecked={correctFlags[i]} />
            ) : (
              <input
                type="radio"
                name="correct_index"
                value={i}
                checked={correctIndex === i}
                onChange={() => setCorrectIndex(i)}
              />
            )}
            {isTrueFalse ? (
              <span className="flex-1 rounded border border-neutral-200 px-3 py-2 text-sm text-neutral-500">
                {value}
              </span>
            ) : (
              <input
                name={`option_label_${i}`}
                defaultValue={value}
                required
                placeholder={`Option ${i + 1}`}
                className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm"
              />
            )}
            {!isTrueFalse && options.length > 2 && (
              <button type="button" onClick={() => removeOption(i)} className="text-xs text-red-600">
                Remove
              </button>
            )}
          </div>
        ))}
        {isTrueFalse && <input type="hidden" name="option_label_0" value="True" />}
        {isTrueFalse && <input type="hidden" name="option_label_1" value="False" />}
        {!isTrueFalse && (
          <button type="button" onClick={addOption} className="self-start text-xs text-neutral-500">
            + Add option
          </button>
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Explanation (shown after answering, module quizzes only)
        <textarea name="explanation" rows={2} className="rounded border border-neutral-300 px-3 py-2" />
      </label>

      <button
        type="submit"
        className="self-start rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
      >
        Add question
      </button>
    </form>
  );
}
