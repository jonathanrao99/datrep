import { getFileById } from '@/lib/db';

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const file = process.env.POSTGRES_URL ? await getFileById(id) : null;
  const name = file?.filename ?? 'Dataset';
  return {
    title: `View: ${name}`,
    description: `View data, insights, charts, and chat for ${name}.`,
  };
}

export default function ViewLayout({ children }: Props) {
  return children;
}
