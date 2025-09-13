'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Check } from 'lucide-react';

interface WidgetEmbedCodeProps {
  agentId: string;
}

export default function WidgetEmbedCode({ agentId }: WidgetEmbedCodeProps) {
  const [copied, setCopied] = useState(false);

  const embedCode = `<script
  src="https://intaj.nabih.tech/widget.js"
  data-agent-id="${agentId}"
  defer>
</script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle>Embed on Your Website</CardTitle>
        <CardDescription>
          Copy and paste this snippet into the {"<head>"} or {"<body>"} of your website's HTML.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative bg-gray-900 rounded-md p-4">
          <pre className="text-sm text-gray-300 overflow-x-auto">
            <code>{embedCode}</code>
          </pre>
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-2 right-2"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

