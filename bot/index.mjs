import { Telegraf } from 'telegraf';
import jwt from 'jsonwebtoken';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as dotenv from 'dotenv';

// Load bot/.env alongside this file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const BOT_TOKEN = process.env.BOT_TOKEN;
const LOGIN_JWT_SECRET = process.env.TELEGRAM_LOGIN_JWT_SECRET || BOT_TOKEN;
const APP_ORIGIN = process.env.APP_ORIGIN; // e.g., https://yourapp.com

if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN is required');
}
if (!APP_ORIGIN) {
  throw new Error('APP_ORIGIN is required (like https://yourapp.com)');
}

const bot = new Telegraf(BOT_TOKEN);

bot.start(async (ctx) => {
  const payload = ctx.startPayload;
  if (payload !== 'login') {
    const me = ctx.me || (await ctx.telegram.getMe()).username;
    await ctx.reply(`Нажмите: https://t.me/${me}?start=login`);
    return;
  }

  const from = ctx.from || {};
  const token = jwt.sign(
    {
      sub: String(from.id),
      username: from.username,
      first_name: from.first_name,
      last_name: from.last_name,
      extra: { telegram_id: from.id },
    },
    LOGIN_JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '15m' }
  );

  const url = `${APP_ORIGIN}/auth?token=${encodeURIComponent(token)}`;
  await ctx.reply('Перейдите по ссылке для входа:', {
    reply_markup: {
      inline_keyboard: [[{ text: 'Войти', url }]],
    },
  });
});

bot.catch((err) => {
  console.error('[BOT] error', err);
});

bot.launch().then(() => {
  console.log('[BOT] started');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
