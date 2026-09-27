import BuilderManager from '@/views/admin/BuilderManager';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'إدارة قسم التجميعات المخصصة | لوحة التحكم',
  robots: {
    index: false,
    follow: false,
  },
};

export default function BuilderAdminPage() {
  return <BuilderManager />;
}
