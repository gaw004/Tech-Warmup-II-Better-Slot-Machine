import { palette, typography } from './theme/tokens';

function App() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: palette.backgroundDeep,
        color: palette.textPrimary,
        fontFamily: typography.fontStackPrimary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 24,
      }}
    >
      <div>
        <h1 style={{ color: palette.spinNeon, margin: 0, letterSpacing: '0.08em' }}>
          DATA HEIST
        </h1>
        <p style={{ color: palette.mutedText, marginTop: 12 }}>
          Scaffold ready. Game logic lands in P01+.
        </p>
      </div>
    </div>
  );
}

export default App;
