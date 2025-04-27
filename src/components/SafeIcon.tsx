import React from 'react';
import type { LucideProps } from 'lucide-react';

// Use a dynamic component approach
interface SafeIconProps extends Omit<LucideProps, 'ref'> {
  name: string; // Allow any icon name
}

const SafeIcon: React.FC<SafeIconProps> = ({ name, ...props }) => {
  const [Icon, setIcon] = React.useState<React.ComponentType<LucideProps> | null>(null);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    // Use a proxy path for sensitive icons
    const iconPath = name === 'fingerprint' 
      ? '/icon-assets/fingerprint.js'
      : `lucide-react/dist/esm/icons/${name}.js`;
    
    // Dynamic import with error handling
    import(/* @vite-ignore */ iconPath)
      .then(module => {
        setIcon(() => module.default);
        setLoading(false);
      })
      .catch(error => {
        console.error(`Failed to load icon: ${name}`, error);
        setLoading(false);
      });
  }, [name]);
  
  if (loading) {
    return <div className="w-5 h-5 animate-pulse bg-gray-300/10 rounded" />;
  }
  
  if (!Icon) {
    return <div className="w-5 h-5 bg-red-300/10 rounded" />; // Error state
  }
  
  return <Icon {...props} />;
};

export default SafeIcon; 