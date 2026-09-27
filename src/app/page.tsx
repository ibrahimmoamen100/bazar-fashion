import IndexView from '@/views/Index';
import { productsService } from '@/lib/firebase';
import type { Metadata } from 'next';

// ISR: إعادة بناء الصفحة الرئيسية كل 24 ساعة (مع التحديث الفوري عند أي تعديل من الأدمن عبر /api/revalidate)
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'بازار للموضه | لابتوب استيراد وجديد - Docking Station - سماعات - رواتر',
  description:
    'متجرك الشامل للأجهزة الإلكترونية في مصر. نوفر لابتوبات استيراد وجديدة، docking station، سماعات، تجميعات كمبيوتر وكيسات استيراد، رواتر Tenda وغيرها بأفضل الأسعار وأعلى جودة.',
  keywords: [
    'لاب توب استيراد',
    'لابتوب جديد',
    'dockstation',
    'docking station',
    'سماعات',
    'تجميعات كمبيوتر',
    'كيسات استيراد',
    'رواتر tenda',
    'روتر تندا',
    'بازار للموضه',
    'كمبيوتر استيراد مصر'
  ],
  alternates: {
    canonical: 'https://bazar-fashion.vercel.app/',
  },
};

export default async function Home() {
  // Fetch products server-side
  let products = [];
  try {
    products = await productsService.getAllProducts();
  } catch (error) {
    console.error('Failed to fetch products for SSR Home Page:', error);
  }

  return <IndexView initialProducts={products} />;
}
