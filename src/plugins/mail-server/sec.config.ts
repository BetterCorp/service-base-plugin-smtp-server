import Mail = require('nodemailer/lib/mailer');
import SendmailTransport = require('nodemailer/lib/sendmail-transport');

export interface MyPluginConfig {
  transport: SendmailTransport | SendmailTransport.Options;
  defaults?: SendmailTransport.Options;
  //templatesPath: string;
}

export interface IMailTemplateRequest {
  mail: Mail.Options;
  data: any;
}

export default (pluginName: string, existingPluginConfig: any): MyPluginConfig => {
  let newConfig: MyPluginConfig = {
    transport: {
      sendmail: true,
      newline: 'unix',
      path: '/usr/sbin/sendmail'
    },
    //templatesPath: require('path').join(process.cwd(), './node_modules/@bettercorp/service-base-plugin-smtp-server/content/html-templates')
  };
  return newConfig;
};