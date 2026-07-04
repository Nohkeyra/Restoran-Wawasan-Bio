import type { LucideIcon } from 'lucide-react';

interface PrincipleCardProps {
  icon: LucideIcon;
  name: string;
  malayName: string;
  description: string;
}

export default function PrincipleCard({ icon: Icon, name, malayName, description }: PrincipleCardProps) {
  return (
    <div className="bg-charcoal/60 border border-warm-gold/20 rounded-xl p-8 md:p-10 text-center transition-all duration-400 hover:-translate-y-1 hover:border-warm-gold/30">
      <Icon className="w-12 h-12 text-warm-gold mx-auto" strokeWidth={1.5} />
      <h3 className="font-display font-medium text-[22px] text-cream mt-5">{name}</h3>
      <p className="font-body font-medium text-sm text-warm-gold tracking-[0.05em] mt-1">{malayName}</p>
      <p className="font-body text-sm text-cream/60 leading-relaxed mt-3">{description}</p>
    </div>
  );
}
