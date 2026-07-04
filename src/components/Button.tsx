import { ArrowRight } from 'lucide-react';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'light';
  href?: string;
  onClick?: () => void;
  className?: string;
  small?: boolean;
}

export default function Button({
  children,
  variant = 'primary',
  href,
  onClick,
  className = '',
  small = false,
}: ButtonProps) {
  const base = `inline-flex items-center justify-center gap-2 rounded-lg font-body font-semibold text-sm uppercase tracking-[0.05em] transition-all duration-300 ease-out active:scale-[0.98] ${
    small ? 'px-6 py-3 text-[13px]' : 'px-8 py-4'
  }`;

  const variants = {
    primary: 'bg-warm-gold text-charcoal hover:bg-[#E0BC74] hover:scale-[1.02]',
    secondary:
      'bg-transparent border border-warm-gold text-warm-gold hover:bg-warm-gold hover:text-charcoal',
    light: 'bg-cream text-charcoal hover:bg-white hover:scale-[1.02]',
  };

  const classes = `${base} ${variants[variant]} ${className}`;

  const content = (
    <>
      {children}
      <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
    </>
  );

  if (href) {
    return (
      <a href={href} className={`group ${classes}`}>
        {content}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={`group ${classes}`}>
      {content}
    </button>
  );
}
