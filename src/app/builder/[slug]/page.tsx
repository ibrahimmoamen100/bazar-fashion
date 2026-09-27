import BuilderView from '@/views/BuilderView';
import { BUILDER_PRESETS } from '@/constants/builderPresets';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug || '').toLowerCase();

  const preset = BUILDER_PRESETS.find(
    (p) => (p.slug && p.slug.toLowerCase() === decodedSlug) || p.id === decodedSlug
  );

  const title = preset ? `${preset.title} | تجميعة مخصصة - بازار للموضه` : 'ابني تجميعتك المخصصة | بازار للموضه';
  const description = preset?.description || 'صمم وابنِ تجميعتك بنفسك خطوة بخطوة مع أسعار مخفضة وتوافق مضمون 100%.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: preset?.showcaseImage ? [{ url: preset.showcaseImage }] : [],
    },
    alternates: {
      canonical: `https://bazar-fashion.vercel.app/builder/${decodedSlug}`,
    },
  };
}

export default async function BuilderSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug || '');
  return <BuilderView initialSlug={decodedSlug} />;
}
