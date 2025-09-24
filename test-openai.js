const https = require('https');

const apiKey = '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';

const data = JSON.stringify({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Привет' }],
  max_tokens: 10
});

const options = {
  hostname: 'api.openai.com',
  port: 443,
  path: '/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'Content-Length': data.length
  }
};

console.log('Проверяю OpenAI API ключ...');

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('Статус:', res.statusCode);
    console.log('Ответ:', JSON.stringify(JSON.parse(responseData), null, 2));
    
    if (res.statusCode === 200) {
      console.log('✅ API ключ работает!');
    } else {
      console.log('❌ API ключ недействителен');
    }
  });
});

req.on('error', (error) => {
  console.error('Ошибка запроса:', error);
});

req.write(data);
req.end();