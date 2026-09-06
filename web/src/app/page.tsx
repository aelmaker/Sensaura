import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ margin: '3rem auto', maxWidth: 960, fontFamily: 'Arial, sans-serif' }}>
      <h1>Sensaura Platform</h1>
      <p>
        MVP-платформа для моніторингу пристроїв, телеметрії, кампаній та
        взаємодій.
      </p>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
        <Link href="/auth">Авторизація / Реєстрація</Link>
        <Link href="/dashboard">Панель</Link>
      </div>
    </main>
  );
}
