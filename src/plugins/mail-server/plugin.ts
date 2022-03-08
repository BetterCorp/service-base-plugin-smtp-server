import { Tools } from '@bettercorp/tools/lib/Tools';
import { CPlugin, CPluginClient } from "@bettercorp/service-base/lib/interfaces/plugins";
import { IMailTemplateRequest, MyPluginConfig } from './sec.config';
import { createTransport, Transporter } from 'nodemailer';
import { compile as handleBarCompile } from 'handlebars';
import Mail = require('nodemailer/lib/mailer');

export class mailServer extends CPluginClient<MyPluginConfig> {
  public readonly _pluginName: string = "mail-server";

  async sendEmail(data: Mail.Options): Promise<any> {
    this.refPlugin.emitEvent<Mail.Options>(null, "send-email", data);
  }

  async sendEmailTemplate(mail: Mail.Options, data: any): Promise<any> {
    this.refPlugin.emitEvent<IMailTemplateRequest>(null, "send-email-template", {
      mail,
      data
    });
  }
}

export class Plugin extends CPlugin<MyPluginConfig> {
  private nodeMailer!: Transporter;
  init(): Promise<void> {
    const self = this;
    return new Promise(async (resolve) => {
      self.nodeMailer = createTransport((await self.getPluginConfig()).transport, (await self.getPluginConfig()).defaults);

      self.onEvent<Mail.Options>(null, 'send-email', async (data) => {
        await self.nodeMailer.sendMail(data);
      });
      self.onEvent<IMailTemplateRequest>(null, 'send-email-template', async (data) => {
        let mailOpts = data.mail;
        
        if (!Tools.isString(mailOpts.html)) {
          let hbHtmlTemplate = handleBarCompile(mailOpts.html);
          mailOpts.html = hbHtmlTemplate(data.data);
        }
        if (!Tools.isString(mailOpts.text)) {
          let hbTextTemplate = handleBarCompile(mailOpts.text);
          mailOpts.text = hbTextTemplate(data.data);
        }

        await self.nodeMailer.sendMail(mailOpts);
      });
      resolve();
    });
  }
}