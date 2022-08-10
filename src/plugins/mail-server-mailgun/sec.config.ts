import { MailgunRegion } from "./mailgunClient";

export interface MailgunDefaults {
  domain: string;
  apiKey: string;
}
export interface MyPluginConfig {
  region: MailgunRegion | null; // Region: EU / US
  templatesPath: string; // Templates Path: Path on disk for the template files
  mailgunDefaults?: MailgunDefaults; // Mailgun Defaults: Optional for default mailgun sender *depreciated*
}

export default (
  pluginName: string,
  existingPluginConfig: any
): MyPluginConfig => {
  let newConfig: MyPluginConfig = {
    region: null,
    templatesPath: require("path").join(
      process.cwd(),
      "./node_modules/@bettercorp/service-base-plugin-smtp-server/content/html-templates"
    ),
  };
  return newConfig;
};
