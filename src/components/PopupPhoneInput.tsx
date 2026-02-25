import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Country {
  id: string;
  name: string;
  phone_code: string;
}

// Fallback countries if database fetch fails
const FALLBACK_COUNTRIES: Country[] = [
  { id: 'qa', name: 'Qatar', phone_code: '+974' },
  { id: 'ae', name: 'United Arab Emirates', phone_code: '+971' },
  { id: 'sa', name: 'Saudi Arabia', phone_code: '+966' },
  { id: 'kw', name: 'Kuwait', phone_code: '+965' },
  { id: 'bh', name: 'Bahrain', phone_code: '+973' },
  { id: 'om', name: 'Oman', phone_code: '+968' },
  { id: 'us', name: 'United States', phone_code: '+1' },
  { id: 'gb', name: 'United Kingdom', phone_code: '+44' },
  { id: 'in', name: 'India', phone_code: '+91' },
  { id: 'pk', name: 'Pakistan', phone_code: '+92' },
  { id: 'ph', name: 'Philippines', phone_code: '+63' },
  { id: 'eg', name: 'Egypt', phone_code: '+20' },
  { id: 'jo', name: 'Jordan', phone_code: '+962' },
  { id: 'lb', name: 'Lebanon', phone_code: '+961' },
];

interface PopupPhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
}

export function PopupPhoneInput({ 
  value, 
  onChange, 
  backgroundColor, 
  textColor, 
  accentColor 
}: PopupPhoneInputProps) {
  const [countries, setCountries] = useState<Country[]>(FALLBACK_COUNTRIES);
  const [selectedCode, setSelectedCode] = useState('+974');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [open, setOpen] = useState(false);

  // Parse initial value if provided
  useEffect(() => {
    if (value) {
      // Try to extract country code from value
      const matchedCountry = countries.find(c => value.startsWith(c.phone_code));
      if (matchedCountry) {
        setSelectedCode(matchedCountry.phone_code);
        setPhoneNumber(value.slice(matchedCountry.phone_code.length));
      }
    }
  }, []);

  // Fetch all countries from database
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const { data, error } = await supabase
          .from('countries')
          .select('id, name, phone_code')
          .eq('is_active', true)
          .order('phone_code', { ascending: true });

        if (error) {
          console.error('Error fetching countries:', error);
          return;
        }

        if (data && data.length > 0) {
          setCountries(data);
        }
      } catch (err) {
        console.error('Failed to fetch countries:', err);
      }
    };

    fetchCountries();
  }, []);

  const handleCodeSelect = (code: string) => {
    setSelectedCode(code);
    setOpen(false);
    // Update the full value
    onChange(code + phoneNumber);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNumber = e.target.value.replace(/[^\d]/g, '');
    setPhoneNumber(newNumber);
    onChange(selectedCode + newNumber);
  };

  const selectedCountry = countries.find(c => c.phone_code === selectedCode);

  return (
    <div className="flex gap-2 w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[100px] justify-between px-3 shrink-0"
            style={{ 
              backgroundColor: `${textColor}15`,
              color: textColor,
              borderColor: `${textColor}30`
            }}
          >
            <span className="truncate">{selectedCode}</span>
            <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[300px] p-0"
          style={{
            backgroundColor: '#FFFFFF',
            border: `2px solid ${accentColor}`,
            zIndex: 9999
          }}
          align="start"
        >
          <Command className="bg-white">
            <CommandInput 
              placeholder="Search country..." 
              className="text-black"
              style={{ color: '#000000' }}
            />
            <CommandList>
              <CommandEmpty className="text-gray-500 py-4 text-center text-sm">
                No country found.
              </CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                {countries.map((country) => (
                  <CommandItem
                    key={country.id}
                    value={`${country.phone_code} ${country.name}`}
                    onSelect={() => handleCodeSelect(country.phone_code)}
                    className="cursor-pointer hover:bg-gray-100"
                    style={{ color: '#000000' }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedCode === country.phone_code ? "opacity-100" : "opacity-0"
                      )}
                      style={{ color: accentColor }}
                    />
                    <span className="font-medium mr-2" style={{ color: '#000000' }}>
                      {country.phone_code}
                    </span>
                    <span className="text-gray-600 truncate">
                      {country.name}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Input
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneChange}
        placeholder="55555555"
        className="flex-1"
        style={{
          backgroundColor: `${textColor}15`,
          color: textColor,
          borderColor: `${textColor}30`
        }}
      />
    </div>
  );
}
