import { Metadata } from 'next';
import AdminNavbar from '@/components/admin/AdminNavbar';

export const metadata: Metadata = {
  title: 'Admin Dashboard - Intaj AI',
  description: 'Admin dashboard for managing Intaj AI platform',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-layout">
      <AdminNavbar />
      <main>{children}</main>
    </div>
  );
}