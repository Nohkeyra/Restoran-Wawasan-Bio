import type { LucideIcon } from 'lucide-react';

interface PrincipleCardProps {
  icon: LucideIcon;
  name: string;
  malayName: string;
  description: string;
}

export default function PrincipleCard({ icon: Icon, name, malayName, description }: PrincipleCardProps) {
  return (
    <div className="group bg-charcoal/40 border border-warm-gold/15 rounded-xl p-8 md:p-10 text-center transition-all duration-500 hover:-translate-y-2 hover:border-warm-gold/40 hover:bg-deep-brown/40 hover:shadow-[0_8px_32px_rgba(0,0,0,0.2)] flex flex-col items-center h-full">
      {/* Premium Circular Icon Shield */}
      <div className="w-20 h-20 rounded-full border border-warm-gold/20 bg-charcoal flex items-center justify-center transition-all duration-500 group-hover:border-warm-gold/50 group-hover:bg-deep-brown group-hover:scale-105 shadow-inner">
        <Icon className="w-8 h-8 text-warm-gold transition-transform duration-500 group-hover:rotate-6" strokeWidth={1.5} />
      </div>
      
      <h3 className="font-display font-semibold text-[22px] text-cream mt-6 group-hover:text-warm-gold transition-colors duration-300">
        {name}
      </h3>
      
      <span className="inline-block px-3 py-1 bg-warm-gold/10 rounded-full font-body font-semibold text-[11px] text-warm-gold uppercase tracking-[0.08em] mt-2">
        {malayName}
      </span>
      
      <p className="font-body text-sm text-cream/75 leading-relaxed mt-4 flex-grow font-light">
        {description}
      </p>
    </div>
  );
}
