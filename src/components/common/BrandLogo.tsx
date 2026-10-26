import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// On définit les tailles exactes en pixels
const sizeMap = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', className = '' }) => {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const pixelSize = sizeMap[size];

  return (
    <img
      src={`${baseUrl}icon.svg`}
      alt="StockFacture Pro"
      // ✅ On force la taille exacte en pixels, ce qui empêche l'image de devenir géante
      width={pixelSize}
      height={pixelSize}
      style={{ 
        width: `${pixelSize}px`, 
        height: `${pixelSize}px`, 
        objectFit: 'contain' 
      }}
      className={className}
      loading="eager"
    />
  );
};