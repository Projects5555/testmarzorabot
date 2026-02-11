// 🤖 VPN Channel Automation Bot
// 📱 Automates posting VPN subscriptions to Telegram channels
// 💾 Uses Deno KV for user data, plans, panels, channels
// 🔔 Handles plans, settings, top-ups with Telegram Stars
// 📊 Integrates with user Marzban panels or our Marzban (premium)
// ⚠️ Posts Happ codes at scheduled times with custom features

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

// -------------------- Telegram Setup --------------------
const TOKEN = Deno.env.get("BOT_TOKEN");
if (!TOKEN) throw new Error("BOT_TOKEN not set");
const API = `https://api.telegram.org/bot${TOKEN}`;

// -------------------- Happ API --------------------
const HAPP_API_URL = "https://crypto.happ.su/api.php";

// -------------------- Deno KV --------------------
const kv = await Deno.openKv();

// -------------------- Constants --------------------
const PLANS: Record<string, any> = {
  free: {
    maxChannels: 1,
    editTime: false,
    editPost: false,
    noWatermark: false,
    editReaction: false,
    noAds: false,
    integrateOur: false,
  },
  starter: {
    maxChannels: 3,
    editTime: true,
    editPost: false,
    noWatermark: false,
    editReaction: false,
    noAds: false,
    integrateOur: false,
  },
  pro: {
    maxChannels: 10,
    editTime: true,
    editPost: true,
    noWatermark: true,
    editReaction: true,
    noAds: true,
    integrateOur: false,
  },
  premium: {
    maxChannels: Infinity,
    editTime: true,
    editPost: true,
    noWatermark: true,
    editReaction: true,
    noAds: true,
    integrateOur: true,
  },
};

const PLAN_COSTS: Record<string, number> = {
  starter: 100,
  pro: 300,
  premium: 500,
};

const PLAN_HIERARCHY: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  premium: 3,
};

async function getOurMarzban() {
  const entry = await kv.get(["our_marzban"]);
  return entry.value || { url: "http://89.23.97.127:3286/dashboard/login", username: "05", password: "05", sub_prefix: "happ_" };
}

async function saveOurMarzban(data: any) {
  await kv.set(["our_marzban"], data);
}

let botId: number | null = null;
async function getBotId() {
  if (botId) return botId;
  const res = await fetch(`${API}/getMe`);
  const data = await res.json();
  if (data.ok) {
    botId = data.result.id;
    return botId;
  }
  throw new Error("Failed to get bot ID");
}

// -------------------- Helpers --------------------
function escapeMarkdown(text: string): string {
  return text.replace(/([_*`\[])/g, '\\$1');
}

async function sendMessage(chatId: string, text: string, parseMode: string | null = "Markdown", replyMarkup: any = null, entities: any[] | null = null) {
  try {
    const body: any = { chat_id: chatId, text };
    if (parseMode) body.parse_mode = parseMode;
    if (entities) body.entities = entities;
    if (replyMarkup) body.reply_markup = replyMarkup;
    const res = await fetch(`${API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) return null;
    return data.result;
  } catch (err) {
    console.error("Failed to send message:", err);
    return null;
  }
}

async function editMessageText(chatId: string, messageId: number, text: string, parseMode = "Markdown", replyMarkup: any = null) {
  try {
    const body: any = { chat_id: chatId, message_id: messageId, text, parse_mode: parseMode };
    if (replyMarkup) body.reply_markup = replyMarkup;
    const res = await fetch(`${API}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) return null;
    return data.result;
  } catch (err) {
    console.error("Failed to edit message:", err);
    return null;
  }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  try {
    const body: any = { callback_query_id: callbackQueryId };
    if (text) body.text = text;
    await fetch(`${API}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("Failed to answer callback:", err);
  }
}

async function getChat(chatId: string) {
  try {
    const res = await fetch(`${API}/getChat?chat_id=${chatId}`);
    const data = await res.json();
    if (!data.ok) return null;
    return data.result;
  } catch (err) {
    console.error("Failed to get chat:", err);
    return null;
  }
}

async function getChatMember(chatId: string, userId: number) {
  try {
    const res = await fetch(`${API}/getChatMember?chat_id=${chatId}&user_id=${userId}`);
    const data = await res.json();
    if (!data.ok) return null;
    return data.result;
  } catch (err) {
    console.error("Failed to get chat member:", err);
    return null;
  }
}

async function isAdmin(chatId: string, userId: number) {
  const member = await getChatMember(chatId, userId);
  if (!member) return false;
  return ["administrator", "creator"].includes(member.status);
}

async function setReaction(chatId: string, messageId: number, emoji: string) {
  try {
    await fetch(`${API}/setMessageReaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        reaction: [{ type: "emoji", emoji }],
      }),
    });
  } catch (err) {
    console.error("Failed to set reaction:", err);
  }
}

async function getMarzbanToken(url: string, adminUser: string, adminPass: string): Promise<string | null> {
  const tokenUrl = new URL("/api/admin/token", url).toString();
  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username: adminUser, password: adminPass }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.access_token;
  } catch (err) {
    console.error("Failed to get Marzban token:", err);
    return null;
  }
}

async function removeMarzbanUser(url: string, token: string, username: string): Promise<boolean> {
  const removeUrl = new URL(`/api/user/${encodeURIComponent(username)}`, url).toString();
  try {
    const response = await fetch(removeUrl, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 404) return true;
    return response.ok;
  } catch (err) {
    console.error("Failed to remove Marzban user:", err);
    return false;
  }
}

async function createMarzbanUser(url: string, adminUser: string, adminPass: string, plan: any, sub_prefix: string, protocols: string[] = ['vless', 'shadowsocks']): Promise<{ link: string; expiryDate: string; username: string; links: string[] }> | null {
  const token = await getMarzbanToken(url, adminUser, adminPass);
  if (!token) return null;
  const username = sub_prefix + Math.random().toString(36).substring(2, 8);
  await removeMarzbanUser(url, token, username); // Clean if exists
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const userApiUrl = new URL("/api/user", url).toString();
  const dataLimitBytes = plan.traffic_gb * 1024 * 1024 * 1024;
  const expire = null;
  const profileTitleStr = `${username}`;
  const profileTitleB64 = encodeBase64(profileTitleStr);
  const announceB64 = encodeBase64("@HappService");
  const supportUrl = "https://t.me/HappService";
  const profileWebPageUrl = "https://t.me/HappService";
  const proxies: any = {};
  if (protocols.includes('vmess')) proxies.vmess = { id: crypto.randomUUID() };
  if (protocols.includes('vless')) proxies.vless = { id: crypto.randomUUID() };
  if (protocols.includes('trojan')) proxies.trojan = { password: `tj_${username}_${Math.floor(Math.random() * 900) + 100}` };
  if (protocols.includes('shadowsocks')) proxies.shadowsocks = { method: "aes-256-gcm", password: `ss_${username}_${Math.floor(Math.random() * 900) + 100}` };
  const payload = {
    username,
    proxies,
    data_limit: dataLimitBytes,
    expire,
    status: "active",
    inbounds: {},
    "profile-title": `base64:${profileTitleB64}`,
    "support-url": supportUrl,
    "announce": `base64:${announceB64}`,
    "profile-web-page-url": profileWebPageUrl,
  };
  try {
    let response = await fetch(userApiUrl, { method: "POST", headers, body: JSON.stringify(payload) });
    if (response.status === 409) {
      const modifyUrl = new URL(`/api/user/${encodeURIComponent(username)}`, url).toString();
      const getRes = await fetch(modifyUrl, { headers });
      if (!getRes.ok) return null;
      let existingData = await getRes.json();
      existingData = { ...existingData, ...payload };
      delete existingData.on_hold;
      delete existingData.used_traffic;
      delete existingData.created_at;
      delete existingData.subscription_url;
      delete existingData.links;
      response = await fetch(modifyUrl, { method: "PUT", headers, body: JSON.stringify(existingData) });
    }
    if (!response.ok) return null;
    const data = await response.json();
    const relativeLink = data.subscription_url;
    if (!relativeLink) return null;
    const fullLink = new URL(relativeLink, url).toString();
    const expiryDate = "Unlimited";
    const links = data.links || [];
    return { link: fullLink, expiryDate, username, links };
  } catch (err) {
    console.error("Failed to create/update Marzban user:", err);
    return null;
  }
}

async function convertToHappCode(subUrl: string): Promise<string | null> {
  try {
    const response = await fetch(HAPP_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ url: subUrl }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.encrypted_link || null;
  } catch (err) {
    console.error("Failed to convert to Happ code:", err);
    return null;
  }
}

// -------------------- User Data Helpers --------------------
async function getUser(userId: number): Promise<any> {
  const entry = await kv.get(["users", userId]);
  return entry.value || { id: userId, subscribedPlan: "free", activePlan: "free", balance: 0, panels: {}, channels: [], first_name: "", expiry: null };
}

async function saveUser(user: any) {
  await kv.set(["users", user.id], user);
}

async function getState(userId: number): Promise<any> {
  const entry = await kv.get(["states", userId]);
  return entry.value || null;
}

async function setState(userId: number, state: string, data: any = {}) {
  await kv.set(["states", userId], { state, data });
}

async function clearState(userId: number) {
  await kv.delete(["states", userId]);
}

async function checkPlanExpiry(user: any) {
  if (user.expiry && Date.now() > user.expiry) {
    user.subscribedPlan = "free";
    user.activePlan = "free";
    user.expiry = null;
    resetSettings(user);
    await saveUser(user);
    await sendMessage(user.id.toString(), `Your plan has expired! Reverted to Free. All settings reset to default. Please configure again. 📉`, "Markdown");
  }
  return user;
}

function resetSettings(user: any) {
  const channels = user.channels || [];
  for (const ch of channels) {
    ch.selected = false;
    ch.marzban = null;
    ch.times = ["10:00"];
    ch.last_posted_at = 0;
    ch.template_text = "<happcode>";
    ch.template_entities = [{ type: "pre", offset: 0, length: ch.template_text.length }];
    ch.reaction = null;
    ch.protocols = ['vless', 'shadowsocks'];
    ch.traffic_gb = 0;
    ch.delete_before_posting = false;
    ch.last_username = null;
    ch.posting_config = 'subscription';
    ch.encrypt = true;
  }
  user.channels = channels;
}

// -------------------- Menu & Settings Helpers --------------------
async function showMenu(chatId: string, user: any) {
  user = await checkPlanExpiry(user);
  const name = user.first_name || "User";
  const id = user.id;
  const balance = user.balance || 0;
  const activePlan = user.activePlan || "free";
  const text = `Hello \`${escapeMarkdown(name)}\` 👋\nID: \`${id}\` 🆔\nBalance: ${balance} ⭐️\nThis is very powerful tool to automate your VPN channels! 🚀`;
  const keyboard = {
    inline_keyboard: [
      [{ text: `Plan: ${activePlan.charAt(0).toUpperCase() + activePlan.slice(1)} 📊`, callback_data: "plan_info" }],
      [{ text: "Settings ⚙️", callback_data: "settings" }],
      [{ text: "Top up 💰", callback_data: "top_up" }],
      [{ text: "Pricing plans 💲", callback_data: "pricing" }],
    ],
  };
  await sendMessage(chatId, text, "Markdown", keyboard);
}

function getSettingsText(planConfig: any) {
  let text = "Settings:\n";
  text += `${planConfig.maxChannels === Infinity ? "✅Unlimited channels" : `✅${planConfig.maxChannels} channels`} 📡\n`;
  text += `${planConfig.editTime ? "✅" : "🚫"}Edit posting time ⏰\n`;
  text += `${planConfig.editPost ? "✅" : "🚫"}Edit post ✏️\n`;
  text += `${planConfig.noWatermark ? "✅" : "🚫"}No watermark 🚫\n`;
  text += `${planConfig.editReaction ? "✅" : "🚫"}Edit reaction ❤️\n`;
  text += `${planConfig.noAds ? "✅" : "🚫"}No Ads 📵\n`;
  text += `${planConfig.integrateOur ? "✅" : "🚫"}Integrate our marzban 🔗\n`;
  return text;
}

function getFeaturesText(planName: string) {
  const config = PLANS[planName];
  let channelsText = `${config.maxChannels} channel`;
  if (config.maxChannels === Infinity) channelsText = "Unlimited channels";
  if (config.maxChannels > 1 || config.maxChannels === Infinity) channelsText += "s";
  let text = `✅${channelsText}\n`;
  text += `${config.editTime ? "✅" : "🚫"}Edit posting time\n`;
  text += `${config.editPost ? "✅" : "🚫"}Edit post\n`;
  text += `${config.noWatermark ? "✅" : "🚫"}No watermark\n`;
  text += `${config.editReaction ? "✅" : "🚫"}Edit reaction\n`;
  text += `${config.noAds ? "✅" : "🚫"}No Ads\n`;
  text += `${config.integrateOur ? "✅" : "🚫"}Integrate our marzban`;
  return text;
}

async function showPricing(chatId: string, msgId: number | undefined, user: any) {
  const activePlan = user.activePlan || "free";
  const subscribedPlan = user.subscribedPlan || "free";
  let expiryStr = "Never";
  if (activePlan !== "free" && user.expiry) {
    const dt = new Date(user.expiry);
    const utc5 = new Date(dt.getTime() + 5 * 3600 * 1000);
    expiryStr = utc5.toISOString().replace('T', ' ').slice(0, 19) + ' UTC+5';
  }
  const text = `You are now ${activePlan.charAt(0).toUpperCase() + activePlan.slice(1)}\nExpires: ${expiryStr}`;
  const planOrder = ['free', 'starter', 'pro', 'premium'];
  const subscribedLevel = PLAN_HIERARCHY[subscribedPlan];
  const keyboard = { inline_keyboard: [] };
  for (const pName of planOrder) {
    let btnText = pName.charAt(0).toUpperCase() + pName.slice(1);
    let callback;
    if (PLAN_HIERARCHY[pName] <= subscribedLevel) {
      callback = `select_plan:${pName}`;
      if (pName === activePlan) btnText += " ✅";
    } else {
      btnText = `Buy ${btnText}🛒`;
      callback = `confirm_buy:${pName}`;
    }
    keyboard.inline_keyboard.push([{ text: btnText, callback_data: callback }]);
  }
  keyboard.inline_keyboard.push([{ text: "Back", callback_data: "back_menu" }]);
  if (msgId) {
    await editMessageText(chatId, msgId, text, "Markdown", keyboard);
  } else {
    await sendMessage(chatId, text, "Markdown", keyboard);
  }
}

async function showConfirmBuy(chatId: string, msgId: number, buyPlan: string) {
  const cost = PLAN_COSTS[buyPlan];
  const features = getFeaturesText(buyPlan);
  const text = `${features}\nCosts ${cost}⭐️`;
  const keyboard = {
    inline_keyboard: [
      [{ text: "Buy", callback_data: `buy_plan:${buyPlan}` }, { text: "Cancel", callback_data: "cancel_buy" }],
    ],
  };
  await editMessageText(chatId, msgId, text, "Markdown", keyboard);
}

async function showAdminPanel(chatId: string) {
  const text = "Here you can work with admin features!";
  const keyboard = {
    inline_keyboard: [
      [{ text: "Show profile", callback_data: "admin_show_profile" }],
      [{ text: "Modify balance", callback_data: "admin_modify_balance" }],
      [{ text: "Modify plans", callback_data: "admin_modify_plans" }],
      [{ text: "Our marzban", callback_data: "admin_our_marzban" }],
    ],
  };
  await sendMessage(chatId, text, "Markdown", keyboard);
}

async function showOurMarzbanManagement(chatId: string, msgId?: number) {
  const text = "Manage our marzban";
  const keyboard = {
    inline_keyboard: [
      [{ text: "Change url", callback_data: "admin_change_our_url" }],
      [{ text: "Change username", callback_data: "admin_change_our_username" }],
      [{ text: "Change password", callback_data: "admin_change_our_password" }],
      [{ text: "Back", callback_data: "admin_back_to_panel" }],
    ],
  };
  if (msgId) {
    await editMessageText(chatId, msgId, text, "Markdown", keyboard);
  } else {
    await sendMessage(chatId, text, "Markdown", keyboard);
  }
}

// -------------------- Scheduler --------------------
async function processUser(userId: number) {
  const lockKey = ["user_lock", userId];
  const entry = await kv.get(lockKey);
  const now = Date.now();
  if (entry.value && entry.value > now) {
    return;
  }
  const ttl = 30000; // 30 seconds lock
  const newLock = now + ttl;
  const atomic = kv.atomic().check(entry).set(lockKey, newLock);
  const res = await atomic.commit();
  if (!res.ok) return;
  try {
    let user = await getUser(userId);
    user = await checkPlanExpiry(user);
    const planConfig = PLANS[user.activePlan];
    const channels = user.channels || [];
    let updated = false;
    for (let i = 0; i < channels.length; i++) {
      const ch = channels[i];
      if (!ch.selected || !ch.marzban) continue;
      const current = Date.now();
      let posted = false;
      for (const time_str of ch.times) {
        const [h, m] = time_str.split(':').map(Number);
        const now_utc5 = new Date(current + 5 * 3600 * 1000);
        const scheduled_utc5 = new Date(now_utc5.getFullYear(), now_utc5.getMonth(), now_utc5.getDate(), h, m, 0, 0);
        const scheduled_ts = scheduled_utc5.getTime() - 5 * 3600 * 1000;
        const window = 59 * 60 * 1000;
        if (current >= scheduled_ts && current < scheduled_ts + window && ch.last_posted_at < scheduled_ts) {
          await postToChannel(userId, ch, planConfig, user);
          ch.last_posted_at = scheduled_ts;
          updated = true;
          posted = true;
          break;
        }
      }
      if (posted) {
        channels[i] = ch;
      }
    }
    if (updated) {
      user.channels = channels;
      await saveUser(user);
    }
  } finally {
    await kv.delete(lockKey);
  }
}

setInterval(async () => {
  try {
    const iterator = kv.list({ prefix: ["users"] });
    for await (const entry of iterator) {
      const userId = entry.key[1] as number;
      await processUser(userId);
    }
  } catch (err) {
    console.error("Scheduler error:", err);
  }
}, 60000);

async function postToChannel(userId: number, ch: any, planConfig: any, user: any) {
  const botIdLocal = await getBotId();
  if (!await isAdmin(ch.chatId, userId)) {
    user.channels = user.channels.filter((c: any) => c.chatId !== ch.chatId);
    await saveUser(user);
    await sendMessage(userId.toString(), `Channel ${escapeMarkdown(ch.username)} deleted because you are not admin anymore. ❌`);
    return;
  }
  if (!await isAdmin(ch.chatId, botIdLocal)) {
    user.channels = user.channels.filter((c: any) => c.chatId !== ch.chatId);
    await saveUser(user);
    await sendMessage(userId.toString(), `Channel ${escapeMarkdown(ch.username)} deleted because bot is not admin. ❌`);
    return;
  }
  const chatInfo = await getChat(ch.chatId);
  if (chatInfo && chatInfo.username !== ch.username.slice(1)) {
    ch.username = `@${chatInfo.username}`;
    await kv.set(["channel_owners", ch.chatId], userId);
  }
  let panel = ch.marzban === "our_marzban" ? await getOurMarzban() : user.panels[ch.marzban];
  if (!panel) return;
  const token = await getMarzbanToken(panel.url, panel.username, panel.password);
  if (!token) return;
  if (ch.delete_before_posting && ch.last_username) {
    await removeMarzbanUser(panel.url, token, ch.last_username);
  }
  const subData = await createMarzbanUser(panel.url, panel.username, panel.password, { traffic_gb: ch.traffic_gb || 0 }, panel.sub_prefix, ch.protocols || ['vless', 'shadowsocks']);
  if (!subData) return;
  let happCodeStr = '';
  if (ch.posting_config === 'configs') {
    let items: string[];
    if (ch.encrypt) {
      const happCodes = await Promise.all(subData.links.map(async (link: string) => await convertToHappCode(link)));
      items = happCodes.filter((code): code is string => code !== null);
    } else {
      items = subData.links;
    }
    happCodeStr = items.join('\n');
  } else {
    let item: string | null;
    if (ch.encrypt) {
      item = await convertToHappCode(subData.link);
    } else {
      item = subData.link;
    }
    if (!item) return;
    happCodeStr = item;
  }
  let postText = ch.template_text;
  let postEntities = ch.template_entities.map((e: any) => ({...e}));
  const placeholder = "<happcode>";
  const phLen = placeholder.length;
  let offset = 0;
  while (true) {
    const pos = postText.indexOf(placeholder, offset);
    if (pos === -1) break;
    postText = postText.slice(0, pos) + happCodeStr + postText.slice(pos + phLen);
    const diff = happCodeStr.length - phLen;
    postEntities = postEntities.map((e: any) => {
      if (e.offset >= pos + phLen) {
        e.offset += diff;
      } else if (e.offset + e.length > pos) {
        e.length += diff;
      }
      return e;
    });
    offset = pos + happCodeStr.length;
  }
  if (!planConfig.noWatermark) postText += "\n\nPowered by Happ Bot 🚀";
  if (!planConfig.noAds) postText += "\nJoin @HappService for more! 📢";
  const sent = await sendMessage(ch.username, postText, null, null, postEntities);
  if (sent && ch.reaction && planConfig.editReaction) {
    await setReaction(ch.username, sent.message_id, ch.reaction);
  }
  ch.last_username = subData.username;
}

// -------------------- Webhook Handler --------------------
serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  try {
    const update = await req.json();
    if (update.pre_checkout_query) {
      const pq = update.pre_checkout_query;
      await fetch(`${API}/answerPreCheckoutQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pre_checkout_query_id: pq.id, ok: true }),
      });
      return new Response("ok");
    }
    if (update.message && update.message.successful_payment) {
      const pay = update.message.successful_payment;
      const { userId, amount } = JSON.parse(pay.invoice_payload);
      let user = await getUser(userId);
      user.balance = (user.balance || 0) + amount;
      await saveUser(user);
      await sendMessage(update.message.chat.id.toString(), `Successfully topped up ${amount} ⭐️! 🎉`);
      return new Response("ok");
    }
    if (update.callback_query) {
      const cb = update.callback_query;
      const data = cb.data;
      const chatId = cb.message.chat.id.toString();
      const msgId = cb.message.message_id;
      const userId = cb.from.id;
      const username = cb.from.username;
      let user = await getUser(userId);
      user.first_name = cb.from.first_name;
      user = await checkPlanExpiry(user);
      const activePlan = user.activePlan || "free";
      const subscribedPlan = user.subscribedPlan || "free";
      const planConfig = PLANS[activePlan];
      if (data === "plan_info") {
        const settingsText = getSettingsText(planConfig);
        const text = `Your plan info: 📊\n\n${settingsText}`;
        const keyboard = {
          inline_keyboard: [
            [{ text: "Back", callback_data: "back_menu" }],
          ],
        };
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
      } else if (data === "settings") {
        const text = "Manage settings ⚙️";
        const keyboard = {
          inline_keyboard: [
            [{ text: "Marzban panels 🔗", callback_data: "marzban_panels" }],
            [{ text: "Channels 📡", callback_data: "channels" }],
            [{ text: "Back", callback_data: "back_menu" }],
          ],
        };
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
      } else if (data === "top_up") {
        await setState(userId, "top_up_amount");
        await editMessageText(chatId, msgId, "Enter amount to top up (in ⭐️): 💰");
      } else if (data === "pricing") {
        await showPricing(chatId, msgId, user);
      } else if (data.startsWith("select_plan:")) {
        const planName = data.slice(12);
        if (PLAN_HIERARCHY[planName] > PLAN_HIERARCHY[subscribedPlan]) {
          await answerCallbackQuery(cb.id, "You haven't subscribed to this plan yet.");
          return new Response("ok");
        }
        user.activePlan = planName;
        await saveUser(user);
        await answerCallbackQuery(cb.id, `Selected ${planName.charAt(0).toUpperCase() + planName.slice(1)} plan! ✅`);
        await showPricing(chatId, msgId, user);
      } else if (data.startsWith("confirm_buy:")) {
        const buyPlan = data.slice(12);
        await showConfirmBuy(chatId, msgId, buyPlan);
      } else if (data.startsWith("buy_plan:")) {
        const buyPlan = data.slice(9);
        const cost = PLAN_COSTS[buyPlan];
        if (user.balance < cost) {
          await answerCallbackQuery(cb.id, "Insufficient balance! ❌");
          return new Response("ok");
        }
        user.balance -= cost;
        const newLevel = PLAN_HIERARCHY[buyPlan];
        if (newLevel > PLAN_HIERARCHY[subscribedPlan]) {
          user.subscribedPlan = buyPlan;
        }
        user.activePlan = buyPlan;
        const expiry = Date.now() + 30 * 24 * 3600 * 1000; // 30 days
        user.expiry = expiry;
        await saveUser(user);
        await answerCallbackQuery(cb.id, `Purchased ${buyPlan.charAt(0).toUpperCase() + buyPlan.slice(1)} plan! 🎉`);
        await showMenu(chatId, user);
      } else if (data === "cancel_buy") {
        await showPricing(chatId, msgId, user);
      } else if (data === "back_menu") {
        await showMenu(chatId, user);
      } else if (data === "marzban_panels") {
        const panels = Object.entries(user.panels || {});
        let text = "Your Marzban panels 🔗";
        if (panels.length === 0) text += "\nNone added yet.";
        const keyboard = { inline_keyboard: [] };
        panels.forEach(([name]) => {
          keyboard.inline_keyboard.push([{ text: name, callback_data: `manage_panel:${name}` }]);
        });
        keyboard.inline_keyboard.push([{ text: "Add panel ➕", callback_data: "add_marzban" }]);
        keyboard.inline_keyboard.push([{ text: "Back", callback_data: "settings" }]);
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
      } else if (data === "add_marzban") {
        await setState(userId, "add_marzban_name");
        await editMessageText(chatId, msgId, "Enter name for the panel: 📛");
      } else if (data.startsWith("manage_panel:")) {
        const name = data.slice(13);
        if (!user.panels[name]) return new Response("ok");
        const panel = user.panels[name];
        const text = `Panel: ${escapeMarkdown(name)}\nID: ${escapeMarkdown(panel.sub_prefix)}\nURL: ${escapeMarkdown(panel.url)}\nUsername: ${escapeMarkdown(panel.username)}\nPassword: ${escapeMarkdown(panel.password)}`;
        const keyboard = {
          inline_keyboard: [
            [{ text: "Change name", callback_data: `change_panel_name:${name}` }],
            [{ text: "Change ID", callback_data: `change_panel_id:${name}` }],
            [{ text: "Change URL", callback_data: `change_panel_url:${name}` }],
            [{ text: "Change username", callback_data: `change_panel_username:${name}` }],
            [{ text: "Change password", callback_data: `change_panel_password:${name}` }],
            [{ text: "Delete panel 🗑️", callback_data: `delete_panel:${name}` }],
            [{ text: "Back", callback_data: "marzban_panels" }],
          ],
        };
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
      } else if (data.startsWith("change_panel_")) {
        const parts = data.split(":");
        const field = parts[0].slice(13);
        const name = parts[1];
        await setState(userId, `change_panel_${field}`, { name });
        let prompt = "";
        if (field === "name") prompt = "Enter new name:";
        else if (field === "id") prompt = "Enter new ID (subscription prefix):";
        else if (field === "url") prompt = "Enter new URL:";
        else if (field === "username") prompt = "Enter new username:";
        else if (field === "password") prompt = "Enter new password:";
        await editMessageText(chatId, msgId, prompt);
      } else if (data.startsWith("delete_panel:")) {
        const name = data.slice(13);
        delete user.panels[name];
        await saveUser(user);
        await answerCallbackQuery(cb.id, `Panel ${escapeMarkdown(name)} deleted! 🗑️`);
        // Refresh panels menu
        const panels = Object.entries(user.panels || {});
        let text = "Your Marzban panels 🔗";
        if (panels.length === 0) text += "\nNone added yet.";
        const keyboard = { inline_keyboard: [] };
        panels.forEach(([pname]) => {
          keyboard.inline_keyboard.push([{ text: pname, callback_data: `manage_panel:${pname}` }]);
        });
        keyboard.inline_keyboard.push([{ text: "Add panel ➕", callback_data: "add_marzban" }]);
        keyboard.inline_keyboard.push([{ text: "Back", callback_data: "settings" }]);
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
      } else if (data === "channels") {
        const channels = user.channels || [];
        let text = "Your channels 📡";
        if (channels.length === 0) text += "\nNone added yet.";
        const keyboard = { inline_keyboard: [] };
        channels.forEach((ch: any) => {
          keyboard.inline_keyboard.push([{ text: `${ch.username} ${ch.selected ? "✅" : ""}`, callback_data: `manage_ch:${ch.chatId}` }]);
        });
        keyboard.inline_keyboard.push([{ text: "Add channel ➕", callback_data: "add_channel" }]);
        keyboard.inline_keyboard.push([{ text: "Back", callback_data: "settings" }]);
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
      } else if (data === "add_channel") {
        await setState(userId, "add_channel");
        await editMessageText(chatId, msgId, "Enter channel username (with @): 📡");
      } else if (data.startsWith("manage_ch:")) {
        const chatIdStr = data.slice(10);
        const channels = user.channels || [];
        const ch = channels.find((c: any) => c.chatId === chatIdStr);
        if (!ch) return new Response("ok");
        const selected = ch.selected ? "✅" : "🚫";
        const marzban = ch.marzban ? escapeMarkdown(ch.marzban) : "None";
        const times = ch.times.join(", ");
        const reaction = ch.reaction || "None";
        const text = `Channel: ${escapeMarkdown(ch.username)}\nSelected: ${selected}\nMarzban: ${marzban}\nTimes: ${times}\nReaction: ${reaction}`;
        const keyboard = {
          inline_keyboard: [
            [{ text: `Toggle select ${selected}`, callback_data: `toggle_select:${chatIdStr}` }],
            [{ text: "Connect Marzban 🔗", callback_data: `connect_marzban:${chatIdStr}` }],
            [{ text: "Edit time ⏰", callback_data: `edit_time:${chatIdStr}` }],
            [{ text: "Edit post ✏️", callback_data: `edit_post:${chatIdStr}` }],
            [{ text: "Edit reaction ❤️", callback_data: `edit_reaction:${chatIdStr}` }],
            [{ text: "Delete channel 🗑️", callback_data: `delete_ch:${chatIdStr}` }],
            [{ text: "Back", callback_data: "channels" }],
          ],
        };
        if (!planConfig.editTime) keyboard.inline_keyboard[2][0].callback_data = "locked";
        if (!planConfig.editPost) keyboard.inline_keyboard[3][0].callback_data = "locked";
        if (!planConfig.editReaction) keyboard.inline_keyboard[4][0].callback_data = "locked";
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
      } else if (data.startsWith("toggle_select:")) {
        const chatIdStr = data.slice(14);
        const channels = user.channels || [];
        const chIndex = channels.findIndex((c: any) => c.chatId === chatIdStr);
        if (chIndex === -1) return new Response("ok");
        channels[chIndex].selected = !channels[chIndex].selected;
        user.channels = channels;
        await saveUser(user);
        await answerCallbackQuery(cb.id, `Toggled select! ${channels[chIndex].selected ? "✅" : "🚫"}`);
        // Refresh manage menu
        const ch = channels[chIndex];
        const selected = ch.selected ? "✅" : "🚫";
        const marzban = ch.marzban ? escapeMarkdown(ch.marzban) : "None";
        const times = ch.times.join(", ");
        const reaction = ch.reaction || "None";
        const text = `Channel: ${escapeMarkdown(ch.username)}\nSelected: ${selected}\nMarzban: ${marzban}\nTimes: ${times}\nReaction: ${reaction}`;
        const keyboard = {
          inline_keyboard: [
            [{ text: `Toggle select ${selected}`, callback_data: `toggle_select:${chatIdStr}` }],
            [{ text: "Connect Marzban 🔗", callback_data: `connect_marzban:${chatIdStr}` }],
            [{ text: "Edit time ⏰", callback_data: `edit_time:${chatIdStr}` }],
            [{ text: "Edit post ✏️", callback_data: `edit_post:${chatIdStr}` }],
            [{ text: "Edit reaction ❤️", callback_data: `edit_reaction:${chatIdStr}` }],
            [{ text: "Delete channel 🗑️", callback_data: `delete_ch:${chatIdStr}` }],
            [{ text: "Back", callback_data: "channels" }],
          ],
        };
        if (!planConfig.editTime) keyboard.inline_keyboard[2][0].callback_data = "locked";
        if (!planConfig.editPost) keyboard.inline_keyboard[3][0].callback_data = "locked";
        if (!planConfig.editReaction) keyboard.inline_keyboard[4][0].callback_data = "locked";
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
      } else if (data.startsWith("delete_ch:")) {
        const chatIdStr = data.slice(10);
        user.channels = user.channels.filter((c: any) => c.chatId !== chatIdStr);
        await kv.delete(["channel_owners", chatIdStr]);
        await saveUser(user);
        await answerCallbackQuery(cb.id, "Channel deleted! 🗑️");
        // Refresh channels menu
        const channels = user.channels || [];
        let text = "Your channels 📡";
        if (channels.length === 0) text += "\nNone added yet.";
        const keyboard = { inline_keyboard: [] };
        channels.forEach((ch: any) => {
          keyboard.inline_keyboard.push([{ text: `${ch.username} ${ch.selected ? "✅" : ""}`, callback_data: `manage_ch:${ch.chatId}` }]);
        });
        keyboard.inline_keyboard.push([{ text: "Add channel ➕", callback_data: "add_channel" }]);
        keyboard.inline_keyboard.push([{ text: "Back", callback_data: "settings" }]);
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
      } else if (data.startsWith("connect_marzban:")) {
        const chatIdStr = data.slice(16);
        const text = "Select Marzban panel to connect to this channel! 🔗";
        const keyboard = { inline_keyboard: [] };
        if (planConfig.integrateOur) {
          keyboard.inline_keyboard.push([{ text: "Our marzban", callback_data: `connect_our:${chatIdStr}` }]);
        } else {
          keyboard.inline_keyboard.push([{ text: "🔒Our marzban🔒", callback_data: "locked" }]);
        }
        const panels = Object.entries(user.panels || {});
        panels.forEach(([name]) => {
          keyboard.inline_keyboard.push([{ text: name, callback_data: `connect_panel:${chatIdStr}:${name}` }]);
        });
        keyboard.inline_keyboard.push([{ text: "Back", callback_data: `manage_ch:${chatIdStr}` }]);
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
      } else if (data.startsWith("connect_our:")) {
        if (!planConfig.integrateOur) {
          await answerCallbackQuery(cb.id, "Locked for your plan 🔒");
          return new Response("ok");
        }
        const chatIdStr = data.slice(12);
        const channels = user.channels || [];
        const chIndex = channels.findIndex((c: any) => c.chatId === chatIdStr);
        if (chIndex === -1) return new Response("ok");
        channels[chIndex].marzban = "our_marzban";
        user.channels = channels;
        await saveUser(user);
        await answerCallbackQuery(cb.id, "Connected to our Marzban! ✅");
        // Refresh connect menu
        const text = "Select Marzban panel to connect to this channel! 🔗";
        const keyboard = { inline_keyboard: [] };
        keyboard.inline_keyboard.push([{ text: `Our marzban ✅`, callback_data: `connect_our:${chatIdStr}` }]);
        const panels = Object.entries(user.panels || {});
        panels.forEach(([name]) => {
          keyboard.inline_keyboard.push([{ text: `${name} `, callback_data: `connect_panel:${chatIdStr}:${name}` }]);
        });
        keyboard.inline_keyboard.push([{ text: "Back", callback_data: `manage_ch:${chatIdStr}` }]);
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
      } else if (data.startsWith("connect_panel:")) {
        const parts = data.split(":");
        const chatIdStr = parts[1];
        const name = parts[2];
        const channels = user.channels || [];
        const chIndex = channels.findIndex((c: any) => c.chatId === chatIdStr);
        if (chIndex === -1 || !user.panels[name]) return new Response("ok");
        channels[chIndex].marzban = name;
        user.channels = channels;
        await saveUser(user);
        await answerCallbackQuery(cb.id, `Connected to ${name}! ✅`);
        // Refresh
        const text = "Select Marzban panel to connect to this channel! 🔗";
        const keyboard = { inline_keyboard: [] };
        if (planConfig.integrateOur) {
          keyboard.inline_keyboard.push([{ text: `Our marzban `, callback_data: `connect_our:${chatIdStr}` }]);
        } else {
          keyboard.inline_keyboard.push([{ text: "🔒Our marzban🔒", callback_data: "locked" }]);
        }
        const panels = Object.entries(user.panels || {});
        panels.forEach(([pname]) => {
          keyboard.inline_keyboard.push([{ text: `${pname} ${pname === name ? "✅" : ""}`, callback_data: `connect_panel:${chatIdStr}:${pname}` }]);
        });
        keyboard.inline_keyboard.push([{ text: "Back", callback_data: `manage_ch:${chatIdStr}` }]);
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
      } else if (data.startsWith("edit_time:")) {
        if (!planConfig.editTime) {
          await answerCallbackQuery(cb.id, "Locked for your plan 🔒");
          return new Response("ok");
        }
        const chatIdStr = data.slice(10);
        await setState(userId, "edit_time", { chatId: chatIdStr });
        const text = "Here you can edit posting time (UTC+5) ⏰\nExample: 15:00\nFor multiple: 2:00,5:00,16:00\nMinimum 1 hour between posts!";
        await editMessageText(chatId, msgId, text);
      } else if (data.startsWith("edit_post:")) {
        if (!planConfig.editPost) {
          await answerCallbackQuery(cb.id, "Locked for your plan 🔒");
          return new Response("ok");
        }
        const chatIdStr = data.slice(10);
        await setState(userId, "edit_post", { chatId: chatIdStr });
        await editMessageText(chatId, msgId, "Send me the post template, use <happcode> for the subscription code: ✏️");
      } else if (data.startsWith("edit_reaction:")) {
        if (!planConfig.editReaction) {
          await answerCallbackQuery(cb.id, "Locked for your plan 🔒");
          return new Response("ok");
        }
        const chatIdStr = data.slice(14);
        await setState(userId, "edit_reaction", { chatId: chatIdStr });
        await editMessageText(chatId, msgId, "Send me the reaction emoji (e.g., ❤️): ❤️");
      } else if (data === "locked") {
        await answerCallbackQuery(cb.id, "Locked for your plan 🔒");
      } else if (data.startsWith("admin_")) {
        if (username !== "Masakoff") {
          await answerCallbackQuery(cb.id, "You are not admin.");
          return new Response("ok");
        }
        if (data === "admin_show_profile") {
          await setState(userId, "admin_show_profile");
          await editMessageText(chatId, msgId, "Send user ID to show profile:");
        } else if (data === "admin_modify_balance") {
          await setState(userId, "admin_modify_balance_id");
          await editMessageText(chatId, msgId, "Send user ID to modify balance:");
        } else if (data === "admin_modify_plans") {
          await setState(userId, "admin_modify_plans_id");
          await editMessageText(chatId, msgId, "Send user ID to modify plans:");
        } else if (data === "admin_our_marzban") {
          await showOurMarzbanManagement(chatId, msgId);
        } else if (data === "admin_change_our_url") {
          await setState(userId, "admin_change_our_url");
          await editMessageText(chatId, msgId, "Send new URL for our marzban:");
        } else if (data === "admin_change_our_username") {
          await setState(userId, "admin_change_our_username");
          await editMessageText(chatId, msgId, "Send new username for our marzban:");
        } else if (data === "admin_change_our_password") {
          await setState(userId, "admin_change_our_password");
          await editMessageText(chatId, msgId, "Send new password for our marzban:");
        } else if (data === "admin_back_to_panel") {
          await showAdminPanel(chatId);
          await answerCallbackQuery(cb.id);
        }
      }
      return new Response("ok");
    }
    const msg = update.message;
    if (!msg) return new Response("ok");
    const chatId = msg.chat.id.toString();
    const text = msg.text?.trim() || "";
    const userId = msg.from.id;
    const username = msg.from.username;
    let user = await getUser(userId);
    user.first_name = msg.from.first_name;
    await saveUser(user);
    const state = await getState(userId);
    if (state) {
      if (state.state === "top_up_amount") {
        const amount = parseInt(text);
        if (isNaN(amount) || amount <= 0) {
          await sendMessage(chatId, "Invalid amount. ❌");
          await clearState(userId);
          return new Response("ok");
        }
        const body = {
          chat_id: chatId,
          title: "Top up ⭐️",
          description: `Top up ${amount} ⭐️ to your balance.`,
          payload: JSON.stringify({ userId, amount }),
          currency: "XTR",
          prices: [{ label: `${amount} ⭐️`, amount }],
          provider_token: "",
        };
        await fetch(`${API}/sendInvoice`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        await clearState(userId);
      } else if (state.state === "add_marzban_name") {
        await setState(userId, "add_marzban_id", { name: text });
        await sendMessage(chatId, "Enter ID (subscription prefix): 🆔");
      } else if (state.state === "add_marzban_id") {
        await setState(userId, "add_marzban_url", { ...state.data, sub_prefix: text });
        await sendMessage(chatId, "Enter Marzban URL: 🌐");
      } else if (state.state === "add_marzban_url") {
        await setState(userId, "add_marzban_username", { ...state.data, url: text });
        await sendMessage(chatId, "Enter Marzban username: 👤");
      } else if (state.state === "add_marzban_username") {
        await setState(userId, "add_marzban_password", { ...state.data, username: text });
        await sendMessage(chatId, "Enter Marzban password: 🔑");
      } else if (state.state === "add_marzban_password") {
        const { name, sub_prefix, url, username } = state.data;
        user.panels = user.panels || {};
        if (user.panels[name]) {
          await sendMessage(chatId, "Name already exists. ❌");
          await clearState(userId);
          return new Response("ok");
        }
        user.panels[name] = { sub_prefix, url, username, password: text };
        await saveUser(user);
        await sendMessage(chatId, `Marzban panel ${escapeMarkdown(name)} added! ✅`);
        await clearState(userId);
      } else if (state.state === "delete_marzban") {
        user.panels = user.panels || {};
        if (!user.panels[text]) {
          await sendMessage(chatId, "Panel not found. ❌");
          await clearState(userId);
        } else {
          delete user.panels[text];
          await saveUser(user);
          await sendMessage(chatId, `Marzban panel ${escapeMarkdown(text)} deleted! 🗑️`);
          await clearState(userId);
        }
      } else if (state.state.startsWith("change_panel_")) {
        const field = state.state.slice(13);
        const { name } = state.data;
        user.panels = user.panels || {};
        if (!user.panels[name]) {
          await sendMessage(chatId, "Panel not found. ❌");
          await clearState(userId);
          return new Response("ok");
        }
        if (field === "name") {
          if (user.panels[text]) {
            await sendMessage(chatId, "New name already exists. ❌");
            await clearState(userId);
            return new Response("ok");
          }
          user.panels[text] = user.panels[name];
          delete user.panels[name];
          await sendMessage(chatId, `Panel name changed to ${escapeMarkdown(text)}! ✅`);
        } else if (field === "id") {
          user.panels[name].sub_prefix = text;
          await sendMessage(chatId, "ID updated! ✅");
        } else if (field === "url") {
          user.panels[name].url = text;
          await sendMessage(chatId, "URL updated! ✅");
        } else if (field === "username") {
          user.panels[name].username = text;
          await sendMessage(chatId, "Username updated! ✅");
        } else if (field === "password") {
          user.panels[name].password = text;
          await sendMessage(chatId, "Password updated! ✅");
        }
        await saveUser(user);
        await clearState(userId);
      } else if (state.state === "add_channel") {
        let inputUsername = text.startsWith("@") ? text.slice(1) : text;
        const username = `@${inputUsername}`;
        const chatInfo = await getChat(username);
        if (!chatInfo) {
          await sendMessage(chatId, "Invalid channel. ❌");
          await clearState(userId);
          return new Response("ok");
        }
        const chChatId = chatInfo.id.toString();
        const botIdLocal = await getBotId();
        if (!await isAdmin(chChatId, userId) || !await isAdmin(chChatId, botIdLocal)) {
          await sendMessage(chatId, "You or bot must be admin in the channel. ❌");
          await clearState(userId);
          return new Response("ok");
        }
        const ownerEntry = await kv.get(["channel_owners", chChatId]);
        if (ownerEntry.value && ownerEntry.value !== userId) {
          const prevUser = await getUser(ownerEntry.value);
          prevUser.channels = prevUser.channels.filter((c: any) => c.chatId !== chChatId);
          await saveUser(prevUser);
        }
        await kv.set(["channel_owners", chChatId], userId);
        user.channels = user.channels || [];
        if (user.channels.some((c: any) => c.chatId === chChatId)) {
          await sendMessage(chatId, "Channel already added. ❌");
          await clearState(userId);
          return new Response("ok");
        } else {
          const storedUsername = `@${chatInfo.username}`;
          const defaultTemplate = "<happcode>";
          user.channels.push({
            chatId: chChatId,
            username: storedUsername,
            marzban: null,
            times: ["10:00"],
            last_posted_at: 0,
            template_text: defaultTemplate,
            template_entities: [{ type: "pre", offset: 0, length: defaultTemplate.length }],
            reaction: null,
            selected: false,
            protocols: ['vless', 'shadowsocks'],
            traffic_gb: 0,
            delete_before_posting: false,
            last_username: null,
            posting_config: 'subscription',
            encrypt: true,
          });
          await saveUser(user);
          await sendMessage(chatId, `Channel ${escapeMarkdown(storedUsername)} added! ✅`);
          await clearState(userId);
        }
      } else if (state.state === "delete_channel") {
        let inputUsername = text.startsWith("@") ? text.slice(1) : text;
        const username = `@${inputUsername}`;
        user.channels = user.channels || [];
        const ch = user.channels.find((c: any) => c.username.toLowerCase() === username.toLowerCase());
        if (!ch) {
          await sendMessage(chatId, "Channel not found. ❌");
          await clearState(userId);
        } else {
          user.channels = user.channels.filter((c: any) => c.username.toLowerCase() !== username.toLowerCase());
          await kv.delete(["channel_owners", ch.chatId]);
          await saveUser(user);
          await sendMessage(chatId, `Channel ${escapeMarkdown(ch.username)} deleted! 🗑️`);
          await clearState(userId);
        }
      } else if (state.state === "edit_time") {
        const times = text.split(",").map((t) => t.trim()).map((t) => {
          const [h, m] = t.split(":").map(Number);
          return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        });
        const valid = times.every((t) => /^\d{2}:\d{2}$/.test(t));
        if (!valid) {
          await sendMessage(chatId, "Invalid format. ❌");
          await clearState(userId);
          return new Response("ok");
        }
        const mins = times.map((t) => {
          const [h, m] = t.split(":").map(Number);
          return h * 60 + m;
        }).sort((a, b) => a - b);
        for (let i = 1; i < mins.length; i++) {
          if (mins[i] - mins[i - 1] < 60) {
            await sendMessage(chatId, "Minimum 1 hour between posts. ❌");
            await clearState(userId);
            return new Response("ok");
          }
        }
        const channels = user.channels || [];
        const chIndex = channels.findIndex((c: any) => c.chatId === state.data.chatId);
        if (chIndex !== -1) {
          channels[chIndex].times = times;
          user.channels = channels;
          await saveUser(user);
          await sendMessage(chatId, "Posting times updated! ✅");
          await clearState(userId);
        } else {
          await clearState(userId);
        }
      } else if (state.state === "edit_post") {
        if (!text.includes("<happcode>")) {
          await sendMessage(chatId, "Must include <happcode>. ❌");
          await clearState(userId);
          return new Response("ok");
        }
        const channels = user.channels || [];
        const chIndex = channels.findIndex((c: any) => c.chatId === state.data.chatId);
        if (chIndex !== -1) {
          channels[chIndex].template_text = text;
          channels[chIndex].template_entities = msg.entities || [];
          user.channels = channels;
          await saveUser(user);
          await sendMessage(chatId, "Post template updated! ✅");
          await clearState(userId);
        } else {
          await clearState(userId);
        }
      } else if (state.state === "edit_reaction") {
        const channels = user.channels || [];
        const chIndex = channels.findIndex((c: any) => c.chatId === state.data.chatId);
        if (chIndex !== -1) {
          channels[chIndex].reaction = text;
          user.channels = channels;
          await saveUser(user);
          await sendMessage(chatId, "Reaction updated! ✅");
          await clearState(userId);
        } else {
          await clearState(userId);
        }
      } else if (state.state === "edit_traffic_limit") {
        const limit = parseFloat(text);
        if (isNaN(limit) || limit < 0) {
          await sendMessage(chatId, "Invalid traffic limit. ❌");
          await clearState(userId);
          return new Response("ok");
        }
        const channels = user.channels || [];
        const chIndex = channels.findIndex((c: any) => c.chatId === state.data.chatId);
        if (chIndex !== -1) {
          channels[chIndex].traffic_gb = limit;
          user.channels = channels;
          await saveUser(user);
          await sendMessage(chatId, "Traffic limit updated! ✅");
          await clearState(userId);
        } else {
          await clearState(userId);
        }
      } else if (state.state.startsWith("admin_")) {
        if (username !== "Masakoff") {
          await sendMessage(chatId, "You are not admin. ❌");
          await clearState(userId);
          return new Response("ok");
        }
        if (state.state === "admin_show_profile") {
          const targetId = parseInt(text);
          if (isNaN(targetId)) {
            await sendMessage(chatId, "Invalid user ID. ❌");
            await clearState(userId);
            return new Response("ok");
          }
          const targetUser = await getUser(targetId);
          if (!targetUser) {
            await sendMessage(chatId, "User not found. ❌");
            await clearState(userId);
            return new Response("ok");
          }
          let expiryStr = "Never";
          if (targetUser.expiry) {
            const dt = new Date(targetUser.expiry);
            const utc5 = new Date(dt.getTime() + 5 * 3600 * 1000);
            expiryStr = utc5.toISOString().replace('T', ' ').slice(0, 19) + ' UTC+5';
          }
          const profileText = `User Profile:\nID: \`${targetUser.id}\`\nName: ${escapeMarkdown(targetUser.first_name)}\nBalance: ${targetUser.balance || 0} ⭐️\nActive Plan: ${targetUser.activePlan}\nSubscribed Plan: ${targetUser.subscribedPlan}\nExpiry: ${expiryStr}\nPanels: ${Object.keys(targetUser.panels || {}).map(escapeMarkdown).join(", ") || "None"}\nChannels: ${targetUser.channels?.map((c: any) => escapeMarkdown(c.username)).join(", ") || "None"}`;
          await sendMessage(chatId, profileText, "Markdown");
          await clearState(userId);
        } else if (state.state === "admin_modify_balance_id") {
          const targetId = parseInt(text);
          if (isNaN(targetId)) {
            await sendMessage(chatId, "Invalid user ID. ❌");
            await clearState(userId);
            return new Response("ok");
          }
          const targetUser = await getUser(targetId);
          if (!targetUser) {
            await sendMessage(chatId, "User not found. ❌");
            await clearState(userId);
            return new Response("ok");
          }
          await setState(userId, "admin_modify_balance_amount", { targetId });
          await sendMessage(chatId, "Send amount to add (positive) or subtract (negative):");
        } else if (state.state === "admin_modify_balance_amount") {
          const amount = parseInt(text);
          if (isNaN(amount)) {
            await sendMessage(chatId, "Invalid amount. ❌");
            await clearState(userId);
            return new Response("ok");
          }
          const targetUser = await getUser(state.data.targetId);
          targetUser.balance = (targetUser.balance || 0) + amount;
          await saveUser(targetUser);
          await sendMessage(chatId, `Balance updated to ${targetUser.balance} ⭐️ ✅`);
          await clearState(userId);
        } else if (state.state === "admin_modify_plans_id") {
          const targetId = parseInt(text);
          if (isNaN(targetId)) {
            await sendMessage(chatId, "Invalid user ID. ❌");
            await clearState(userId);
            return new Response("ok");
          }
          const targetUser = await getUser(targetId);
          if (!targetUser) {
            await sendMessage(chatId, "User not found. ❌");
            await clearState(userId);
            return new Response("ok");
          }
          let expiryStr = "Never";
          if (targetUser.expiry) {
            const dt = new Date(targetUser.expiry);
            const utc5 = new Date(dt.getTime() + 5 * 3600 * 1000);
            expiryStr = utc5.toISOString().replace('T', ' ').slice(0, 19) + ' UTC+5';
          }
          const plansText = `User ${targetUser.id} - ${escapeMarkdown(targetUser.first_name)}\nActive Plan: ${targetUser.activePlan}\nSubscribed Plan: ${targetUser.subscribedPlan}\nExpiry: ${expiryStr} (UTC+5)`;
          await sendMessage(chatId, plansText);
          await setState(userId, "admin_modify_plans_expiry", { targetId });
          await sendMessage(chatId, "Send new expiry in format DD.MM.YYYY HH:MM (UTC+5) or 'never' to remove:");
        } else if (state.state === "admin_modify_plans_expiry") {
          const targetUser = await getUser(state.data.targetId);
          if (text.toLowerCase() === "never") {
            targetUser.expiry = null;
          } else {
            const parts = text.split(" ");
            if (parts.length !== 2) {
              await sendMessage(chatId, "Invalid format. ❌");
              await clearState(userId);
              return new Response("ok");
            }
            const dateParts = parts[0].split(".");
            if (dateParts.length !== 3) {
              await sendMessage(chatId, "Invalid format. ❌");
              await clearState(userId);
              return new Response("ok");
            }
            const timeParts = parts[1].split(":");
            if (timeParts.length !== 2) {
              await sendMessage(chatId, "Invalid format. ❌");
              await clearState(userId);
              return new Response("ok");
            }
            const day = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]) - 1;
            const year = parseInt(dateParts[2]);
            const hour = parseInt(timeParts[0]);
            const min = parseInt(timeParts[1]);
            const utc5Date = new Date(year, month, day, hour, min);
            if (isNaN(utc5Date.getTime())) {
              await sendMessage(chatId, "Invalid date. ❌");
              await clearState(userId);
              return new Response("ok");
            }
            const expiry = utc5Date.getTime() - 5 * 3600 * 1000;
            targetUser.expiry = expiry;
          }
          await saveUser(targetUser);
          await sendMessage(chatId, "Expiry updated! ✅");
          await clearState(userId);
        } else if (state.state === "admin_change_our_url") {
          const our = await getOurMarzban();
          our.url = text;
          await saveOurMarzban(our);
          await sendMessage(chatId, "URL updated! ✅");
          await clearState(userId);
        } else if (state.state === "admin_change_our_username") {
          const our = await getOurMarzban();
          our.username = text;
          await saveOurMarzban(our);
          await sendMessage(chatId, "Username updated! ✅");
          await clearState(userId);
        } else if (state.state === "admin_change_our_password") {
          const our = await getOurMarzban();
          our.password = text;
          await saveOurMarzban(our);
          await sendMessage(chatId, "Password updated! ✅");
          await clearState(userId);
        }
      }
      return new Response("ok");
    }
    if (text === "/start") {
      await showMenu(chatId, user);
    } else if (text === "/adminpanel") {
      if (username === "Masakoff") {
        await showAdminPanel(chatId);
      } else {
        await sendMessage(chatId, "You are not admin. ❌");
      }
    }
  } catch (err) {
    console.error("Error handling update:", err);
  }
  return new Response("ok");
});