export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-8">
      {children}
    </main>
  );
}
