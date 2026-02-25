import React, { useEffect, useRef, useState } from 'react';

interface ScrollAnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  animationClass?: string;
}

export function ScrollAnimatedSection({ 
  children, 
  className = '', 
  animationClass = 'animate-fade-in' 
}: ScrollAnimatedSectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1, rootMargin: '50px 0px' }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={sectionRef}
      className={`${className} ${isVisible ? animationClass : 'opacity-0 translate-y-8'} transition-all duration-700`}
    >
      {children}
    </div>
  );
}