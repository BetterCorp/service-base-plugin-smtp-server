import SendmailTransport = require('nodemailer/lib/sendmail-transport');

export interface MyPluginConfig {
  transport: SendmailTransport | SendmailTransport.Options;
  defaults?: SendmailTransport.Options;
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