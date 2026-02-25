import React, { useEffect, useRef } from 'react';

const cakeImages = [
  '/cakes/cake1.jpg',
  '/cakes/cake2.jpg', 
  '/cakes/cake3.jpg',
  '/cakes/cake4.jpg',
  '/cakes/cake5.jpg',
  '/cakes/cake6.jpg',
  '/cakes/cake7.jpg',
  '/cakes/cake8.jpg',
  '/cakes/cake9.jpg',
  '/cakes/cake10.jpg'
];

export function AutoCakeSlider() {
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    const firstClone = slider.children[0].cloneNode(true);
    const secondClone = slider.children[1].cloneNode(true);
    const thirdClone = slider.children[2].cloneNode(true);
    
    slider.appendChild(firstClone);
    slider.appendChild(secondClone);
    slider.appendChild(thirdClone);

    let scrollAmount = 0;
    const slideWidth = slider.children[0].getBoundingClientRect().width + 16; // including gap

    const slide = () => {
      scrollAmount += 0.5; // Smooth continuous movement
      slider.style.transform = `translateX(-${scrollAmount}px)`;

      // Reset when we've moved past 3 images
      if (scrollAmount >= slideWidth * 3) {
        scrollAmount = 0;
      }
    };

    const interval = setInterval(slide, 16); // ~60fps for smooth animation

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <section className="py-20 px-4 bg-background overflow-hidden">
      <div className="container max-w-6xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-12 text-foreground animate-fade-in">
          Our Best Cakes
        </h2>
        
        <div className="relative overflow-hidden">
          <div 
            ref={sliderRef}
            className="flex gap-4 transition-transform"
            style={{ willChange: 'transform' }}
          >
            {cakeImages.map((image, index) => (
              <div key={index} className="flex-shrink-0 w-1/2 md:w-1/3">
                <div className="aspect-square rounded-2xl overflow-hidden shadow-xl">
                  <img
                    src={image}
                    alt={`Delicious cake ${index + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}