import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface ApiConfigSectionProps {
  provider: ModelProvider;
  onFieldChange: (field: string, value: any) => void;
}

export default function ApiConfigSection({ provider, onFieldChange }: ApiConfigSectionProps) {
  const [showApiKey, setShowApiKey] = useState(false);

  const providerName = provider.name;

  return (
    <div className="space-y-4 rounded-lg bg-muted/80 p-4">
      <div className="space-y-2">
        <div>
          <Label htmlFor="apiKey" className="text-sm dark:text-neutral-200">
            API Key
          </Label>
          {provider.apiKeyHelpUrl && (
            <p className="mt-2 text-xs dark:text-neutral-400">
              The {providerName} API uses API keys for authentication. Visit your{" "}
              <a
                href={provider.apiKeyHelpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 underline dark:text-blue-400"
              >
                API Keys
              </a>{" "}
              page to retrieve the API key you'll use in your requests.
            </p>
          )}
        </div>
        <div className="relative">
          <Input
            id="apiKey"
            type={showApiKey ? "text" : "password"}
            value={provider?.apiKey ?? ""}
            onChange={(e) => onFieldChange("apiKey", e.target.value)}
            placeholder="Enter your API key..."
            className="h-8 pr-10"
          />
          <Button
            variant="ghost"
            size="icon"
            className="-translate-y-1/2 absolute top-1/2 right-2 h-6 w-6"
            onClick={() => setShowApiKey(!showApiKey)}
          >
            {!showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <Label htmlFor="baseUrl" className="text-sm dark:text-neutral-200">
            Base URL
          </Label>
          {provider.baseUrlHelpUrl && (
            <p className="mt-2 text-xs dark:text-neutral-400">
              The base endpoint to use. See the{" "}
              <a
                href={provider.baseUrlHelpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 underline dark:text-blue-400"
              >
                {providerName} API documentation
              </a>{" "}
              for more information.
            </p>
          )}
        </div>
        <Input
          id="baseUrl"
          type="text"
          className="h-8"
          value={provider?.baseUrl ?? ""}
          onChange={(e) => onFieldChange("baseUrl", e.target.value)}
          placeholder="https://api.example.com/v1"
        />
      </div>
    </div>
  );
}
