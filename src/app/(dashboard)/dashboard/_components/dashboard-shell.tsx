interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-1 flex-col space-y-4">
      {children}
    </div>
  );
}
