import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Phone, Share2, Copy, Instagram, Facebook } from "lucide-react";
import tiktokLogo from "@/assets/tiktok-logo.png";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";

export default function ContactPage() {
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleWhatsApp = () => {
    window.open("https://api.whatsapp.com/send/?phone=96550018008&text&type=phone_number&app_absent=0", "_blank");
  };
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: t('contact_copied'),
        description: `${text} ${t('contact_copied_desc')}`
      });
    } catch (err) {
      toast({
        title: t('contact_copy_failed'),
        description: t('contact_copy_failed_desc'),
        variant: "destructive"
      });
    }
  };
  return <main className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-black font-display text-foreground mb-4">
            {t('contact_title')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('contact_subtitle')}
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-tiffany/20 rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="w-8 h-8 text-tiffany" />
                </div>
                <CardTitle>{t('contact_whatsapp')}</CardTitle>
                <CardDescription>{t('contact_whatsapp_desc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="sunshine" onClick={handleWhatsApp} className="w-full">
                  {t('contact_message_us')}
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-tiffany/20 rounded-full flex items-center justify-center mb-4">
                  <Phone className="w-8 h-8 text-tiffany" />
                </div>
                <CardTitle>{t('contact_call')}</CardTitle>
                <CardDescription>{t('contact_call_desc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <button onClick={() => copyToClipboard("+96550018008")} className="flex items-center justify-center gap-2 w-full p-2 rounded-md hover:bg-muted transition-colors text-foreground">
                  <span className="font-medium" dir="ltr">+965 5001 8008</span>
                  <Copy className="w-4 h-4" />
                </button>
                <button onClick={() => copyToClipboard("+96555756675")} className="flex items-center justify-center gap-2 w-full p-2 rounded-md hover:bg-muted transition-colors text-foreground">
                  <span className="font-medium" dir="ltr">+965 5575 6675</span>
                  <Copy className="w-4 h-4" />
                </button>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-tiffany/20 rounded-full flex items-center justify-center mb-4">
                  <Share2 className="w-8 h-8 text-tiffany" />
                </div>
                <CardTitle>{t('contact_follow')}</CardTitle>
                <CardDescription>{t('contact_follow_desc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" onClick={() => window.open("https://www.tiktok.com/@pandacakes.kw", "_blank")} className="w-full flex items-center gap-2">
                  <img src={tiktokLogo} alt="TikTok" className="w-4 h-4" />
                  TikTok
                </Button>
                <Button variant="outline" onClick={() => window.open("https://www.instagram.com/pandacakes.kw", "_blank")} className="w-full flex items-center gap-2">
                  <Instagram className="w-4 h-4" />
                  Instagram
                </Button>
                <Button variant="outline" onClick={() => window.open("https://www.facebook.com/PandaCakes.kw/", "_blank")} className="w-full flex items-center gap-2">
                  <Facebook className="w-4 h-4" />
                  Facebook
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('contact_visit')}</CardTitle>
              <CardDescription className="space-y-1">
                <span className="block">{t('contact_address')}</span>
                <span className="block">{t('contact_hours')}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-video rounded-lg overflow-hidden shadow-lg">
                <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3479.6194374260135!2d47.90644827552532!3d29.293500275310365!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3fcf907ba074ddb9%3A0x575decba9542b630!2sPANDA%20CAKES!5e0!3m2!1sen!2sqa!4v1771672383039!5m2!1sen!2sqa" className="w-full h-full border-0" allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="PANDA CAKES Location" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>;
}