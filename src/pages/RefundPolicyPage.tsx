import React from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function RefundPolicyPage() {
  const { language } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 bg-hero-gradient">
        <div className="container max-w-4xl mx-auto px-4 py-8 md:py-16">
          {/* Back Button */}
          <Link 
            to="/terms" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{language === 'ar' ? 'العودة إلى الشروط والأحكام' : 'Back to Terms & Conditions'}</span>
          </Link>

          <div className="bg-card rounded-2xl shadow-lg p-6 md:p-10">
            {language === 'ar' ? (
              <>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">سياسة الاسترجاع والإلغاء</h1>
                <p className="text-muted-foreground mb-8">باندا كيك</p>

                <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
                  <p>تحدد هذه السياسة حقوقك في إلغاء عقدك لشراء الكيك والمخبوزات لدينا، والظروف التي يحق لك فيها استرداد المبلغ.</p>
                  
                  <p>نظراً لأن الكيك والمخبوزات لدينا هي منتجات قابلة للتلف ومصنوعة حسب الطلب، فلا يحق لك عادةً إلغاء عقدك. ومع ذلك، فإن رعاية العملاء هي جوهر ما نقوم به، ونحن نتفهم أنه قد تكون هناك حالات ترغب فيها في إلغاء عقدك معنا. لذلك، قمنا بإنشاء حقوق إلغاء خاصة بك، وهي أكثر سخاءً.</p>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">١. إلغاء طلبك معنا قبل التوصيل</h2>
                    <p>نحن نتفهم تماماً أنه قد تتغير ظروفك، مثل إلغاء مناسبة. في مثل هذا السيناريو، قد ترغب في إلغاء طلبك للكيك و/أو المخبوزات قبل التوصيل. إذا كنت ترغب في ذلك، تطبق الشروط التالية:</p>
                    <ul className="list-disc pl-6 space-y-3 mt-4">
                      <li><strong>أ)</strong> إذا ألغيت عقدك قبل ٢٤ ساعة من تاريخ ووقت التوصيل، سنقوم برد كامل تكلفة الطلب إليك.</li>
                      <li><strong>ب)</strong> إذا ألغيت عقدك بعد تحضير الكيك أو المخبوزات، فلسنا ملزمين بمنحك استرداداً. في حالة قدمنا استرداداً لظروف استثنائية، سيكون على شكل رصيد متجر يمكنك استخدامه في وقت لاحق لدى باندا كيك.</li>
                    </ul>
                    <p className="mt-4">وذلك لأننا نتحمل تكاليف في تحضير طلبك، حيث يتم تحضير جميع الكيك والمخبوزات لدينا طازجة. قد يشمل ذلك أحياناً شراء مكونات معينة وعناصر زخرفية.</p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">٢. إلغاء باندا كيك لطلبك</h2>
                    <p>في حالة غير محتملة أن نضطر لإلغاء طلبك لأي سبب، سنبلغك بذلك بمجرد علمنا وسنقوم برد كامل تكلفة طلبك. لن نكون مسؤولين أمامك عن أي تكاليف أو أضرار تتجاوز المبلغ الذي دفعته مقابل طلبك. حيث دفعت مقابل طلب جزئياً فقط، سيتم إصدار الاسترداد أيضاً على أساس تناسبي.</p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">٣. الإرجاع والاسترداد بعد توصيل الكيك و/أو المخبوزات إليك</h2>
                    <p>بمجرد توصيل طلبك إليك، يكون العقد قد اكتمل. نظراً لأن منتجاتنا هي سلع قابلة للتلف، فلا يحق لك إرجاع طلبك إلينا، ولسنا ملزمين بتقديم استرداد لك.</p>
                    <p className="mt-4">ومع ذلك، إذا واجهت أي مشاكل مع الكيك والمخبوزات لدينا، ندعوك لإبلاغنا بذلك. إذا كان لديك شكوى بخصوص طلبك، يجب الإبلاغ عنها على الرقم <span dir="ltr">+974 60018005</span> في أقرب وقت ممكن عملياً، ومن الأفضل خلال ٢٤ ساعة. أي شكوى تُستلم بعد أكثر من ٢٤ ساعة من توصيل طلبك لن يتم النظر فيها. لسنا ملزمين، ولكن قد نقدم وفقاً لتقديرنا استرداداً جزئياً أو كاملاً أو خصماً على مشترياتك القادمة معنا.</p>
                    <p className="mt-4">يرجى ملاحظة أنه إذا كانت شكواك تتعلق بالطعم أو قوام الكيك، أو تتعلق بمسألة نظافة مزعومة، يجب إبلاغنا في أقرب وقت ممكن، والحفاظ على الكيك، ومنحنا الفرصة لاستلامها للتحقيق. لا يمكننا تقديم استرداد أو تعويض حيث لا تُمنح لنا الفرصة لتقييم مزايا الشكاوى المتعلقة بالطعم أو القوام أو النظافة من خلال فحص الكيك.</p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">٤. كيفية إنهاء عقدك معنا قبل التوصيل</h2>
                    <p>وفقاً لاستيفاء الشروط في القسم ١ من هذه السياسة، يمكنك إرسال طلب لإلغاء طلبك معنا عبر الاتصال/واتساب على الرقم <strong><span dir="ltr">+974 60018005</span></strong>.</p>
                  </section>

                  <section className="mt-8 p-4 bg-muted rounded-lg">
                    <p className="font-semibold">تحتاج للإلغاء أو لديك أسئلة؟</p>
                    <p className="mt-2">تواصل معنا على: <strong><span dir="ltr">+974 60018005</span></strong></p>
                  </section>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Refund and Cancellation Policy</h1>
                <p className="text-muted-foreground mb-8">PANDA CAKES</p>

                <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
                  <p>This Policy sets out your rights for cancelling your contract for the purchase of our Cakes and Baked Goods, and the circumstances where you will be entitled to a refund.</p>
                  
                  <p>Since our Cakes and Baked Goods are perishable items and are also made to order, you are not usually entitled to cancel your contract. However, customer care is at the heart of what we do, and we understand that there may be instances where you wish to cancel your contract with us. Therefore, we have created our own cancellations rights for you, which are more generous.</p>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">1. Cancelling your Order with us before delivery</h2>
                    <p>We completely understand that you might have a change in circumstances, such as the cancellation of an event. In such a scenario, you may wish to cancel your Order of a Cake and/or Baked Good before delivery. If you wish to do so, the following terms apply:</p>
                    <ul className="list-disc pl-6 space-y-3 mt-4">
                      <li><strong>a)</strong> If you cancel your contract 24Hrs before the Delivery Date and Time, we will refund to you the entire cost of the Order.</li>
                      <li><strong>b)</strong> If you cancel your contract once the cake or baked good are prepared, we are not obliged to give you a refund. In the event that we do offer a refund for exceptional circumstances, this shall be in the form of store credit that you can use at a later date at PANDA CAKES.</li>
                    </ul>
                    <p className="mt-4">This is because we incur costs in the preparation of your Order, as all of our Cakes and Baked Goods are prepared freshly. This can also sometimes include procuring certain ingredients and decorative items.</p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">2. PANDA CAKES cancelling your Order</h2>
                    <p>In the unlikely event that we have to cancel your Order for any reason, we will notify you of this as soon as we become aware of this and we will refund to you the full cost of your Order. We will not be liable to you for any costs or damages beyond the amount that you have paid for your Order. Where you have only paid for an Order in part, the refund shall also be issued on a pro rata basis accordingly.</p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">3. Returns and refunds after the Cake and/or Baked Good has been delivered to you</h2>
                    <p>Once your Order has been delivered to you, the contract has been completed. Since our products are perishable goods, you are not entitled to return your Order to us, and we are not obliged to offer you a refund.</p>
                    <p className="mt-4">However, if you experience any issues with our Cakes and Baked Goods, we invite you to bring this to our attention. If you have a complaint in relation to your Order, that complaint must be reported to +974 60018005 as soon as practically possible, and ideally within 24 hours. Any complaint received more than 24 hours after delivery of your Order will not be considered by us. We are not obliged to, but may at our discretion, offer you a partial refund, a full refund, or a discount off your next purchase with us.</p>
                    <p className="mt-4">Please note that if your complaint relates to the taste, texture of the cake, or relates to an alleged hygiene matter, you must let us know as soon as possible, preserve the cake, and give us the opportunity to collect it, to allow us to investigate. We are unable to offer refunds or compensation where we are not given the opportunity to assess the merits of complaints relating to taste, texture or hygiene by inspecting the cake.</p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">4. How to end your contract with us before delivery</h2>
                    <p>Subject to satisfying the conditions in Section 1 of this Policy, you may send a request to cancel your Order with us by call/WhatsApp at <strong>+974 60018005</strong>.</p>
                  </section>

                  <section className="mt-8 p-4 bg-muted rounded-lg">
                    <p className="font-semibold">Need to cancel or have questions?</p>
                    <p className="mt-2">Contact us at: <strong>+974 60018005</strong></p>
                  </section>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
