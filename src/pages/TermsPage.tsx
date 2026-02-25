import React from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function TermsPage() {
  const { language } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 bg-hero-gradient">
        <div className="container max-w-4xl mx-auto px-4 py-8 md:py-16">
          {/* Back Button */}
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}</span>
          </Link>

          <div className="bg-card rounded-2xl shadow-lg p-6 md:p-10">
            {language === 'ar' ? (
              <>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">الشروط والأحكام</h1>
                <p className="text-muted-foreground mb-8">تم التحديث في ١٥ أكتوبر ٢٠٢٥</p>

                <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
                  <p>مرحباً بكم في الشروط والأحكام الخاصة بباندا كيك.</p>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">١. المقدمة</h2>
                    <p>هذه هي الشروط والأحكام (المشار إليها فيما بعد بالشروط) التي نقدم بموجبها منتجاتنا لك.</p>
                    <p>يرجى قراءة هذه الشروط بعناية قبل تقديم طلبك إلينا.</p>
                    <p>توضح هذه الشروط من نحن، وكيف يمكنك شراء منتجاتنا، وكيف يمكنك أنت ونحن تغيير أو إنهاء عقد شراء منتجاتنا، وماذا تفعل في حالة وجود مشكلة ومعلومات مهمة أخرى.</p>
                    <p>إذا كنت تعتقد أن هناك خطأ في هذه الشروط، يرجى التواصل معنا للمناقشة، باستخدام تفاصيل الاتصال في القسم ٢ أدناه.</p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">٢. معلومات عنا وكيفية التواصل معنا</h2>
                    <p><strong>من نحن.</strong> نحن باندا كيك، شركة مسجلة في دولة الكويت. رقم تسجيل شركتنا هو ٤٢٨٩٤٣ (يُشار إليها فيما بعد بباندا كيك ونحن).</p>
                    <p>تدير باندا كيك موقعاً إلكترونياً للتجارة الإلكترونية على www.pandacakes.me لبيع الكيك والمخبوزات وجميع المنتجات الأخرى (المشار إليها فيما بعد بالكيك والمخبوزات) لك.</p>
                    <p><strong>كيفية التواصل معنا.</strong> يمكنك التواصل معنا عبر الاتصال/واتساب بفريق خدمة العملاء على الرقم <span dir="ltr">+965 50018008</span>. يرجى ملاحظة أن ساعات العمل لدينا من ٨ صباحاً إلى ٩ مساءً من الأحد إلى السبت.</p>
                    <p><strong>كيف قد نتواصل معك.</strong> إذا كان علينا التواصل معك، سنقوم بذلك عبر الهاتف/واتساب الذي قدمته لنا في طلبك (كما هو محدد في البند ٣.١ أدناه).</p>
                    <p><strong>شروط أخرى قابلة للتطبيق.</strong> بالإضافة إلى هذه الشروط، تنطبق الشروط التالية أيضاً عليك عند استخدام موقعنا و/أو شراء الكيك والمخبوزات:</p>
                    <p>
                      {' '}
                      <Link to="/privacy-policy" className="text-tiffany hover:underline font-medium">
                        سياسة الخصوصية
                      </Link>
                      {' '}الخاصة بنا، والتي تحدد الشروط التي نعالج بموجبها أي بيانات شخصية نجمعها منك أو تقدمها لنا. باستخدام موقعنا، فإنك توافق على معالجة بياناتك الشخصية وفقاً لسياسة الخصوصية وسياسة ملفات تعريف الارتباط الخاصة بنا وتضمن أن جميع البيانات التي قدمتها دقيقة.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">٣. عقدنا معك</h2>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">٣.١ كيف سنقبل طلبك.</h3>
                    <p>سيتم قبولنا لطلبك لشراء الكيك و/أو المخبوزات (الطلب) إما عند إكمال الطلب عبر موقعنا الإلكتروني أو عبر الهاتف/واتساب.</p>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">٣.٢ إذا لم نتمكن من قبول طلبك.</h3>
                    <p>إذا لم نتمكن من قبول طلبك، سنبلغك بذلك ولن نفرض عليك رسوماً مقابل الكيك و/أو المخبوزات التي طلبتها.</p>
                    <p>في حالة قبولنا لطلبك، أو دفعك مقابل طلبك، ولكننا لم نعد قادرين على تنفيذ طلبك، سنقوم بما يلي:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>تقديم تواريخ بديلة يمكننا التنفيذ فيها؛ أو</li>
                      <li>تقديم منتجات بديلة يمكن توفيرها لك في الوقت المناسب؛ أو</li>
                    </ul>
                    <p>
                      في حالة عدم قبول البدائل المعروضة، سنبلغك ونرد لك كامل تكلفة طلبك. بخلاف رد تكلفة طلبك، لن نتحمل أي مسؤولية إضافية تجاهك. لمزيد من المعلومات، يرجى الاطلاع على{' '}
                      <Link to="/refund-policy" className="text-tiffany hover:underline font-medium">
                        سياسة الاسترجاع
                      </Link>.
                    </p>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">٣.٣ رقم طلبك.</h3>
                    <p>سنخصص رقم طلب لطلبك ونبلغك به عند قبول طلبك. سيساعدنا إذا أمكنك إبلاغنا برقم الطلب عند التواصل معنا بشأن طلبك.</p>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">٣.٤ التوصيل.</h3>
                    <p>على الرغم من أننا مقيمون في الكويت، قد لا نتمكن من توصيل الكيك إلى جميع مناطق الكويت. إذا أدخلت عنوان توصيل خارج منطقة التوصيل الخاصة بنا، فلن يتم قبول طلبك. لعرض مناطق التوصيل المحددة داخل الكويت، يرجى استخدام الخريطة التفاعلية في صفحة الطلب أو التواصل مع فريقنا مباشرة للمساعدة.</p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">٤. الأسعار والدفع</h2>
                    
                    <p><strong>٤.١</strong> يتم الدفع مقابل الطلب عند تقديم طلبك إلينا عند الدفع. ما لم يتم الاتفاق على خلاف ذلك من قبلنا وفقاً لتقديرنا المطلق، يتم إدراج جميع الأسعار ودفعها بالدينار الكويتي. جميع الأسعار شاملة لضريبة القيمة المضافة حيثما تكون قابلة للتطبيق. تقع على عاتقك وحدك مسؤولية مراجعة محتويات طلبك وملاءمتها وتكاليفها.</p>
                    
                    <p><strong>٤.٢</strong> أسعارنا القياسية كما هو موضح على موقعنا وتخضع للتغيير وفقاً لتقديرنا المطلق. من الممكن دائماً أنه على الرغم من بذلنا قصارى جهدنا، قد تكون بعض الكيك أو المخبوزات التي نبيعها مسعرة بشكل غير صحيح. سنتحقق عادةً من الأسعار قبل قبول طلبك. إذا قبلنا وعالجنا طلبك حيث يكون خطأ التسعير واضحاً ولا لبس فيه وكان يمكن التعرف عليه بشكل معقول من قبلك كخطأ في التسعير، فقد ننهي عقد البيع معك ونلغي طلبك ونرد لك أي مبالغ دفعتها.</p>
                    
                    <p><strong>٤.٣</strong> حيث يحتوي طلبك على كيك أو مخبوزات مخصصة، سننظر في متطلباتك ونرد بسعر مقترح. عند تقديم سعر لكيك أو مخبوزات، سننظر في تكلفة المكونات وتعقيد التصميم والوقت ومستوى المهارة المطلوبة لتنفيذ الطلب وموقع التوصيل. لسنا ملزمين بتقديم تفصيل لكيفية وصولنا لأي عرض سعر، أو تبرير قرارات التسعير الخاصة بنا فيما يتعلق بالعروض التي قد قدمناها في الماضي أو أسعار منتجاتنا القياسية.</p>
                    
                    <p>
                      <strong>٤.٤ مزود خدمات الدفع.</strong> نستخدم Tap Payments Systems لمعالجة مدفوعات بطاقات الخصم والائتمان لطلباتك. باستخدام موقع باندا كيك وتقديم طلب والموافقة على هذه الشروط، فإنك توافق أيضاً على الالتزام بـ{' '}
                      <a 
                        href="https://www.tap.company/en-qa/terms-and-conditions" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-tiffany hover:underline font-medium"
                      >
                        شروط خدمة Tap Payments
                      </a>.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">٥. الكيك والمخبوزات لدينا</h2>
                    
                    <p><strong>٥.١</strong> يتم إنشاء جميع الكيك والمخبوزات لدينا وفقاً لمعاييرنا الداخلية. بينما سنبذل دائماً جهوداً معقولة لتكرار مظهر الكيك والمخبوزات كما هو موضح ومصور على موقعنا بأمانة، فإن بعض الاختلاف سيحدث حتماً. لهذا الغرض، صور الكيك والمخبوزات على موقعنا هي لأغراض توضيحية فقط. على الرغم من بذلنا كل جهد لعرض الألوان والتصاميم بدقة، لا يمكننا ضمان أن الكيك و/أو المخبوزات الخاصة بك ستكون مطابقة. بالإضافة إلى ذلك، فإن غالبية الكيك والمخبوزات لدينا لا تُنتج وفقاً لوصفات موحدة. لذلك، ستحدث بعض الاختلافات في النكهات. هذه الاختلافات لا تشكل فشلاً في توصيل طلبك، ولن تكون باندا كيك ملزمة بتقديم خصم أو استرداد فيما يتعلق بهذه الاختلافات.</p>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">٥.٢ المواد المسببة للحساسية.</h3>
                    <p>قد تحتوي جميع الكيك والمخبوزات على أي من هذه المواد المسببة للحساسية: الحبوب المحتوية على الغلوتين (القمح والكاموت والشعير والشوفان) والبيض والحليب والمكسرات والفول السوداني وبذور السمسم وفول الصويا والكبريتيت. يوجد خطر التلوث المتبادل، حتى لو كان الكيك أو المخبوزات "مصنوعة بدون" مادة مسببة للحساسية، فإن جميع الكيك والمخبوزات تُنتج في مطابخ تتعامل مع المكسرات والمواد المسببة للحساسية الأخرى. لذلك، لا يمكننا استبعاد احتمال وجود آثار لهذه المواد في الكيك والمخبوزات لدينا. لا يعمل خبازونا من مطابخ "معتمدة خالية من" أي مادة مسببة للحساسية. تقع على عاتقك وحدك مسؤولية فهم أنواع الحساسية وعدم التحمل لدى جميع مستهلكي الكيك و/أو المخبوزات قبل شرائها من موقعنا. قد لا تكون الكيك والمخبوزات لدينا مناسبة للمستهلكين الذين يعانون من حساسية شديدة. تقع على عاتقك مسؤولية التأكد من إبلاغ جميع مستهلكي الكيك (أو الشخص المسؤول عن رعايتهم) بمحتوياتها قبل أي استهلاك. إلى أقصى حد يسمح به القانون، لا تقبل باندا كيك وخبازوها صراحةً أي مسؤولية عن أي إصابة ناتجة عن عدم ملاحظة هذا التوجيه وتطبيقه.</p>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">٥.٣ التأكد من دقة القياسات و/أو تصاميم التخصيص الخاصة بك.</h3>
                    <p>إذا كنا نصنع كيك أو مخبوزات وفقاً لقياسات و/أو تصاميم تخصيص قدمتها لنا، فأنت مسؤول عن ضمان دقة هذه القياسات و/أو تصاميم التخصيص.</p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">٦. إجراء تغييرات على طلبك</h2>
                    <p>إذا كنت ترغب في إجراء تغيير على الكيك أو المخبوزات في طلبك، يرجى الاتصال/مراسلتنا عبر واتساب مع الطلب. سنبذل قصارى جهدنا لضمان تلبية تغييراتك، ومع ذلك، لا يمكننا ضمان قدرتنا على تنفيذ التغييرات على طلبك الأولي. سنبلغك إذا كان التغيير ممكناً. إذا كان التغيير المطلوب ممكناً، واعتماداً على طبيعة التغيير المطلوب، قد تكون هناك تكلفة إضافية للدفع. في مثل هذا السيناريو، سنبلغك بهذه التكلفة الإضافية، ولن يتم تأكيد التغيير المطلوب إلا بعد الاتفاق على التكلفة الإضافية. إذا لم نتمكن من إجراء التغيير أو كانت عواقب إجراء التغيير غير مقبولة لك، سيعود الطلب إلى الطلب الذي تم تقديمه قبل طلب أي تغييرات، ما لم يكن الطلب بدون التغيير غير مقبول لك، وفي هذه الحالة يمكنك الإلغاء وفقاً لـ{' '}
                      <Link to="/refund-policy" className="text-tiffany hover:underline font-medium">
                        سياسة الدفع والإلغاء
                      </Link>.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">٧. حقوقنا في إجراء التغييرات</h2>
                    <p><strong>تغييرات طفيفة على الكيك أو المخبوزات.</strong> كما ذُكر أعلاه، قد يختلف الكيك والمخبوزات لدينا عن الصور المعروضة على موقعنا. قد نغير أيضاً الكيك أو المخبوزات التي طلبتها إذا احتجنا للامتثال لأي قوانين أو متطلبات تنظيمية معمول بها، على سبيل المثال، أي تحديثات على قوانين الأغذية أو المنتجات القابلة للتلف المعمول بها. في مثل هذا السيناريو، ستكون التغييرات طفيفة فقط ولن تغير المنتج الذي طلبته جوهرياً.</p>
                    <p><strong>التغييرات على هذه الشروط.</strong> نحتفظ بالحق في مراجعة هذه الشروط الحالية في أي وقت عن طريق تحديث الشروط على هذا الموقع. يرجى التأكد من مراجعة هذه الصفحة من وقت لآخر لتكون على علم بأي تغييرات. يرجى التأكد من حفظ نسخة من الشروط المعمول بها وقت طلبك حيث لن نحتفظ بنسخ للعملاء.</p>
                    <p><strong>التغييرات على موقعنا.</strong> قد نقوم بتحديث موقعنا من وقت لآخر وقد نغير المحتوى في أي وقت. ومع ذلك، يرجى ملاحظة أن أي محتوى على موقعنا قد يكون قديماً في أي وقت، ولسنا ملزمين بتحديثه. لا نضمن أن موقعنا أو أي محتوى عليه سيكون خالياً من الأخطاء أو السهو.</p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">٨. تقديم الكيك و/أو المخبوزات إليك</h2>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">٨.١ تكاليف التوصيل.</h3>
                    <p>تكلفة التوصيل تختلف حسب المسافة إلى عنوانك من متجرنا الموجود في العردية الحرفية.</p>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">٨.٢ تواريخ التوصيل.</h3>
                    <p>سيكون تاريخ توصيل الكيك و/أو المخبوزات هو التاريخ المحدد في تأكيد طلبك. سنبذل قصارى جهدنا لتلبية تاريخ ووقت التوصيل الذي تطلبه في طلبك، ومع ذلك، يعتمد ذلك أيضاً على الشروط التالية:</p>
                    <p>أ) إذا كنت تطلب كيك و/أو مخبوزات مخصصة عبر الهاتف/واتساب، فسيتم تأكيد تاريخ التوصيل والتوافر عندما نرد على استفسارك. تخضع تواريخ توصيل الكيك و/أو المخبوزات المخصصة لتوافرنا ويتم تحديدها وفقاً لتقديرنا المطلق. نطلب منك تقديم طلبك قبل ٢ إلى ٣ أيام على الأقل من تاريخ التوصيل المطلوب، وقبل ذلك بمدة أطول للطلبات المعقدة، ومع ذلك، قد نتمكن من توفير كيك و/أو مخبوزات مخصصة خلال ٢٤ ساعة وفقاً لتقديرنا المطلق.</p>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">٨.٣</h3>
                    <p>
                      لسنا مسؤولين عن التأخيرات الخارجة عن سيطرتنا. إذا تأخر توريد الكيك و/أو المخبوزات بسبب حدث خارج عن سيطرتنا، فسنتصل بك في أقرب وقت ممكن لإبلاغك وسنتخذ خطوات لتقليل تأثير التأخير. شريطة أن نفعل ذلك، لن نكون مسؤولين عن التأخيرات الناتجة عن الحدث، ولكن إذا كان هناك خطر تأخير كبير، يمكنك التواصل معنا لإنهاء العقد واسترداد أي مبالغ دفعتها مقابل الكيك أو المخبوزات التي لم تستلمها، وفقاً لشروط{' '}
                      <Link to="/refund-policy" className="text-tiffany hover:underline font-medium">
                        سياسة الدفع والإلغاء
                      </Link>.
                    </p>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">٨.٤</h3>
                    <p>في حالة عدم تمكننا من التوصيل إلى عنوانك المطلوب. قد نتواصل معك ونمنحك خيار استلام الكيك و/أو المخبوزات من متجرنا (وفي هذه الحالة سيتم رد رسوم التوصيل). في حالة عدم قبول هذا البديل، لن نتمكن من تنفيذ طلبك، وسنقدم استرداداً كاملاً.</p>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">٨.٥</h3>
                    <p>إذا لم يكن المستلم المقصود في المنزل عند توصيل الكيك و/أو المخبوزات. الكيك والمخبوزات غالباً ما تكون منتجات قابلة للتلف بشكل كبير، وتقع على عاتقك مسؤولية التأكد من وجود المستلم المقصود في المنزل خلال فترة التوصيل المحددة. إذا لم يكن هناك أحد متاح في عنوانك لاستلام التوصيل، سنحاول التواصل معك أو معهم لإكمال التوصيل. إذا لم نتمكن من إكمال التوصيل إلى العنوان المقصود ولم نتمكن من الوصول إليك للتوجيه، سنعيد الكيك إلى المتجر وقد تحتاج لاستلامها بنفسك.</p>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">٨.٦</h3>
                    <p>إذا لم تقم بإعادة ترتيب التوصيل. إذا لم تستلم الكيك أو المخبوزات منا كما هو مرتب أو إذا، بعد فشل التوصيل إليك، لم تقم بإعادة ترتيب التوصيل، فسنتصل بك للحصول على مزيد من التعليمات. قد نفرض عليك تكاليف التخزين وأي تكاليف توصيل إضافية. إذا لم نتمكن، على الرغم من جهودنا المعقولة، من التواصل معك أو إعادة ترتيب التوصيل أو الاستلام، فقد ننهي العقد. في مثل هذه الحالات حيث لم يكن من الممكن، بدون خطأ منا، توصيل الطلب، لا يمكننا تقديم استرداد.</p>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">٨.٧ إذا تأخر التوصيل.</h3>
                    <p>نهدف إلى توصيل جميع الطلبات ضمن فترة الـ ٣ ساعات المحددة في تأكيد طلبك. ومع ذلك، في حالة عدم وصول طلبك في الوقت المحدد، يرجى التواصل مع فريق خدمة العملاء على الرقم <span dir="ltr">+965 50018008</span> مع رقم طلبك.</p>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">٨.٨ متى تصبح مسؤولاً عن الكيك و/أو المخبوزات.</h3>
                    <p>ستكون الكيك و/أو المخبوزات في طلبك مسؤوليتك من وقت توصيلنا للكيك و/أو المخبوزات إلى العنوان الذي أعطيتنا إياه، أو استلامك لها منا.</p>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">٨.٩ الأسباب التي قد تجعلنا غير قادرين على توريد الكيك و/أو المخبوزات لك.</h3>
                    <p>قد لا نتمكن من توريد الكيك و/أو المخبوزات المطلوبة لك إذا:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>واجهنا حدثاً خارجاً عن سيطرتنا؛</li>
                      <li>لم نتمكن من إجراء تغييرات على الكيك و/أو المخبوزات كما طلبت أو أبلغناك (انظر البند ٧) وعدم القدرة على إجراء هذه التغييرات أدى إلى عدم الرغبة في الكيك و/أو المخبوزات؛</li>
                      <li>لم نتلقَ الدفع الكامل لطلبك منك؛</li>
                      <li>لم نعد قادرين على توفير الكيك و/أو المخبوزات المطلوبة بسبب مشاكل في التوريد.</li>
                    </ul>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">٨.١٠ عندما لا نتمكن من توريد الكيك و/أو المخبوزات المطلوبة.</h3>
                    <p>سنتصل بك بمجرد علمنا بذلك وسنقدم لك إما كيك و/أو مخبوزات بديلة، أو تاريخ توصيل مختلف، أو استرداد كامل.</p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">٩. الإلغاء والاسترداد</h2>
                    <p>
                      يحق لك إلغاء عقدك معنا واسترداد المبلغ، اعتماداً على ظروف معينة. لمزيد من المعلومات حول متى يمكنك طلب الإلغاء و/أو الاسترداد، يرجى الاطلاع على{' '}
                      <Link to="/refund-policy" className="text-tiffany hover:underline font-medium">
                        سياسة الدفع والإلغاء
                      </Link>.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">١٠. حقوقنا في إنهاء العقد</h2>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">١٠.١ قد ننهي العقد إذا أخللت به.</h3>
                    <p>قد ننهي عقد شراء الكيك و/أو المخبوزات في أي وقت عن طريق إخطارك كتابياً إذا:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>لم تقم بأي دفع لنا عند استحقاقه.</li>
                      <li>لم تسمح لنا، في غضون وقت معقول، بتوصيل الكيك و/أو المخبوزات إليك أو استلامها منا؛ أو</li>
                      <li>لم تسمح لنا، في غضون وقت معقول، بالوصول إلى مبانيك لتوريد الكيك و/أو المخبوزات.</li>
                    </ul>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">١٠.٢ يجب عليك تعويضنا إذا أخللت بالعقد.</h3>
                    <p>إذا أنهينا العقد للحالات المذكورة أعلاه، سنرد أي أموال دفعتها مقدماً مقابل منتجات لم نقدمها، ولكن قد نخصم أو نفرض عليك تعويضاً معقولاً عن التكاليف الصافية التي سنتكبدها نتيجة إخلالك بالعقد.</p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">١١. إذا كانت هناك مشكلة في الكيك و/أو المخبوزات</h2>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">١١.١ كيفية إبلاغنا بالمشاكل.</h3>
                    <p>رعاية العملاء هي جوهر ما نقوم به، وسنهدف إلى الرد بسرعة وبشكل كامل على أي شكاوى قد تكون لديك فيما يتعلق بأي طلبات تم تقديمها لدى باندا كيك. نهدف إلى حل جميع الشكاوى بحسن نية لإرضاء جميع الأطراف. عند استلام شكوى تتعلق بالمنتجات، سنقيّم الحقائق لفهم الوضع. إذا كان لديك شكوى بخصوص المنتجات المقدمة من باندا كيك، يجب الإبلاغ عن تلك الشكوى في أقرب وقت ممكن عملياً ومن الأفضل خلال ٢٤ ساعة. أي شكوى تُستلم بعد أكثر من ٢٤ ساعة من توصيل الكيك و/أو المخبوزات لن يتم النظر فيها. لسنا ملزمين، ولكن قد نقدم وفقاً لتقديرنا استرداداً جزئياً أو كاملاً أو خصماً على مشترياتك القادمة معنا.</p>
                    <p>نرجو أن يتم لفت انتباهنا إلى الشكاوى دون اللجوء إلى نشر تقييمات سلبية في المنتديات العامة، حتى نتمكن من السعي لحلها بما يرضيك. يرجى ملاحظة أنه إذا كانت شكواك تتعلق بطعم أو قوام الكيك، أو مسألة نظافة مزعومة، يجب إبلاغنا في أقرب وقت ممكن، والحفاظ على الكيك ومنحنا الفرصة لاستلامها للتحقيق. لا يمكننا تقديم استرداد أو تعويض حيث لا تُمنح لنا الفرصة لتقييم مزايا الشكاوى المتعلقة بالطعم أو القوام أو النظافة من خلال فحص الكيك. في حالة تقديم ادعاءات فيما يتعلق بالكيك والمخبوزات وخدماتنا في منتدى عام، سننظر بالطبع فيها على أساس مزاياها، ونحتفظ بالحق في الدفاع حسب الاقتضاء عن المنتجات والخدمات المقدمة من باندا كيك.</p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">١٢. كيف قد نستخدم معلوماتك الشخصية</h2>
                    <p>
                      سنستخدم معلوماتك الشخصية فقط كما هو منصوص عليه في{' '}
                      <Link to="/privacy-policy" className="text-tiffany hover:underline font-medium">
                        سياسة الخصوصية
                      </Link>
                      {' '}الخاصة بنا.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">١٤. شروط مهمة أخرى</h2>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">١٤.١ قد ننقل هذه الاتفاقية لشخص آخر.</h3>
                    <p>قد ننقل حقوقنا والتزاماتنا بموجب هذه الشروط إلى مؤسسة أخرى. سنبلغك دائماً كتابياً إذا حدث ذلك وسنضمن أن النقل لن يؤثر على حقوقك بموجب العقد.</p>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">١٤.٢ القوانين التي تنطبق على هذه الشروط وأين يمكنك رفع إجراءات قانونية.</h3>
                    <p>سنستخدم المساعي المعقولة للتوسط في أي نزاع يتعلق بطلبك، دون اللجوء إلى أطراف ثالثة في المقام الأول. ومع ذلك، إذا لم يمكن حل النزاع، يجوز لأي من الطرفين تقديم الأمر أمام المحكمة المختصة. إذا كنت مستهلكاً، فإن هذه الشروط تخضع وتُفسر وفقاً لقوانين دولة الكويت.</p>
                  </section>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Terms & Conditions</h1>
                <p className="text-muted-foreground mb-8">Updated 15 October 2025</p>

                <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
                  <p>Welcome to PANDA CAKES's Terms and Conditions.</p>

                  {/* Section 1 */}
                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">1. Introduction</h2>
                    <p>These are the terms and conditions (hereafter, the Terms) on which we supply our products to you.</p>
                    <p>Please read these Terms carefully before you submit your order to us.</p>
                    <p>These terms tell you who we are, how you can purchase our products, how you and we may change or end the contract for the purchase of our products, what to do if there is a problem and other important information.</p>
                    <p>If you think that there is a mistake in these Terms, please contact us to discuss, using the contact details in Section 2 below.</p>
                  </section>

                  {/* Section 2 */}
                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">2. Information about us and how to contact us</h2>
                    <p><strong>Who we are.</strong> We are PANDA CAKES, a company registered in State of Kuwait. Our company registration number is 428943, (hereafter referred to as PANDA CAKES, we, and us).</p>
                    <p>PANDA CAKES operates an e-commerce website at www.pandacakes.me to sell our cakes, baked goods, and all other goods (hereafter, our Cakes and Baked Goods) to you.</p>
                    <p><strong>How to contact us.</strong> You can contact us by Call/WhatsApp our customer service team at +965 50018008. Please note that our opening hours are from 8am to 9pm on Sunday to Saturday.</p>
                    <p><strong>How we may contact you.</strong> If we have to contact you, we will do so by telephone/WhatsApp you provided to us in your Order (as defined in clause 3.1 below).</p>
                    <p><strong>Other applicable terms.</strong> In addition to these Terms, the following terms also apply to you when using our site and/or purchasing our Cakes and Baked Goods:</p>
                    <p>
                      Our{' '}
                      <Link to="/privacy-policy" className="text-tiffany hover:underline font-medium">
                        Privacy Policy
                      </Link>
                      , which sets out the terms on which we process any personal data we collect from you, or that you provide to us. By using our site, you agree that your personal data will be processed pursuant to our Privacy Policy and Cookies Policy and you warrant that all data provided by you is accurate.
                    </p>
                  </section>

                  {/* Section 3 */}
                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">3. Our contract with you</h2>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">3.1 How we will accept your Order.</h3>
                    <p>Our acceptance of your request to purchase our Cakes and/or Baked Goods (Order) will take place either you complete the order through our e-Com website or by Telephone/WhatsApp.</p>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">3.2 If we cannot accept your Order.</h3>
                    <p>If we are unable to accept your Order, we will inform you of this and will not charge you for the Cakes and/or Baked Goods you have requested to order.</p>
                    <p>In the case where we have accepted your Order, or you have paid for your Order, but we are no longer able to fulfil your Order, we will:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>offer alternative dates which we can fulfil; or</li>
                      <li>offer alternative products which can be provided to you in time; or</li>
                    </ul>
                    <p>
                      in the event that the alternatives offered are not acceptable to you, we will notify you and refund the full cost of your Order. Beyond the refund of the cost of your Order, we shall have no further liability to you. For more information, please see our{' '}
                      <Link to="/refund-policy" className="text-tiffany hover:underline font-medium">
                        Refund Policy
                      </Link>.
                    </p>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">3.3 Your Order number.</h3>
                    <p>We will assign an Order number to your Order and tell you what it is when we accept your Order. It will help us if you can tell us the Order number whenever you contact us about your Order.</p>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">3.4 Delivery.</h3>
                    <p>Even though we are based in Kuwait, we may not be able to deliver our cakes to entire areas of Kuwait. If you insert a delivery address outside of our delivery area, your Order will not be accepted. To view our specific delivery zones within Kuwait, please use the interactive map on our order page or contact our team directly for assistance.</p>
                  </section>

                  {/* Section 4 */}
                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">4. Prices and Payment</h2>
                    
                    <p><strong>4.1</strong> Payment for the Order shall be taken when you submit your Order to us at the checkout. Unless otherwise agreed by us, at our sole discretion, all prices shall be listed and payable in KWD. All prices are inclusive of VAT where VAT is applicable. It is your sole responsibility to review the contents of your Order, their suitability, and their costs.</p>
                    
                    <p><strong>4.2</strong> Our standard prices are as shown on our site and subject to change at our sole discretion. It is always possible that, despite our best efforts, some of the Cakes or Baked Goods we sell may be incorrectly priced. We will normally check prices before accepting your Order. If we accept and process your Order where a pricing error is obvious and unmistakable and could reasonably have been recognised by you as a mispricing, we may end our sale contract with you, cancel your Order and refund you any sums you have paid.</p>
                    
                    <p><strong>4.3</strong> Where your Order contains a bespoke Cake or Baked Good, we will consider your requirements and revert with a proposed price. When providing a price for a Cake or Baked Good, we will consider the cost of the ingredients, the complexity of the design, the time and level of skill required to fulfil the Order, and the delivery location. We are under no obligation to provide a breakdown of how we reach any quote, or to justify our pricing decisions in relation to quotes that we may have offered in the past, or our standard product prices.</p>
                    
                    <p>
                      <strong>4.4 Payment services provider.</strong> We use Tap Payments Systems to process debit and credit card payments for your Orders. By using the PANDA CAKES Site and placing an Order, and agreeing to these Terms, you also accept you are bound by{' '}
                      <a 
                        href="https://www.tap.company/en-qa/terms-and-conditions" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-tiffany hover:underline font-medium"
                      >
                        Tap Payments Terms of Service
                      </a>.
                    </p>
                  </section>

                  {/* Section 5 */}
                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">5. Our Cakes and Baked Goods</h2>
                    
                    <p><strong>5.1</strong> All of our Cakes and Baked Goods are created in line with our internal standard. Whilst we shall always make reasonable efforts to faithfully replicate the appearance of our Cakes and Baked Goods as shown and described on our site, some variation shall inevitably occur. To this end, the images of our Cakes and Baked Goods on our site are for illustrative purposes only. Although we have made every effort to display the colours and designs accurately, we cannot guarantee that your Cake and/or Baked Good shall be identical. Additionally, the majority of our Cakes and Baked Goods are not produced according to standardised recipes. Therefore, some differences in flavours will occur. Such variations do not constitute a failure to deliver your Order, and PANDA CAKES shall be under no obligation to provide a discount or refund in relation to such variations.</p>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">5.2 Allergens.</h3>
                    <p>All Cakes and Baked Goods may contain any of these allergens, which are cereals containing gluten (wheat, kamut, barley, oat), eggs, milk, nuts, peanuts, sesame seeds, soya and sulphites. Risk of cross contamination is present, even if a Cake or Baked Good is "Made Without" an allergen, all Cakes and Baked Goods are produced in kitchens that handle nuts and the other allergens. Therefore, we cannot rule out the potential for traces of these allergens being included in our Cakes and Baked Goods. Our bakers do not operate from kitchens which are "Certified Free From" any allergen. It is your sole responsibility to understand the allergies and intolerances of all consumers of the Cake and/or Baked Good before you purchase it from our site. Our Cakes and Baked Goods may not be suitable for consumers with severe allergies. It is your responsibility to ensure all consumers of the cake (or the person responsible for their wellbeing) are informed of its contents before any consumption takes place. To the fullest extent permissible by law, PANDA CAKES and its bakers expressly do not accept liability for any injury caused by failure to take note of and apply this guidance.</p>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">5.3 Making sure your measurements and/or personalisation designs are accurate.</h3>
                    <p>If we are making a Cake or Baked Good to measurements and/or personalisation designs that you have given us, you are responsible for ensuring that these measurements and/or personalisation designs are correct.</p>
                  </section>

                  {/* Section 6 */}
                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">6. Making changes to your Order</h2>
                    <p>If you wish to make a change to the Cake or Baked Good in your Order, please telephone/WhatsApp us with the Order. We will do our best to ensure that your changes are met, however, we cannot guarantee that we are able to fulfil changes to your initial Order. We will let you know if the change is possible. If your requested change is possible, and depending on the nature of the requested change, there may also be an additional cost to pay. In such a scenario, we shall inform you of this additional cost, and the requested change shall only be confirmed upon agreeing upon the additional cost. If we cannot make the change or the consequences of making the change are unacceptable to you, the Order will revert to the Order that was placed before any changes were requested, unless the Order without the change is unacceptable to you, in which case you may cancel, subject to our{' '}
                      <Link to="/refund-policy" className="text-tiffany hover:underline font-medium">
                        Payment and Cancellation Policy
                      </Link>.
                    </p>
                  </section>

                  {/* Section 7 */}
                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">7. Our rights to make changes</h2>
                    <p><strong>Minor changes to the Cake or Baked Good.</strong> As mentioned above, our Cakes and Baked Goods may vary from the images displayed on our site. We may also change the Cake or Baked Good that you have ordered if we need to comply with any applicable laws or regulatory requirements, for example, any updates to applicable food or perishable items laws. In such a scenario, the changes will only be minor and shall not materially change the product that you have ordered.</p>
                    <p><strong>Changes to these Terms.</strong> We reserve the right to revise these present Terms at any time by updating the Terms on this site. Please ensure that you check this page from time to time to be aware of any changes. Please ensure that you save a copy of the Terms applicable at the time of your Order as we will not retain copies for customers.</p>
                    <p><strong>Changes to our site.</strong> We may update our site from time to time and may change the content at any time. However, please note that any of the content on our site may be out of date at any given time, and we are under no obligation to update it. We do not guarantee that our site, or any content on it, will be free from errors or omissions.</p>
                  </section>

                  {/* Section 8 */}
                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">8. Providing the Cakes and/or Baked Goods to you</h2>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">8.1 Delivery costs.</h3>
                    <p>The delivery costs may vary depending on the distance to your address from our shop located at Ardiya Herafiya.</p>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">8.2 Delivery dates.</h3>
                    <p>The delivery date for your Cakes and/or Baked Goods shall be the date specified in your Order Confirmation. We shall try our best to meet the delivery date and delivery time slot that you request in your Order, however, this is also dependent on the following terms:</p>
                    <p>a) If you are ordering a Bespoke Cake and/or Baked Good via Telephone/WhatsApp, then your delivery date and availability shall be confirmed when we respond to your inquiry. Delivery dates for Bespoke Cakes and/or Baked Goods are subject to our availability and determined at our sole discretion. We request that you submit your Order request at least 2 to 3 days before the desired delivery date, and further in advance for complex requests, however, we may be able to provide Bespoke Cakes and/or Baked Goods within 24 hours at our sole discretion.</p>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">8.3</h3>
                    <p>
                      We are not responsible for delays outside our control. If our supply of the Cakes and/or Baked Goods is delayed by an event outside our control, then we will contact you as soon as possible to let you know and we will take steps to minimise the effect of the delay. Provided we do this, we will not be liable for delays caused by the event, but if there is a risk of substantial delay you may contact us to end the contract and receive a refund for any Cakes or Baked Goods you have paid for but not received, in line with the terms of our{' '}
                      <Link to="/refund-policy" className="text-tiffany hover:underline font-medium">
                        Payment and Cancellation Policy
                      </Link>.
                    </p>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">8.4</h3>
                    <p>In the event that we are unable to deliver to your requested address. We may revert to you and give you the option of collecting the Cakes and/or Baked Goods from our store (in which case the delivery charge will be refunded). In the event that this alternative is unacceptable to you, we will be unable to fulfil your Order, and will provide a full refund.</p>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">8.5</h3>
                    <p>If the intended recipient is not at home when the Cakes and/or Baked Goods are delivered. Cakes and Baked Goods are often highly perishable items, and it is your responsibility to ensure that the intended recipient is at home for the intended delivery slot. If no one is available at your address to take the delivery, we will attempt to make contact with you or them to complete the delivery. If we are unable to complete the delivery to the intended address, and cannot reach you for guidance, we will return the cake back to the shop and you may need to collect it from yourself.</p>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">8.6</h3>
                    <p>If you do not re-arrange delivery. If you do not collect the Cakes or Baked Goods from us as arranged or if, after a failed delivery to you, you do not re-arrange delivery, then we will contact you for further instructions. We may charge you for storage costs and any further delivery costs. If, despite our reasonable efforts, we are unable to contact you or re-arrange delivery or collection we may end the contract. In such cases where, through no fault of ours, it has not been possible to deliver the Order, we are unable to offer a refund.</p>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">8.7 If your delivery is late.</h3>
                    <p>We aim to deliver all Orders within the specified 3-hour time slot in your Order Confirmation. However, in the event that your Order does not arrive on time, please contact our Customer Service Team at +965 50018008 with your Order number.</p>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">8.8 When you become responsible for the Cakes and/or Baked Goods.</h3>
                    <p>The Cakes and/or Baked Goods in your Order will be your responsibility from the time we deliver the Cakes and/or Baked Goods to the address you gave us, or you collect it from us.</p>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">8.9 Reasons we may no longer be able to supply the Cakes and/or Baked Goods to you.</h3>
                    <p>We may no longer be able to supply your ordered Cake and/or Baked Good to you if we:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>encounter an event that is outside of our control;</li>
                      <li>are unable to make changes to the Cake and/or Baked Good as requested by you or notified by us to you (see clause 7) and the inability to make such changes have meant that the Cake and/or Baked Good is no longer wanted;</li>
                      <li>have not received full payment of your Order from you;</li>
                      <li>we are no longer able to provide you with your ordered Cake and/or Baked Good due to issues with supply.</li>
                    </ul>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">8.10 Where we are no longer able to supply you with your ordered Cakes and/or Baked Goods.</h3>
                    <p>We will contact you as soon as we become aware of this and will either offer you a replacement Cake and/or Baked Good, a different delivery date, or a full refund.</p>
                  </section>

                  {/* Section 9 */}
                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">9. Cancellations and Refunds</h2>
                    <p>
                      You have the right to cancel your contract with us and receive a refund, depending on certain circumstances. For more information about when you can ask for a cancellation and/or refund, please consult our{' '}
                      <Link to="/refund-policy" className="text-tiffany hover:underline font-medium">
                        Payment and Cancellation Policy
                      </Link>.
                    </p>
                  </section>

                  {/* Section 10 */}
                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">10. Our rights to end the contract</h2>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">10.1 We may end the contract if you break it.</h3>
                    <p>We may end the contract for your purchase of Cakes and/or Baked Goods at any time by writing to you if:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>you do not make any payment to us when it is due.</li>
                      <li>you do not, within a reasonable time, allow us to deliver the Cakes and/or Baked Goods to you or collect them from us; or</li>
                      <li>you do not, within a reasonable time, allow us access to your premises to supply the Cakes and/or Baked Goods.</li>
                    </ul>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">10.2 You must compensate us if you break the contract.</h3>
                    <p>If we end the contract for the situations set out above, we will refund any money you have paid in advance for products we have not provided but we may deduct or charge you reasonable compensation for the net costs we will incur as a result of your breaking the contract.</p>
                  </section>

                  {/* Section 11 */}
                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">11. If there is a problem with the Cakes and/or Baked Goods</h2>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">11.1 How to tell us about problems.</h3>
                    <p>Customer care is at the very heart of what we do, and we will aim to respond promptly and fully to any complaints you may have in relation to any Orders placed with PANDA CAKES. We aim to resolve all complaints in good faith to the satisfaction of all parties. On receipt of a complaint that relates to the products, we will assess the facts in order to understand the situation. If you have a complaint in relation to the products provided by PANDA CAKES, that complaint must be reported to us as soon as practically possible and ideally within 24 hours. Any complaint received more than 24 hours after delivery of the Cake and/or Baked Good will not be considered by us. We are not obliged to, but may at our discretion, offer you a partial refund, a full refund, or a discount off your next purchase with us.</p>
                    <p>We kindly request that complaints are brought to our attention without recourse to posting negative reviews in public forums, so that we can seek to resolve them to your satisfaction. Please note that if your complaint relates to the taste or texture of the cake, or an alleged hygiene matter, you must let us know as soon as possible, preserve the cake and give us the opportunity to collect it, to allow us to investigate. We are unable to offer refunds or compensation where we are not given the opportunity to assess the merits of complaints relating to taste, texture or hygiene by inspecting the cake. In the event that allegations are made in relation to our Cakes and Baked Goods and services in a public forum, we will of course consider them on their merits, and reserve the right to defend as appropriate the products and services provided by PANDA CAKES.</p>
                  </section>

                  {/* Section 12 */}
                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">12. How we may use your personal information</h2>
                    <p>
                      We will only use your personal information as set out in our{' '}
                      <Link to="/privacy-policy" className="text-tiffany hover:underline font-medium">
                        Privacy Policy
                      </Link>.
                    </p>
                  </section>

                  {/* Section 14 */}
                  <section>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">14. Other important terms</h2>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">14.1 We may transfer this agreement to someone else.</h3>
                    <p>We may transfer our rights and obligations under these Terms to another organisation. We will always tell you in writing if this happens and we will ensure that the transfer will not affect your rights under the contract.</p>
                    
                    <h3 className="text-lg font-medium text-foreground mt-6 mb-3">14.2 Which laws apply to these Terms and where you may bring legal proceedings.</h3>
                    <p>We will use reasonable endeavors to mediate any dispute concerning your Order, without recourse to third parties in the first instance. However, if the dispute cannot be resolved, either party may bring the matter before the competent court. If you are a consumer, these terms are governed by in accordance with the laws of The State of Kuwait.</p>
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