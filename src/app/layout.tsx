import "./globals.css";
import Sidebar from "@/src/components/Sidebar";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ display: 'flex', height: '100vh', margin: 0, backgroundColor: '#f8fafc' }}>
        {/* Menu latéral fixe */}
        <aside style={{ width: '260px', height: '100%', borderRight: '1px solid #e2e8f0', backgroundColor: 'white', flexShrink: 0 }}>
          <Sidebar />
        </aside>
        {/* Zone de contenu principale */}
        <main style={{ flex: 1, height: '100%', overflowY: 'auto', padding: '2rem' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
