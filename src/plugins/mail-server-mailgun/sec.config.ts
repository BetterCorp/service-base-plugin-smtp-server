import { MailgunRegion } from './mailgunClient';

export interface MyPluginConfig {
  region: MailgunRegion | null;
}

export default (pluginName: string, existingPluginConfig: any): MyPluginConfig => {
  let newConfig: MyPluginConfig = {
    region: null
  };
  return newConfig;
};