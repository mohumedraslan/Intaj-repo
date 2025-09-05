// src/pages/widget.js
// Embeddable widget loader (served as /widget.js)
export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`(function(){
    var script = document.currentScript;
    var chatbotId = script && script.getAttribute('data-chatbot-id') || 'demo';
    var iframe = document.createElement('iframe');
    iframe.src = 'https://intaj.nabih.tech/widget/' + chatbotId;
    iframe.style.position = 'fixed';
    iframe.style.bottom = '24px';
    iframe.style.right = '24px';
    iframe.style.width = '350px';
    iframe.style.height = '500px';
    iframe.style.border = '1px solid #ccc';
    iframe.style.borderRadius = '12px';
    iframe.style.zIndex = '9999';
    document.body.appendChild(iframe);
  })();`);
}
