// test-whatsapp.cjs - VERSÃO CORRIGIDA
require('dotenv').config();

const CALLMEBOT_APIKEY = "7758207"; // SUA API KEY ATUAL
const CALLMEBOT_PHONE = "+573208547840"; // SEU NÚMERO ATUAL

async function testWhatsApp() {
  try {
    const message = "🔔 TESTE DO SISTEMA ESTUFA\n✅ Notificações funcionando!\n🕒 " + new Date().toLocaleString();
    
    const url = `https://api.callmebot.com/whatsapp.php?phone=${CALLMEBOT_PHONE}&text=${encodeURIComponent(message)}&apikey=${CALLMEBOT_APIKEY}`;
    
    console.log('📱 Enviando teste WhatsApp...');
    console.log('📞 Para:', CALLMEBOT_PHONE);
    console.log('💬 Mensagem:', message);
    
    const response = await fetch(url);
    const result = await response.text();
    
    console.log('✅ Resposta do CallMeBot:', result);
    console.log('📲 Verifique seu WhatsApp!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testWhatsApp();