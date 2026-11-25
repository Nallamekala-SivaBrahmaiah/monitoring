import { redirect } from 'next/navigation';

export default function ThemeCustomizerPage() {
  redirect('/dashboard/style-studio?tab=appearance');
}
