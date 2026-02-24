import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { getDashboardStats, getFilesByUserId } from '@/lib/db';
import { BarChart3, FileText, Brain, Activity, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default async function AnalyticsPage() {
  const session = await auth();
  const userId = session?.user?.id ?? session?.user?.email ?? undefined;

  let stats = { totalProjects: 0, totalInsights: 0, totalCharts: 0, recentUploads: 0 };
  let files: { id: string; filename: string; status: string; insightsCount: number }[] = [];

  if (process.env.POSTGRES_URL) {
    try {
      stats = await getDashboardStats(userId);
      const allFiles = await getFilesByUserId(userId);
      files = allFiles.map((f) => ({
        id: f.id,
        filename: f.filename,
        status: f.status,
        insightsCount: f.insightsCount ?? 0,
      }));
    } catch {
      // Fallback
    }
  }

  const completedCount = files.filter((f) => f.status === 'completed').length;
  const pendingCount = files.filter((f) => f.status === 'pending').length;

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Overview of your data analysis activity
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground">Datasets uploaded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Insights</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInsights}</div>
            <p className="text-xs text-muted-foreground">Insights generated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCount}</div>
            <p className="text-xs text-muted-foreground">Analyses completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting analysis</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Project Activity
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Your datasets and their analysis status
          </p>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No projects yet. Upload your first dataset to get started.</p>
              <Link href="/upload" className="text-primary hover:underline mt-2 inline-block">
                Upload Dataset
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {files.slice(0, 10).map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{f.filename}</span>
                    <span className="text-sm text-muted-foreground">
                      {f.insightsCount} insights
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        f.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : f.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {f.status}
                    </span>
                    <Link
                      href={`/view/${f.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
