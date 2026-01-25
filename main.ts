// 🤖 VPN Channel Automation Bot with Localization
// 📱 Automates posting VPN subscriptions to Telegram channels
// 💾 Uses Deno KV for user data, plans, panels, channels
// 🔔 Handles plans, settings, top-ups with Telegram Stars
// 📊 Integrates with user Marzban panels or our Marzban (premium)
// ⚠️ Posts Happ codes at scheduled times with custom features
// 🌍 Full localization:  English, Russian, Turkmen

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

// -------------------- Localization --------------------
const translations = {
  en: {
    welcome: "Hello {name} 👋\nID: {id} 🆔\nBalance: {balance} ⭐️\nThis is very powerful tool to automate your VPN channels! 🚀",
    menu_plan: "Plan: {plan} 📊",
    menu_settings: "Settings ⚙️",
    menu_topup: "Top up 💰",
    menu_pricing: "Pricing plans 💲",
    menu_our_channel: "Our channel 📢",
    menu_our_chat: "Our chat 💬",
    menu_language: "Language 🌍",
    plan_info: "You are in {plan} plan 📊",
    settings: "Settings:\n{maxChannels}\n{editTime}\n{editPost}\n{noWatermark}\n{editReaction}\n{noAds}\n{integrateOur}",
    settings_max_channels: "✅{count} channels 📡",
    settings_unlimited_channels: "✅Unlimited channels 📡",
    settings_edit_time: "{status}Edit posting time ⏰",
    settings_edit_post: "{status}Edit post ✏️",
    settings_no_watermark: "{status}No watermark 🚫",
    settings_edit_reaction: "{status}Edit reaction ❤️",
    settings_no_ads: "{status}No Ads 📵",
    settings_integrate_our: "{status}Integrate our marzban 🔗",
    status_enabled: "✅",
    status_disabled: "🚫",
    top_up_prompt: "How many ⭐️ you want to top up? 🔢",
    top_up_success: "Successfully topped up {amount} ⭐️! 🎉",
    top_up_failed: "Invalid amount. ❌",
    pricing_current: "You are now {plan}\nExpires: {expiry}",
    pricing_expiry_never: "Never",
    pricing_buy: "Buy {plan}🛒",
    pricing_back: "Back",
    plan_expired: "Your plan has expired! Reverted to Free. All settings reset to default. Please configure again. 📉",
    plan_activated: "Plan activated! ✅",
    plan_already: "Already on this plan.",
    plan_not_enough: "Not enough ⭐️.",
    plan_purchased: "Purchased!",
    plan_features: "{channels}\n{editTime}\n{editPost}\n{noWatermark}\n{editReaction}\n{noAds}\n{integrateOur}",
    plan_features_channels: "✅{count} channel{plural}",
    plan_features_unlimited: "✅Unlimited channels",
    plan_features_edit_time: "{status}Edit posting time",
    plan_features_edit_post: "{status}Edit post",
    plan_features_no_watermark: "{status}No watermark",
    plan_features_edit_reaction: "{status}Edit reaction",
    plan_features_no_ads: "{status}No Ads",
    plan_features_integrate_our: "{status}Integrate our marzban",
    plan_cost: "Costs {cost}⭐️",
    confirm_buy: "Buy",
    confirm_cancel: "Cancel",
    our_channel_message: "Join our channel for updates: https://t.me/MarzoraNews 📢",
    our_chat_message: "Join our chat for discussions: https://t.me/MarzoraChat 💬",
    marzban_manage: "Here you can manage your Marzban panels! 🛠️",
    marzban_add: "Add Marzban ➕",
    marzban_delete: "Delete Marzban ➖",
    marzban_manage_panel: "Manage 🔧",
    marzban_no_panels: "No Marzban panels added yet. ❌",
    marzban_select: "Select Marzban panel to manage! 🔧",
    marzban_name_prompt: "Enter name for the Marzban panel: 📝",
    marzban_delete_prompt: "Enter name of Marzban panel to delete: 🗑️",
    marzban_added: "Marzban panel {name} added! ✅",
    marzban_deleted: "Marzban panel {name} deleted! 🗑️",
    marzban_not_found: "Panel not found. ❌",
    marzban_duplicate: "Name already exists. ❌",
    marzban_change: "Here you can change {name} settings! ⚙️",
    marzban_change_name: "Change name 📛",
    marzban_change_id: "Change ID 🆔",
    marzban_change_url: "Change URL 🌐",
    marzban_change_username: "Change username 👤",
    marzban_change_password: "Change password 🔑",
    channels_manage: "Channels 📢",
    channels_add: "Add channel ➕",
    channels_delete: "Delete channel ➖",
    channels_select: "Select channel ✅",
    channels_manage_channel: "Manage 🔧",
    channels_no_channels: "No channels added yet. ❌",
    channels_add_prompt: "Send username of channel to add (e.g., @channel): ➕",
    channels_delete_prompt: "Send username of channel to delete: 🗑️",
    channels_select_prompt: "Select channels where bot will work! ✅",
    channels_added: "Channel {name} added! ✅",
    channels_deleted: "Channel {name} deleted! 🗑️",
    channels_not_found: "Channel not found. ❌",
    channels_already_added: "Channel already added. ❌",
    channels_not_admin: "You or bot must be admin in the channel. ❌",
    channels_max_reached: "Max {count} channels for your plan. Upgrade! 📈",
    channel_settings: "Here you can change {name} settings! ⚙️",
    channel_connect_marzban: "Connect Marzban 🔗",
    channel_edit_user: "Edit Marzban User ⚙️",
    channel_edit_time: "Editing time ⏰",
    channel_edit_post: "Edit post ✏️",
    channel_edit_reaction: "Edit reaction ❤️",
    channel_locked: "Locked for your plan 🔒",
    channel_time_prompt: "Here you can edit posting time (UTC+5) ⏰\nExample: 15:00\nFor multiple: 2:00,5:00,16:00\nMinimum 1 hour between posts!",
    channel_post_prompt: "Send me the post template, use <happcode> for the subscription code: ✏️",
    channel_reaction_prompt: "Send me the reaction emoji (e.g., ❤️): ❤️",
    channel_time_updated: "Posting times updated! ✅",
    channel_post_updated: "Post template updated! ✅",
    channel_reaction_updated: "Reaction updated! ✅",
    channel_post_no_code: "Must include <happcode>. ❌",
    channel_time_invalid: "Invalid format. ❌",
    channel_time_too_close: "Minimum 1 hour between posts. ❌",
    connect_marzban_select: "Select Marzban panel to connect to this channel! 🔗",
    connect_our_marzban: "Our marzban",
    connect_connected: "Connected to {name}! ✅",
    edit_user_settings: "Edit Marzban User settings for {name} ⚙️",
    edit_protocols: "Edit protocols",
    edit_traffic: "Edit traffic limit",
    edit_delete_before: "Delete before posting",
    protocols_select: "Select protocols:",
    protocol_vmess: "Vmess",
    protocol_vless: "Vless",
    protocol_trojan: "Trojan",
    protocol_shadowsocks: "Shadowsocks",
    traffic_prompt: "Enter traffic limit in GB (0 for unlimited):",
    traffic_updated: "Traffic limit updated! ✅",
    traffic_invalid: "Invalid traffic limit. ❌",
    admin_panel: "Here you can work with admin features!",
    admin_show_profile: "Show profile",
    admin_modify_balance: "Modify balance",
    admin_modify_plans: "Modify plans",
    admin_our_marzban: "Our marzban",
    admin_not_admin: "You are not admin.",
    admin_profile_prompt: "Send user ID to show profile:",
    admin_balance_prompt: "Send user ID to modify balance:",
    admin_plans_prompt: "Send user ID to modify plans:",
    admin_user_not_found: "User not found. ❌",
    admin_user_profile: "User Profile:\nID: `{id}`\nName: {name}\nBalance: {balance} ⭐️\nActive Plan: {activePlan}\nSubscribed Plan: {subscribedPlan}\nExpiry: {expiry}\nPanels: {panels}\nChannels: {channels}",
    admin_balance_amount: "Send amount to add (positive) or subtract (negative):",
    admin_balance_updated: "Balance updated to {balance} ⭐️ ✅",
    admin_plans_expiry: "Send new expiry in format DD.MM.YYYY HH:MM (UTC+5) or 'never' to remove:",
    admin_plans_updated: "Expiry updated! ✅",
    admin_marzban_manage: "Manage our marzban",
    admin_marzban_change_url: "Change url",
    admin_marzban_change_username: "Change username",
    admin_marzban_change_password: "Change password",
    admin_marzban_url_prompt: "Send new URL for our marzban:",
    admin_marzban_username_prompt: "Send new username for our marzban:",
    admin_marzban_password_prompt: "Send new password for our marzban:",
    admin_marzban_updated: "{field} updated! ✅",
    select_language: "Please select your language:",
    language_updated: "Language updated to {language}! ✅",
    back: "Back",
    error: "An error occurred. Please try again. ❌"
  },
  ru: {
    welcome: "Привет, {name} 👋\nID: {id} 🆔\nБаланс: {balance} ⭐️\nЭто очень мощный инструмент для автоматизации ваших VPN каналов! 🚀",
    menu_plan: "Тариф: {plan} 📊",
    menu_settings: "Настройки ⚙️",
    menu_topup: "Пополнить 💰",
    menu_pricing: "Тарифные планы 💲",
    menu_our_channel: "Наш канал 📢",
    menu_our_chat: "Наш чат 💬",
    menu_language: "Язык 🌍",
    plan_info: "Вы на тарифе {plan} 📊",
    settings: "Настройки:\n{maxChannels}\n{editTime}\n{editPost}\n{noWatermark}\n{editReaction}\n{noAds}\n{integrateOur}",
    settings_max_channels: "✅{count} каналов 📡",
    settings_unlimited_channels: "✅Безлимитные каналы 📡",
    settings_edit_time: "{status}Изменение времени публикации ⏰",
    settings_edit_post: "{status}Редактирование поста ✏️",
    settings_no_watermark: "{status}Без водяного знака 🚫",
    settings_edit_reaction: "{status}Изменение реакции ❤️",
    settings_no_ads: "{status}Без рекламы 📵",
    settings_integrate_our: "{status}Интеграция нашего Marzban 🔗",
    status_enabled: "✅",
    status_disabled: "🚫",
    top_up_prompt: "Сколько ⭐️ вы хотите пополнить? 🔢",
    top_up_success: "Успешно пополнено {amount} ⭐️! 🎉",
    top_up_failed: "Неверная сумма. ❌",
    pricing_current: "Ваш текущий тариф: {plan}\nИстекает: {expiry}",
    pricing_expiry_never: "Никогда",
    pricing_buy: "Купить {plan}🛒",
    pricing_back: "Назад",
    plan_expired: "Ваш тариф истек! Возврат к бесплатному тарифу. Все настройки сброшены. Пожалуйста, настройте заново. 📉",
    plan_activated: "Тариф активирован! ✅",
    plan_already: "Уже на этом тарифе.",
    plan_not_enough: "Недостаточно ⭐️.",
    plan_purchased: "Куплено!",
    plan_features: "{channels}\n{editTime}\n{editPost}\n{noWatermark}\n{editReaction}\n{noAds}\n{integrateOur}",
    plan_features_channels: "✅{count} канал{plural}",
    plan_features_unlimited: "✅Безлимитные каналы",
    plan_features_edit_time: "{status}Изменение времени публикации",
    plan_features_edit_post: "{status}Редактирование поста",
    plan_features_no_watermark: "{status}Без водяного знака",
    plan_features_edit_reaction: "{status}Изменение реакции",
    plan_features_no_ads: "{status}Без рекламы",
    plan_features_integrate_our: "{status}Интеграция нашего Marzban",
    plan_cost: "Стоимость: {cost}⭐️",
    confirm_buy: "Купить",
    confirm_cancel: "Отмена",
    our_channel_message: "Присоединяйтесь к нашему каналу для обновлений: https://t.me/MarzoraNews 📢",
    our_chat_message: "Присоединяйтесь к нашему чату для обсуждений: https://t.me/MarzoraChat 💬",
    marzban_manage: "Здесь вы можете управлять вашими панелями Marzban! 🛠️",
    marzban_add: "Добавить Marzban ➕",
    marzban_delete: "Удалить Marzban ➖",
    marzban_manage_panel: "Управление 🔧",
    marzban_no_panels: "Пока нет добавленных панелей Marzban. ❌",
    marzban_select: "Выберите панель Marzban для управления! 🔧",
    marzban_name_prompt: "Введите название для панели Marzban: 📝",
    marzban_delete_prompt: "Введите название панели Marzban для удаления: 🗑️",
    marzban_added: "Панель Marzban {name} добавлена! ✅",
    marzban_deleted: "Панель Marzban {name} удалена! 🗑️",
    marzban_not_found: "Панель не найдена. ❌",
    marzban_duplicate: "Название уже существует. ❌",
    marzban_change: "Здесь вы можете изменить настройки {name}! ⚙️",
    marzban_change_name: "Изменить название 📛",
    marzban_change_id: "Изменить ID 🆔",
    marzban_change_url: "Изменить URL 🌐",
    marzban_change_username: "Изменить имя пользователя 👤",
    marzban_change_password: "Изменить пароль 🔑",
    channels_manage: "Каналы 📢",
    channels_add: "Добавить канал ➕",
    channels_delete: "Удалить канал ➖",
    channels_select: "Выбрать канал ✅",
    channels_manage_channel: "Управление 🔧",
    channels_no_channels: "Пока нет добавленных каналов. ❌",
    channels_add_prompt: "Отправьте username канала для добавления (например, @channel): ➕",
    channels_delete_prompt: "Отправьте username канала для удаления: 🗑️",
    channels_select_prompt: "Выберите каналы, где бот будет работать! ✅",
    channels_added: "Канал {name} добавлен! ✅",
    channels_deleted: "Канал {name} удален! 🗑️",
    channels_not_found: "Канал не найден. ❌",
    channels_already_added: "Канал уже добавлен. ❌",
    channels_not_admin: "Вы или бот должны быть администраторами в канале. ❌",
    channels_max_reached: "Максимум {count} каналов для вашего тарифа. Улучшите тариф! 📈",
    channel_settings: "Здесь вы можете изменить настройки {name}! ⚙️",
    channel_connect_marzban: "Подключить Marzban 🔗",
    channel_edit_user: "Настройки пользователя Marzban ⚙️",
    channel_edit_time: "Изменение времени ⏰",
    channel_edit_post: "Редактирование поста ✏️",
    channel_edit_reaction: "Изменение реакции ❤️",
    channel_locked: "Заблокировано для вашего тарифа 🔒",
    channel_time_prompt: "Здесь вы можете изменить время публикации (UTC+5) ⏰\nПример: 15:00\nНесколько значений: 2:00,5:00,16:00\nМинимум 1 час между публикациями!",
    channel_post_prompt: "Отправьте шаблон поста, используйте <happcode> для кода подписки: ✏️",
    channel_reaction_prompt: "Отправьте эмодзи реакции (например, ❤️): ❤️",
    channel_time_updated: "Время публикации обновлено! ✅",
    channel_post_updated: "Шаблон поста обновлен! ✅",
    channel_reaction_updated: "Реакция обновлена! ✅",
    channel_post_no_code: "Должен содержать <happcode>. ❌",
    channel_time_invalid: "Неверный формат. ❌",
    channel_time_too_close: "Минимум 1 час между публикациями. ❌",
    connect_marzban_select: "Выберите панель Marzban для подключения к этому каналу! 🔗",
    connect_our_marzban: "Наш Marzban",
    connect_connected: "Подключено к {name}! ✅",
    edit_user_settings: "Настройки пользователя Marzban для {name} ⚙️",
    edit_protocols: "Изменить протоколы",
    edit_traffic: "Изменить лимит трафика",
    edit_delete_before: "Удалять перед публикацией",
    protocols_select: "Выберите протоколы:",
    protocol_vmess: "Vmess",
    protocol_vless: "Vless",
    protocol_trojan: "Trojan",
    protocol_shadowsocks: "Shadowsocks",
    traffic_prompt: "Введите лимит трафика в ГБ (0 для безлимита):",
    traffic_updated: "Лимит трафика обновлен! ✅",
    traffic_invalid: "Неверный лимит трафика. ❌",
    admin_panel: "Здесь вы можете работать с административными функциями!",
    admin_show_profile: "Показать профиль",
    admin_modify_balance: "Изменить баланс",
    admin_modify_plans: "Изменить тарифы",
    admin_our_marzban: "Наш Marzban",
    admin_not_admin: "Вы не администратор.",
    admin_profile_prompt: "Отправьте ID пользователя для показа профиля:",
    admin_balance_prompt: "Отправьте ID пользователя для изменения баланса:",
    admin_plans_prompt: "Отправьте ID пользователя для изменения тарифов:",
    admin_user_not_found: "Пользователь не найден. ❌",
    admin_user_profile: "Профиль пользователя:\nID: `{id}`\nИмя: {name}\nБаланс: {balance} ⭐️\nАктивный тариф: {activePlan}\nПодписанный тариф: {subscribedPlan}\nИстекает: {expiry}\nПанели: {panels}\nКаналы: {channels}",
    admin_balance_amount: "Отправьте сумму для добавления (положительная) или вычитания (отрицательная):",
    admin_balance_updated: "Баланс обновлен до {balance} ⭐️ ✅",
    admin_plans_expiry: "Отправьте новую дату истечения в формате ДД.ММ.ГГГГ ЧЧ:ММ (UTC+5) или 'never' для отмены:",
    admin_plans_updated: "Дата истечения обновлена! ✅",
    admin_marzban_manage: "Управление нашим Marzban",
    admin_marzban_change_url: "Изменить URL",
    admin_marzban_change_username: "Изменить имя пользователя",
    admin_marzban_change_password: "Изменить пароль",
    admin_marzban_url_prompt: "Отправьте новый URL для нашего Marzban:",
    admin_marzban_username_prompt: "Отправьте новое имя пользователя для нашего Marzban:",
    admin_marzban_password_prompt: "Отправьте новый пароль для нашего Marzban:",
    admin_marzban_updated: "{field} обновлен! ✅",
    select_language: "Пожалуйста, выберите ваш язык:",
    language_updated: "Язык изменен на {language}! ✅",
    back: "Назад",
    error: "Произошла ошибка. Пожалуйста, попробуйте снова. ❌"
  },
  tk: {
    welcome: "Salam {name} 👋\nID: {id} 🆔\nBalans: {balance} ⭐️\nBu VPN kanallaryňyzy awtomatlaşdyrmak üçin güýçli gural! 🚀",
    menu_plan: "Meýilnama: {plan} 📊",
    menu_settings: "Sazlamalar ⚙️",
    menu_topup: "Balansy doldur 💰",
    menu_pricing: "Meýilnama bahalary 💲",
    menu_our_channel: "Biziň kanal 📢",
    menu_our_chat: "Biziň chat 💬",
    menu_language: "Dil 🌍",
    plan_info: "Siz {plan} meýilnamasynda 📊",
    settings: "Sazlamalar:\n{maxChannels}\n{editTime}\n{editPost}\n{noWatermark}\n{editReaction}\n{noAds}\n{integrateOur}",
    settings_max_channels: "✅{count} kanal 📡",
    settings_unlimited_channels: "✅Çäksiz kanallar 📡",
    settings_edit_time: "{status}Ýazylma wagtyny üýtgetmek ⏰",
    settings_edit_post: "{status}Posty üýtgetmek ✏️",
    settings_no_watermark: "{status}Wodemark ýok 🚫",
    settings_edit_reaction: "{status}Reaksiýany üýtgetmek ❤️",
    settings_no_ads: "{status}Reklama ýok 📵",
    settings_integrate_our: "{status}Bizim Marzban-y birleşdirmek 🔗",
    status_enabled: "✅",
    status_disabled: "🚫",
    top_up_prompt: "Näçe ⭐️ doldurmak isleýärsiňiz? 🔢",
    top_up_success: "{amount} ⭐️ üstünlikli dolduryldy! 🎉",
    top_up_failed: "Nädogry mukdar. ❌",
    pricing_current: "Häzirki meýilnamanyz: {plan}\nGutarýan wagty: {expiry}",
    pricing_expiry_never: "Hiçwagt",
    pricing_buy: "{plan} satyn al 🛒",
    pricing_back: "Yza",
    plan_expired: "Meýilnamanyňyz gutardy! Mugt meýilnamaga gaýdyp gelindi. Ähli sazlamalar öňki ýagdaýyna getirildi. Täzeden sazlaň. 📉",
    plan_activated: "Meýilnama işjeňleşdirildi! ✅",
    plan_already: "Eýýäm bu meýilnamada.",
    plan_not_enough: "⭐️ Ýeterlik däl.",
    plan_purchased: "Satyn alyndy!",
    plan_features: "{channels}\n{editTime}\n{editPost}\n{noWatermark}\n{editReaction}\n{noAds}\n{integrateOur}",
    plan_features_channels: "✅{count} kanal{plural}",
    plan_features_unlimited: "✅Çäksiz kanallar",
    plan_features_edit_time: "{status}Ýazylma wagtyny üýtgetmek",
    plan_features_edit_post: "{status}Posty üýtgetmek",
    plan_features_no_watermark: "{status}Wodemark ýok",
    plan_features_edit_reaction: "{status}Reaksiýany üýtgetmek",
    plan_features_no_ads: "{status}Reklama ýok",
    plan_features_integrate_our: "{status}Bizim Marzban-y birleşdirmek",
    plan_cost: "Bahasy: {cost}⭐️",
    confirm_buy: "Satyn al",
    confirm_cancel: "Ýatyr",
    our_channel_message: "Täzelenmeler üçin kanala goşulyň: https://t.me/MarzoraNews 📢",
    our_chat_message: "Gürrüňler üçin chata goşulyň: https://t.me/MarzoraChat 💬",
    marzban_manage: "Bu ýerde Marzban paneliňizi dolandyryp bilersiňiz! 🛠️",
    marzban_add: "Marzban goş ➕",
    marzban_delete: "Marzban pozu ➖",
    marzban_manage_panel: "Dolandyrmak 🔧",
    marzban_no_panels: "Häzirki wagtda goşulan Marzban paneli ýok. ❌",
    marzban_select: "Dolandyrmak üçin Marzban paneli saýlaň! 🔧",
    marzban_name_prompt: "Marzban paneli üçin at giriziň: 📝",
    marzban_delete_prompt: "Pozmak üçin Marzban paneliniň adyny giriziň: 🗑️",
    marzban_added: "Marzban paneli {name} goşuldy! ✅",
    marzban_deleted: "Marzban paneli {name} pozuldy! 🗑️",
    marzban_not_found: "Panel tapylmady. ❌",
    marzban_duplicate: "At eýýäm bar. ❌",
    marzban_change: "Bu ýerde {name} sazlamalaryny üýtgedip bilersiňiz! ⚙️",
    marzban_change_name: "Ady üýtget 📛",
    marzban_change_id: "ID üýtget 🆔",
    marzban_change_url: "URL üýtget 🌐",
    marzban_change_username: "Ulanyjy adyny üýtget 👤",
    marzban_change_password: "Açarsözi üýtget 🔑",
    channels_manage: "Kanallar 📢",
    channels_add: "Kanal goş ➕",
    channels_delete: "Kanal pozu ➖",
    channels_select: "Kanal saýla ✅",
    channels_manage_channel: "Dolandyrmak 🔧",
    channels_no_channels: "Häzirki wagtda goşulan kanal ýok. ❌",
    channels_add_prompt: "Goşmak üçin kanalyň username ini iberiň (meselem, @channel): ➕",
    channels_delete_prompt: "Pozmak üçin kanalyň username ini iberiň: 🗑️",
    channels_select_prompt: "Bot işlemeli kanallary saýlaň! ✅",
    channels_added: "Kanal {name} goşuldy! ✅",
    channels_deleted: "Kanal {name} pozuldy! 🗑️",
    channels_not_found: "Kanal tapylmady. ❌",
    channels_already_added: "Kanal eýýäm goşulan. ❌",
    channels_not_admin: "Siz ýa-da bot kanalda admin bolmaly. ❌",
    channels_max_reached: "Meýilnamanyz üçin iň köp {count} kanal. Meýilnamany ýokarlandyryň! 📈",
    channel_settings: "Bu ýerde {name} sazlamalaryny üýtgedip bilersiňiz! ⚙️",
    channel_connect_marzban: "Marzban birikdir 🔗",
    channel_edit_user: "Marzban ulanyjy sazlamalary ⚙️",
    channel_edit_time: "Wagty üýtget ⏰",
    channel_edit_post: "Posty üýtget ✏️",
    channel_edit_reaction: "Reaksiýany üýtget ❤️",
    channel_locked: "Meýilnamanyz üçin bloklanan 🔒",
    channel_time_prompt: "Bu ýerde ýazylma wagtyny (UTC+5) üýtgedip bilersiňiz ⏰\nMysal: 15:00\nBirnäçe baha: 2:00,5:00,16:00\nPostlar arasynda iň az 1 sagat!",
    channel_post_prompt: "Post şablonyny iberiň, abuna kody üçin <happcode> ulanyň: ✏️",
    channel_reaction_prompt: "Reaksiýa emojisini iberiň (meselem, ❤️): ❤️",
    channel_time_updated: "Ýazylma wagty täzelendi! ✅",
    channel_post_updated: "Post şablonyny täzelendi! ✅",
    channel_reaction_updated: "Reaksiýa täzelendi! ✅",
    channel_post_no_code: "<happcode> bolmaly. ❌",
    channel_time_invalid: "Nädogry format. ❌",
    channel_time_too_close: "Postlar arasynda iň az 1 sagat. ❌",
    connect_marzban_select: "Bu kanala birikdirmek üçin Marzban paneli saýlaň! 🔗",
    connect_our_marzban: "Bizim Marzban",
    connect_connected: "{name} birikdirildi! ✅",
    edit_user_settings: "{name} üçin Marzban ulanyjy sazlamalary ⚙️",
    edit_protocols: "Protokollary üýtget",
    edit_traffic: "Trafik çäklendirmesini üýtget",
    edit_delete_before: "Ýazylma öň poz",
    protocols_select: "Protokollary saýlaň:",
    protocol_vmess: "Vmess",
    protocol_vless: "Vless",
    protocol_trojan: "Trojan",
    protocol_shadowsocks: "Shadowsocks",
    traffic_prompt: "GB-da trafik çäklendirmesini giriziň (çäksiz üçin 0):",
    traffic_updated: "Trafik çäklendirmesi täzelendi! ✅",
    traffic_invalid: "Nädogry trafik çäklendirmesi. ❌",
    admin_panel: "Bu ýerde administratiw funksiýalar bilen işläp bilersiňiz!",
    admin_show_profile: "Profili görkez",
    admin_modify_balance: "Balansy üýtget",
    admin_modify_plans: "Meýilnamalary üýtget",
    admin_our_marzban: "Bizim Marzban",
    admin_not_admin: "Siz admin dälsiňiz.",
    admin_profile_prompt: "Profili görkezmek üçin ulanyjy ID sini iberiň:",
    admin_balance_prompt: "Balansy üýtgetmek üçin ulanyjy ID sini iberiň:",
    admin_plans_prompt: "Meýilnamalary üýtgetmek üçin ulanyjy ID sini iberiň:",
    admin_user_not_found: "Ulanyjy tapylmady. ❌",
    admin_user_profile: "Ulanyjy profili:\nID: `{id}`\nAdy: {name}\nBalans: {balance} ⭐️\nIşjeň meýilnama: {activePlan}\nAbuna meýilnamasy: {subscribedPlan}\nGutarýan wagty: {expiry}\nPaneller: {panels}\nKanallar: {channels}",
    admin_balance_amount: "Goşmak (pozi tiw) ýa-da aýyrmak (nega tiw) üçin mukdary iberiň:",
    admin_balance_updated: "Balans {balance} ⭐️ täzelendi! ✅",
    admin_plans_expiry: "Täze gutarýan wagtyny DD.MM.ÝÝÝÝ SS:MM (UTC+5) formatda ýa-da 'never' ýazyp iberiň:",
    admin_plans_updated: "Gutarýan wagty täzelendi! ✅",
    admin_marzban_manage: "Bizim Marzban-y dolandyrmak",
    admin_marzban_change_url: "URL üýtget",
    admin_marzban_change_username: "Ulanyjy adyny üýtget",
    admin_marzban_change_password: "Açarsözi üýtget",
    admin_marzban_url_prompt: "Bizim Marzban üçin täze URL iberiň:",
    admin_marzban_username_prompt: "Bizim Marzban üçin täze ulanyjy adyny iberiň:",
    admin_marzban_password_prompt: "Bizim Marzban üçin täze açarsözi iberiň:",
    admin_marzban_updated: "{field} täzelendi! ✅",
    select_language: "Diliňizi saýlaň:",
    language_updated: "Dil {language} üýtgedildi! ✅",
    back: "Yza",
    error: "Ýalňyşlyk ýüze çykdy. Täzeden synanyşyň. ❌"
  }
};

// Helper function to translate text
function t(key: string, lang: string = 'en', params: Record<string, any> = {}): string {
  const langTranslations = translations[lang as keyof typeof translations] || translations.en;
  let text = langTranslations[key as keyof typeof langTranslations] || translations.en[key as keyof typeof translations.en] || key;
  
  // Replace parameters
  Object.keys(params).forEach(param => {
    const value = params[param];
    const regex = new RegExp(`\\{${param}\\}`, 'g');
    
    // Handle pluralization for channels
    if (param === 'plural' && value !== undefined) {
      if (lang === 'en') {
        text = text.replace(regex, value === 1 ? '' : 's');
      } else if (lang === 'ru') {
        if (value % 10 === 1 && value % 100 !== 11) {
          text = text.replace(regex, '');
        } else if ([2,3,4].includes(value % 10) && ![12,13,14].includes(value % 100)) {
          text = text.replace(regex, 'а');
        } else {
          text = text.replace(regex, 'ов');
        }
      } else if (lang === 'tk') {
        text = text.replace(regex, value === 1 ? '' : 'lar');
      }
    } else {
      text = text.replace(regex, value !== undefined ? value.toString() : `{${param}}`);
    }
  });
  
  return text;
}

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

// Language flags
const LANGUAGE_FLAGS: Record<string, string> = {
  'en': '🇺🇸',
  'ru': '🇷🇺',
  'tk': '🇹🇲'
};

const LANGUAGE_NAMES: Record<string, string> = {
  'en': 'English',
  'ru': 'Русский',
  'tk': 'Türkmençe'
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

async function createMarzbanUser(url: string, adminUser: string, adminPass: string, plan: any, sub_prefix: string, protocols: string[] = ['vless', 'shadowsocks']): Promise<{ link: string; expiryDate: string; username: string } | null> {
  const token = await getMarzbanToken(url, adminUser, adminPass);
  if (!token) return null;
  const username = sub_prefix + Math.random().toString(36).substring(2, 8);
  await removeMarzbanUser(url, token, username);
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
  const announceB64 = encodeBase64("@MarzoraNews");
  const supportUrl = "https://t.me/MarzoraNews";
  const profileWebPageUrl = "https://t.me/MarzoraNews";
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
    return { link: fullLink, expiryDate, username };
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
  return entry.value || { id: userId, subscribedPlan: "free", activePlan: "free", balance: 0, panels: {}, channels: [], first_name: "", expiry: null, language: 'en' };
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
    await sendMessage(user.id.toString(), t('plan_expired', user.language || 'en'), "Markdown");
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
  }
  user.channels = channels;
}

// -------------------- Menu & Settings Helpers --------------------
async function showLanguageSelection(chatId: string, messageId?: number) {
  const text = t('select_language', 'en');
  const keyboard = {
    inline_keyboard: [
      [{ text: `${LANGUAGE_FLAGS['en']} English`, callback_data: "set_language:en" }],
      [{ text: `${LANGUAGE_FLAGS['ru']} Русский`, callback_data: "set_language:ru" }],
      [{ text: `${LANGUAGE_FLAGS['tk']} Türkmençe`, callback_data: "set_language:tk" }],
    ],
  };
  
  if (messageId) {
    await editMessageText(chatId, messageId, text, "Markdown", keyboard);
  } else {
    await sendMessage(chatId, text, "Markdown", keyboard);
  }
}

async function showMenu(chatId: string, user: any) {
  user = await checkPlanExpiry(user);
  const lang = user.language || 'en';
  const name = user.first_name || t('User', lang);
  const id = user.id;
  const balance = user.balance || 0;
  const activePlan = user.activePlan || "free";
  const text = t('welcome', lang, { name, id, balance });
  const keyboard = {
    inline_keyboard: [
      [{ text: t('menu_plan', lang, { plan: activePlan.charAt(0).toUpperCase() + activePlan.slice(1) }), callback_data: "plan_info" }],
      [{ text: t('menu_settings', lang), callback_data: "settings" }],
      [{ text: t('menu_topup', lang), callback_data: "top_up" }],
      [{ text: t('menu_pricing', lang), callback_data: "pricing" }],
      [{ text: t('menu_our_channel', lang), callback_data: "our_channel" }],
      [{ text: t('menu_our_chat', lang), callback_data: "our_chat" }],
      [{ text: t('menu_language', lang), callback_data: "change_language" }],
    ],
  };
  await sendMessage(chatId, text, "Markdown", keyboard);
}

function getSettingsText(planConfig: any, lang: string) {
  const maxChannelsText = planConfig.maxChannels === Infinity 
    ? t('settings_unlimited_channels', lang)
    : t('settings_max_channels', lang, { count: planConfig.maxChannels });
    
  return t('settings', lang, {
    maxChannels: maxChannelsText,
    editTime: t('settings_edit_time', lang, { status: planConfig.editTime ? t('status_enabled', lang) : t('status_disabled', lang) }),
    editPost: t('settings_edit_post', lang, { status: planConfig.editPost ? t('status_enabled', lang) : t('status_disabled', lang) }),
    noWatermark: t('settings_no_watermark', lang, { status: planConfig.noWatermark ? t('status_enabled', lang) : t('status_disabled', lang) }),
    editReaction: t('settings_edit_reaction', lang, { status: planConfig.editReaction ? t('status_enabled', lang) : t('status_disabled', lang) }),
    noAds: t('settings_no_ads', lang, { status: planConfig.noAds ? t('status_enabled', lang) : t('status_disabled', lang) }),
    integrateOur: t('settings_integrate_our', lang, { status: planConfig.integrateOur ? t('status_enabled', lang) : t('status_disabled', lang) }),
  });
}

function getFeaturesText(planName: string, lang: string) {
  const config = PLANS[planName];
  let channelsText = config.maxChannels === Infinity 
    ? t('plan_features_unlimited', lang)
    : t('plan_features_channels', lang, { count: config.maxChannels, plural: config.maxChannels });
    
  return t('plan_features', lang, {
    channels: channelsText,
    editTime: t('plan_features_edit_time', lang, { status: config.editTime ? t('status_enabled', lang) : t('status_disabled', lang) }),
    editPost: t('plan_features_edit_post', lang, { status: config.editPost ? t('status_enabled', lang) : t('status_disabled', lang) }),
    noWatermark: t('plan_features_no_watermark', lang, { status: config.noWatermark ? t('status_enabled', lang) : t('status_disabled', lang) }),
    editReaction: t('plan_features_edit_reaction', lang, { status: config.editReaction ? t('status_enabled', lang) : t('status_disabled', lang) }),
    noAds: t('plan_features_no_ads', lang, { status: config.noAds ? t('status_enabled', lang) : t('status_disabled', lang) }),
    integrateOur: t('plan_features_integrate_our', lang, { status: config.integrateOur ? t('status_enabled', lang) : t('status_disabled', lang) }),
  });
}

async function showPricing(chatId: string, msgId: number | undefined, user: any) {
  const lang = user.language || 'en';
  const activePlan = user.activePlan || "free";
  const subscribedPlan = user.subscribedPlan || "free";
  let expiryStr = t('pricing_expiry_never', lang);
  if (activePlan !== "free" && user.expiry) {
    const dt = new Date(user.expiry);
    const utc5 = new Date(dt.getTime() + 5 * 3600 * 1000);
    expiryStr = utc5.toISOString().replace('T', ' ').slice(0, 19) + ' UTC+5';
  }
  const text = t('pricing_current', lang, { 
    plan: activePlan.charAt(0).toUpperCase() + activePlan.slice(1), 
    expiry: expiryStr 
  });
  
  const planOrder = ['free', 'starter', 'pro', 'premium'];
  const subscribedLevel = PLAN_HIERARCHY[subscribedPlan];
  const keyboard = { inline_keyboard: [] as any[] };
  
  for (const pName of planOrder) {
    let btnText = pName.charAt(0).toUpperCase() + pName.slice(1);
    let callback;
    if (PLAN_HIERARCHY[pName] <= subscribedLevel) {
      callback = `select_plan:${pName}`;
      if (pName === activePlan) btnText += " ✅";
    } else {
      btnText = t('pricing_buy', lang, { plan: btnText });
      callback = `confirm_buy:${pName}`;
    }
    keyboard.inline_keyboard.push([{ text: btnText, callback_data: callback }]);
  }
  keyboard.inline_keyboard.push([{ text: t('pricing_back', lang), callback_data: "back_menu" }]);
  
  if (msgId) {
    await editMessageText(chatId, msgId, text, "Markdown", keyboard);
  } else {
    await sendMessage(chatId, text, "Markdown", keyboard);
  }
}

async function showConfirmBuy(chatId: string, msgId: number, buyPlan: string, lang: string) {
  const cost = PLAN_COSTS[buyPlan];
  const features = getFeaturesText(buyPlan, lang);
  const text = `${features}\n${t('plan_cost', lang, { cost })}`;
  const keyboard = {
    inline_keyboard: [
      [{ text: t('confirm_buy', lang), callback_data: `buy_plan:${buyPlan}` }, { text: t('confirm_cancel', lang), callback_data: "cancel_buy" }],
    ],
  };
  await editMessageText(chatId, msgId, text, "Markdown", keyboard);
}

async function showAdminPanel(chatId: string, lang: string) {
  const text = t('admin_panel', lang);
  const keyboard = {
    inline_keyboard: [
      [{ text: t('admin_show_profile', lang), callback_data: "admin_show_profile" }],
      [{ text: t('admin_modify_balance', lang), callback_data: "admin_modify_balance" }],
      [{ text: t('admin_modify_plans', lang), callback_data: "admin_modify_plans" }],
      [{ text: t('admin_our_marzban', lang), callback_data: "admin_our_marzban" }],
    ],
  };
  await sendMessage(chatId, text, "Markdown", keyboard);
}

async function showOurMarzbanManagement(chatId: string, lang: string, msgId?: number) {
  const text = t('admin_marzban_manage', lang);
  const keyboard = {
    inline_keyboard: [
      [{ text: t('admin_marzban_change_url', lang), callback_data: "admin_change_our_url" }],
      [{ text: t('admin_marzban_change_username', lang), callback_data: "admin_change_our_username" }],
      [{ text: t('admin_marzban_change_password', lang), callback_data: "admin_change_our_password" }],
      [{ text: t('back', lang), callback_data: "admin_back_to_panel" }],
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
  const ttl = 30000;
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
    await sendMessage(userId.toString(), `Channel ${ch.username} deleted because you are not admin anymore. ❌`);
    return;
  }
  if (!await isAdmin(ch.chatId, botIdLocal)) {
    user.channels = user.channels.filter((c: any) => c.chatId !== ch.chatId);
    await saveUser(user);
    await sendMessage(userId.toString(), `Channel ${ch.username} deleted because bot is not admin. ❌`);
    return;
  }
  const chatInfo = await getChat(ch.chatId);
  if (chatInfo && chatInfo.username !== ch.username) {
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
  const happCode = await convertToHappCode(subData.link);
  if (!happCode) return;
  let postText = ch.template_text;
  let postEntities = ch.template_entities.map((e: any) => ({...e}));
  const placeholder = "<happcode>";
  const phLen = placeholder.length;
  let offset = 0;
  while (true) {
    const pos = postText.indexOf(placeholder, offset);
    if (pos === -1) break;
    postText = postText.slice(0, pos) + happCode + postText.slice(pos + phLen);
    const diff = happCode.length - phLen;
    postEntities = postEntities.map((e: any) => {
      if (e.offset >= pos + phLen) {
        e.offset += diff;
      } else if (e.offset + e.length > pos) {
        e.length += diff;
      }
      return e;
    });
    offset = pos + happCode.length;
  }
  if (!planConfig.noWatermark) postText += "\n\nPowered by @MarzoraBot 🚀";
  if (!planConfig.noAds) postText += "\nJoin @MarzoraNews for more! 📢";
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
      const lang = user.language || 'en';
      await sendMessage(update.message.chat.id.toString(), t('top_up_success', lang, { amount }), "Markdown");
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
      const lang = user.language || 'en';
      const activePlan = user.activePlan || "free";
      const subscribedPlan = user.subscribedPlan || "free";
      const planConfig = PLANS[activePlan];
      
      if (data === "change_language") {
        await showLanguageSelection(chatId, msgId);
        await answerCallbackQuery(cb.id);
      } else if (data.startsWith("set_language:")) {
        const newLang = data.split(":")[1];
        user.language = newLang;
        await saveUser(user);
        await answerCallbackQuery(cb.id, t('language_updated', newLang, { language: LANGUAGE_NAMES[newLang] }));
        await showMenu(chatId, user);
      } else if (data === "plan_info") {
        await answerCallbackQuery(cb.id, t('plan_info', lang, { plan: activePlan.charAt(0).toUpperCase() + activePlan.slice(1) }));
      } else if (data === "settings") {
        const text = getSettingsText(planConfig, lang);
        const keyboard = {
          inline_keyboard: [
            [{ text: "Marzban 🛠️", callback_data: "marzban" }],
            [{ text: t('channels_manage', lang), callback_data: "channels" }],
            [{ text: t('back', lang), callback_data: "back_menu" }],
          ],
        };
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
      } else if (data === "top_up") {
        await setState(userId, "top_up_amount");
        await editMessageText(chatId, msgId, t('top_up_prompt', lang), "Markdown");
      } else if (data === "pricing") {
        await showPricing(chatId, msgId, user);
      } else if (data === "our_channel") {
        await answerCallbackQuery(cb.id);
        await sendMessage(chatId, t('our_channel_message', lang), "Markdown");
      } else if (data === "our_chat") {
        await answerCallbackQuery(cb.id);
        await sendMessage(chatId, t('our_chat_message', lang), "Markdown");
      } else if (data.startsWith("select_plan:")) {
        const newPlan = data.slice(12);
        if (newPlan === activePlan) {
          await answerCallbackQuery(cb.id, t('plan_already', lang));
          return new Response("ok");
        }
        const oldActive = activePlan;
        user.activePlan = newPlan;
        if (newPlan !== oldActive) {
          resetSettings(user);
          await sendMessage(chatId, t('plan_activated', lang), "Markdown");
        }
        await saveUser(user);
        await answerCallbackQuery(cb.id);
        await showPricing(chatId, msgId, user);
      } else if (data.startsWith("confirm_buy:")) {
        const buyPlan = data.slice(12);
        await showConfirmBuy(chatId, msgId, buyPlan, lang);
      } else if (data.startsWith("buy_plan:")) {
        const buyPlan = data.slice(9);
        const cost = PLAN_COSTS[buyPlan];
        if (user.balance < cost) {
          await answerCallbackQuery(cb.id, t('plan_not_enough', lang));
          return new Response("ok");
        }
        user.balance -= cost;
        const oldSubscribed = user.subscribedPlan;
        const oldActive = user.activePlan;
        user.subscribedPlan = buyPlan;
        user.activePlan = buyPlan;
        user.expiry = Date.now() + 30 * 24 * 3600 * 1000;
        if (buyPlan !== oldActive) {
          resetSettings(user);
          await sendMessage(chatId, t('plan_activated', lang), "Markdown");
        }
        await saveUser(user);
        await answerCallbackQuery(cb.id, t('plan_purchased', lang));
        await showMenu(chatId, user);
      } else if (data === "cancel_buy") {
        await showPricing(chatId, msgId, user);
      } else if (data === "back_menu") {
        await showMenu(chatId, user);
        await answerCallbackQuery(cb.id);
      } else if (data === "marzban") {
        const text = t('marzban_manage', lang);
        const keyboard = {
          inline_keyboard: [
            [{ text: t('marzban_manage_panel', lang), callback_data: "manage_marzban" }],
            [{ text: t('marzban_add', lang), callback_data: "add_marzban" }],
            [{ text: t('marzban_delete', lang), callback_data: "delete_marzban" }],
            [{ text: t('back', lang), callback_data: "back_settings" }],
          ],
        };
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
      } else if (data === "back_settings") {
        const text = getSettingsText(planConfig, lang);
        const keyboard = {
          inline_keyboard: [
            [{ text: "Marzban 🛠️", callback_data: "marzban" }],
            [{ text: t('channels_manage', lang), callback_data: "channels" }],
            [{ text: t('back', lang), callback_data: "back_menu" }],
          ],
        };
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
        await answerCallbackQuery(cb.id);
      } else if (data === "add_marzban") {
        await setState(userId, "add_marzban_name");
        await editMessageText(chatId, msgId, t('marzban_name_prompt', lang), "Markdown");
      } else if (data === "delete_marzban") {
        await setState(userId, "delete_marzban");
        await editMessageText(chatId, msgId, t('marzban_delete_prompt', lang), "Markdown");
      } else if (data === "manage_marzban") {
        const panels = Object.keys(user.panels || {});
        if (panels.length === 0) {
          await editMessageText(chatId, msgId, t('marzban_no_panels', lang), "Markdown");
          return new Response("ok");
        }
        const text = t('marzban_select', lang);
        const keyboard = { inline_keyboard: panels.map((name) => [{ text: name, callback_data: `manage_panel:${name}` }]) };
        keyboard.inline_keyboard.push([{ text: t('back', lang), callback_data: "back_marzban" }]);
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
      } else if (data === "back_marzban") {
        const text = t('marzban_manage', lang);
        const keyboard = {
          inline_keyboard: [
            [{ text: t('marzban_manage_panel', lang), callback_data: "manage_marzban" }],
            [{ text: t('marzban_add', lang), callback_data: "add_marzban" }],
            [{ text: t('marzban_delete', lang), callback_data: "delete_marzban" }],
            [{ text: t('back', lang), callback_data: "back_settings" }],
          ],
        };
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
        await answerCallbackQuery(cb.id);
      } else if (data.startsWith("manage_panel:")) {
        const name = data.slice(13);
        const text = t('marzban_change', lang, { name });
        const keyboard = {
          inline_keyboard: [
            [{ text: t('marzban_change_name', lang), callback_data: `change_panel_name:${name}` }],
            [{ text: t('marzban_change_id', lang), callback_data: `change_panel_id:${name}` }],
            [{ text: t('marzban_change_url', lang), callback_data: `change_panel_url:${name}` }],
            [{ text: t('marzban_change_username', lang), callback_data: `change_panel_username:${name}` }],
            [{ text: t('marzban_change_password', lang), callback_data: `change_panel_password:${name}` }],
            [{ text: t('back', lang), callback_data: "back_manage_marzban" }],
          ],
        };
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
      } else if (data === "back_manage_marzban") {
        const panels = Object.keys(user.panels || {});
        const text = panels.length === 0 ? t('marzban_no_panels', lang) : t('marzban_select', lang);
        const keyboard = { inline_keyboard: panels.map((name) => [{ text: name, callback_data: `manage_panel:${name}` }]) };
        keyboard.inline_keyboard.push([{ text: t('back', lang), callback_data: "back_marzban" }]);
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
        await answerCallbackQuery(cb.id);
      } else if (data.startsWith("change_panel_")) {
        const parts = data.split(":");
        const fieldStr = parts[0];
        const name = parts[1];
        const field = fieldStr.split("_").pop();
        await setState(userId, `change_panel_${field}`, { name });
        const fieldNames: Record<string, string> = {
          'name': t('marzban_change_name', lang).toLowerCase(),
          'id': t('marzban_change_id', lang).toLowerCase(),
          'url': t('marzban_change_url', lang).toLowerCase(),
          'username': t('marzban_change_username', lang).toLowerCase(),
          'password': t('marzban_change_password', lang).toLowerCase()
        };
        await editMessageText(chatId, msgId, t('marzban_name_prompt', lang).replace('name', fieldNames[field] || field), "Markdown");
      } else if (data === "channels") {
        const text = t('channels_manage', lang);
        const keyboard = {
          inline_keyboard: [
            [{ text: t('channels_manage_channel', lang), callback_data: "manage_channel" }],
            [{ text: t('channels_add', lang), callback_data: "add_channel" }],
            [{ text: t('channels_delete', lang), callback_data: "delete_channel" }],
            [{ text: t('channels_select', lang), callback_data: "select_channel" }],
            [{ text: t('back', lang), callback_data: "back_settings" }],
          ],
        };
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
      } else if (data === "add_channel") {
        await setState(userId, "add_channel");
        await editMessageText(chatId, msgId, t('channels_add_prompt', lang), "Markdown");
      } else if (data === "delete_channel") {
        await setState(userId, "delete_channel");
        await editMessageText(chatId, msgId, t('channels_delete_prompt', lang), "Markdown");
      } else if (data === "select_channel") {
        const channels = user.channels || [];
        if (channels.length === 0) {
          await editMessageText(chatId, msgId, t('channels_no_channels', lang), "Markdown");
          return new Response("ok");
        }
        const text = t('channels_select_prompt', lang);
        const keyboard = { inline_keyboard: channels.map((ch: any) => [{ text: `${ch.username} ${ch.selected ? "✅" : ""}`, callback_data: `toggle_select:${ch.chatId}` }]) };
        keyboard.inline_keyboard.push([{ text: t('back', lang), callback_data: "back_channels" }]);
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
      } else if (data === "back_channels") {
        const text = t('channels_manage', lang);
        const keyboard = {
          inline_keyboard: [
            [{ text: t('channels_manage_channel', lang), callback_data: "manage_channel" }],
            [{ text: t('channels_add', lang), callback_data: "add_channel" }],
            [{ text: t('channels_delete', lang), callback_data: "delete_channel" }],
            [{ text: t('channels_select', lang), callback_data: "select_channel" }],
            [{ text: t('back', lang), callback_data: "back_settings" }],
          ],
        };
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
        await answerCallbackQuery(cb.id);
      } else if (data.startsWith("toggle_select:")) {
        const chatIdStr = data.slice(14);
        const channels = user.channels || [];
        const chIndex = channels.findIndex((c: any) => c.chatId === chatIdStr);
        if (chIndex === -1) return new Response("ok");
        const selectedCount = channels.filter((c: any) => c.selected).length;
        if (channels[chIndex].selected) {
          channels[chIndex].selected = false;
        } else {
          if (selectedCount >= planConfig.maxChannels) {
            await answerCallbackQuery(cb.id, t('channels_max_reached', lang, { count: planConfig.maxChannels }));
            return new Response("ok");
          }
          channels[chIndex].selected = true;
        }
        user.channels = channels;
        await saveUser(user);
        const text = t('channels_select_prompt', lang);
        const keyboard = { inline_keyboard: channels.map((ch: any) => [{ text: `${ch.username} ${ch.selected ? "✅" : ""}`, callback_data: `toggle_select:${ch.chatId}` }]) };
        keyboard.inline_keyboard.push([{ text: t('back', lang), callback_data: "back_channels" }]);
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
        await answerCallbackQuery(cb.id);
      } else if (data === "manage_channel") {
        const channels = user.channels || [];
        if (channels.length === 0) {
          await editMessageText(chatId, msgId, t('channels_no_channels', lang), "Markdown");
          return new Response("ok");
        }
        const text = t('channels_manage_channel', lang);
        const keyboard = { inline_keyboard: channels.map((ch: any) => [{ text: ch.username, callback_data: `manage_ch:${ch.chatId}` }]) };
        keyboard.inline_keyboard.push([{ text: t('back', lang), callback_data: "back_channels" }]);
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
      } else if (data === "back_manage_channel") {
        const channels = user.channels || [];
        const text = channels.length === 0 ? t('channels_no_channels', lang) : t('channels_manage_channel', lang);
        const keyboard = { inline_keyboard: channels.map((ch: any) => [{ text: ch.username, callback_data: `manage_ch:${ch.chatId}` }]) };
        keyboard.inline_keyboard.push([{ text: t('back', lang), callback_data: "back_channels" }]);
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
        await answerCallbackQuery(cb.id);
      } else if (data.startsWith("manage_ch:")) {
        const chatIdStr = data.slice(10);
        const channels = user.channels || [];
        const ch = channels.find((c: any) => c.chatId === chatIdStr);
        if (!ch) return new Response("ok");
        const text = t('channel_settings', lang, { name: ch.username });
        const keyboard = { inline_keyboard: [] as any[] };
        keyboard.inline_keyboard.push([{ text: t('channel_connect_marzban', lang), callback_data: `connect_marzban:${ch.chatId}` }]);
        keyboard.inline_keyboard.push([{ text: t('channel_edit_user', lang), callback_data: `edit_marzban_user:${ch.chatId}` }]);
        const timeText = planConfig.editTime ? t('channel_edit_time', lang) : `🔒${t('channel_edit_time', lang)}🔒`;
        keyboard.inline_keyboard.push([{ text: timeText, callback_data: `edit_time:${ch.chatId}` }]);
        const postText = planConfig.editPost ? t('channel_edit_post', lang) : `🔒${t('channel_edit_post', lang)}🔒`;
        keyboard.inline_keyboard.push([{ text: postText, callback_data: `edit_post:${ch.chatId}` }]);
        const reactionText = planConfig.editReaction ? t('channel_edit_reaction', lang) : `🔒${t('channel_edit_reaction', lang)}🔒`;
        keyboard.inline_keyboard.push([{ text: reactionText, callback_data: `edit_reaction:${ch.chatId}` }]);
        keyboard.inline_keyboard.push([{ text: t('back', lang), callback_data: "back_manage_channel" }]);
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
      } else if (data.startsWith("edit_marzban_user:")) {
        const chatIdStr = data.slice(18);
        const channels = user.channels || [];
        const ch = channels.find((c: any) => c.chatId === chatIdStr);
        if (!ch) return new Response("ok");
        const text = t('edit_user_settings', lang, { name: ch.username });
        const keyboard = { inline_keyboard: [] as any[] };
        keyboard.inline_keyboard.push([{ text: t('edit_protocols', lang), callback_data: `edit_protocols:${ch.chatId}` }]);
        keyboard.inline_keyboard.push([{ text: t('edit_traffic', lang), callback_data: `edit_traffic:${ch.chatId}` }]);
        keyboard.inline_keyboard.push([{ text: `${t('edit_delete_before', lang)} ${ch.delete_before_posting ? "✅" : ""}`, callback_data: `toggle_delete_before:${ch.chatId}` }]);
        keyboard.inline_keyboard.push([{ text: t('back', lang), callback_data: `manage_ch:${ch.chatId}` }]);
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
      } else if (data.startsWith("edit_protocols:")) {
        const chatIdStr = data.slice(15);
        const channels = user.channels || [];
        const ch = channels.find((c: any) => c.chatId === chatIdStr);
        if (!ch) return new Response("ok");
        const protocols = ch.protocols || ['vless', 'shadowsocks'];
        const text = t('protocols_select', lang);
        const keyboard = { inline_keyboard: [] as any[] };
        keyboard.inline_keyboard.push([{ text: `${t('protocol_vmess', lang)} ${protocols.includes('vmess') ? "✅" : ""}`, callback_data: `toggle_protocol:vmess:${ch.chatId}` }]);
        keyboard.inline_keyboard.push([{ text: `${t('protocol_vless', lang)} ${protocols.includes('vless') ? "✅" : ""}`, callback_data: `toggle_protocol:vless:${ch.chatId}` }]);
        keyboard.inline_keyboard.push([{ text: `${t('protocol_trojan', lang)} ${protocols.includes('trojan') ? "✅" : ""}`, callback_data: `toggle_protocol:trojan:${ch.chatId}` }]);
        keyboard.inline_keyboard.push([{ text: `${t('protocol_shadowsocks', lang)} ${protocols.includes('shadowsocks') ? "✅" : ""}`, callback_data: `toggle_protocol:shadowsocks:${ch.chatId}` }]);
        keyboard.inline_keyboard.push([{ text: t('back', lang), callback_data: `edit_marzban_user:${ch.chatId}` }]);
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
      } else if (data.startsWith("toggle_protocol:")) {
        const parts = data.split(":");
        const proto = parts[1];
        const chatIdStr = parts[2];
        const channels = user.channels || [];
        const chIndex = channels.findIndex((c: any) => c.chatId === chatIdStr);
        if (chIndex === -1) return new Response("ok");
        let protocols = channels[chIndex].protocols || ['vless', 'shadowsocks'];
        if (protocols.includes(proto)) {
          protocols = protocols.filter((p: string) => p !== proto);
        } else {
          protocols.push(proto);
        }
        channels[chIndex].protocols = protocols;
        user.channels = channels;
        await saveUser(user);
        await answerCallbackQuery(cb.id);
        const text = t('protocols_select', lang);
        const keyboard = { inline_keyboard: [] as any[] };
        keyboard.inline_keyboard.push([{ text: `${t('protocol_vmess', lang)} ${protocols.includes('vmess') ? "✅" : ""}`, callback_data: `toggle_protocol:vmess:${chatIdStr}` }]);
        keyboard.inline_keyboard.push([{ text: `${t('protocol_vless', lang)} ${protocols.includes('vless') ? "✅" : ""}`, callback_data: `toggle_protocol:vless:${chatIdStr}` }]);
        keyboard.inline_keyboard.push([{ text: `${t('protocol_trojan', lang)} ${protocols.includes('trojan') ? "✅" : ""}`, callback_data: `toggle_protocol:trojan:${chatIdStr}` }]);
        keyboard.inline_keyboard.push([{ text: `${t('protocol_shadowsocks', lang)} ${protocols.includes('shadowsocks') ? "✅" : ""}`, callback_data: `toggle_protocol:shadowsocks:${chatIdStr}` }]);
        keyboard.inline_keyboard.push([{ text: t('back', lang), callback_data: `edit_marzban_user:${chatIdStr}` }]);
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
      } else if (data.startsWith("edit_traffic:")) {
        const chatIdStr = data.slice(13);
        await setState(userId, "edit_traffic_limit", { chatId: chatIdStr });
        await editMessageText(chatId, msgId, t('traffic_prompt', lang), "Markdown");
      } else if (data.startsWith("toggle_delete_before:")) {
        const chatIdStr = data.slice(21);
        const channels = user.channels || [];
        const chIndex = channels.findIndex((c: any) => c.chatId === chatIdStr);
        if (chIndex === -1) return new Response("ok");
        channels[chIndex].delete_before_posting = !channels[chIndex].delete_before_posting;
        user.channels = channels;
        await saveUser(user);
        await answerCallbackQuery(cb.id);
        const ch = channels[chIndex];
        const text = t('edit_user_settings', lang, { name: ch.username });
        const keyboard = { inline_keyboard: [] as any[] };
        keyboard.inline_keyboard.push([{ text: t('edit_protocols', lang), callback_data: `edit_protocols:${ch.chatId}` }]);
        keyboard.inline_keyboard.push([{ text: t('edit_traffic', lang), callback_data: `edit_traffic:${ch.chatId}` }]);
        keyboard.inline_keyboard.push([{ text: `${t('edit_delete_before', lang)} ${ch.delete_before_posting ? "✅" : ""}`, callback_data: `toggle_delete_before:${ch.chatId}` }]);
        keyboard.inline_keyboard.push([{ text: t('back', lang), callback_data: `manage_ch:${ch.chatId}` }]);
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
      } else if (data.startsWith("connect_marzban:")) {
        const chatIdStr = data.slice(16);
        const channels = user.channels || [];
        const ch = channels.find((c: any) => c.chatId === chatIdStr);
        if (!ch) return new Response("ok");
        const text = t('connect_marzban_select', lang);
        const keyboard = { inline_keyboard: [] as any[] };
        if (planConfig.integrateOur) {
          keyboard.inline_keyboard.push([{ text: `${t('connect_our_marzban', lang)} ${ch.marzban === "our_marzban" ? "✅" : ""}`, callback_data: `connect_our:${ch.chatId}` }]);
        } else {
          keyboard.inline_keyboard.push([{ text: `🔒${t('connect_our_marzban', lang)}🔒`, callback_data: "locked" }]);
        }
        const panels = Object.entries(user.panels || {});
        panels.forEach(([name]) => {
          keyboard.inline_keyboard.push([{ text: `${name} ${ch.marzban === name ? "✅" : ""}`, callback_data: `connect_panel:${ch.chatId}:${name}` }]);
        });
        keyboard.inline_keyboard.push([{ text: t('back', lang), callback_data: `manage_ch:${ch.chatId}` }]);
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
      } else if (data.startsWith("connect_our:")) {
        if (!planConfig.integrateOur) {
          await answerCallbackQuery(cb.id, t('channel_locked', lang));
          return new Response("ok");
        }
        const chatIdStr = data.slice(12);
        const channels = user.channels || [];
        const chIndex = channels.findIndex((c: any) => c.chatId === chatIdStr);
        if (chIndex === -1) return new Response("ok");
        channels[chIndex].marzban = "our_marzban";
        user.channels = channels;
        await saveUser(user);
        await answerCallbackQuery(cb.id, t('connect_connected', lang, { name: t('connect_our_marzban', lang) }));
        const text = t('connect_marzban_select', lang);
        const keyboard = { inline_keyboard: [] as any[] };
        keyboard.inline_keyboard.push([{ text: `${t('connect_our_marzban', lang)} ✅`, callback_data: `connect_our:${chatIdStr}` }]);
        const panels = Object.entries(user.panels || {});
        panels.forEach(([name]) => {
          keyboard.inline_keyboard.push([{ text: `${name} `, callback_data: `connect_panel:${chatIdStr}:${name}` }]);
        });
        keyboard.inline_keyboard.push([{ text: t('back', lang), callback_data: `manage_ch:${chatIdStr}` }]);
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
        await answerCallbackQuery(cb.id, t('connect_connected', lang, { name }));
        const text = t('connect_marzban_select', lang);
        const keyboard = { inline_keyboard: [] as any[] };
        if (planConfig.integrateOur) {
          keyboard.inline_keyboard.push([{ text: `${t('connect_our_marzban', lang)} `, callback_data: `connect_our:${chatIdStr}` }]);
        } else {
          keyboard.inline_keyboard.push([{ text: `🔒${t('connect_our_marzban', lang)}🔒`, callback_data: "locked" }]);
        }
        const panels = Object.entries(user.panels || {});
        panels.forEach(([pname]) => {
          keyboard.inline_keyboard.push([{ text: `${pname} ${pname === name ? "✅" : ""}`, callback_data: `connect_panel:${chatIdStr}:${pname}` }]);
        });
        keyboard.inline_keyboard.push([{ text: t('back', lang), callback_data: `manage_ch:${chatIdStr}` }]);
        await editMessageText(chatId, msgId, text, "Markdown", keyboard);
      } else if (data.startsWith("edit_time:")) {
        if (!planConfig.editTime) {
          await answerCallbackQuery(cb.id, t('channel_locked', lang));
          return new Response("ok");
        }
        const chatIdStr = data.slice(10);
        await setState(userId, "edit_time", { chatId: chatIdStr });
        const text = t('channel_time_prompt', lang);
        await editMessageText(chatId, msgId, text);
      } else if (data.startsWith("edit_post:")) {
        if (!planConfig.editPost) {
          await answerCallbackQuery(cb.id, t('channel_locked', lang));
          return new Response("ok");
        }
        const chatIdStr = data.slice(10);
        await setState(userId, "edit_post", { chatId: chatIdStr });
        await editMessageText(chatId, msgId, t('channel_post_prompt', lang));
      } else if (data.startsWith("edit_reaction:")) {
        if (!planConfig.editReaction) {
          await answerCallbackQuery(cb.id, t('channel_locked', lang));
          return new Response("ok");
        }
        const chatIdStr = data.slice(14);
        await setState(userId, "edit_reaction", { chatId: chatIdStr });
        await editMessageText(chatId, msgId, t('channel_reaction_prompt', lang));
      } else if (data === "locked") {
        await answerCallbackQuery(cb.id, t('channel_locked', lang));
      } else if (data.startsWith("admin_")) {
        if (username !== "Masakoff") {
          await answerCallbackQuery(cb.id, t('admin_not_admin', lang));
          return new Response("ok");
        }
        if (data === "admin_show_profile") {
          await setState(userId, "admin_show_profile");
          await editMessageText(chatId, msgId, t('admin_profile_prompt', lang));
        } else if (data === "admin_modify_balance") {
          await setState(userId, "admin_modify_balance_id");
          await editMessageText(chatId, msgId, t('admin_balance_prompt', lang));
        } else if (data === "admin_modify_plans") {
          await setState(userId, "admin_modify_plans_id");
          await editMessageText(chatId, msgId, t('admin_plans_prompt', lang));
        } else if (data === "admin_our_marzban") {
          await showOurMarzbanManagement(chatId, lang, msgId);
        } else if (data === "admin_change_our_url") {
          await setState(userId, "admin_change_our_url");
          await editMessageText(chatId, msgId, t('admin_marzban_url_prompt', lang));
        } else if (data === "admin_change_our_username") {
          await setState(userId, "admin_change_our_username");
          await editMessageText(chatId, msgId, t('admin_marzban_username_prompt', lang));
        } else if (data === "admin_change_our_password") {
          await setState(userId, "admin_change_our_password");
          await editMessageText(chatId, msgId, t('admin_marzban_password_prompt', lang));
        } else if (data === "admin_back_to_panel") {
          await showAdminPanel(chatId, lang);
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
    
    // Check if user needs language selection
    if (!user.language) {
      await showLanguageSelection(chatId);
      return new Response("ok");
    }
    
    const lang = user.language || 'en';
    await saveUser(user);
    const state = await getState(userId);
    
    if (state) {
      if (state.state === "top_up_amount") {
        const amount = parseInt(text);
        if (isNaN(amount) || amount <= 0) {
          await sendMessage(chatId, t('top_up_failed', lang), "Markdown");
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
          await sendMessage(chatId, t('marzban_duplicate', lang), "Markdown");
          await clearState(userId);
          return new Response("ok");
        }
        user.panels[name] = { sub_prefix, url, username, password: text };
        await saveUser(user);
        await sendMessage(chatId, t('marzban_added', lang, { name }), "Markdown");
        await clearState(userId);
      } else if (state.state === "delete_marzban") {
        user.panels = user.panels || {};
        if (!user.panels[text]) {
          await sendMessage(chatId, t('marzban_not_found', lang), "Markdown");
          await clearState(userId);
        } else {
          delete user.panels[text];
          await saveUser(user);
          await sendMessage(chatId, t('marzban_deleted', lang, { name: text }), "Markdown");
          await clearState(userId);
        }
      } else if (state.state.startsWith("change_panel_")) {
        const field = state.state.slice(13);
        const { name } = state.data;
        user.panels = user.panels || {};
        if (!user.panels[name]) {
          await sendMessage(chatId, t('marzban_not_found', lang), "Markdown");
          await clearState(userId);
          return new Response("ok");
        }
        if (field === "name") {
          if (user.panels[text]) {
            await sendMessage(chatId, t('marzban_duplicate', lang), "Markdown");
            await clearState(userId);
            return new Response("ok");
          }
          user.panels[text] = user.panels[name];
          delete user.panels[name];
          await sendMessage(chatId, t('admin_marzban_updated', lang, { field: "Name" }), "Markdown");
        } else if (field === "id") {
          user.panels[name].sub_prefix = text;
          await sendMessage(chatId, t('admin_marzban_updated', lang, { field: "ID" }), "Markdown");
        } else if (field === "url") {
          user.panels[name].url = text;
          await sendMessage(chatId, t('admin_marzban_updated', lang, { field: "URL" }), "Markdown");
        } else if (field === "username") {
          user.panels[name].username = text;
          await sendMessage(chatId, t('admin_marzban_updated', lang, { field: "Username" }), "Markdown");
        } else if (field === "password") {
          user.panels[name].password = text;
          await sendMessage(chatId, t('admin_marzban_updated', lang, { field: "Password" }), "Markdown");
        }
        await saveUser(user);
        await clearState(userId);
      } else if (state.state === "add_channel") {
        let username = text.startsWith("@") ? text : `@${text}`;
        const chatInfo = await getChat(username);
        if (!chatInfo) {
          await sendMessage(chatId, t('channels_not_found', lang), "Markdown");
          await clearState(userId);
          return new Response("ok");
        }
        const chChatId = chatInfo.id.toString();
        const botIdLocal = await getBotId();
        if (!await isAdmin(chChatId, userId) || !await isAdmin(chChatId, botIdLocal)) {
          await sendMessage(chatId, t('channels_not_admin', lang), "Markdown");
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
          await sendMessage(chatId, t('channels_already_added', lang), "Markdown");
          await clearState(userId);
          return new Response("ok");
        } else {
          const defaultTemplate = "<happcode>";
          user.channels.push({
            chatId: chChatId,
            username,
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
          });
          await saveUser(user);
          await sendMessage(chatId, t('channels_added', lang, { name: username }), "Markdown");
          await clearState(userId);
        }
      } else if (state.state === "delete_channel") {
        let username = text.startsWith("@") ? text : `@${text}`;
        user.channels = user.channels || [];
        const ch = user.channels.find((c: any) => c.username === username);
        if (!ch) {
          await sendMessage(chatId, t('channels_not_found', lang), "Markdown");
          await clearState(userId);
        } else {
          user.channels = user.channels.filter((c: any) => c.username !== username);
          await kv.delete(["channel_owners", ch.chatId]);
          await saveUser(user);
          await sendMessage(chatId, t('channels_deleted', lang, { name: username }), "Markdown");
          await clearState(userId);
        }
      } else if (state.state === "edit_time") {
        const times = text.split(",").map((t) => t.trim()).map((t) => {
          const [h, m] = t.split(":").map(Number);
          return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        });
        const valid = times.every((t) => /^\d{2}:\d{2}$/.test(t));
        if (!valid) {
          await sendMessage(chatId, t('channel_time_invalid', lang), "Markdown");
          await clearState(userId);
          return new Response("ok");
        }
        const mins = times.map((t) => {
          const [h, m] = t.split(":").map(Number);
          return h * 60 + m;
        }).sort((a, b) => a - b);
        for (let i = 1; i < mins.length; i++) {
          if (mins[i] - mins[i - 1] < 60) {
            await sendMessage(chatId, t('channel_time_too_close', lang), "Markdown");
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
          await sendMessage(chatId, t('channel_time_updated', lang), "Markdown");
          await clearState(userId);
        } else {
          await clearState(userId);
        }
      } else if (state.state === "edit_post") {
        if (!text.includes("<happcode>")) {
          await sendMessage(chatId, t('channel_post_no_code', lang), "Markdown");
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
          await sendMessage(chatId, t('channel_post_updated', lang), "Markdown");
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
          await sendMessage(chatId, t('channel_reaction_updated', lang), "Markdown");
          await clearState(userId);
        } else {
          await clearState(userId);
        }
      } else if (state.state === "edit_traffic_limit") {
        const limit = parseFloat(text);
        if (isNaN(limit) || limit < 0) {
          await sendMessage(chatId, t('traffic_invalid', lang), "Markdown");
          await clearState(userId);
          return new Response("ok");
        }
        const channels = user.channels || [];
        const chIndex = channels.findIndex((c: any) => c.chatId === state.data.chatId);
        if (chIndex !== -1) {
          channels[chIndex].traffic_gb = limit;
          user.channels = channels;
          await saveUser(user);
          await sendMessage(chatId, t('traffic_updated', lang), "Markdown");
          await clearState(userId);
        } else {
          await clearState(userId);
        }
      } else if (state.state.startsWith("admin_")) {
        if (username !== "Masakoff") {
          await sendMessage(chatId, t('admin_not_admin', lang), "Markdown");
          await clearState(userId);
          return new Response("ok");
        }
        if (state.state === "admin_show_profile") {
          const targetId = parseInt(text);
          if (isNaN(targetId)) {
            await sendMessage(chatId, t('admin_user_not_found', lang), "Markdown");
            await clearState(userId);
            return new Response("ok");
          }
          const targetUser = await getUser(targetId);
          if (!targetUser) {
            await sendMessage(chatId, t('admin_user_not_found', lang), "Markdown");
            await clearState(userId);
            return new Response("ok");
          }
          let expiryStr = t('pricing_expiry_never', lang);
          if (targetUser.expiry) {
            const dt = new Date(targetUser.expiry);
            const utc5 = new Date(dt.getTime() + 5 * 3600 * 1000);
            expiryStr = utc5.toISOString().replace('T', ' ').slice(0, 19) + ' UTC+5';
          }
          const profileText = t('admin_user_profile', lang, {
            id: targetUser.id,
            name: targetUser.first_name,
            balance: targetUser.balance || 0,
            activePlan: targetUser.activePlan,
            subscribedPlan: targetUser.subscribedPlan,
            expiry: expiryStr,
            panels: Object.keys(targetUser.panels || {}).join(", ") || "None",
            channels: targetUser.channels?.map((c: any) => c.username).join(", ") || "None"
          });
          await sendMessage(chatId, profileText, "Markdown");
          await clearState(userId);
        } else if (state.state === "admin_modify_balance_id") {
          const targetId = parseInt(text);
          if (isNaN(targetId)) {
            await sendMessage(chatId, t('admin_user_not_found', lang), "Markdown");
            await clearState(userId);
            return new Response("ok");
          }
          const targetUser = await getUser(targetId);
          if (!targetUser) {
            await sendMessage(chatId, t('admin_user_not_found', lang), "Markdown");
            await clearState(userId);
            return new Response("ok");
          }
          await setState(userId, "admin_modify_balance_amount", { targetId });
          await sendMessage(chatId, t('admin_balance_amount', lang));
        } else if (state.state === "admin_modify_balance_amount") {
          const amount = parseInt(text);
          if (isNaN(amount)) {
            await sendMessage(chatId, t('top_up_failed', lang), "Markdown");
            await clearState(userId);
            return new Response("ok");
          }
          const targetUser = await getUser(state.data.targetId);
          targetUser.balance = (targetUser.balance || 0) + amount;
          await saveUser(targetUser);
          await sendMessage(chatId, t('admin_balance_updated', lang, { balance: targetUser.balance }), "Markdown");
          await clearState(userId);
        } else if (state.state === "admin_modify_plans_id") {
          const targetId = parseInt(text);
          if (isNaN(targetId)) {
            await sendMessage(chatId, t('admin_user_not_found', lang), "Markdown");
            await clearState(userId);
            return new Response("ok");
          }
          const targetUser = await getUser(targetId);
          if (!targetUser) {
            await sendMessage(chatId, t('admin_user_not_found', lang), "Markdown");
            await clearState(userId);
            return new Response("ok");
          }
          let expiryStr = t('pricing_expiry_never', lang);
          if (targetUser.expiry) {
            const dt = new Date(targetUser.expiry);
            const utc5 = new Date(dt.getTime() + 5 * 3600 * 1000);
            expiryStr = utc5.toLocaleString('en-GB', { timeZone: 'UTC' }).replace(',', '');
          }
          const plansText = `User ${targetUser.id} - ${targetUser.first_name}\nActive Plan: ${targetUser.activePlan}\nSubscribed Plan: ${targetUser.subscribedPlan}\nExpiry: ${expiryStr} (UTC+5)`;
          await sendMessage(chatId, plansText);
          await setState(userId, "admin_modify_plans_expiry", { targetId });
          await sendMessage(chatId, t('admin_plans_expiry', lang));
        } else if (state.state === "admin_modify_plans_expiry") {
          const targetUser = await getUser(state.data.targetId);
          if (text.toLowerCase() === "never") {
            targetUser.expiry = null;
          } else {
            const parts = text.split(" ");
            if (parts.length !== 2) {
              await sendMessage(chatId, t('channel_time_invalid', lang), "Markdown");
              await clearState(userId);
              return new Response("ok");
            }
            const dateParts = parts[0].split(".");
            if (dateParts.length !== 3) {
              await sendMessage(chatId, t('channel_time_invalid', lang), "Markdown");
              await clearState(userId);
              return new Response("ok");
            }
            const timeParts = parts[1].split(":");
            if (timeParts.length !== 2) {
              await sendMessage(chatId, t('channel_time_invalid', lang), "Markdown");
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
              await sendMessage(chatId, t('channel_time_invalid', lang), "Markdown");
              await clearState(userId);
              return new Response("ok");
            }
            const expiry = utc5Date.getTime() - 5 * 3600 * 1000;
            targetUser.expiry = expiry;
          }
          await saveUser(targetUser);
          await sendMessage(chatId, t('admin_plans_updated', lang), "Markdown");
          await clearState(userId);
        } else if (state.state === "admin_change_our_url") {
          const our = await getOurMarzban();
          our.url = text;
          await saveOurMarzban(our);
          await sendMessage(chatId, t('admin_marzban_updated', lang, { field: "URL" }), "Markdown");
          await clearState(userId);
        } else if (state.state === "admin_change_our_username") {
          const our = await getOurMarzban();
          our.username = text;
          await saveOurMarzban(our);
          await sendMessage(chatId, t('admin_marzban_updated', lang, { field: "Username" }), "Markdown");
          await clearState(userId);
        } else if (state.state === "admin_change_our_password") {
          const our = await getOurMarzban();
          our.password = text;
          await saveOurMarzban(our);
          await sendMessage(chatId, t('admin_marzban_updated', lang, { field: "Password" }), "Markdown");
          await clearState(userId);
        }
      }
      return new Response("ok");
    }
    if (text === "/start") {
      await showMenu(chatId, user);
    } else if (text === "/adminpanel") {
      if (username === "Masakoff") {
        await showAdminPanel(chatId, lang);
      } else {
        await sendMessage(chatId, t('admin_not_admin', lang), "Markdown");
      }
    } else if (text === "/language") {
      await showLanguageSelection(chatId);
    }
  } catch (err) {
    console.error("Error handling update:", err);
  }
  return new Response("ok");
});