import { Star, Quote } from 'lucide-react';

interface ReviewCardProps {
  text: string;
  name: string;
  rating: number;
}

export default function ReviewCard({ text, name, rating }: ReviewCardProps) {
  return (
    <div className="bg-white rounded-xl p-8 md:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.06)] min-h-[280px] flex flex-col transition-all duration-400 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
      <Quote className="w-10 h-10 text-warm-gold/30 mb-4" strokeWidth={1} />
      <p className="font-body text-base text-deep-brown leading-relaxed italic flex-1">
        &ldquo;{text}&rdquo;
      </p>
      <div className="w-10 h-0.5 bg-warm-gold mt-6" />
      <p className="font-body font-semibold text-sm text-charcoal mt-4">{name}</p>
      <div className="flex gap-1 mt-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${
              i < rating ? 'text-warm-gold fill-warm-gold' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
