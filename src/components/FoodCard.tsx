interface FoodCardProps {
  name: string;
  description: string;
  price: string;
  image: string;
}

export default function FoodCard({ name, description, price, image }: FoodCardProps) {
  return (
    <div className="group bg-deep-brown rounded-xl border border-warm-gold/15 overflow-hidden transition-all duration-400 hover:-translate-y-1.5 hover:border-warm-gold/30 hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={image}
          alt={name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="p-6">
        <h3 className="font-display font-medium text-[22px] text-cream">{name}</h3>
        <p className="font-body text-sm text-cream/60 leading-relaxed mt-2">{description}</p>
        <p className="font-display font-semibold text-lg text-warm-gold mt-3">{price}</p>
      </div>
    </div>
  );
}
