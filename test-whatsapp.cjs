// test-whatsapp.cjs - NÃO PRECISA DE INSTALAÇÃO
require('dotenv').config();
const https = require('https');

console.log('🧪 Iniciando teste do WhatsApp...');

const CALLMEBOT_APIKEY = process.env.CALLMEBOT_APIKEY;
const PHONE_NUMBER = process.env.CALLMEBOT_PHONE;

console.log('📞 Número:', PHONE_NUMBER);
console.log('🔑 API Key:', CALLMEBOT_APIKEY ? '***' + CALLMEBOT_APIKEY.slice(-4) : 'NÃO ENCONTRADA');

if (!CALLMEBOT_APIKEY || !PHONE_NUMBER) {
  console.log('❌ ERRO: Credenciais não encontradas no .env');
  console.log('📍 Verifique se seu arquivo .env tem:');
  console.log('   CALLMEBOT_APIKEY=sua_chave');
  console.log('   CALLMEBOT_PHONE=+seu_numero');
  process.exit(1);
}

const message = "✅ TESTE: Esta é uma mensagem de teste do sistema!";
const url = `https://api.callmebot.com/whatsapp.php?phone=${PHONE_NUMBER}&text=${encodeURIComponent(message)}&apikey=${CALLMEBOT_APIKEY}`;

console.log('📤 Enviando mensagem...');
console.log('🔗 URL:', url.substring(0, 80) + '...');

// Faz a requisição SEM bibliotecas externas
const req = https.get(url, (res) => {
  console.log('✅ RESPOSTA RECEBIDA!');
  console.log('Status:', res.statusCode);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Resposta completa:', data);
    console.log('📱 Se funcionou, você deve receber a mensagem no WhatsApp!');
  });
});

req.on('error', (error) => {
  console.log('❌ ERRO NA REQUISIÇÃO:');
  console.log('Mensagem:', error.message);
});

req.setTimeout(30000, () => {
  console.log('❌ TIMEOUT: A requisição demorou mais de 30 segundos');
  req.destroy();
});