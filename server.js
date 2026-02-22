const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const app = express();

// Конфигурация
const BOT_TOKEN = "7584186495:AAGin6ctrku5AUf2i1tLd0H5DXZQLk";
const CHAT_ID = "5477935692";

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Файлдарды убактылуу сактоо (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB лимит
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Yuan Backend is running',
        endpoints: {
            sendPayment: '/send-payment (POST)'
        }
    });
});

// Төлөмдү кабыл алуу эндпоинти
app.post('/send-payment', upload.fields([
    { name: 'checkPhoto', maxCount: 1 },
    { name: 'qrPhoto', maxCount: 1 }
]), async (req, res) => {
    try {
        console.log('Received payment request');
        
        const { contact, som, yuan, app: paymentApp, bankName, bankNumber, bankOwner } = req.body;
        const checkPhoto = req.files['checkPhoto'] ? req.files['checkPhoto'][0] : null;
        const qrPhoto = req.files['qrPhoto'] ? req.files['qrPhoto'][0] : null;
        
        // Валидация
        if (!contact || !som || !yuan || !paymentApp) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        if (!checkPhoto || !qrPhoto) {
            return res.status(400).json({ error: 'Both photos are required' });
        }
        
        // Текст билдирүү даярдоо
        const message = `
<b>✅ ЖАҢЫ ТӨЛӨМ!</b>

💰 <b>Сумма:</b> ${som} сом → ${yuan} ¥
📱 <b>Тиркеме:</b> ${paymentApp}
🏦 <b>Банк:</b> ${bankName}
💳 <b>Номер:</b> ${bankNumber}
👤 <b>Ээси:</b> ${bankOwner}
📞 <b>Байланыш:</b> ${contact}
🕐 <b>Убактысы:</b> ${new Date().toLocaleString('ru-RU')}

<b>📸 Сүрөттөр төмөндө:</b>
        `;
        
        // 1. Текстти жиберүү
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
        
        // 2. Чек сүрөтүн жиберүү
        if (checkPhoto) {
            const checkFormData = new FormData();
            checkFormData.append('chat_id', CHAT_ID);
            checkFormData.append('photo', checkPhoto.buffer, {
                filename: checkPhoto.originalname,
                contentType: checkPhoto.mimetype
            });
            checkFormData.append('caption', '📸 Чек');
            
            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, checkFormData, {
                headers: checkFormData.getHeaders()
            });
        }
        
        // 3. QR сүрөтүн жиберүү (бир аз күтүү менен)
        if (qrPhoto) {
            // 1 секунда күтөбүз (rate limiting үчүн)
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const qrFormData = new FormData();
            qrFormData.append('chat_id', CHAT_ID);
            qrFormData.append('photo', qrPhoto.buffer, {
                filename: qrPhoto.originalname,
                contentType: qrPhoto.mimetype
            });
            qrFormData.append('caption', '📱 QR-код');
            
            await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, qrFormData, {
                headers: qrFormData.getHeaders()
            });
        }
        
        res.json({ success: true, message: 'Payment sent to Telegram' });
        
    } catch (error) {
        console.error('Error sending to Telegram:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to send to Telegram',
            details: error.response?.data || error.message 
        });
    }
});

// Серверди иштетүү
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
