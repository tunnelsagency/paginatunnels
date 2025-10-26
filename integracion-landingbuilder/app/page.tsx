import UnloquiaChatWidget from '@/components/UnloquiaChatWidget';

export default function LandingPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #eff6ff 0%, #f5f3ff 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
      }}
    >
      <div
        style={{
          maxWidth: '960px',
          width: '100%',
          display: 'grid',
          gap: '2rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          alignItems: 'center',
        }}
      >
        <section>
          <h1
            style={{
              fontSize: '2.5rem',
              lineHeight: 1.1,
              marginBottom: '1rem',
              color: '#0f172a',
            }}
          >
            Automatizá tus ventas con Unloquia
          </h1>
          <p
            style={{
              fontSize: '1rem',
              color: '#475569',
              marginBottom: '1.5rem',
            }}
          >
            Integra el bot conversacional en tu landing y responde a cada visitante en segundos.
            Personalizá la experiencia con tu propio clientId.
          </p>
          <ul style={{ color: '#334155', lineHeight: 1.6 }}>
            <li>✅ Captura de leads asistida por IA</li>
            <li>✅ Respuestas personalizadas según tu negocio</li>
            <li>✅ Integración segura vía proxy serverless</li>
          </ul>
        </section>

        <UnloquiaChatWidget clientId="CLIENT_ID" />
      </div>
    </main>
  );
}
