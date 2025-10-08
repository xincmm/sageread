/**
 * The model object structure
 */
type Model = {
  id: string;
  name?: string;
  active?: boolean;
  description?: string;
  capabilities?: string[];
  manual?: boolean;
};

/**
 * The provider object structure
 */
type ModelProvider = {
  name: string;
  active: boolean;
  provider: string;
  exploreModelsUrl?: string;
  apiKey?: string;
  apiKeyHelpUrl?: string;
  baseUrl?: string;
  baseUrlHelpUrl?: string;
  models: Model[];
};
