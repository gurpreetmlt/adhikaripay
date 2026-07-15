// Hidden SVG def, mounted once in the root layout. Lucide icons accept `color="url(#id)"`
// which SVG resolves as a real gradient stroke — this is what lets every icon in the app
// share one consistent red → purple blend instead of two flat alternating colors.
export function GradientDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true">
      <defs>
        <linearGradient id="brand-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c8102e" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
    </svg>
  );
}
