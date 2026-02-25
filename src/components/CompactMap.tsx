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
            src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d28878.39581486397!2d51.574197!3d25.209984!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e45cfd07986c83d%3A0xf63a0d6de5f4d17a!2sPANDA%20CAKES!5e0!3m2!1sen!2sqa!4v1758026332523!5m2!1sen!2sqa"
            className="w-full h-full border-0"
            allowFullScreen
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
            title="Panda Cakes Store Location"
          />
        </div>
        <div className="mt-2 text-xs text-muted-foreground text-center">
          Panda Cakes - Kuwait
        </div>
      </CardContent>
    </Card>
  );
}