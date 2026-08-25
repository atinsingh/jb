import MonoLabel from './MonoLabel';

// "LABEL ————————————————— action →". The section divider that carries the
// page's structure now that cards are gone: a mono label, a hairline that eats
// the remaining width, and an optional trailing action.
export default function RuleHeading({ label, action, tracking = 'wide', style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, ...style }}>
      <MonoLabel tracking={tracking}>{label}</MonoLabel>
      <span style={{ flex: 1, height: 1, background: 'var(--jb-a-line-strong)' }} />
      {action}
    </div>
  );
}
