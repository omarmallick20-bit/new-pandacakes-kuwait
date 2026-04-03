import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CustomVariantSelector } from '@/components/CustomVariantSelector';
import { useAppContext } from '@/contexts/AppContext';
import { CartItem } from '@/types';
import { toast } from 'sonner';
import { ShoppingCart } from 'lucide-react';

interface CustomSection {
  title: string;
  option_type: 'single' | 'multiple' | 'dropdown';
  options: { name: string; price: number }[];
}

interface UpsellQuickAddModalProps {
  product: any | null;
  isOpen: boolean;
  onClose: () => void;
  onAddSuccess: (product: any) => void;
}

export function UpsellQuickAddModal({
  product,
  isOpen,
  onClose,
  onAddSuccess,
}: UpsellQuickAddModalProps) {
  const { dispatch } = useAppContext();
  
  const [selectedFlavor, setSelectedFlavor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [customSelections, setCustomSelections] = useState<Record<string, string | string[]>>({});
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [customPrice, setCustomPrice] = useState(0);
  const [isValid, setIsValid] = useState(false);

  // Parse product data
  const flavors: string[] = product?.flavors || [];
  const sizes: { name: string; price: number }[] = product?.sizes || [];
  const customSections: CustomSection[] = product?.custom_sections || [];
  const hasCustomSections = customSections.length > 0;
  const hasLegacyVariants = flavors.length > 0 || sizes.length > 0;

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setSelectedFlavor(flavors[0] || '');
      setSelectedSize(sizes[0]?.name || '');
      setCustomSelections({});
      setSpecialInstructions('');
      setCustomPrice(0);
      setIsValid(!hasCustomSections);
    }
  }, [product?.id]);

  // Calculate total price
  const basePrice = product?.price || 0;
  const sizePrice = sizes.find(s => s.name === selectedSize)?.price || 0;
  const totalPrice = basePrice + sizePrice + customPrice;

  const handleAddToCart = () => {
    if (!product) return;

    // Build customizations object from selections
    let customizations: CartItem['customizations'] | undefined;
    if (hasCustomSections && Object.keys(customSelections).length > 0) {
      const custom_selections: Record<string, { selected: string | string[]; selected_ar?: string | string[]; title_ar?: string; price: number }> = {};
      customSections.forEach(section => {
        const selected = customSelections[section.title];
        if (selected !== undefined) {
          let price = 0;
          const selectedOptions = Array.isArray(selected) ? selected : [selected];
          selectedOptions.forEach(optName => {
            const option = section.options.find(opt => opt.name === optName);
            if (option) price += option.price;
          });
          custom_selections[section.title] = {
            selected,
            selected_ar: section.options
              .filter(opt => selectedOptions.includes(opt.name))
              .map(opt => (opt as any).name_ar || opt.name),
            title_ar: (section as any).title_ar,
            price
          };
        }
      });
      customizations = {
        custom_selections,
        total_variant_price: customPrice,
        specialInstructions: specialInstructions || undefined,
      };
    }

    const cartItem: CartItem = {
      id: `upsell-${product.id}-${Date.now()}`,
      cake: {
        id: product.id,
        name: product.name,
        categoryId: product.category_id,
        image: product.image_url || '/placeholder.svg',
        description: product.description || '',
        inches: sizes.map(s => s.name) || ['Standard'],
        layers: 1,
        servingSize: '1 person',
        preparationTime: product.preparation_time?.toString() || '24 hours',
        basePrice: basePrice,
      },
      flavor: selectedFlavor || 'Default',
      variant: selectedSize || 'Standard',
      quantity: 1,
      price: totalPrice,
      specialInstructions: specialInstructions || undefined,
      customizations,
    };

    dispatch({ type: 'ADD_TO_CART', payload: cartItem });
    toast.success(`Added ${product.name} to cart!`);
    onAddSuccess(product);
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] md:max-w-md max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-base font-semibold line-clamp-1">
            {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {/* Product Image */}
          <div className="aspect-video w-full rounded-lg overflow-hidden mb-4">
            <img
              src={product.image_url || '/placeholder.svg'}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {product.description}
            </p>
          )}

          {/* Custom Sections Variant Selector */}
          {hasCustomSections && (
            <div className="mb-4">
              <CustomVariantSelector
                customSections={customSections}
                selections={customSelections}
                onSelectionChange={(sectionTitle, value) => {
                  setCustomSelections(prev => ({
                    ...prev,
                    [sectionTitle]: value
                  }));
                }}
                onPriceChange={setCustomPrice}
                onValidationChange={setIsValid}
              />
            </div>
          )}

          {/* Legacy Flavor/Size Selectors */}
          {!hasCustomSections && hasLegacyVariants && (
            <div className="space-y-3 mb-4">
              {flavors.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-sm">Flavor</Label>
                  <Select value={selectedFlavor} onValueChange={setSelectedFlavor}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select flavor" />
                    </SelectTrigger>
                    <SelectContent>
                      {flavors.map((flavor) => (
                        <SelectItem key={flavor} value={flavor}>
                          {flavor}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {sizes.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-sm">Size</Label>
                  <Select value={selectedSize} onValueChange={setSelectedSize}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {sizes.map((size) => (
                        <SelectItem key={size.name} value={size.name}>
                          {size.name} {size.price > 0 && `(+${size.price} QAR)`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Special Instructions */}
          <div className="space-y-1.5">
            <Label className="text-sm">Special Instructions (Optional)</Label>
            <Textarea
              placeholder="Add any special requests..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="h-16 text-sm resize-none"
            />
          </div>
        </div>

        {/* Footer with Price and Add Button */}
        <div className="border-t p-4 bg-background">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-lg font-bold text-primary">{totalPrice} QAR</span>
          </div>
          <Button
            onClick={handleAddToCart}
            disabled={hasCustomSections && !isValid}
            className="w-full"
            variant="hero"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Add to Cart
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
