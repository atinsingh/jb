import Link from 'next/link';

export default function Button({ variant = 'primary', href, children, style, ...rest }) {
  const variantStyle = {
    primary: {
      background: 'var(--jb-a-accent)',
      color: 'var(--jb-a-accent-ink)',
      border: 'none',
      fontWeight: 700,
    },
    secondary: {
      background: 'var(--jb-a-card)',
      color: 'var(--jb-a-ink)',
      border: '1px solid var(--jb-a-line-strong)',
      fontWeight: 600,
    },
    ghost: {
      background: 'transparent',
      color: 'var(--jb-a-ink-2)',
      border: '1px solid var(--jb-a-line-strong)',
      fontWeight: 600,
      width: 38,
      height: 38,
      padding: 0,
    },
  }[variant];

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: variant === 'ghost' ? undefined : 40,
    padding: variant === 'ghost' ? undefined : '0 18px',
    borderRadius: variant === 'ghost' ? 9 : 10,
    fontSize: 14,
    fontFamily: 'inherit',
    textDecoration: 'none',
    cursor: 'pointer',
  };

  const mergedStyle = { ...base, ...variantStyle, ...style };

  if (href) {
    return (
      <Link href={href} style={mergedStyle} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" style={mergedStyle} {...rest}>
      {children}
    </button>
  );
}
