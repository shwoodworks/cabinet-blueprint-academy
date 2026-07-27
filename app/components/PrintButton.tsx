"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden rounded bg-navy px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
    >
      Print / Save as PDF
    </button>
  );
}
