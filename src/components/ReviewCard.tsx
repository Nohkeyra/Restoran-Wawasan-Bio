import { Star, Quote } from 'lucide-react';

interface ReviewCardProps {
  text: string;
  name: string;
  rating: number;
}

export default function ReviewCard({ text, name, rating }: ReviewCardProps) {
  return (
    <div className="bg-[#FAF8F5] rounded-xl p-8 md:p-10 border border-warm-gold/20 shadow-[0_6px_20px_rgba(45,37,32,0.03)] min-h-[300px] flex flex-col transition-all duration-500 hover:-translate-y-2 hover:border-warm-gold/40 hover:shadow-[0_12px_32px_rgba(45,37,32,0.08)] relative">
      {/* Absolute background card accent for luxury feel */}
      <div className="absolute top-0 left-0 w-full h-[3px] bg-warm-gold/60" />
      
      <div className="flex justify-between items-start mb-5">
        <Quote className="w-10 h-10 text-warm-gold/40" strokeWidth={1} />
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < rating ? 'text-warm-gold fill-warm-gold' : 'text-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      <p className="font-body text-base text-deep-brown/90 leading-relaxed italic flex-1 font-light">
        &ldquo;{text}&rdquo;
      </p>

      <div className="mt-6 pt-5 border-t border-warm-gold/10 flex items-center justify-between">
        <div>
          <span className="block font-body text-[11px] uppercase tracking-[0.12em] text-warm-gray font-semibold">Verified Guest</span>
          <p className="font-display font-semibold text-[15px] text-charcoal mt-0.5">{name}</p>
        </div>
        <div className="w-6 h-6 rounded-full bg-warm-gold/10 flex items-center justify-center">
          <span className="text-[10px] font-bold text-warm-gold">W</span>
        </div>
      </div>
    </div>
  );
}
