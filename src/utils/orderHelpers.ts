/**
 * Formats order item customizations into a displayable array of strings
 * Handles both simple format (flavor/variant) and complex format (custom_selections)
 */
export function formatOrderItemCustomizations(customizations: any): string[] {
  if (!customizations) return [];
  
  const details: string[] = [];
  
  // Handle custom_selections format (new complex structure)
  if (customizations.custom_selections) {
    Object.entries(customizations.custom_selections).forEach(([key, value]: [string, any]) => {
      if (value?.selected && value.selected !== 'Default' && value.selected !== 'Standard') {
        const selectedValue = Array.isArray(value.selected) 
          ? value.selected.join(', ') 
          : value.selected;
        details.push(`${key}: ${selectedValue}`);
      }
    });
  }
  
  // Handle simple flavor/variant format (legacy structure)
  if (customizations.flavor && customizations.flavor !== 'Default') {
    details.push(`Flavor: ${customizations.flavor}`);
  }
  if (customizations.variant && customizations.variant !== 'Standard') {
    details.push(`Variant: ${customizations.variant}`);
  }
  
  // Handle size if it's at the root level
  if (customizations.size && customizations.size !== 'Default') {
    details.push(`Size: ${customizations.size}`);
  }
  
  return details;
}

/**
 * Gets special instructions from order item customizations
 */
export function getSpecialInstructions(customizations: any): string | null {
  if (!customizations) return null;
  return customizations.specialInstructions || customizations.special_instructions || null;
}
