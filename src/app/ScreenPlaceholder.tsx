interface ScreenPlaceholderProps {
  title: string;
}

export function ScreenPlaceholder({ title }: ScreenPlaceholderProps) {
  return (
    <main className="main-single">
      <div style={{ padding: 24 }}>
        <h2>{title}</h2>
        <p>This screen is implemented in a later plan.</p>
      </div>
    </main>
  );
}
