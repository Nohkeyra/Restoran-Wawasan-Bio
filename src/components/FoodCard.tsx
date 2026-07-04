interface FoodCardProps {
  name: string;
  description: string;
  price: string;
  image: string;
}

export default function FoodCard({ name, description, price, image }: FoodCardProps) {
  return (
    <div className="group bg-deep-brown rounded-xl border border-warm-gold/20 overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:border-warm-gold/40 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)] flex flex-col h-full relative">
      {/* Visual top bar decorator */}
      <div className="h-1 w-full bg-gradient-to-r from-terracotta via-warm-gold to-terracotta" />
      
      {/* Image container with modern hover zoom and gradient shield */}
      <div className="aspect-[4/3] overflow-hidden relative">
        <img
          src={image}
          alt={name}
          loading="lazy"
          className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-110 group-hover:rotate-1"
        />
        {/* Soft elegant shadow overlay inside image */}
        <div className="absolute inset-0 bg-gradient-to-t from-deep-brown/80 to-transparent opacity-60" />
      </div>

      {/* Content wrapper */}
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex justify-between items-start gap-3">
          <h3 className="font-display font-medium text-[22px] text-cream tracking-tight group-hover:text-warm-gold transition-colors duration-300">
            {name}
          </h3>
        </div>
        
        <p className="font-body text-[14px] text-cream/75 leading-relaxed mt-3 flex-grow">
          {description}
        </p>
        
        {/* Price Tag with background badge styling */}
        <div className="mt-5 pt-4 border-t border-cream/10 flex justify-between items-center">
          <span className="font-body text-xs uppercase tracking-[0.1em] text-cream/50 font-medium">Signature</span>
          <span className="font-display font-semibold text-lg text-warm-gold px-3 py-1 rounded bg-charcoal/50 border border-warm-gold/20 shadow-sm">
            {price}
          </span>
        </div>
      </div>
    </div>
  );
}
