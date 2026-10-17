import { useEffect, useState } from "react";
import http from "../services/http";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { toast } from "react-toastify";
import Button from "../components/ui/button/Button";
import { Modal } from "../components/ui/modal";
import TableSkeleton from "../components/ui/skeleton/TableSkeleton";

type User = {
  id: string;
  fname: string;
  lname: string;
  email: string;
  isActive: boolean;
  createdAt: string;
};

export default function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeChecked, setActiveChecked] = useState(false);
  const [inactiveChecked, setInactiveChecked] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Edit state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ fname: "", lname: "", email: "", password: "", confirmPassword: "", isActive: true });

  // Delete modal state
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  // Loading states for actions
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      let url = "/api/v1/auth/users";
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (activeChecked && !inactiveChecked) params.append("status", "active");
      if (!activeChecked && inactiveChecked) params.append("status", "inactive");
      if (!activeChecked && !inactiveChecked) params.append("status", "none"); 
      params.append("page", currentPage.toString());
      
      if (params.toString()) url += `?${params.toString()}`;
      
      const res = await http.get(url);
      if (res.data?.data) {
        setUsers(res.data.data.users || []);
        setTotalPages(res.data.data.totalPages || 1);
        setTotalRecords(res.data.data.totalRecords || 0);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, activeChecked, inactiveChecked, currentPage]);

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      setIsDeleting(true);
      await http.delete(`/api/v1/auth/users/${userToDelete}`);
      toast.success("User deleted successfully");
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete user");
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await http.patch(`/api/v1/auth/users/${id}/status`, { isActive: !currentStatus });
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  const startEditing = (user: User) => {
    setEditingUserId(user.id);
    setEditForm({ fname: user.fname || "", lname: user.lname || "", email: user.email, password: "", confirmPassword: "", isActive: user.isActive });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const saveEdit = async () => {
    if (!editingUserId) return;
    
    if (editForm.password && editForm.password !== editForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setIsSaving(true);
      const { confirmPassword, ...dataToSend } = editForm;
      if (!dataToSend.password) delete (dataToSend as any).password;

      await http.patch(`/api/v1/auth/users/${editingUserId}`, dataToSend);
      toast.success("User updated successfully");
      setEditingUserId(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update user");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PageMeta title="Users List | AI Admin" description="Manage users in the system" />
      <PageBreadcrumb pageTitle="Users" />
      
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5 lg:mb-7">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            User Management
          </h3>
          <div className="flex gap-3 relative">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:max-w-[250px] rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-brand-500"
            />
            <div className="relative">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center justify-center rounded-lg border border-gray-300 p-2.5 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800 z-50">
                  <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Filter by Status</h4>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={activeChecked} 
                        onChange={(e) => setActiveChecked(e.target.checked)}
                        className="rounded border-gray-300 text-brand-500 focus:ring-brand-500" 
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={inactiveChecked} 
                        onChange={(e) => setInactiveChecked(e.target.checked)}
                        className="rounded border-gray-300 text-brand-500 focus:ring-brand-500" 
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Inactive</span>
                    </label>
                  </div>
                  <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
                    <button 
                      onClick={() => { setActiveChecked(false); setInactiveChecked(false); }}
                      className="w-full rounded text-center text-sm font-medium text-brand-500 hover:text-brand-600"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {loading ? (
          <TableSkeleton columns={7} rows={5} />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full whitespace-nowrap text-left text-sm text-gray-500 dark:text-gray-400">
              <thead className="bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                <tr>
                  <th className="px-6 py-4 font-semibold">Serial No</th>
                  <th className="px-6 py-4 font-semibold">Name</th>
                  <th className="px-6 py-4 font-semibold">Email</th>
                  <th className="px-6 py-4 font-semibold">Created At</th>
                  <th className="px-6 py-4 font-semibold">IsActive</th>
                  <th className="px-6 py-4 font-semibold text-right">Edit</th>
                  <th className="px-6 py-4 font-semibold text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user, index) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4">{(currentPage - 1) * 10 + index + 1}</td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {user.fname} {user.lname}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleToggleStatus(user.id, user.isActive)}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.isActive 
                            ? 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-400' 
                            : 'bg-error-50 text-error-700 dark:bg-error-900/30 dark:text-error-400'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => startEditing(user)} className="text-brand-500 hover:text-brand-700">
                        Edit
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setUserToDelete(user.id)} className="text-error-500 hover:text-error-700">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, totalRecords)} of {totalRecords} users
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => handlePageChange(i + 1)}
                        className={`h-8 w-8 rounded-lg text-sm font-medium ${
                          currentPage === i + 1
                            ? "bg-brand-500 text-white"
                            : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal isOpen={!!userToDelete} onClose={() => setUserToDelete(null)} className="max-w-[400px] p-6">
        <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Confirm Deletion</h3>
        <p className="mb-6 text-gray-500 dark:text-gray-400">
          Are you sure you want to delete this user? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button size="sm" variant="outline" onClick={() => setUserToDelete(null)}>
            Cancel
          </Button>
          <button 
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-lg bg-error-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </Modal>

      <Modal isOpen={!!editingUserId} onClose={() => setEditingUserId(null)} className="max-w-[400px] p-6">
        <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Edit User</h3>
        <div className="mb-6 flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
            <input 
              type="text" 
              value={editForm.fname} 
              onChange={(e) => setEditForm({ ...editForm, fname: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-brand-500" 
              placeholder="First Name"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
            <input 
              type="text" 
              value={editForm.lname} 
              onChange={(e) => setEditForm({ ...editForm, lname: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-brand-500" 
              placeholder="Last Name"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input 
              type="email" 
              value={editForm.email} 
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-brand-500" 
              placeholder="Email Address"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Password (Leave blank to keep current)</label>
            <input 
              type="password" 
              value={editForm.password} 
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-brand-500" 
              placeholder="New Password"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
            <input 
              type="password" 
              value={editForm.confirmPassword} 
              onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-brand-500" 
              placeholder="Confirm New Password"
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Account Active</label>
            <label className="relative inline-flex cursor-pointer items-center">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={editForm.isActive}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-500"></div>
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button size="sm" variant="outline" onClick={() => setEditingUserId(null)}>
            Cancel
          </Button>
          <button 
            onClick={saveEdit}
            disabled={isSaving}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </Modal>
    </>
  );
}
