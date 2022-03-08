import Mail = require('nodemailer/lib/mailer');
import SendmailTransport = require('nodemailer/lib/sendmail-transport');

export interface MyPluginConfig {
  transport: SendmailTransport | SendmailTransport.Options;
  defaults?: SendmailTransport.Options;
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
    }
  };
  return newConfig;
};