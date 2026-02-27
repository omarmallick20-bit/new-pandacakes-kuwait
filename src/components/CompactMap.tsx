import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

interface CompactMapProps {
  title?: string;
  className?: string;
  height?: string;
}

export function CompactMap({ 
  title = "Store Location", 
  className = "",
  height = "h-[200px]" 
}: CompactMapProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`rounded-lg overflow-hidden shadow-sm ${height}`}>
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3479.6194374260135!2d47.90644827552532!3d29.293500275310365!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3fcf907ba074ddb9%3A0x575decba9542b630!2sPANDA%20CAKES!5e0!3m2!1sen!2sqa!4v1771672383039!5m2!1sen!2sqa"
            className="w-full h-full border-0"
            allowFullScreen
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
            title="Panda Cakes Store Location"
          />
        </div>
        <div className="mt-2 text-xs text-muted-foreground text-center">
          Panda Cakes - Kuwait 🇰🇼
        </div>
      </CardContent>
    </Card>
  );
}