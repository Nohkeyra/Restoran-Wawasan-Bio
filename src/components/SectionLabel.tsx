interface SectionLabelProps {
  text: string;
  light?: boolean;
}

export default function SectionLabel({ text, light = false }: SectionLabelProps) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="w-2 h-2 rounded-full bg-warm-gold" />
      <span
        className={`font-body font-medium text-xs uppercase tracking-[0.1em] ${
          light ? 'text-warm-gold' : 'text-warm-gold'
        }`}
      >
        {text}
      </span>
    </div>
  );
}
