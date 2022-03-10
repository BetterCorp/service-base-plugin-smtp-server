import { MailgunRegion } from './mailgunClient';

export interface MyPluginConfig {
  region: MailgunRegion | null;
  templatesPath: string;
  mailgunDefaults?: {
    domain: string;
    apiKey: string;
  };
}

export default (pluginName: string, existingPluginConfig: any): MyPluginConfig => {
  let newConfig: MyPluginConfig = {
    region: null,
    templatesPath: require('path').join(process.cwd(), './node_modules/@bettercorp/service-base-plugin-smtp-server/content/html-templates')
  };
  return newConfig;
};