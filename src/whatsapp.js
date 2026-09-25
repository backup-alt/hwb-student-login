// WhatsApp click-to-chat requires the country code and number without punctuation.
export const WHATSAPP_BOT_NUMBER = "919360733079";
export const whatsappChatUrl = (message = "Hi") => `https://wa.me/${WHATSAPP_BOT_NUMBER}?text=${encodeURIComponent(message)}`;
export const whatsappAppUrl = (message = "Hi") => `whatsapp://send?phone=${WHATSAPP_BOT_NUMBER}&text=${encodeURIComponent(message)}`;
export const WHATSAPP_CHAT_URL = whatsappChatUrl();
export const isMobileDevice = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
export const preferredWhatsAppUrl = (message = "Hi") => isMobileDevice() ? whatsappAppUrl(message) : whatsappChatUrl(message);
