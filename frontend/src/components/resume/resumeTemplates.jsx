'use client';

/**
 * Resume template engine.
 *
 * A registry of distinct resume LAYOUTS plus three customization axes —
 * accent colour, font pairing and density. Every template renders the SAME
 * data model, so the user can switch freely (FlowCV-style) and keep content.
 *
 *   data  = { identity:{name,title,email,location,linkedin}, summary,
 *             experience:[{role,company,dates,bullets[]}], skills:[] }
 *   theme = resolveTheme({ accentId, fontId, densityId })
 */

const MONO = 'var(--jb-font-mono)';

/* --------------------------------------------------------- tokens --- */
export const ACCENTS = [
  { id: 'emerald', name: 'Emerald', color: '#1FA463', soft: '#EAF6EE', ink: '#0C2C1C' },
  { id: 'blue', name: 'Blue', color: '#2D6CDF', soft: '#E9F0FE', ink: '#0C2340' },
  { id: 'indigo', name: 'Indigo', color: '#4B4DED', soft: '#ECEDFE', ink: '#16174A' },
  { id: 'plum', name: 'Plum', color: '#8A3FA0', soft: '#F5EAF8', ink: '#3A1745' },
  { id: 'rose', name: 'Rose', color: '#C6407A', soft: '#FCEAF1', ink: '#4A0F2A' },
  { id: 'amber', name: 'Amber', color: '#C9622E', soft: '#FBEEE2', ink: '#4A2410' },
  { id: 'teal', name: 'Teal', color: '#0E9C9C', soft: '#E3F5F5', ink: '#093A3A' },
  { id: 'slate', name: 'Slate', color: '#3A4654', soft: '#EDF0F3', ink: '#161C24' },
  { id: 'ink', name: 'Ink', color: '#1B1A16', soft: '#EFEBE1', ink: '#000000' },
];

/*
 * Only pairings that can actually render. The app ships three faces
 * (--jb-font-display / --jb-font-sans / --jb-font-mono, see _app.js), so the
 * old five-option list was four labels lying about two rendered results:
 * "Fraunces", "Space" and "Bricolage" were never loaded and silently fell back
 * to the browser default. Unknown/legacy fontIds resolve to FONTS[0].
 */
export const FONTS = [
  { id: 'classic', name: 'Classic', tag: 'Serif · Sans', heading: 'var(--jb-font-display)', body: 'var(--jb-font-sans)' },
  { id: 'clean', name: 'Clean', tag: 'Sans · Sans', heading: 'var(--jb-font-sans)', body: 'var(--jb-font-sans)' },
  { id: 'technical', name: 'Technical', tag: 'Mono · Sans', heading: MONO, body: 'var(--jb-font-sans)' },
];

export const DENSITIES = [
  { id: 'compact', name: 'Compact', scale: 0.9 },
  { id: 'cozy', name: 'Cozy', scale: 1 },
  { id: 'spacious', name: 'Spacious', scale: 1.12 },
];

export function resolveTheme({ accentId, fontId, densityId } = {}) {
  const a = ACCENTS.find((x) => x.id === accentId) || ACCENTS[0];
  const f = FONTS.find((x) => x.id === fontId) || FONTS[0];
  const d = DENSITIES.find((x) => x.id === densityId) || DENSITIES[1];
  return {
    accentId: a.id,
    accent: a.color,
    accentSoft: a.soft,
    accentInk: a.ink,
    heading: f.heading,
    body: f.body,
    scale: d.scale,
  };
}

/* -------------------------------------------------------- helpers --- */
const contact = (id) => [id.email, id.location, id.linkedin].filter(Boolean);
const s = (n, scale) => Math.round(n * scale);

function Ph({ children }) {
  return <span style={{ color: '#B9B1A0', fontStyle: 'italic' }}>{children}</span>;
}

function ContactRow({ id, sep = '·', color = '#5A544A', center = false, mono = true }) {
  const items = contact(id);
  if (!items.length) return <Ph>email · location · linkedin</Ph>;
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        justifyContent: center ? 'center' : 'flex-start',
        fontFamily: mono ? MONO : 'inherit',
        fontSize: 11.5,
        color,
      }}
    >
      {items.map((v, i) => (
        <span key={i} style={{ display: 'inline-flex', gap: 12 }}>
          <span>{v}</span>
          {i < items.length - 1 && <span style={{ opacity: 0.5 }}>{sep}</span>}
        </span>
      ))}
    </div>
  );
}

function ExpItem({ e, accent, scale, dark }) {
  return (
    <div style={{ marginBottom: s(16, scale) }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 2 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: dark ? '#F4EFE4' : '#1B1A16' }}>{e.role}</span>
        <span style={{ fontFamily: MONO, fontSize: 11, color: dark ? '#9A9184' : '#8A8378', flexShrink: 0 }}>{e.dates}</span>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: accent, marginBottom: 6 }}>{e.company}</div>
      {(e.bullets || []).map((b, j) => (
        <div key={j} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <span style={{ color: accent, flexShrink: 0, fontSize: 12, lineHeight: 1.5 }}>▪</span>
          <span style={{ fontSize: 12.5, lineHeight: 1.55, color: dark ? '#CFC8BA' : '#2A2820' }}>{b}</span>
        </div>
      ))}
    </div>
  );
}

function ExperienceBlock({ data, accent, scale }) {
  if (!data.experience.length) return <Ph>Add your work experience — roles, achievements, impact.</Ph>;
  return data.experience.map((e, i) => <ExpItem key={i} e={e} accent={accent} scale={scale} />);
}

function Pills({ skills, accent, soft, outline }) {
  if (!skills.length) return <Ph>Add your skills.</Ph>;
  return (
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
      {skills.map((sk, i) => (
        <span
          key={i}
          style={{
            fontSize: 11.5,
            fontWeight: 500,
            color: outline ? accent : '#2A2820',
            background: outline ? 'transparent' : soft,
            border: outline ? `1px solid ${accent}` : '1px solid transparent',
            borderRadius: 6,
            padding: '4px 10px',
          }}
        >
          {sk}
        </span>
      ))}
    </div>
  );
}

/* ============================================================ TEMPLATES */

/* 1) CLASSIC — traditional single column, strong rule under the header */
function Classic({ data, theme }) {
  const { identity: id } = data;
  const { accent, body, heading, scale, accentSoft } = theme;
  const Label = ({ children }) => (
    <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: accent, marginBottom: 9 }}>{children}</div>
  );
  return (
    <div style={{ fontFamily: body, color: '#2A2820', padding: `${s(52, scale)}px ${s(56, scale)}px`, background: '#fff' }}>
      <div style={{ borderBottom: '2px solid #1B1A16', paddingBottom: 16, marginBottom: 22 }}>
        <h2 style={{ fontFamily: heading, fontWeight: 500, fontSize: s(38, scale), lineHeight: 1, margin: '0 0 6px', color: '#1B1A16' }}>{id.name || 'Your name'}</h2>
        {id.title ? <div style={{ fontSize: 14, fontWeight: 600, color: accent, marginBottom: 10 }}>{id.title}</div> : null}
        <ContactRow id={id} />
      </div>
      <div style={{ marginBottom: s(22, scale) }}><Label>Summary</Label>{data.summary ? <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>{data.summary}</p> : <Ph>Add a professional summary.</Ph>}</div>
      <div style={{ marginBottom: s(22, scale) }}><Label>Experience</Label><ExperienceBlock data={data} accent={accent} scale={scale} /></div>
      <div><Label>Skills</Label><Pills skills={data.skills} accent={accent} soft={accentSoft} /></div>
    </div>
  );
}

/* 2) MODERN — bold accent header band, clean body */
function Modern({ data, theme }) {
  const { identity: id } = data;
  const { accent, body, heading, scale, accentSoft } = theme;
  const Label = ({ children }) => (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 5, marginBottom: 11 }}>
      <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase', color: accent }}>{children}</span>
      <span style={{ width: 26, height: 3, borderRadius: 2, background: accent }} />
    </div>
  );
  return (
    <div style={{ fontFamily: body, color: '#2A2820', background: '#fff' }}>
      <div style={{ background: accent, color: '#fff', padding: `${s(38, scale)}px ${s(52, scale)}px ${s(34, scale)}px` }}>
        <h2 style={{ fontFamily: heading, fontWeight: 700, fontSize: s(34, scale), lineHeight: 1.05, margin: '0 0 6px', color: '#fff' }}>{id.name || 'Your name'}</h2>
        {id.title ? <div style={{ fontSize: 14.5, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: 12 }}>{id.title}</div> : <div style={{ height: 8 }} />}
        <ContactRow id={id} color="rgba(255,255,255,0.9)" />
      </div>
      <div style={{ padding: `${s(34, scale)}px ${s(52, scale)}px ${s(48, scale)}px` }}>
        <div style={{ marginBottom: s(24, scale) }}><Label>Summary</Label>{data.summary ? <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>{data.summary}</p> : <Ph>Add a professional summary.</Ph>}</div>
        <div style={{ marginBottom: s(24, scale) }}><Label>Experience</Label><ExperienceBlock data={data} accent={accent} scale={scale} /></div>
        <div><Label>Skills</Label><Pills skills={data.skills} accent={accent} soft={accentSoft} /></div>
      </div>
    </div>
  );
}

/* 3) SIDEBAR — two columns; contact + skills in a tinted rail */
function Sidebar({ data, theme }) {
  const { identity: id } = data;
  const { accent, accentSoft, accentInk, body, heading, scale } = theme;
  const RailLabel = ({ children }) => (
    <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: accent, marginBottom: 10 }}>{children}</div>
  );
  const MainLabel = ({ children }) => (
    <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase', color: accent, marginBottom: 10, paddingBottom: 6, borderBottom: `2px solid ${accentSoft}` }}>{children}</div>
  );
  return (
    <div style={{ fontFamily: body, color: '#2A2820', background: '#fff', display: 'flex', alignItems: 'stretch', minHeight: 560 }}>
      {/* rail */}
      <div style={{ width: '34%', background: accentSoft, padding: `${s(38, scale)}px ${s(24, scale)}px`, flexShrink: 0 }}>
        <RailLabel>Contact</RailLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: s(26, scale), fontSize: 11.5, color: accentInk, wordBreak: 'break-word' }}>
          {contact(id).length ? contact(id).map((v, i) => <span key={i}>{v}</span>) : <Ph>email · location</Ph>}
        </div>
        <RailLabel>Skills</RailLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.skills.length ? data.skills.map((sk, i) => (
            <span key={i} style={{ fontSize: 12, color: accentInk, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: accent, flexShrink: 0 }} />{sk}
            </span>
          )) : <Ph>Add skills.</Ph>}
        </div>
      </div>
      {/* main */}
      <div style={{ flex: 1, padding: `${s(38, scale)}px ${s(38, scale)}px` }}>
        <h2 style={{ fontFamily: heading, fontWeight: 700, fontSize: s(32, scale), lineHeight: 1.05, margin: '0 0 5px', color: '#1B1A16' }}>{id.name || 'Your name'}</h2>
        {id.title ? <div style={{ fontSize: 14, fontWeight: 600, color: accent, marginBottom: 20 }}>{id.title}</div> : <div style={{ height: 16 }} />}
        <div style={{ marginBottom: s(22, scale) }}><MainLabel>Summary</MainLabel>{data.summary ? <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>{data.summary}</p> : <Ph>Add a professional summary.</Ph>}</div>
        <div><MainLabel>Experience</MainLabel><ExperienceBlock data={data} accent={accent} scale={scale} /></div>
      </div>
    </div>
  );
}

/* 4) MINIMAL — airy, monochrome, hairline rules */
function Minimal({ data, theme }) {
  const { identity: id } = data;
  const { accent, body, heading, scale } = theme;
  const Label = ({ children }) => (
    <div style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #EDE7DA' }}>{children}</div>
  );
  return (
    <div style={{ fontFamily: body, color: '#2A2820', padding: `${s(60, scale)}px ${s(60, scale)}px`, background: '#fff' }}>
      <div style={{ marginBottom: s(34, scale) }}>
        <h2 style={{ fontFamily: heading, fontWeight: 400, fontSize: s(34, scale), lineHeight: 1.1, letterSpacing: '0.01em', margin: '0 0 8px', color: '#1B1A16' }}>{id.name || 'Your name'}</h2>
        {id.title ? <div style={{ fontSize: 13, fontWeight: 500, color: '#6B655A', letterSpacing: '0.04em', marginBottom: 12 }}>{id.title}</div> : null}
        <ContactRow id={id} color="#8A8378" sep="/" />
      </div>
      <div style={{ marginBottom: s(28, scale) }}><Label>Profile</Label>{data.summary ? <p style={{ fontSize: 13, lineHeight: 1.7, margin: 0, color: '#3A362E' }}>{data.summary}</p> : <Ph>Add a professional summary.</Ph>}</div>
      <div style={{ marginBottom: s(28, scale) }}><Label>Experience</Label><ExperienceBlock data={data} accent={accent} scale={scale} /></div>
      <div><Label>Skills</Label>{data.skills.length ? <div style={{ fontSize: 12.5, lineHeight: 1.8, color: '#3A362E' }}>{data.skills.join('  ·  ')}</div> : <Ph>Add your skills.</Ph>}</div>
    </div>
  );
}

/* 5) ELEGANT — centred serif header, framed section titles */
function Elegant({ data, theme }) {
  const { identity: id } = data;
  const { accent, accentSoft, body, heading, scale } = theme;
  const Label = ({ children }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 12px' }}>
      <span style={{ flex: 1, height: 1, background: accentSoft }} />
      <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: accent }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: accentSoft }} />
    </div>
  );
  return (
    <div style={{ fontFamily: body, color: '#2A2820', padding: `${s(52, scale)}px ${s(56, scale)}px`, background: '#fff' }}>
      <div style={{ textAlign: 'center', marginBottom: s(28, scale) }}>
        <h2 style={{ fontFamily: heading, fontWeight: 500, fontSize: s(40, scale), lineHeight: 1.05, margin: '0 0 6px', color: '#1B1A16' }}>{id.name || 'Your name'}</h2>
        {id.title ? <div style={{ fontSize: 14, fontStyle: 'italic', color: accent, marginBottom: 12 }}>{id.title}</div> : <div style={{ height: 6 }} />}
        <div style={{ display: 'flex', justifyContent: 'center' }}><ContactRow id={id} center /></div>
      </div>
      <div style={{ marginBottom: s(22, scale) }}><Label>Summary</Label>{data.summary ? <p style={{ fontSize: 13, lineHeight: 1.65, margin: 0, textAlign: 'center' }}>{data.summary}</p> : <div style={{ textAlign: 'center' }}><Ph>Add a professional summary.</Ph></div>}</div>
      <div style={{ marginBottom: s(22, scale) }}><Label>Experience</Label><ExperienceBlock data={data} accent={accent} scale={scale} /></div>
      <div><Label>Skills</Label><div style={{ display: 'flex', justifyContent: 'center' }}><Pills skills={data.skills} accent={accent} soft={accentSoft} /></div></div>
    </div>
  );
}

/* ------------------------------------------------------- thumbnails --- */
const line = (w, c = '#D8D0BF', h = 4) => ({ width: w, height: h, borderRadius: 2, background: c });

function ThumbFrame({ children, pad = 8 }) {
  return <div style={{ width: '100%', aspectRatio: '3 / 4', background: '#fff', padding: pad, display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden' }}>{children}</div>;
}
function ClassicThumb({ theme }) {
  return (
    <ThumbFrame>
      <div style={line('62%', '#1B1A16', 7)} />
      <div style={line('34%', theme.accent, 4)} />
      <div style={{ height: 2, background: '#1B1A16', margin: '3px 0' }} />
      {['86%', '92%', '70%'].map((w, i) => <div key={i} style={line(w)} />)}
      <div style={{ ...line('40%', theme.accent, 4), marginTop: 4 }} />
      {['88%', '64%'].map((w, i) => <div key={i} style={line(w)} />)}
    </ThumbFrame>
  );
}
function ModernThumb({ theme }) {
  return (
    <ThumbFrame pad={0}>
      <div style={{ background: theme.accent, padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={line('58%', 'rgba(255,255,255,0.95)', 7)} />
        <div style={line('34%', 'rgba(255,255,255,0.7)', 4)} />
      </div>
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={line('30%', theme.accent, 4)} />
        {['88%', '92%', '68%'].map((w, i) => <div key={i} style={line(w)} />)}
        <div style={{ ...line('30%', theme.accent, 4), marginTop: 3 }} />
        {['84%'].map((w, i) => <div key={i} style={line(w)} />)}
      </div>
    </ThumbFrame>
  );
}
function SidebarThumb({ theme }) {
  return (
    <ThumbFrame pad={0}>
      <div style={{ display: 'flex', height: '100%' }}>
        <div style={{ width: '36%', background: theme.accentSoft, padding: 7, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={line('80%', theme.accent, 4)} />
          {['70%', '60%', '75%', '55%'].map((w, i) => <div key={i} style={line(w, '#CFC6B4', 3)} />)}
        </div>
        <div style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={line('70%', '#1B1A16', 7)} />
          <div style={line('40%', theme.accent, 4)} />
          {['92%', '86%', '70%'].map((w, i) => <div key={i} style={line(w)} />)}
        </div>
      </div>
    </ThumbFrame>
  );
}
function MinimalThumb() {
  return (
    <ThumbFrame pad={10}>
      <div style={line('50%', '#1B1A16', 6)} />
      <div style={line('26%', '#B7AE9C', 3)} />
      <div style={{ height: 1, background: '#EDE7DA', margin: '5px 0' }} />
      {['82%', '88%'].map((w, i) => <div key={i} style={line(w, '#D8D0BF', 3)} />)}
      <div style={{ height: 1, background: '#EDE7DA', margin: '5px 0' }} />
      {['74%', '60%'].map((w, i) => <div key={i} style={line(w, '#D8D0BF', 3)} />)}
    </ThumbFrame>
  );
}
function ElegantThumb({ theme }) {
  const dash = { display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' };
  const half = { flex: 1, height: 1, background: theme.accentSoft };
  return (
    <ThumbFrame>
      <div style={{ ...line('56%', '#1B1A16', 7), alignSelf: 'center' }} />
      <div style={{ ...line('30%', theme.accent, 4), alignSelf: 'center' }} />
      <div style={{ ...dash, margin: '4px 0' }}><span style={half} /><span style={line(16, theme.accent, 3)} /><span style={half} /></div>
      {['88%', '78%'].map((w, i) => <div key={i} style={{ ...line(w), alignSelf: 'center' }} />)}
      <div style={{ ...dash, margin: '4px 0' }}><span style={half} /><span style={line(16, theme.accent, 3)} /><span style={half} /></div>
      {['82%'].map((w, i) => <div key={i} style={{ ...line(w), alignSelf: 'center' }} />)}
    </ThumbFrame>
  );
}

/* --------------------------------------------------------- registry --- */
export const TEMPLATES = [
  { id: 'classic', name: 'Classic', blurb: 'Timeless single column', Component: Classic, Thumb: ClassicThumb },
  { id: 'modern', name: 'Modern', blurb: 'Bold accent header', Component: Modern, Thumb: ModernThumb },
  { id: 'sidebar', name: 'Sidebar', blurb: 'Two-column with rail', Component: Sidebar, Thumb: SidebarThumb },
  { id: 'minimal', name: 'Minimal', blurb: 'Airy and monochrome', Component: Minimal, Thumb: MinimalThumb },
  { id: 'elegant', name: 'Elegant', blurb: 'Centred serif', Component: Elegant, Thumb: ElegantThumb },
];

export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
}

export const DEFAULT_DESIGN = { templateId: 'classic', accentId: 'emerald', fontId: 'classic', densityId: 'cozy' };
