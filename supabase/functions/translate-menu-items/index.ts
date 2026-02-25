import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Phonetic transliteration dictionary for cake product names
const wordMap: Record<string, string> = {
  // Common cake words
  'cake': 'كيك', 'cakes': 'كيك', 'cup': 'كب', 'cupcake': 'كب كيك', 'cupcakes': 'كب كيك',
  'mini': 'ميني', 'brownie': 'براوني', 'brownies': 'براونيز', 'cookie': 'كوكي', 'cookies': 'كوكيز',
  'cheesecake': 'تشيز كيك', 'biscoff': 'بيسكوف', 'tiramisu': 'تيراميسو',
  'donut': 'دونات', 'donuts': 'دونات', 'muffin': 'مافن', 'muffins': 'مافن',
  'tart': 'تارت', 'pie': 'باي', 'roll': 'رول', 'rolls': 'رول',
  'truffle': 'ترافل', 'truffles': 'ترافل', 'macaron': 'ماكرون', 'macarons': 'ماكرون',
  'pudding': 'بودنج', 'mousse': 'موس', 'fudge': 'فدج',
  'croissant': 'كرواسون', 'waffle': 'وافل', 'waffles': 'وافل',
  'biscuit': 'بسكويت', 'biscuits': 'بسكويت', 'eclair': 'إكلير',
  'profiterole': 'بروفيتيرول', 'baklava': 'بقلاوة', 'kunafa': 'كنافة',

  // Flavors & ingredients
  'vanilla': 'فانيلا', 'chocolate': 'شوكولاتة', 'strawberry': 'فراولة',
  'caramel': 'كراميل', 'lemon': 'ليمون', 'oreo': 'أوريو', 'nutella': 'نوتيلا',
  'pistachio': 'فستق', 'mango': 'مانجو', 'blueberry': 'توت أزرق',
  'raspberry': 'توت', 'coconut': 'جوز هند', 'coffee': 'قهوة', 'lotus': 'لوتس',
  'cheese': 'جبن', 'cream': 'كريم', 'butter': 'زبدة', 'honey': 'عسل',
  'red': 'ريد', 'velvet': 'فيلفيت', 'cinnamon': 'قرفة', 'almond': 'لوز',
  'hazelnut': 'بندق', 'peanut': 'فول سوداني', 'walnut': 'جوز',
  'banana': 'موز', 'apple': 'تفاح', 'orange': 'برتقال', 'peach': 'خوخ',
  'cherry': 'كرز', 'berries': 'توت', 'berry': 'توت', 'fruit': 'فواكه', 'fruits': 'فواكه',
  'matcha': 'ماتشا', 'kinder': 'كندر', 'ferrero': 'فيريرو', 'rocher': 'روشيه',
  'snickers': 'سنيكرز', 'twix': 'تويكس', 'kitkat': 'كيت كات', 'mars': 'مارس',
  'bounty': 'باونتي', 'galaxy': 'جالكسي', 'maltesers': 'مولتيزرز',
  'sponge': 'إسفنج', 'ganache': 'غاناش', 'praline': 'برالين',
  'dulce': 'دولسي', 'leche': 'ليتشي', 'tres': 'تريس',
  'frosting': 'كريمة التزيين', 'icing': 'آيسنج', 'glaze': 'جليز',
  'sprinkles': 'رشات', 'drizzle': 'دريزل', 'sauce': 'صوص',
  'jam': 'مربى', 'jelly': 'جيلي', 'compote': 'كومبوت',
  'whipped': 'مخفوق', 'fresh': 'طازج', 'dark': 'داكن', 'milk': 'حليب',

  // Colors
  'pink': 'بينك', 'blue': 'بلو', 'black': 'بلاك', 'white': 'وايت',
  'gold': 'ذهبي', 'golden': 'ذهبي', 'green': 'جرين', 'purple': 'بيربل',
  'silver': 'فضي', 'yellow': 'أصفر', 'rainbow': 'قوس قزح', 'rose': 'روز',
  'pastel': 'باستيل', 'nude': 'نود', 'beige': 'بيج', 'ivory': 'آيفوري',
  'turquoise': 'تركواز', 'teal': 'تيل', 'coral': 'كورال', 'burgundy': 'بورجندي',
  'lavender': 'لافندر', 'lilac': 'ليلك', 'pearly': 'لؤلؤي', 'pearl': 'لؤلؤ',
  'ombre': 'أومبري', 'ombré': 'أومبري', 'marbled': 'ماربل', 'marble': 'ماربل',
  'navy': 'نيفي', 'magenta': 'ماجنتا', 'crimson': 'قرمزي', 'bronze': 'برونزي',
  'copper': 'نحاسي', 'cream-colored': 'كريمي', 'dusty': 'داستي', 'neon': 'نيون',
  'chrome': 'كروم', 'metallic': 'ميتالك', 'matte': 'مات', 'glossy': 'لامع',

  // Characters & brands
  'batman': 'باتمان', 'barbie': 'باربي', 'spider': 'سبايدر', 'man': 'مان',
  'spiderman': 'سبايدر مان', 'superman': 'سوبرمان', 'hulk': 'هالك',
  'elsa': 'إلسا', 'frozen': 'فروزن', 'princess': 'برنسيس', 'prince': 'برنس',
  'unicorn': 'يونيكورن', 'dinosaur': 'ديناصور', 'dino': 'دينو',
  'mickey': 'ميكي', 'mouse': 'ماوس', 'minnie': 'ميني', 'disney': 'ديزني',
  'hello': 'هيلو', 'kitty': 'كيتي', 'peppa': 'بيبا', 'pig': 'بيغ',
  'paw': 'باو', 'patrol': 'باترول', 'mario': 'ماريو', 'sonic': 'سونيك',
  'pokemon': 'بوكيمون', 'pikachu': 'بيكاتشو', 'naruto': 'ناروتو',
  'anime': 'أنمي', 'marvel': 'مارفل', 'avengers': 'أفنجرز',
  'lego': 'ليجو', 'roblox': 'روبلوكس', 'minecraft': 'ماينكرافت',
  'fortnite': 'فورتنايت', 'football': 'كرة قدم', 'soccer': 'كرة قدم',
  'basketball': 'كرة سلة', 'tennis': 'تنس', 'cricket': 'كريكت',
  'car': 'سيارة', 'cars': 'سيارات', 'racing': 'ريسنج', 'truck': 'شاحنة',
  'stitch': 'ستيتش', 'winnie': 'ويني', 'pooh': 'بوه', 'snoopy': 'سنوبي',
  'garfield': 'جارفيلد', 'tom': 'توم', 'jerry': 'جيري', 'looney': 'لوني',
  'tunes': 'تونز', 'transformers': 'ترانسفورمرز', 'power': 'باور',
  'rangers': 'رينجرز', 'ben': 'بن', 'bluey': 'بلوي', 'cocomelon': 'كوكوميلون',
  'dora': 'دورا', 'explorer': 'إكسبلورر', 'moana': 'موانا',
  'rapunzel': 'رابونزل', 'cinderella': 'سندريلا', 'jasmine': 'ياسمين',
  'aladdin': 'علاء الدين', 'lion': 'أسد', 'king': 'ملك', 'queen': 'ملكة',
  'ninjago': 'نينجاجو', 'ninja': 'نينجا', 'turtle': 'سلحفاة', 'turtles': 'سلاحف',
  'harry': 'هاري', 'potter': 'بوتر', 'hogwarts': 'هوجوارتس',

  // Common cake design words
  'heart': 'قلب', 'hearts': 'قلوب', 'flower': 'وردة', 'flowers': 'ورد',
  'bouquet': 'باقة', 'butterfly': 'فراشة', 'butterflies': 'فراشات',
  'star': 'نجمة', 'stars': 'نجوم', 'crown': 'تاج', 'tiara': 'تيارا',
  'balloon': 'بالون', 'balloons': 'بالونات', 'confetti': 'كونفيتي',
  'ribbon': 'ريبون', 'bow': 'فيونكة', 'lace': 'دانتيل',
  'drip': 'دريب', 'swirl': 'سويرل', 'ruffle': 'رافل', 'ruffles': 'رافلز',
  'floral': 'فلورال', 'garden': 'حديقة', 'tropical': 'تروبيكال',
  'vintage': 'فينتج', 'rustic': 'رستك', 'boho': 'بوهو', 'chic': 'شيك',
  'elegant': 'أنيق', 'luxury': 'فاخر', 'royal': 'ملكي', 'classic': 'كلاسيك',
  'modern': 'مودرن', 'simple': 'بسيط', 'minimalist': 'مينيمال',
  'geometric': 'هندسي', 'abstract': 'أبستراكت',
  'retro': 'ريترو', 'broken': 'بروكن', 'mama': 'ماما', 'papa': 'بابا',
  'dad': 'بابا', 'mom': 'ماما', 'mum': 'ماما', 'baba': 'بابا',
  'grandma': 'جدة', 'grandpa': 'جد', 'sister': 'أخت', 'brother': 'أخ',
  'friend': 'صديق', 'bestie': 'بيستي', 'boss': 'بوس', 'lady': 'ليدي',
  'girl': 'بنت', 'boy': 'ولد', 'girls': 'بنات', 'boys': 'أولاد',
  'mrs': 'مسز', 'mr': 'مستر', 'miss': 'مس', 'dr': 'دكتور',
  'angel': 'ملاك', 'fairy': 'فيري', 'mermaid': 'حورية بحر',
  'pirate': 'قرصان', 'cowboy': 'كاوبوي', 'astronaut': 'رائد فضاء',
  'robot': 'روبوت', 'monster': 'مونستر', 'ghost': 'شبح',
  'panda': 'باندا', 'bear': 'دب', 'bunny': 'أرنب', 'rabbit': 'أرنب',
  'cat': 'قطة', 'dog': 'كلب', 'puppy': 'جرو', 'kitten': 'قطة صغيرة',
  'elephant': 'فيل', 'giraffe': 'زرافة', 'monkey': 'قرد', 'fox': 'ثعلب',
  'owl': 'بومة', 'flamingo': 'فلامنجو', 'swan': 'بجعة', 'peacock': 'طاووس',
  'safari': 'سفاري', 'jungle': 'غابة', 'forest': 'غابة', 'ocean': 'محيط',
  'sea': 'بحر', 'beach': 'شاطئ', 'island': 'جزيرة', 'mountain': 'جبل',
  'castle': 'قلعة', 'tower': 'برج', 'house': 'بيت', 'tree': 'شجرة',
  'leaf': 'ورقة', 'leaves': 'أوراق', 'branch': 'غصن', 'vine': 'كرمة',
  'sun': 'شمس', 'cloud': 'سحابة', 'rain': 'مطر', 'snow': 'ثلج',
  'ice': 'ثلج', 'fire': 'نار', 'flame': 'لهب', 'sparkle': 'بريق',
  'glitter': 'جليتر', 'shimmer': 'شيمر', 'glow': 'توهج',
  'diamond': 'ألماس', 'gem': 'جوهرة', 'crystal': 'كريستال',
  'ring': 'خاتم', 'rings': 'خواتم', 'necklace': 'عقد', 'jewel': 'جوهرة',
  'music': 'موسيقى', 'guitar': 'جيتار', 'piano': 'بيانو', 'drum': 'طبل',
  'camera': 'كاميرا', 'book': 'كتاب', 'pen': 'قلم', 'paint': 'رسم',
  'art': 'فن', 'craft': 'حرفة', 'diy': 'DIY', 'handmade': 'يدوي',
  'travel': 'سفر', 'world': 'عالم', 'map': 'خريطة', 'compass': 'بوصلة',
  'plane': 'طائرة', 'ship': 'سفينة', 'train': 'قطار', 'bicycle': 'دراجة',
  'shoe': 'حذاء', 'shoes': 'أحذية', 'bag': 'حقيبة', 'purse': 'حقيبة يد',
  'hat': 'قبعة', 'glasses': 'نظارات', 'dress': 'فستان', 'suit': 'بدلة',
  'makeup': 'مكياج', 'lipstick': 'أحمر شفاه', 'perfume': 'عطر',
  'spa': 'سبا', 'gym': 'جيم', 'yoga': 'يوجا', 'fitness': 'فتنس',
  'doctor': 'دكتور', 'nurse': 'ممرضة', 'engineer': 'مهندس', 'teacher': 'معلم',
  'chef': 'شيف', 'baker': 'خباز', 'artist': 'فنان', 'pilot': 'طيار',
  'soldier': 'جندي', 'police': 'شرطي', 'firefighter': 'إطفائي',

  // Common words
  'with': 'مع', 'and': 'و', 'the': '', 'a': '', 'an': '', 'of': '',
  'for': 'لـ', 'in': 'في', 'on': 'على', 'to': 'إلى', 'by': '',
  'birthday': 'عيد ميلاد', 'wedding': 'زفاف', 'graduation': 'تخرج',
  'engagement': 'خطوبة', 'anniversary': 'ذكرى', 'baby': 'بيبي',
  'shower': 'شاور', 'gender': 'جنس', 'reveal': 'كشف',
  'valentine': 'فالنتاين', "valentine's": 'فالنتاين', 'valentines': 'فالنتاين',
  'love': 'حب', 'romance': 'رومانسي', 'romantic': 'رومانسي',
  'be': 'بي', 'mine': 'ماين', 'my': 'ماي', 'your': 'يور', 'you': 'يو',
  'happy': 'هابي', 'sweet': 'سويت', 'little': 'ليتل', 'big': 'بيغ',
  'super': 'سوبر', 'mega': 'ميجا', 'deluxe': 'ديلوكس', 'premium': 'بريميوم',
  'special': 'سبيشل', 'custom': 'مخصص', 'signature': 'سيجنتشر',
  'dream': 'دريم', 'magic': 'ماجيك', 'wonder': 'وندر', 'fantasy': 'فانتازي',
  'paradise': 'باراديس', 'delight': 'ديلايت', 'bliss': 'بليس', 'joy': 'جوي',
  'box': 'بوكس', 'set': 'سيت', 'pack': 'باك', 'combo': 'كومبو', 'bundle': 'باندل',
  'number': 'نمبر', 'letter': 'ليتر', 'name': 'اسم', 'photo': 'صورة',
  'topper': 'توبر', 'toppers': 'توبرز', 'candle': 'شمعة', 'candles': 'شموع',
  'sparkler': 'سباركلر', 'sparklers': 'سباركلرز', 'fountain': 'نافورة',
  'tier': 'طبقة', 'tiers': 'طبقات', 'layer': 'طبقة', 'layers': 'طبقات',
  'round': 'دائري', 'square': 'مربع', 'rectangle': 'مستطيل',
  'small': 'صغير', 'medium': 'وسط', 'large': 'كبير', 'extra': 'إكسترا',
  'dozen': 'دزينة', 'half': 'نصف', 'piece': 'قطعة', 'pieces': 'قطع',
  'inch': 'إنش', 'inches': 'إنش',
  'serves': 'يكفي', 'serving': 'حصة', 'person': 'شخص', 'persons': 'أشخاص', 'people': 'أشخاص',
  'kg': 'كيلو', 'gram': 'جرام', 'grams': 'جرام',
  'cm': 'سم', 'tall': 'طول', 'height': 'ارتفاع', 'wide': 'عرض', 'long': 'طول',
  'minimum': 'كحد أدنى', 'maximum': 'كحد أقصى',
  'available': 'متوفر', 'limited': 'محدود', 'new': 'جديد', 'best': 'أفضل',
  'seller': 'مبيعاً', 'popular': 'شائع', 'trending': 'رائج',
  'collection': 'مجموعة', 'edition': 'إصدار', 'series': 'سلسلة',
  'exclusive': 'حصري', 'original': 'أصلي', 'authentic': 'أصيل',
  'design': 'تصميم', 'style': 'ستايل', 'theme': 'ثيم', 'concept': 'كونسبت',
  'inspired': 'مستوحى', 'shaped': 'على شكل', 'decorated': 'مزين',
  'topped': 'مزين', 'covered': 'مغطى', 'stuffed': 'محشو', 'loaded': 'محمل',
  'smash': 'سماش', 'explosion': 'انفجار', 'surprise': 'مفاجأة',
  'pinata': 'بيناتا', 'piñata': 'بيناتا', 'pull': 'بول', 'me': 'مي', 'up': 'أب',
  'naked': 'نيكد', 'semi': 'سيمي', 'fault': 'فولت', 'line': 'لاين',
  'tall': 'طويل', 'short': 'قصير', 'flat': 'فلات',
  'single': 'سنجل', 'double': 'دبل', 'triple': 'تربل',
  '2t': 'طبقتين', '3t': 'ثلاث طبقات', '4t': 'أربع طبقات',
  'assorted': 'مشكل', 'mixed': 'مشكل', 'variety': 'متنوع',
  'handcraft': 'يدوي', 'artisan': 'حرفي', 'gourmet': 'ذواقة',

  // Sports
  'barcelona': 'برشلونة', 'madrid': 'مدريد', 'psg': 'باريس', 'chelsea': 'تشلسي',
  'liverpool': 'ليفربول', 'arsenal': 'أرسنال', 'qatar': 'قطر',
  'al-sadd': 'السد', 'al-duhail': 'الدحيل', 'al-rayyan': 'الريان',
  'gym': 'جيم', 'ball': 'كرة', 'trophy': 'كأس', 'medal': 'ميدالية',
  'jersey': 'جيرسي', 'shirt': 'قميص', 'boots': 'حذاء رياضي',

  // Islamic
  'eid': 'عيد', 'mubarak': 'مبارك', 'ramadan': 'رمضان', 'kareem': 'كريم',
  'hajj': 'حج', 'mabrook': 'مبروك', 'umrah': 'عمرة', 'islamic': 'إسلامي',
  'mosque': 'مسجد', 'crescent': 'هلال', 'moon': 'قمر', 'lantern': 'فانوس',
  'quran': 'قرآن', 'kaaba': 'كعبة', 'prayer': 'صلاة', 'muslim': 'مسلم',
  'hijab': 'حجاب', 'arabic': 'عربي', 'calligraphy': 'خط عربي',

  // Zodiac
  'aries': 'الحمل', 'taurus': 'الثور', 'gemini': 'الجوزاء', 'cancer': 'السرطان',
  'leo': 'الأسد', 'virgo': 'العذراء', 'libra': 'الميزان', 'scorpio': 'العقرب',
  'sagittarius': 'القوس', 'capricorn': 'الجدي', 'aquarius': 'الدلو', 'pisces': 'الحوت',
  'zodiac': 'برج', 'sign': 'علامة', 'horoscope': 'أبراج',
};

// Multi-word phrases (checked first)
const phraseMap: Record<string, string> = {
  'red velvet': 'ريد فيلفيت',
  'cream cheese': 'كريم تشيز',
  'peanut butter': 'زبدة الفول السوداني',
  'ice cream': 'آيس كريم',
  'cotton candy': 'غزل البنات',
  'baby shower': 'بيبي شاور',
  'gender reveal': 'كشف الجنس',
  'be mine': 'بي ماين',
  'i love you': 'آي لوف يو',
  'happy birthday': 'عيد ميلاد سعيد',
  'with love': 'مع حب',
  'with flowers': 'مع ورد',
  'number cake': 'كيك نمبر',
  'letter cake': 'كيك ليتر',
  'photo cake': 'كيك صورة',
  'drip cake': 'دريب كيك',
  'naked cake': 'كيك نيكد',
  'pinata cake': 'كيك بيناتا',
  'pull me up': 'بول مي أب',
  'half birthday': 'نصف عيد ميلاد',
  'spider man': 'سبايدر مان',
  'hello kitty': 'هيلو كيتي',
  'paw patrol': 'باو باترول',
  'mickey mouse': 'ميكي ماوس',
  'minnie mouse': 'ميني ماوس',
  'eid mubarak': 'عيد مبارك',
  'ramadan kareem': 'رمضان كريم',
  'kit kat': 'كيت كات',
  'black forest': 'بلاك فورست',
  'tres leches': 'تريس ليتشيز',
  'new york': 'نيويورك',
  'cup cake': 'كب كيك',
  'cheese cake': 'تشيز كيك',
  'fault line': 'فولت لاين',
  'semi naked': 'سيمي نيكد',
  'pull apart': 'بول أبارت',
  'push up': 'بوش أب',
  'no bake': 'بدون خبز',
  'sugar free': 'خالي من السكر',
  'gluten free': 'خالي من الجلوتين',
  'dairy free': 'خالي من الألبان',
  'harry potter': 'هاري بوتر',
  'lion king': 'الأسد الملك',
  'ice age': 'العصر الجليدي',
  'toy story': 'توي ستوري',
  'finding nemo': 'فايندنج نيمو',
  'beauty and the beast': 'الجميلة والوحش',
  'snow white': 'سنو وايت',
  'sleeping beauty': 'سليبنج بيوتي',
  'little mermaid': 'ليتل ميرميد',
  'iron man': 'آيرون مان',
  'captain america': 'كابتن أمريكا',
  'wonder woman': 'وندر وومان',
  'power rangers': 'باور رينجرز',
  'ben 10': 'بن ١٠',
  'peppa pig': 'بيبا بيغ',
  'winnie the pooh': 'ويني ذا بوه',
  'among us': 'أمونج أس',
  'one piece': 'ون بيس',
  'cream cheese frosting': 'كريمة الجبن',
  'white chocolate': 'شوكولاتة بيضاء',
  'dark chocolate': 'شوكولاتة داكنة',
  'milk chocolate': 'شوكولاتة بالحليب',
  'of your choice': 'من اختيارك',
  'your choice': 'اختيارك',
  'bow and frosting cream': 'الفيونكة وكريمة التزيين',
  'frosting cream': 'كريمة التزيين',
};

const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

function toArabicNumerals(str: string): string {
  return str.replace(/[0-9]/g, (d) => arabicDigits[parseInt(d)]);
}

function transliterateName(name: string): string {
  let result = name.toLowerCase();
  
  // Check phrases first (sorted by length descending for greedy matching)
  const sortedPhrases = Object.entries(phraseMap).sort((a, b) => b[0].length - a[0].length);
  for (const [phrase, arabic] of sortedPhrases) {
    const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    result = result.replace(regex, arabic);
  }
  
  // Split remaining into words and transliterate
  const words = result.split(/\s+/);
  const transliterated = words.map(word => {
    // If already Arabic (from phrase replacement), keep it
    if (/[\u0600-\u06FF]/.test(word)) return word;
    
    // Remove common punctuation
    const clean = word.replace(/[^a-z0-9'-]/g, '');
    if (!clean) return '';
    
    // Check dictionary
    if (wordMap[clean]) return wordMap[clean];
    
    // If it's a number, convert to Arabic numerals
    if (/^\d+$/.test(clean)) return toArabicNumerals(clean);
    
    // Handle patterns like "2t", "3t" etc.
    const tierMatch = clean.match(/^(\d+)t$/i);
    if (tierMatch) {
      const num = parseInt(tierMatch[1]);
      if (num === 2) return 'طبقتين';
      return `${toArabicNumerals(String(num))} طبقات`;
    }
    
    // Keep as-is (proper nouns, unknown words) - transliterate phonetically
    const originalWord = name.split(/\s+/).find(w => w.toLowerCase().replace(/[^a-z0-9'-]/g, '') === clean);
    return originalWord || word;
  }).filter(w => w.length > 0);
  
  return transliterated.join(' ');
}

function translateDescription(desc: string): string {
  if (!desc) return '';
  
  let result = desc;
  
  // Sentence-level patterns (order matters - longer patterns first)
  const sentencePatterns: [RegExp, string | ((match: string, ...args: string[]) => string)][] = [
    // Full sentence patterns
    [/The order will be cancelled if not picked up within \d+ hours?/gi, (m) => {
      const hours = m.match(/\d+/)?.[0] || '';
      return `سيتم إلغاء الطلب إذا لم يتم استلامه خلال ${toArabicNumerals(hours)} ساعات`;
    }],
    [/The order will be cancelled if/gi, 'سيتم إلغاء الطلب إذا'],
    [/Choose the colou?r for/gi, 'اختر اللون لـ'],
    [/Choose your (favourite|favorite)/gi, 'اختر المفضل لديك'],
    [/of your choice of sponge/gi, 'من اختيارك من الإسفنج'],
    [/of your choice/gi, 'من اختيارك'],
    [/your choice/gi, 'اختيارك'],
    [/filled with/gi, 'محشو بـ'],
    [/stuffed with/gi, 'محشو بـ'],
    [/topped with/gi, 'مزين بـ'],
    [/decorated with/gi, 'مزين بـ'],
    [/covered (in|with)/gi, 'مغطى بـ'],
    [/drizzled with/gi, 'مغطى بـ'],
    [/inside white chocolate shell/gi, 'داخل غلاف شوكولاتة بيضاء'],
    [/inside (a )?chocolate shell/gi, 'داخل غلاف شوكولاتة'],
    [/bow and frosting cream/gi, 'الفيونكة وكريمة التزيين'],
    [/frosting cream/gi, 'كريمة التزيين'],
    [/cream cheese frosting/gi, 'كريمة الجبن'],
    [/white chocolate/gi, 'شوكولاتة بيضاء'],
    [/dark chocolate/gi, 'شوكولاتة داكنة'],
    [/milk chocolate/gi, 'شوكولاتة بالحليب'],
    [/minimum order/gi, 'الحد الأدنى للطلب'],
    [/preparation time/gi, 'وقت التحضير'],
    [/Serves minimum (\d+) people/gi, (_, n) => `تكفي ${toArabicNumerals(n)} أشخاص كحد أدنى`],
    [/Serves minimum (\d+)/gi, (_, n) => `تكفي ${toArabicNumerals(n)} كحد أدنى`],
    [/can be customized/gi, 'يمكن تخصيصه'],
    [/can be personalized/gi, 'يمكن تخصيصه'],
    [/please specify/gi, 'يرجى التحديد'],
    [/please note/gi, 'يرجى الملاحظة'],
    [/not included/gi, 'غير مشمول'],
    [/sold separately/gi, 'يباع بشكل منفصل'],
    [/per piece/gi, 'للقطعة'],
    [/per box/gi, 'للعلبة'],
    [/per set/gi, 'للمجموعة'],
    [/price may vary/gi, 'قد يختلف السعر'],
    [/subject to availability/gi, 'حسب التوفر'],
    [/while stocks last/gi, 'حتى نفاد الكمية'],
    [/made to order/gi, 'يُصنع عند الطلب'],
    [/freshly baked/gi, 'مخبوز طازجاً'],
    [/same day/gi, 'في نفس اليوم'],
    [/next day/gi, 'في اليوم التالي'],
    [/advance order/gi, 'طلب مسبق'],
    [/pre-?order/gi, 'طلب مسبق'],
  ];
  
  for (const [pattern, replacement] of sentencePatterns) {
    if (typeof replacement === 'string') {
      result = result.replace(pattern, replacement);
    } else {
      result = result.replace(pattern, replacement as any);
    }
  }
  
  // Size and measurement patterns
  result = result.replace(/(\d+)\s*inch(es)?/gi, (_, n) => `${toArabicNumerals(n)} إنش`);
  result = result.replace(/(\d+)\s*layer(s)?/gi, (_, n) => `${toArabicNumerals(n)} طبقات`);
  result = result.replace(/Height\s*(\d+)\s*cm/gi, (_, n) => `ارتفاع ${toArabicNumerals(n)} سم`);
  result = result.replace(/(\d+)\s*cm/gi, (_, n) => `${toArabicNumerals(n)} سم`);
  result = result.replace(/serves?\s*(\d+)[\s-]*(\d+)?\s*(person|people|pax)?/gi, (_, n1, n2) => {
    return n2 ? `يكفي ${toArabicNumerals(n1)}-${toArabicNumerals(n2)} أشخاص` : `يكفي ${toArabicNumerals(n1)} أشخاص`;
  });
  result = result.replace(/(\d+)\s*pieces?/gi, (_, n) => `${toArabicNumerals(n)} قطع`);
  result = result.replace(/(\d+)\s*dozen/gi, (_, n) => `${toArabicNumerals(n)} دزينة`);
  result = result.replace(/half\s*dozen/gi, 'نصف دزينة');
  
  // Common ingredient/method words in descriptions
  result = result.replace(/\bbuttercream\b/gi, 'بتر كريم');
  result = result.replace(/\bfondant\b/gi, 'فوندان');
  result = result.replace(/\bganache\b/gi, 'غاناش');
  result = result.replace(/\bsponge\b/gi, 'إسفنج');
  result = result.replace(/\bvanilla\b/gi, 'فانيلا');
  result = result.replace(/\bchocolate\b/gi, 'شوكولاتة');
  result = result.replace(/\bstrawberry\b/gi, 'فراولة');
  result = result.replace(/\bcaramel\b/gi, 'كراميل');
  result = result.replace(/\bcream\b/gi, 'كريم');
  result = result.replace(/\bcheese\b/gi, 'جبن');
  result = result.replace(/\bflower(s)?\b/gi, 'ورد');
  result = result.replace(/\bcandle(s)?\b/gi, 'شموع');
  result = result.replace(/\btopper(s)?\b/gi, 'توبر');
  result = result.replace(/\bribbon(s)?\b/gi, 'شريطة');
  result = result.replace(/\bbow\b/gi, 'فيونكة');
  result = result.replace(/\bdelivery\b/gi, 'التوصيل');
  result = result.replace(/\bpickup\b/gi, 'الاستلام');
  result = result.replace(/\bshell\b/gi, 'غلاف');
  result = result.replace(/\binside\b/gi, 'داخل');
  result = result.replace(/\boutside\b/gi, 'خارج');
  result = result.replace(/\bwith\b/gi, 'مع');
  result = result.replace(/\band\b/gi, 'و');
  result = result.replace(/\bor\b/gi, 'أو');
  result = result.replace(/\bthe\b/gi, '');
  result = result.replace(/\ba\b/gi, '');
  result = result.replace(/\ban\b/gi, '');
  result = result.replace(/\bof\b/gi, 'من');
  result = result.replace(/\bfor\b/gi, 'لـ');
  result = result.replace(/\bin\b/gi, 'في');
  result = result.replace(/\bon\b/gi, 'على');
  result = result.replace(/\bis\b/gi, '');
  result = result.replace(/\bare\b/gi, '');
  result = result.replace(/\bwill\b/gi, '');
  result = result.replace(/\bbe\b/gi, '');
  result = result.replace(/\bcan\b/gi, 'يمكن');
  result = result.replace(/\bmay\b/gi, 'قد');
  result = result.replace(/\bnot\b/gi, 'ليس');
  result = result.replace(/\byour\b/gi, 'لك');
  result = result.replace(/\byou\b/gi, 'أنت');
  result = result.replace(/\bour\b/gi, '');
  result = result.replace(/\bthis\b/gi, 'هذا');
  result = result.replace(/\bthat\b/gi, 'ذلك');
  result = result.replace(/\bwe\b/gi, 'نحن');
  result = result.replace(/\bany\b/gi, 'أي');
  result = result.replace(/\ball\b/gi, 'كل');
  result = result.replace(/\beach\b/gi, 'كل');
  result = result.replace(/\bevery\b/gi, 'كل');
  result = result.replace(/\bperfect\b/gi, 'مثالي');
  result = result.replace(/\bbeautiful\b/gi, 'جميل');
  result = result.replace(/\bdelicious\b/gi, 'لذيذ');
  result = result.replace(/\bamazing\b/gi, 'رائع');
  result = result.replace(/\bspecial\b/gi, 'خاص');
  result = result.replace(/\bcustom\b/gi, 'مخصص');
  result = result.replace(/\bchoice\b/gi, 'اختيار');
  result = result.replace(/\bchoose\b/gi, 'اختر');
  result = result.replace(/\bselect\b/gi, 'اختر');
  result = result.replace(/\bcolou?r\b/gi, 'اللون');
  result = result.replace(/\bflavou?r\b/gi, 'النكهة');
  result = result.replace(/\bsize\b/gi, 'الحجم');
  result = result.replace(/\bshape\b/gi, 'الشكل');
  result = result.replace(/\bdesign\b/gi, 'التصميم');
  result = result.replace(/\bstyle\b/gi, 'الستايل');
  result = result.replace(/\btype\b/gi, 'النوع');
  result = result.replace(/\bfilling\b/gi, 'الحشوة');
  result = result.replace(/\bicing\b/gi, 'آيسنج');
  result = result.replace(/\bglaze\b/gi, 'جليز');
  result = result.replace(/\bsprinkles\b/gi, 'رشات');
  result = result.replace(/\bfresh\b/gi, 'طازج');
  result = result.replace(/\bhomemade\b/gi, 'منزلي');
  result = result.replace(/\bhandmade\b/gi, 'يدوي');
  result = result.replace(/\bartisan\b/gi, 'حرفي');
  result = result.replace(/\bgourmet\b/gi, 'فاخر');
  result = result.replace(/\bpremium\b/gi, 'بريميوم');
  result = result.replace(/\bluxury\b/gi, 'فاخر');
  result = result.replace(/\belegant\b/gi, 'أنيق');
  result = result.replace(/\bclassic\b/gi, 'كلاسيك');
  result = result.replace(/\bmodern\b/gi, 'مودرن');
  result = result.replace(/\bsimple\b/gi, 'بسيط');
  result = result.replace(/\bminimalist\b/gi, 'مينيمال');
  result = result.replace(/\brustic\b/gi, 'رستك');
  result = result.replace(/\bvintage\b/gi, 'فينتج');
  result = result.replace(/\bretro\b/gi, 'ريترو');
  result = result.replace(/\btropical\b/gi, 'تروبيكال');
  result = result.replace(/\bfloral\b/gi, 'فلورال');
  result = result.replace(/\bgarden\b/gi, 'حديقة');
  result = result.replace(/\bwhite\b/gi, 'أبيض');
  result = result.replace(/\bblack\b/gi, 'أسود');
  result = result.replace(/\bpink\b/gi, 'وردي');
  result = result.replace(/\bblue\b/gi, 'أزرق');
  result = result.replace(/\bred\b/gi, 'أحمر');
  result = result.replace(/\bgold\b/gi, 'ذهبي');
  result = result.replace(/\bsilver\b/gi, 'فضي');
  result = result.replace(/\bgreen\b/gi, 'أخضر');
  result = result.replace(/\bpurple\b/gi, 'بنفسجي');
  result = result.replace(/\byellow\b/gi, 'أصفر');
  
  // Convert remaining Western digits to Arabic
  result = toArabicNumerals(result);
  
  // Clean up double spaces
  result = result.replace(/\s{2,}/g, ' ').trim();
  
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let body: any = {};
    try { body = await req.json(); } catch { /* empty body ok */ }
    const force = body?.force === true;

    // Fetch items - if force, re-translate ALL active items
    let query = supabase
      .from('menu_items')
      .select('id, name, description')
      .eq('is_active', true);

    if (!force) {
      query = query.is('name_ar', null);
    }

    // Limit to 200 items per run to avoid timeout
    const offset = body?.offset || 0;
    query = query.range(offset, offset + 199);

    const { data: items, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ message: 'No items to translate', count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${items.length} items to translate (force=${force})`);

    let updatedCount = 0;
    const errors: string[] = [];

    // Process in batches of 50
    for (let i = 0; i < items.length; i += 50) {
      const batch = items.slice(i, i + 50);
      
      for (const item of batch) {
        try {
          const nameAr = transliterateName(item.name);
          const descAr = item.description ? translateDescription(item.description) : null;

          const { error: updateError } = await supabase
            .from('menu_items')
            .update({ name_ar: nameAr, description_ar: descAr })
            .eq('id', item.id);

          if (updateError) {
            errors.push(`Failed to update ${item.id}: ${updateError.message}`);
          } else {
            updatedCount++;
          }
        } catch (e) {
          errors.push(`Error processing ${item.name}: ${e.message}`);
        }
      }
    }

    return new Response(JSON.stringify({
      message: `Translated ${updatedCount} of ${items.length} items`,
      count: updatedCount,
      total: items.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Translation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
