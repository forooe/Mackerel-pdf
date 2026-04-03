const { Telegraf, Markup } = require('telegraf');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const fs = require('fs');

// توكن البوت الخاص 
const bot = new Telegraf('8764714344:AAGUG-SgnIzacA0Zu5Ej-ZK1Vy8Hx6yd8Kc');

// تخزين اختيار المستخدم
let userChoice = {};

// --- تصميم الـ 6 أزرار الرئيسية ---
const mainKeyboard = Markup.keyboard([
    ['🖼️ تحويل إلى ايموجي', '🖼️ تحويل إلى ملصق'],
    ['📖 تعليمات ملصق ثابت', '🎬 تعليمات ملصق متحرك'],
    ['✨ تعليمات ايموجي ثابت', '💫 تعليمات ايموجي متحرك']
]).resize();

bot.start((ctx) => {
    ctx.reply('مرحباً بك في بوت المحول المطور!\nاختر نوع التحويل أو اقرأ التعليمات من الأزرار أدناه.', mainKeyboard);
});

// --- تنفيذ أزرار التحويل ---
bot.hears('🖼️ تحويل إلى ايموجي', (ctx) => {
    userChoice[ctx.from.id] = 'emoji';
    ctx.reply('✅ وضع الإيموجي (100x100) مفعل.\nأرسل الآن الصورة (ستكون بقوس) أو الفيديو (سيكون حاد 3 ثواني).');
});

bot.hears('🖼️ تحويل إلى ملصق', (ctx) => {
    userChoice[ctx.from.id] = 'sticker';
    ctx.reply('✅ وضع الملصق (512x512) مفعل.\nأرسل الآن الصورة (ستكون بقوس) أو الفيديو (سيكون حاد 3 ثواني).');
});

// --- تنفيذ أزرار التعليمات الأربعة (نصوص ملفك كاملة بدون نقص) ---

bot.hears('📖 تعليمات ملصق ثابت', (ctx) => {
    ctx.reply(`**كيفية عمل ملصق ثابت في تلقرام**\n\nاذهب الى تلقرام و ادخل البوت ستيكر هذا يوزر البوت Stickers و تضغط start و تختار /newpack - لإنشاء حزمة ملصقات ثابتة بصيغة PNG/WEBP و بعدها تختار اسم الحزمة يعني اسم الي يضهر فوق حزمة ملصق و بعدها ترسله ملف الصورة الي سويته بالموقع و بعدها ترسل اي ايموجي من عندك بال كيبورد و إذا تريد تضيف بالحزمة هواي ملصقات تكمل نفس شي الصوره الي تريده و ايموجي و بعدها تضغط /publish و بعدها /skip و ترسل اي شي بال انكليزي حتى يخلي رابط حق الحزمة و خلص.`, { parse_mode: 'Markdown' });
});

bot.hears('🎬 تعليمات ملصق متحرك', (ctx) => {
    ctx.reply(`**كيفية عمل ملصق متحرك في تلقرام**\n\nلعمل ملصق متحرك في تلقرام يجب ان لا يتجاوز مدة الفيديو 3 ثواني تم تصميم هذا الموقع بذكاء و تركيز اذا اضفت فيديو مدته اكثر من 3 ثوني سوف يحوله الموقع تلقائيا إلى ثلاث ثواني و يطبق جميع متطلبات ستيكر بوت لنبدأ ب تعليم اولاً اذهب الى بوت ستيكر في تلقرام هذا يوزر البوت Stickers و اضغط start و اضغط /newvideo – لإنشاء حزمة ملصقات فيديو WEBM اكتب اسم الحزمه هذا الاسم يضهر فوق الملصق بال حزمه ارسل ملف الفيديو الي سويته بالموقع الي انت بيه حاليا و ارسل وراه اي ايموجي من كيبورد و إذا تريد تضيف بعد عدة ملصقات ايضا دز ج الملف الملصق الي سويته بالموقع و دز اي ايموجي بالكيبورد و اضغط /publish بعدها اضغط /skip و بعدها اكتب اي شي بال إنكليزي هذا يصير رابط الحزمه و خلص.`, { parse_mode: 'Markdown' });
});

bot.hears('✨ تعليمات ايموجي ثابت', (ctx) => {
    ctx.reply(`**كيفية عمل ايموجي ثابت في تلقرام**\n\nاذهب الى تلقرام و ادخل البوت ستيكر هذا يوزر البوت Stickers و تضغط start و تختار /newemojipack – لإنشاء حزمة من الرموز التعبيرية وتختار رمز تعبيري ثابت و اكتب اسم الحزمة الايموجي هذا الاسم يضهر فوق الحزمة و أرسله ملف الصوره الي سويته بالموقع و أرسله اي ايموجي و إذا تريد تضيف بعد صور للحزمه ايضا ارسل صوره و وراها ايموجي من الكيبورد بعدين تضغط /publish و تضغط /skip و تكتب اي شي بالإنكليزي هذا للرابط حق الحزمة.`, { parse_mode: 'Markdown' });
});

bot.hears('💫 تعليمات ايموجي متحرك', (ctx) => {
    ctx.reply(`**كيفية عمل ايموجي متحرك في تلقرام**\n\nلعمل ايموجي متحرك في تلقرام يجب ان لا يتجاوز مدة الفيديو 3 ثواني تم تصميم هذا الموقع بذكاء و تركيز اذا اضفت فيديو مدته اكثر من 3 ثوني سوف يحوله الموقع تلقائيا إلى ثلاث ثواني و يطبق جميع متطلبات ستيكر بوت لنبدأ ب تعليم اولاً اذهب الى بوت ستيكر في تلقرام هذا يوزر البوت Stickers و اضغط start و اضغط /newemojipack – لإنشاء حزمة من الرموز التعبيرية و اكتب او اضغط على رمز تعبيري فيديو اكتب اسم الحزمه هذا الاسم يضهر فوق الملصق بال حزمه ارسل ملف الفيديو الي سويته بالموقع الي انت بيه حاليا و ارسل وراه اي ايموجي من كيبورد و إذا تريد تضيف بعد عدة ملصقات ايضا دز ج الملف الملصق الي سويته بالموقع و دز اي ايموجي بالكيبورد و اضغط /publish بعدها اضغط /skip و بعدها اكتب اي شي بال إنكليزي هذا يصير رابط الحزمه و خلص.`, { parse_mode: 'Markdown' });
});

// --- البرمجة التقنية (قوس للصور / حاد للفيديو + قص 3 ثواني) ---

async function processMedia(ctx, link, isVideo) {
    const type = userChoice[ctx.from.id] || 'sticker'; 
    const size = (type === 'emoji') ? 100 : 512;
    const output = `./ali_${Date.now()}.${isVideo ? 'webm' : 'png'}`;

    try {
        if (!isVideo) {
            // صورة -> أطراف منحنية (قوس)
            const res = await axios({ url: link, responseType: 'arraybuffer' });
            const r = size / 5; 
            const mask = Buffer.from(`<svg><rect x="0" y="0" width="${size}" height="${size}" rx="${r}" ry="${r}"/></svg>`);
            await sharp(res.data).resize(size, size).composite([{ input: mask, blend: 'dest-in' }]).png().toFile(output);
        } else {
            // فيديو -> أطراف حادة + 3 ثواني تلقائياً
            await new Promise((resolve, reject) => {
                ffmpeg(link)
                    .size(`${size}x${size}`)
                    .duration(3) // قص الفيديو تلقائياً لأول 3 ثواني
                    .videoCodec('libvpx-vp9')
                    .outputOptions(['-pix_fmt yuva420p', '-an'])
                    .on('end', resolve)
                    .on('error', reject)
                    .save(output);
            });
        }
        // إرسال الملف (هذا هو رابط التحميل)
        await ctx.replyWithDocument({ source: output, filename: `ali_converted.${isVideo ? 'webm' : 'png'}` });
        if (fs.existsSync(output)) fs.unlinkSync(output);
    } catch (e) {
        ctx.reply('حدث خطأ في المعالجة.');
    }
}

bot.on('photo', async (ctx) => {
    const link = await ctx.telegram.getFileLink(ctx.message.photo.pop().file_id);
    await processMedia(ctx, link.href, false);
});

bot.on('video', async (ctx) => {
    const link = await ctx.telegram.getFileLink(ctx.message.video.file_id);
    await processMedia(ctx, link.href, true);
});

bot.launch();
