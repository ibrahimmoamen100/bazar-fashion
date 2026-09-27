'use client';

import { useState } from "react";
import { Play, Sparkles, Clock, ShieldCheck, Tag } from "lucide-react";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { motion } from "framer-motion";

export function ImportGuide() {
  const { settings } = useSiteSettings();
  const [isPlaying, setIsPlaying] = useState(false);

  const videoId = "vlaDmkuw6N0";

  return (
    <section className="relative overflow-hidden py-10 md:py-16 bg-gradient-to-br from-gray-50/50 via-white to-gray-50/30 border border-gray-100 rounded-3xl p-6 sm:p-8 md:p-12 shadow-[0_15px_40px_rgba(0,0,0,0.015)]">
      {/* ── Background decoration ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-[80px]" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-blue-500/5 blur-[80px]" />
      </div>

      <div className="relative z-10">
        {/* ── Main layout grid: Info (RTL: right side) & Shorts Video (RTL: left side) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

          {/* ── Right Column (Title & Text Content) ── */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            viewport={{ once: true }}
            className="lg:col-span-7 text-right flex flex-col gap-6 items-start select-none"
          >
            {/* Elegant Badge */}
            <span className="inline-flex items-center gap-1.5 text-xs font-black tracking-widest uppercase text-primary bg-primary/8 border border-primary/15 rounded-full px-4 py-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              عن بازار للموضه
            </span>

            {/* Title with Premium Gradient */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900 leading-tight">
              ما هي شركة بازار للموضه؟
              <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-l from-primary via-orange-500 to-amber-500 leading-normal">
                توفير وقت ومجهود البحث عن أحدث العروض
              </span>
            </h2>

            {/* Subtitle/Description */}
            <p className="text-gray-600 text-sm md:text-base leading-relaxed max-w-xl">
              في شركة <strong>بازار للموضه</strong>، نختصر عليك عناء التنقل والمفاضلة بين المحلات والمولات المختلفة. نجمع لك أفضل عروض الأجهزة الإلكترونية واللابتوبات المفحوصة بدقة في مكان واحد، لتصل إلى جهازك المفضل بأعلى جودة وأقل سعر دون تضييع وقتك.
            </p>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 w-full max-w-xl">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">توفير الوقت والجهد</h3>
                  <p className="text-xs text-gray-500 mt-0.5">بدون الحاجة للبحث والتنقل بين المولات والمحلات.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 shrink-0">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">أقوى العروض الحصرية</h3>
                  <p className="text-xs text-gray-500 mt-0.5">أسعار تنافسية وقيمة حقيقية مقابل سعر مناسب.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm sm:col-span-2">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">جودة واطمئنان قبل الاستلام</h3>
                  <p className="text-xs text-gray-500 mt-0.5">فحص كامل ودقيق لجميع الأجهزة لضمان عملها بأعلى كفاءة.</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Left Column (Reels / Shorts Vertical Video Frame) ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            viewport={{ once: true }}
            className="lg:col-span-5 w-full flex flex-col items-center justify-center"
          >
            {/* Phone-like Vertical Video Frame (9:16 aspect ratio) */}
            <div className="w-full max-w-[300px] sm:max-w-[330px] mx-auto">
              <div
                className="relative w-full overflow-hidden shadow-2xl bg-gray-900 border-4 border-gray-800 transition-all duration-300 group rounded-[2.5rem] aspect-[9/16]"
              >
                {/* Ambient Glow */}
                <div className="absolute -inset-1 bg-gradient-to-br from-primary/30 via-orange-500/20 to-blue-500/20 blur opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-[2.5rem]" />

                {/* Top Phone Notch Detail */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-gray-800/80 backdrop-blur-md rounded-full z-30 pointer-events-none flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-gray-900/90" />
                </div>

                {/* Dark overlay when paused */}
                {!isPlaying && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20 z-10 pointer-events-none transition-all group-hover:from-black/90" />
                )}

                {/* Thumbnail or iFrame */}
                {!isPlaying ? (
                  <>
                    <img
                      src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                      alt="فيديو عن شركة بازار للموضه"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />

                    {/* Center Play Button */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 gap-4 p-4 text-center">
                      <button
                        type="button"
                        onClick={() => setIsPlaying(true)}
                        className="outline-none group/play cursor-pointer"
                        aria-label="شاهد فيديو الريلز"
                      >
                        <div className="relative">
                          {/* Ping ring */}
                          <span className="absolute inset-0 rounded-full bg-white/40 animate-ping" />
                          <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full bg-white text-primary flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-transform duration-200">
                            <Play className="w-7 h-7 md:w-8 md:h-8 fill-current ml-1" />
                          </div>
                        </div>
                      </button>

                      <div className="space-y-1 select-none">
                        <p className="text-white font-black text-base md:text-lg drop-shadow-md">
                          شاهد الفكرة في ثوانٍ 🎬
                        </p>
                        <p className="text-gray-300 text-xs font-medium drop-shadow">
                          فيديو ريلز قصير عن خدمات بازار
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <iframe
                    className="absolute inset-0 w-full h-full border-0 z-20 rounded-[2.2rem]"
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                    title="فيديو تعريفي عن شركة بازار للموضه"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                )}
              </div>

              {/* Caption below video */}
              <p className="text-center text-xs text-gray-500 mt-3 font-semibold flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                فيديو ريلز تعريفي — بازار للموضه
              </p>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
