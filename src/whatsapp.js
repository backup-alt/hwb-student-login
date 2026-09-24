// WhatsApp click-to-chat requires the country code and number without punctuation.
export const WHATSAPP_BOT_NUMBER = "919360733079";
const greeting = encodeURIComponent("Hi");
export const WHATSAPP_CHAT_URL = `https://wa.me/${WHATSAPP_BOT_NUMBER}?text=${greeting}`;
export const WHATSAPP_APP_URL = `whatsapp://send?phone=${WHATSAPP_BOT_NUMBER}&text=${greeting}`;
export const isMobileDevice = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
export const preferredWhatsAppUrl = () => isMobileDevice() ? WHATSAPP_APP_URL : WHATSAPP_CHAT_URL;
