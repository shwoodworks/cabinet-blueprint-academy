const MODULES = [
  "Measuring and layout basics",
  "Cabinet fundamentals",
  "Reading plans and layouts",
  "Jobsite preparation",
  "Base cabinet installation",
  "Wall cabinet installation",
  "Specialty cabinet installation",
  "Fillers, scribing, and trim",
  "Advanced troubleshooting and problem solving",
  "Business, estimating, and profitability",
];

export function OnePagerDocument({
  courseTitle,
  credentialId,
  issuedDate,
}: {
  courseTitle: string;
  credentialId: string;
  issuedDate: string;
}) {
  return (
    <div
      id="one-pager"
      className="mx-auto w-full max-w-2xl overflow-hidden bg-white shadow-xl print:max-w-none print:shadow-none"
      style={{ border: "1px solid #e5e2da", borderRadius: "12px" }}
    >
      <div className="bg-navy px-8 py-6 text-center">
        <p className="font-serif text-xl font-bold tracking-[0.08em] text-gold">
          CABINET BLUEPRINT ACADEMY
        </p>
        <p className="mt-1 text-sm italic text-white">
          Cabinet Blueprint Certified Installer Program
        </p>
      </div>

      <div className="px-8 py-6">
        <h1 className="font-serif text-lg font-bold text-navy">Certified installer credential</h1>
        <p className="mt-2 text-sm text-neutral-600">
          This credential confirms successful completion of the {courseTitle} through Cabinet
          Blueprint Academy.
        </p>

        <div className="mt-4 rounded-lg border border-gold bg-[#F4EFE6] px-4 py-3 text-sm">
          <p>
            <span className="font-medium text-navy">Course:</span> {courseTitle}
          </p>
          <p className="mt-1">
            <span className="font-medium text-navy">Credential ID:</span> {credentialId}
          </p>
          <p className="mt-1">
            <span className="font-medium text-navy">Issued:</span> {issuedDate}
          </p>
          <p className="mt-1">
            <span className="font-medium text-navy">Verify at:</span>{" "}
            cabinet-blueprint-academy.vercel.app/verify
          </p>
        </div>

        <h2 className="mt-5 font-serif text-base font-bold text-navy">About the program</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Cabinet Blueprint Academy is a hands-on training and certification program built by
          Stephen Harness, a working cabinet installer, covering measurement, layout, leveling,
          hardware installation, and finish-out best practices used on real jobsites.
        </p>

        <h2 className="mt-5 font-serif text-base font-bold text-navy">10-module curriculum</h2>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-neutral-700">
          {MODULES.map((m, i) => (
            <p key={m}>
              <span className="font-medium text-gold">{i + 1}.</span> {m}
            </p>
          ))}
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Each module includes a quiz. Certification requires passing a 50-question final exam
          with a score of 80% or higher.
        </p>

        <p className="mt-5 border-t border-neutral-200 pt-3 text-center text-xs italic text-neutral-400">
          Cabinet Blueprint Academy &middot; Founded by Stephen Harness
        </p>
      </div>
    </div>
  );
}
