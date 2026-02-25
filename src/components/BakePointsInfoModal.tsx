import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Gift, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BakePointsInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BakePointsInfoModal({ isOpen, onClose }: BakePointsInfoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-2xl max-h-[90vh] sm:max-h-[85vh] p-4 sm:p-6 flex flex-col overflow-hidden">
        {/* Mobile close button */}
        <button 
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full p-2 bg-muted/80 hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <DialogHeader className="flex-shrink-0 pr-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="h-9 w-9 sm:h-8 sm:w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <DialogTitle className="text-xl sm:text-2xl font-bold">BakePoints</DialogTitle>
            </div>
          </div>
          <p className="text-base sm:text-lg text-muted-foreground italic mt-1 sm:mt-0">Every slice earns you more.</p>
        </DialogHeader>

        <div className="flex-1 mt-4 overflow-y-auto overflow-x-hidden pr-2 sm:pr-3 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-muted/30 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50">
          <div className="space-y-4 sm:space-y-6 text-xs sm:text-sm pb-4 pr-2">
            {/* What is BakePoints Section */}
            <section>
              <h3 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2">What is BakePoints?</h3>
              <p className="text-muted-foreground leading-relaxed">
                BakePoints is PANDA CAKES's exclusive rewards program, crafted with you in mind. 
                Every time you treat yourself to our cakes, cupcakes, cake pops, and more—whether 
                in-store or online—you'll earn points. These points can be redeemed for sweet 
                savings on future purchases, both at our physical locations and through our website.
              </p>
            </section>

            {/* How to Join Section */}
            <section>
              <h3 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2">How to Join BakePoints?</h3>
              <p className="text-muted-foreground leading-relaxed">
                <span className="font-medium">No sign-ups, no fuss—just cake and rewards!</span>
                <br /><br />
                Every time you place an order with PANDA CAKES, whether online or in-store, you're 
                instantly welcomed into the BakePoints family. From your very first purchase, your 
                points start stacking like layers of your favorite cake.
              </p>
            </section>

            {/* Calculation Section */}
            <section>
              <h3 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2">How Are BakePoints Calculated?</h3>
              <div className="space-y-2 text-muted-foreground">
                <p className="leading-relaxed">
                  It's simple: for every <span className="font-bold text-primary">QAR 1</span> you 
                  spend with PANDA CAKES, you earn <span className="font-bold text-primary">1 BakePoint</span>.
                </p>
                <div className="bg-muted/50 p-2 sm:p-3 rounded-md space-y-1">
                  <p className="text-xs">
                    ⚠️ Please note that orders placed through third-party delivery platforms—such 
                    as Talabat, Snoonu, Rafeeq, Bleems, and others—do not qualify for BakePoints.
                  </p>
                  <p className="text-xs">
                    ℹ️ Points are awarded in whole numbers only, so partial points won't be issued.
                  </p>
                </div>
              </div>
            </section>

            {/* Expiry Section */}
            <section>
              <h3 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2">How Long Do My BakePoints Last?</h3>
              <p className="text-muted-foreground leading-relaxed">
                Your BakePoints stay fresh for <span className="font-bold text-primary">12 months</span> from 
                the date they're earned—plenty of time to treat yourself!
              </p>
            </section>

            {/* Value Section */}
            <section>
              <h3 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2">What Are My BakePoints Worth?</h3>
              <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-3 sm:p-4 rounded-lg border-l-4 border-primary">
                <p className="text-base sm:text-lg font-bold text-center">
                  Every <span className="text-primary">50 BakePoints</span> = <span className="text-primary">QAR 1</span> in rewards
                </p>
                <p className="text-xs text-center text-muted-foreground mt-1">
                  So the more you indulge, the more you earn!
                </p>
              </div>
            </section>

            {/* Redemption Section */}
            <section>
              <h3 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2">How Do I Redeem My BakePoints?</h3>
              <p className="text-muted-foreground leading-relaxed">
                <span className="font-medium">Redeeming your BakePoints is a piece of cake!</span>
                <br /><br />
                When placing an order through the PANDA CAKES website, you'll see the option to 
                apply your points at checkout—just select it and enjoy the sweet savings.
              </p>
            </section>

            {/* Balance Section */}
            <section>
              <h3 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2">Where Can I See My BakePoints Balance?</h3>
              <p className="text-muted-foreground leading-relaxed">
                You can view your current BakePoints anytime by logging into your account on the 
                PANDA CAKES website. Just head to your account details and your sweet rewards will 
                be waiting!
              </p>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
