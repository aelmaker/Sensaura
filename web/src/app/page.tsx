import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ margin: '3rem auto', maxWidth: 960, fontFamily: 'Arial, sans-serif' }}>
      <h1>Sensaura Platform</h1>
      <p>Production-ready IoT engagement platform starter.</p>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
        <Link href="/auth">Авторизація / Реєстрація</Link>
        <Link href="/dashboard">Відкрити панель</Link>
      </div>
    </main>
  );
}
