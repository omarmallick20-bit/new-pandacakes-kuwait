import React from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function PrivacyPolicyPage() {
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
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">سياسة الخصوصية</h1>
                <p className="text-muted-foreground mb-8">تاريخ السريان: ١٥ أكتوبر ٢٠٢٥</p>

                <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">١. المقدمة</h2>
                    <p>تلتزم باندا كيك بحماية خصوصية عملائنا عبر الإنترنت. توضح سياسة الخصوصية هذه كيفية جمع واستخدام ومشاركة معلوماتك الشخصية عند زيارة أو إجراء عملية شراء من موقعنا الإلكتروني www.PandaCakes.me. نحن موجودون في الدوحة، قطر.</p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">٢. المعلومات التي نجمعها</h2>
                    <p>نجمع عدة أنواع من المعلومات من مستخدمي موقعنا وعنهم، بما في ذلك:</p>
                    <ul className="list-disc pl-6 space-y-3 mt-4">
                      <li><strong>المعلومات الشخصية:</strong> تشمل المعلومات التي يمكن استخدامها لتحديد هويتك، مثل اسمك وعنوان بريدك الإلكتروني ورقم هاتفك وعنوان الفوترة وعنوان التوصيل ومعلومات الدفع. نجمع هذه المعلومات فقط عندما تقدمها لنا طواعية، مثل عند إنشاء حساب أو تقديم طلب أو التواصل معنا.</li>
                      <li><strong>المعلومات غير الشخصية:</strong> تشمل المعلومات التي لا يمكن استخدامها لتحديد هويتك، مثل عنوان IP الخاص بك ونوع المتصفح ومعلومات الجهاز وبيانات استخدام الموقع. قد نجمع هذه المعلومات تلقائياً من خلال ملفات تعريف الارتباط وإشارات الويب وتقنيات التتبع الأخرى.</li>
                      <li><strong>معلومات الطلب:</strong> عند إجراء عملية شراء، نجمع معلومات حول طلبك، بما في ذلك المنتجات التي اشتريتها والتكلفة الإجمالية ومعلومات الدفع.</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">٣. كيف نستخدم معلوماتك</h2>
                    <p>نستخدم معلوماتك للأغراض التالية:</p>
                    <ul className="list-disc pl-6 space-y-3 mt-4">
                      <li><strong>لمعالجة الطلبات:</strong> نستخدم معلوماتك الشخصية ومعلومات الطلب لمعالجة طلباتك وتنفيذها، بما في ذلك إرسال تأكيدات الطلب وتحديثات التوصيل وإشعارات التوصيل.</li>
                      <li><strong>لتقديم خدمة العملاء:</strong> نستخدم معلوماتك للرد على استفساراتك وتقديم الدعم وحل أي مشاكل قد تواجهها.</li>
                      <li><strong>لتحسين موقعنا:</strong> نستخدم المعلومات غير الشخصية لتحليل استخدام الموقع وتحديد الاتجاهات وتحسين وظائف وتجربة المستخدم لموقعنا.</li>
                      <li><strong>للتواصل معك:</strong> بموافقتك، قد نستخدم عنوان بريدك الإلكتروني لإرسال رسائل تسويقية حول المنتجات الجديدة والعروض الترويجية والعروض الخاصة. يمكنك إلغاء الاشتراك في تلقي هذه الرسائل في أي وقت بالنقر على رابط "إلغاء الاشتراك" في البريد الإلكتروني.</li>
                      <li><strong>للامتثال للالتزامات القانونية:</strong> قد نستخدم معلوماتك للامتثال للقوانين واللوائح المعمول بها.</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">٤. كيف نشارك معلوماتك</h2>
                    <p>قد نشارك معلوماتك مع الأطراف الثالثة التالية:</p>
                    <ul className="list-disc pl-6 space-y-3 mt-4">
                      <li><strong>مقدمو الخدمات:</strong> قد نشارك معلوماتك مع مقدمي خدمات من أطراف ثالثة يساعدوننا في معالجة الدفع والتوصيل والتسويق وخدمات أخرى. نضمن أن هؤلاء المقدمين ملتزمون تعاقدياً بحماية بياناتك.</li>
                      <li><strong>السلطات القانونية:</strong> قد نفصح عن معلوماتك للسلطات القانونية إذا كان مطلوباً بموجب القانون أو الإجراءات القانونية.</li>
                      <li><strong>عمليات نقل الأعمال:</strong> إذا كانت باندا كيك مشاركة في عملية دمج أو استحواذ أو بيع كل أصولها أو جزء منها، فقد يتم نقل معلوماتك كجزء من تلك المعاملة.</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">٥. ملفات تعريف الارتباط وتقنيات التتبع</h2>
                    <p>نستخدم ملفات تعريف الارتباط وتقنيات التتبع الأخرى لجمع معلومات غير شخصية حول استخدامك للموقع. يمكنك التحكم في ملفات تعريف الارتباط من خلال إعدادات متصفحك، لكن تعطيل ملفات تعريف الارتباط قد يؤثر على وظائف موقعنا.</p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">٦. أمن البيانات</h2>
                    <p>نتخذ تدابير معقولة لحماية معلوماتك من الوصول غير المصرح به أو الاستخدام أو الإفصاح. ومع ذلك، لا توجد طريقة نقل بيانات عبر الإنترنت أو تخزين إلكتروني آمنة بنسبة ١٠٠٪.</p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">٧. خصوصية الأطفال</h2>
                    <p>موقعنا غير مخصص للأطفال دون سن ١٨ عاماً. لا نجمع عن عمد معلومات شخصية من الأطفال دون سن ١٣ عاماً. إذا علمت أن طفلاً دون ١٨ عاماً قد قدم لنا معلومات شخصية، يرجى التواصل معنا.</p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">٨. التغييرات على سياسة الخصوصية هذه</h2>
                    <p>قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر. سننشر أي تغييرات على هذه الصفحة ونشجعك على مراجعتها بشكل دوري.</p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">٩. اتصل بنا</h2>
                    <p>إذا كان لديك أي أسئلة حول سياسة الخصوصية هذه، يرجى التواصل معنا على:</p>
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <p className="font-semibold">باندا كيك</p>
                      <p>+974 60018005</p>
                      <p>qa@pandacakes.me</p>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">١٠. القانون الحاكم</h2>
                    <p>تخضع سياسة الخصوصية هذه وتُفسر وفقاً لقوانين دولة قطر.</p>
                  </section>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
                <p className="text-muted-foreground mb-8">Effective Date: 15th October 2025</p>

                <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">1. Introduction</h2>
                    <p>PANDA CAKES is committed to protecting the privacy of our online customers. This Privacy Policy explains how we collect, use, and share your personal information when you visit or make a purchase from our website www.PandaCakes.me. We are located at Doha, Qatar.</p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">2. Information We Collect</h2>
                    <p>We collect several types of information from and about users of our Site, including:</p>
                    <ul className="list-disc pl-6 space-y-3 mt-4">
                      <li><strong>Personal Information:</strong> This includes information that can be used to identify you, such as your name, email address, phone number, billing address, delivery address, and payment information. We only collect this information when you voluntarily provide it to us, such as when you create an account, place an order, or contact us.</li>
                      <li><strong>Non-Personal Information:</strong> This includes information that cannot be used to identify you, such as your IP address, browser type, device information, and website usage data. We may collect this information automatically through cookies, web beacons, and other tracking technologies.</li>
                      <li><strong>Order Information:</strong> When you make a purchase, we collect information about your order, including the items you purchased, the total cost, and your payment information.</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">3. How We Use Your Information</h2>
                    <p>We use your information for the following purposes:</p>
                    <ul className="list-disc pl-6 space-y-3 mt-4">
                      <li><strong>To Process Orders:</strong> We use your personal and order information to process and fulfill your orders, including sending you order confirmations, delivery updates, and delivery notifications.</li>
                      <li><strong>To Provide Customer Service:</strong> We use your information to respond to your inquiries, provide support, and resolve any issues you may have.</li>
                      <li><strong>To Improve Our Site:</strong> We use non-personal information to analyze website usage, identify trends, and improve the functionality and user experience of our Site.</li>
                      <li><strong>To Communicate with You:</strong> With your consent, we may use your email address to send you marketing communications about new products, promotions, and special offers. You can opt out of receiving these communications at any time by clicking the "unsubscribe" link in the email.</li>
                      <li><strong>To Comply with Legal Obligations:</strong> We may use your information to comply with applicable laws and regulations.</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">4. How We Share Your Information</h2>
                    <p>We may share your information with the following third parties:</p>
                    <ul className="list-disc pl-6 space-y-3 mt-4">
                      <li><strong>Service Providers:</strong> We may share your information with third-party service providers who assist us with payment processing, delivery, marketing, and other services. We ensure these providers are contractually obligated to protect your data.</li>
                      <li><strong>Legal Authorities:</strong> We may disclose your information to legal authorities if required by law or legal process.</li>
                      <li><strong>Business Transfers:</strong> If PANDA CAKES is involved in a merger, acquisition, or sale of all or a portion of its assets, your information may be transferred as part of that transaction.</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">5. Cookies and Tracking Technologies</h2>
                    <p>We use cookies and other tracking technologies to collect non-personal information about your website usage. You can control cookies through your browser settings, but disabling cookies may affect the functionality of our Site.</p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">6. Data Security</h2>
                    <p>We take reasonable measures to protect your information from unauthorized access, use, or disclosure. However, no data transmission over the internet or electronic storage method is 100% secure.</p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">7. Children's Privacy</h2>
                    <p>Our Site is not intended for children under the age of 18. We do not knowingly collect personal information from children under 13. If you become aware that a child under 18 has provided us with personal information, please contact us.</p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">8. Changes to this Privacy Policy</h2>
                    <p>We may update this Privacy Policy from time to time. We will post any changes on this page and encourage you to review it periodically.</p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">9. Contact Us</h2>
                    <p>If you have any questions about this Privacy Policy, please contact us at:</p>
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <p className="font-semibold">PANDA CAKES</p>
                      <p>+974 60018005</p>
                      <p>qa@pandacakes.me</p>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">10. Governing Law</h2>
                    <p>This Privacy Policy shall be governed by and construed in accordance with the laws of The State of Qatar.</p>
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
