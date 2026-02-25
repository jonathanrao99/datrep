import { getFileById } from '@/lib/db';

type Props = {
  children: React.ReactNode;
  params: Promise<{ fileId: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { fileId } = await params;
  const file = process.env.POSTGRES_URL ? await getFileById(fileId) : null;
  const name = file?.filename ?? 'Insights';
  return {
    title: `Insights: ${name}`,
    description: `AI-generated insights, charts, and data analysis for ${name}.`,
  };
}

export default function InsightsLayout({ children }: Props) {
  return children;
}
