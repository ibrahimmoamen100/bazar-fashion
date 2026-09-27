import { redirect } from 'next/navigation';

export default function ProductsRoot() {
  redirect('/categories');
}
