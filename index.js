const { Telegraf, Markup } = require('telegraf');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const bot = new Telegraf('8764714344:AAGUG-SgnIzacA0Zu5Ej-ZK1Vy8Hx6yd8Kc');

let userChoice = {};

const mainKeyboard = Markup.keyboard([
    ['🖼️ تحويل إلى ايموجي', '🖼️ تحويل إلى ملصق'],
    ['📖 تعليمات ملصق ثابت', '🎬 تعليمات ملصق متحرك'],
    ['✨ تعليمات ايموجي ثابت', '💫 تعليمات ايموجي متحرك']
]).resize();

bot.start((ctx) => {
    ctx.reply('مرحباً بك في بوت المحول المطور!\nاختر نوع التحويل من الأزرار أدناه.', mainKeyboard);
});

// --- التعليمات (نفس نصوصك السابقة) ---
bot.hears('📖 تعليمات ملصق ثابت', (ctx) => ctx.reply(`كيفية عمل ملصق ثابت في تلقرام:\nاذهب الى @Stickers و اختر /newpack و ارسل ملف الصورة.`));
bot.hears('🎬 تعليمات ملصق متحرك', (ctx) => ctx.reply(`كيفية عمل ملصق متحرك في تلقرام:\nيجب ان لا يتجاوز مدة الفيديو 3 ثواني (سيتم قصه تلقائياً). اذهب لـ @Stickers و اختر /newvideo.`));
bot.hears('✨ تعليمات ايموجي ثابت', (ctx) => ctx.reply(`كيفية عمل ايموجي ثابت في تلقرام:\nاذهب الى @Stickers و اختر /newemojipack ثم رمز تعبيري ثابت.`));
bot.hears('💫 تعليمات ايموجي متحرك', (ctx) => ctx.reply(`كيفية عمل ايموجي متحرك في تلقرام:\nيجب ان لا يتجاوز 3 ثواني. اذهب لـ @Stickers و اختر /newemojipack ثم رمز تعبيري فيديو.`));

// --- اختيار الوضع ---
bot.hears('🖼️ تحويل إلى ايموجي', (ctx) => { userChoice[ctx.from.id] = 'emoji'; ctx.reply('✅ تم تفعيل وضع الإيموجي (100x100)'); });
bot.hears('🖼️ تحويل إلى ملصق', (ctx) => { userChoice[ctx.from.id] = 'sticker'; ctx.reply('✅ تم تفعيل وضع الملصق (512x512)'); });

// --- دالة المعالجة المحسنة ---
async function processMedia(ctx, fileLink, isVideo) {
    const type = userChoice[ctx.from.id] || 'sticker';
    const size = (type === 'emoji') ? 100 : 512;
    const output = path.join(__dirname, `ali_${Date.now()}.${isVideo ? 'webm' : 'png'}`);

    try {
        if (!isVideo) {
            const res = await axios({ url: fileLink, responseType: 'arraybuffer' });
            const r = size / 5;
            const mask = Buffer.from(`<svg><rect x="0" y="0" width="${size}" height="${size}" rx="${r}" ry="${r}"/></svg>`);
            await sharp(res.data).resize(size, size).composite([{ input: mask, blend: 'dest-in' }]).png().toFile(output);
        } else {
            // معالجة الفيديو مع إعدادات متوافقة مع Railway
            await new Promise((resolve, reject) => {
                ffmpeg(fileLink)
                    .inputOptions('-t 3') // قص الفيديو لـ 3 ثواني قبل البدء
                    .size(`${size}x${size}`)
                    .aspect('1:1')
                    .videoCodec('libvpx-vp9')
                    .outputOptions([
                        '-pix_fmt yuva420p',
                        '-an',
                        '-b:v 256k',
                        '-fs 256k' // تحديد الحجم الأقصى للملف ليقبله التلجرام
                    ])
                    .on('start', (cmd) => console.log('بدأت المعالجة: ' + cmd))
                    .on('end', resolve)
                    .on('error', (err) => {
                        console.error('FFMPEG Error:', err);
                        reject(err);
                    })
                    .save(output);
            });
        }
        await ctx.replyWithDocument({ source: output, filename: `ali_result.${isVideo ? 'webm' : 'png'}` });
        if (fs.existsSync(output)) fs.unlinkSync(output);
    } catch (e) {
        console.error('General Error:', e);
        ctx.reply('❌ حدث خطأ في المعالجة. تأكد من تثبيت FFmpeg في سيرفر Railway.');
    }
}

bot.on('photo', async (ctx) => {
    const link = await ctx.telegram.getFileLink(ctx.message.photo.pop().file_id);
    await processMedia(ctx, link.href, false);
});

bot.on('video', async (ctx) => {
    const link = await ctx.telegram.getFileLink(ctx.message.video.file_id);
    ctx.reply('🔄 جاري معالجة الفيديو (قص لـ 3 ثواني وتعديل المقاسات)...');
    await processMedia(ctx, link.href, true);
});

bot.on('animation', async (ctx) => { // لدعم الـ GIF أيضاً
    const link = await ctx.telegram.getFileLink(ctx.message.animation.file_id);
    await processMedia(ctx, link.href, true);
});

bot.launch();
