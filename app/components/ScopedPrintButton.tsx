"use client";

export function ScopedPrintButton({
  target,
  label,
}: {
  target: "certificate" | "onepager";
  label: string;
}) {
  return (
    <button
      onClick={() => {
        document.body.setAttribute("data-print-target", target);
        window.print();
      }}
      className="print:hidden rounded bg-navy px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
    >
      {label}
    </button>
  );
}
