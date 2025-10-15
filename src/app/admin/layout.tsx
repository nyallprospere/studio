export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // This re-uses the main layout but the sidebar will adapt based on the path.
  // A more complex app might have a completely separate root layout for admin.
  return <>{children}</>;
}
