(function() {
  // Find the script tag on the page
  const scriptTag = document.querySelector('script[src="https://intaj.nabih.tech/widget.js"]');
  if (!scriptTag) {
    console.error("Intaj AI Widget: Could not find script tag. Make sure the src is correct.");
    return;
  }

  // Get the agent ID from the data attribute
  const agentId = scriptTag.getAttribute('data-agent-id');
  if (!agentId) {
    console.error("Intaj AI Widget: 'data-agent-id' attribute is missing from the script tag.");
    return;
  }

  // Create a container for the widget
  const widgetContainer = document.createElement('div');
  widgetContainer.id = 'intaj-ai-widget-container';
  widgetContainer.style.position = 'fixed';
  widgetContainer.style.bottom = '20px';
  widgetContainer.style.right = '20px';
  widgetContainer.style.zIndex = '999999';

  // Create the iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'intaj-ai-widget-iframe';
  iframe.src = `https://intaj.nabih.tech/chat-widget/${agentId}`;
  iframe.style.border = 'none';
  iframe.style.width = '400px';
  iframe.style.height = '600px';
  iframe.style.borderRadius = '10px';
  iframe.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';

  // Append the iframe to the container, and the container to the body
  widgetContainer.appendChild(iframe);
  document.body.appendChild(widgetContainer);

})();
