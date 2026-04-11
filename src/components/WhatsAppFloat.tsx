import whatsappIcon from '@/assets/whatsapp-tiffany.png';

export function WhatsAppFloat() {
  return (
    <a
      href="https://api.whatsapp.com/send/?phone=96550018008&type=phone_number&app_absent=0"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300"
      aria-label="Chat on WhatsApp"
    >
      <img src={whatsappIcon} alt="WhatsApp" className="w-full h-full" />
    </a>
  );
}
