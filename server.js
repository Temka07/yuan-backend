const express = require("express");
const axios = require("axios");
const multer = require("multer");
const cors = require("cors");
const FormData = require("form-data");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

app.post("/send-order", upload.fields([
  { name: "receipt", maxCount: 1 },
  { name: "qr", maxCount: 1 }
]), async (req, res) => {
  try {
    const { amountSom, amountYuan, appName } = req.body;

    const message = `
🆕 Жаңы заказ!
Сом: ${amountSom}
Юань: ${amountYuan}
Тиркеме: ${appName}
    `;

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message
    });

    if (req.files?.receipt) {
      const form = new FormData();
      form.append("chat_id", CHAT_ID);
      form.append("photo", fs.createReadStream(req.files.receipt[0].path));

      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, form, {
        headers: form.getHeaders()
      });
    }

    if (req.files?.qr) {
      const form = new FormData();
      form.append("chat_id", CHAT_ID);
      form.append("photo", fs.createReadStream(req.files.qr[0].path));

      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, form, {
        headers: form.getHeaders()
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error sending to Telegram" });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running...");
});
