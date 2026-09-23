export default function AdminPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div data-surface="day">{children}</div>;
}
