import { useState, useEffect } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client';
import { retryWithBackoff } from '@/utils/retryWithBackoff';
import { PHONE_COUNTRY_CODE } from '@/config/country';

interface Country {
  id: string;
  name: string;
  phone_code: string;
  is_active: boolean;
}

// Fallback countries in case database fetch fails
const FALLBACK_COUNTRIES: Country[] = [
  { id: 'qa', name: 'Qatar', phone_code: '+974', is_active: true },
  { id: 'ae', name: 'United Arab Emirates', phone_code: '+971', is_active: true },
  { id: 'sa', name: 'Saudi Arabia', phone_code: '+966', is_active: true },
  { id: 'bh', name: 'Bahrain', phone_code: '+973', is_active: true },
  { id: 'om', name: 'Oman', phone_code: '+968', is_active: true },
  { id: 'us', name: 'United States', phone_code: '+1', is_active: true },
  { id: 'gb', name: 'United Kingdom', phone_code: '+44', is_active: true },
  { id: 'eg', name: 'Egypt', phone_code: '+20', is_active: true },
  { id: 'in', name: 'India', phone_code: '+91', is_active: true },
  { id: 'pk', name: 'Pakistan', phone_code: '+92', is_active: true },
];

interface PhoneNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export const PhoneNumberInput = ({
  value,
  onChange,
  onBlur,
  required = false,
  disabled = false,
  placeholder = "55555555"
}: PhoneNumberInputProps) => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(PHONE_COUNTRY_CODE);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    if (value && value.includes(' ')) {
      const parts = value.split(' ');
      if (parts.length >= 2) {
        setSelectedCountryCode(parts[0]);
        setPhoneNumber(parts.slice(1).join(' '));
      }
    }
  }, [value]);

  const fetchCountries = async () => {
    try {
      const data = await retryWithBackoff(
        async () => {
          const { data, error } = await supabase
            .from('countries')
            .select('id, name, phone_code, is_active')
            .eq('is_active', true)
            .order('phone_code');

          if (error) throw error;
          return data;
        },
        { operationName: 'fetchCountries' }
      );
      
      setCountries(data && data.length > 0 ? data : FALLBACK_COUNTRIES);
    } catch (error) {
      console.error('Error fetching countries:', error);
      // Use fallback countries if fetch fails
      setCountries(FALLBACK_COUNTRIES);
    } finally {
      setLoading(false);
    }
  };

  const handleCountryChange = (countryCode: string) => {
    setSelectedCountryCode(countryCode);
    const fullNumber = phoneNumber ? `${countryCode} ${phoneNumber}` : countryCode;
    onChange(fullNumber);
    setOpen(false);
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const number = e.target.value.replace(/[^\d\s]/g, '');
    setPhoneNumber(number);
    const fullNumber = number ? `${selectedCountryCode} ${number}` : selectedCountryCode;
    onChange(fullNumber);
  };

  const formatPhoneCode = (code: string) => {
    return code.startsWith('+') ? code : `+${code}`;
  };

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[110px] justify-between"
            disabled={disabled}
          >
            {selectedCountryCode}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0 z-[9999] bg-popover border shadow-lg">
          <Command>
            <CommandInput placeholder="Search code..." className="h-9" />
            <CommandList>
              <CommandEmpty>No country code found.</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                {countries.map((country) => {
                  const code = formatPhoneCode(country.phone_code);
                  return (
                    <CommandItem
                      key={country.id}
                      value={`${code} ${country.name}`}
                      onSelect={() => handleCountryChange(code)}
                    >
                      <span className="font-medium">{code}</span>
                      <span className="ml-2 text-xs text-muted-foreground truncate">
                        {country.name}
                      </span>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          selectedCountryCode === code ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Input
        type="tel"
        placeholder={placeholder}
        value={phoneNumber}
        onChange={handlePhoneNumberChange}
        onBlur={onBlur}
        required={required}
        disabled={disabled}
        className="flex-1"
        maxLength={15}
      />
    </div>
  );
};
