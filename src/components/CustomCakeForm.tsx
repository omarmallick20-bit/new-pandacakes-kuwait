import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Palette, Cake, Users, Calendar, Image, Sparkles } from "lucide-react";
import { DEFAULT_CURRENCY } from '@/config/country';

export default function CustomCakeForm() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    cakeType: '',
    size: '',
    servings: '',
    flavors: '',
    theme: '',
    colors: '',
    decorations: '',
    message: '',
    deliveryDate: '',
    specialRequirements: '',
    contactName: '',
    contactPhone: '',
    referenceImages: ''
  });

  const cakeTypes = [
    'Birthday Cake',
    'Wedding Cake',
    'Anniversary Cake',
    'Graduation Cake',
    'Corporate Event Cake',
    'Baby Shower Cake',
    'Custom Theme Cake',
    'Multi-Tier Cake',
    'Cupcake Tower',
    'Other (Specify in details)'
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create WhatsApp message
    const message = `🎂 *CUSTOM CAKE REQUEST* 🎂

📋 *Cake Details:*
• Type: ${formData.cakeType}
• Size: ${formData.size}
• Servings: ${formData.servings}
• Flavors: ${formData.flavors}

🎨 *Design:*
• Theme: ${formData.theme}
• Colors: ${formData.colors}
• Decorations: ${formData.decorations}
• Message on cake: ${formData.message}

📅 *Delivery Date:* ${formData.deliveryDate}

💝 *Special Requirements:*
${formData.specialRequirements}

👤 *Contact Information:*
• Name: ${formData.contactName}
• Phone: ${formData.contactPhone}

${formData.referenceImages ? `📸 *Reference Images:* ${formData.referenceImages}` : ''}

---
Please provide a quote and confirm availability for this custom cake order. Thank you! 🙏`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/97455550123?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: "Custom cake request sent!",
      description: "We'll review your requirements and get back to you with a quote within 24 hours.",
    });

    // Reset form
    setFormData({
      cakeType: '',
      size: '',
      servings: '',
      flavors: '',
      theme: '',
      colors: '',
      decorations: '',
      message: '',
      deliveryDate: '',
      specialRequirements: '',
      contactName: '',
      contactPhone: '',
      referenceImages: ''
    });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-tiffany to-sunshine rounded-full flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold">Custom Cake Designer</CardTitle>
        <CardDescription>
          Let us create the perfect cake for your special occasion. Fill out the details below and we'll provide a personalized quote.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cake Basics */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Cake className="w-5 h-5 text-tiffany" />
              <h3 className="text-lg font-semibold">Cake Basics</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cakeType">Cake Type *</Label>
                <Select value={formData.cakeType} onValueChange={(value) => handleInputChange('cakeType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cake type" />
                  </SelectTrigger>
                  <SelectContent>
                    {cakeTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="size">Size/Dimensions *</Label>
                <Input
                  id="size"
                  placeholder="e.g., 10 inch round, 12x8 inch rectangle"
                  value={formData.size}
                  onChange={(e) => handleInputChange('size', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="servings">Number of Servings *</Label>
                <Input
                  id="servings"
                  placeholder="e.g., 20-25 people"
                  value={formData.servings}
                  onChange={(e) => handleInputChange('servings', e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="flavors">Flavors *</Label>
                <Input
                  id="flavors"
                  placeholder="e.g., Vanilla sponge with chocolate ganache"
                  value={formData.flavors}
                  onChange={(e) => handleInputChange('flavors', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Design & Decoration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-tiffany" />
              <h3 className="text-lg font-semibold">Design & Decoration</h3>
            </div>
            
            <div>
              <Label htmlFor="theme">Theme/Concept</Label>
              <Input
                id="theme"
                placeholder="e.g., Princess theme, Superhero, Floral, Minimalist"
                value={formData.theme}
                onChange={(e) => handleInputChange('theme', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="colors">Color Scheme</Label>
                <Input
                  id="colors"
                  placeholder="e.g., Pink and gold, Blue and white"
                  value={formData.colors}
                  onChange={(e) => handleInputChange('colors', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="decorations">Special Decorations</Label>
                <Input
                  id="decorations"
                  placeholder="e.g., Fondant figures, Fresh flowers, Edible glitter"
                  value={formData.decorations}
                  onChange={(e) => handleInputChange('decorations', e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="message">Message on Cake</Label>
              <Input
                id="message"
                placeholder="e.g., Happy Birthday Sarah!, Congratulations!"
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
              />
            </div>
          </div>

          {/* Event Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-tiffany" />
              <h3 className="text-lg font-semibold">Event Details</h3>
            </div>
            
            <div>
              <Label htmlFor="deliveryDate">Delivery/Pickup Date *</Label>
              <Input
                id="deliveryDate"
                type="date"
                value={formData.deliveryDate}
                onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                min={new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} // 3 days from now
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Custom cakes require at least 3 days advance notice
              </p>
            </div>

            <div>
              <Label htmlFor="specialRequirements">Special Requirements</Label>
              <Textarea
                id="specialRequirements"
                placeholder="Any dietary restrictions, allergen concerns, setup requirements, or other special requests..."
                value={formData.specialRequirements}
                onChange={(e) => handleInputChange('specialRequirements', e.target.value)}
                rows={4}
              />
            </div>
          </div>

          {/* Contact & References */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-tiffany" />
              <h3 className="text-lg font-semibold">Contact Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactName">Your Name *</Label>
                <Input
                  id="contactName"
                  placeholder="Full name"
                  value={formData.contactName}
                  onChange={(e) => handleInputChange('contactName', e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="contactPhone">Phone Number *</Label>
                <Input
                  id="contactPhone"
                  placeholder="+974 5555 0123"
                  value={formData.contactPhone}
                  onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="referenceImages">Reference Images (Optional)</Label>
              <Input
                id="referenceImages"
                placeholder="Describe images you can share via WhatsApp"
                value={formData.referenceImages}
                onChange={(e) => handleInputChange('referenceImages', e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                You can share reference images when we chat on WhatsApp
              </p>
            </div>
          </div>

          {/* Pricing Info */}
          <div className="bg-gradient-to-r from-tiffany/10 to-sunshine/10 p-6 rounded-lg">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Custom Cake Pricing Guide
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Basic Custom Cakes:</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  <li>Small (8&quot;): 150-250 {DEFAULT_CURRENCY}</li>
                  <li>Medium (10&quot;): 250-400 {DEFAULT_CURRENCY}</li>
                  <li>Large (12&quot;): 400-600 {DEFAULT_CURRENCY}</li>
                </ul>
              </div>
              <div>
                <p className="font-medium">Premium Features:</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  <li>Fondant work: +50-150 {DEFAULT_CURRENCY}</li>
                  <li>Custom figures: +100-300 {DEFAULT_CURRENCY}</li>
                  <li>Multi-tier: +200-500 {DEFAULT_CURRENCY}</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-3 bg-white/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                * Final pricing will be provided based on your specific requirements. Complex designs may require additional time and cost.
              </p>
            </div>
          </div>

          <Button 
            type="submit" 
            variant="hero" 
            size="lg" 
            className="w-full"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Send Custom Request via WhatsApp
          </Button>

          <div className="text-center">
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              <Badge variant="secondary">Free Consultation</Badge>
              <Badge variant="secondary">Expert Designers</Badge>
              <Badge variant="secondary">Fresh Ingredients</Badge>
              <Badge variant="secondary">Delivery Available</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Our cake artists will review your request and provide a detailed quote within 24 hours.
              Rush orders (less than 3 days) may incur additional charges.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}