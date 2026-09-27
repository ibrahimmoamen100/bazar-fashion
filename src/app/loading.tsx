/**
 * Global Loading UI - يظهر تلقائياً بواسطة Next.js Suspense Boundary
 * أثناء تحميل أي صفحة في التطبيق
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        {/* Animated Logo Spinner */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
          <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-accent animate-spin [animation-duration:0.7s]" />
        </div>

        {/* Loading Text */}
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-foreground">جارٍ التحميل...</p>
          <div className="flex gap-1 justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    </div>
  );
}
