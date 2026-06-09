export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-3 py-6 sm:px-4 sm:py-8">
      {children}
    </main>
  );
}
