import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import http from "../../services/http";
import { toast } from "react-toastify";
import TableSkeleton from "../../components/ui/skeleton/TableSkeleton";
import { UserIcon } from "../../icons";

type DashboardStats = {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  recentUsers: {
    id: string;
    fname: string;
    lname: string;
    email: string;
    isActive: boolean;
    createdAt: string;
  }[];
};

export default function Home() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await http.get("/api/v1/auth/dashboard-stats");
        if (res.data?.data) {
          setStats(res.data.data);
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to fetch dashboard stats");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <>
      <PageMeta
        title="Admin Dashboard | AI Admin"
        description="AI Admin Dashboard"
      />
      <div className="flex flex-col gap-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
          {/* Card 1: Total Users */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/20 dark:text-brand-400">
                <UserIcon />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</p>
                {loading ? (
                  <div className="mt-1 h-6 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                ) : (
                  <h4 className="text-2xl font-bold text-gray-800 dark:text-white/90">
                    {stats?.totalUsers || 0}
                  </h4>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Active Users */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-50 text-success-500 dark:bg-success-500/20 dark:text-success-400">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Users</p>
                {loading ? (
                  <div className="mt-1 h-6 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                ) : (
                  <h4 className="text-2xl font-bold text-gray-800 dark:text-white/90">
                    {stats?.activeUsers || 0}
                  </h4>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Inactive Users */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-50 text-error-500 dark:bg-error-500/20 dark:text-error-400">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Inactive Users</p>
                {loading ? (
                  <div className="mt-1 h-6 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                ) : (
                  <h4 className="text-2xl font-bold text-gray-800 dark:text-white/90">
                    {stats?.inactiveUsers || 0}
                  </h4>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Users Table */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
            Top 5 Recent Users
          </h3>

          {loading ? (
            <TableSkeleton columns={5} rows={5} />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full whitespace-nowrap text-left text-sm text-gray-500 dark:text-gray-400">
                <thead className="bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Name</th>
                    <th className="px-6 py-4 font-semibold">Email</th>
                    <th className="px-6 py-4 font-semibold">Created At</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {stats?.recentUsers?.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {user.fname} {user.lname}
                        </span>
                      </td>
                      <td className="px-6 py-4">{user.email}</td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            user.isActive
                              ? "bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                              : "bg-error-50 text-error-700 dark:bg-error-900/30 dark:text-error-400"
                          }`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!stats?.recentUsers || stats.recentUsers.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center">
                        No recent users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
