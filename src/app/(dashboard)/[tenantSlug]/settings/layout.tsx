import Link from "next/link";

const SUB_NAV = [
  { href: "", label: "Overview" },
  { href: "/branches", label: "Branches" },
];

export default function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tenantSlug: string };
}) {
  return (
    <div className="container space-y-6 py-6">
      <header>
        <p className="font-mono text-xs text-foreground-muted">SETTINGS</p>
        <h1 className="mt-1 text-h1">Workspace settings</h1>
      </header>
      <nav className="flex gap-1 overflow-x-auto border-b border-border">
        {SUB_NAV.map((item) => (
          <Link
            key={item.label}
            href={`/${params.tenantSlug}/settings${item.href}`}
            className="border-b-2 border-transparent px-3 py-2 text-sm text-foreground-muted hover:border-border hover:text-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
