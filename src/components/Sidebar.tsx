export default function Sidebar() {
  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <img 
          src="https://i.postimg.cc/jj9x2wr9/92953051_100850928268975_2573263542966812672_n.png" 
          alt="Logo Riverside" 
          style={{ height: '50px', width: 'auto' }}
        />
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ color: '#dc2626', fontWeight: 'bold', padding: '0.5rem', backgroundColor: '#fef2f2', borderRadius: '4px' }}>Dashboard</div>
        <div style={{ color: '#475569', padding: '0.5rem' }}>Patients</div>
        <div style={{ color: '#475569', padding: '0.5rem' }}>Trésorerie</div>
        <div style={{ color: '#475569', padding: '0.5rem' }}>Administration</div>
      </nav>
    </div>
  );
}
