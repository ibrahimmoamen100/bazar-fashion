// ────────────────────────────────────────────────────────────────
// Helper to apply suffix
// ────────────────────────────────────────────────────────────────
function formatSpecValue(key: string, val: string) {
  const trimmed = val.trim();
  if (!trimmed) return trimmed;
  const isNumber = /^[\d.,]+$/.test(trimmed);
  if (isNumber) {
    const suffixes: Record<string, string> = {
      "التردد الأساسي": "GHz",
      "أقصى تردد": "GHz",
      "الكاش": "MB",
      "سرعة الرامات": "MHz",
      "معدل التحديث": "Hz",
      "سطوع الشاشة": "nits",
      "حجم VRAM": "GB",
      "زمن الاستجابة": "ms",
      "حجم الشاشة": "بوصة",
      "المدى": "متر",
      "الرامات": "GB",
      "استهلاك الطاقة": "W",
      "عمر البطارية": "ساعات",
      "الوزن": "كجم",
    };
    const suffix = suffixes[key];
    if (suffix) return `${trimmed} ${suffix}`;
  }
  return trimmed;
}

// ────────────────────────────────────────────────────────────────
// Main exported component
// ────────────────────────────────────────────────────────────────
interface SpecsDisplayProps {
  category: string;
  specifications: { id?: string; key?: string; value?: string; inFilter?: boolean }[];
}

export function SpecsDisplay({ specifications }: SpecsDisplayProps) {
  // Filter to only specs that have both key and value
  const validSpecs = specifications.filter(
    (s): s is { id?: string; key: string; value: string; inFilter?: boolean } =>
      !!s.key && !!s.value
  );

  if (validSpecs.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <table className="w-full text-sm sm:text-base text-right font-sans">
        <tbody className="divide-y divide-gray-100">
          {validSpecs.map((spec, i) => (
            <tr key={spec.id ?? spec.key} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}>
              <td className="py-4 px-6 font-semibold text-gray-700 w-2/5 align-top border-l border-gray-100 bg-gray-50/30">
                {spec.key}
              </td>
              <td className="py-4 px-6 text-gray-900 leading-relaxed font-medium">
                {formatSpecValue(spec.key, spec.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
