// Flat monochrome brand glyph — no gradient, no background tile.
// A stylized "compiler arrow" (chevron + bolt) that reads as a developer tool.
export function BrandMark({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 6l5 6-5 6" />
      <path d="M13 18h7" />
    </svg>
  );
}
