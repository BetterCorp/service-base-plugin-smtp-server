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
        try {
          self.log.debug(`SENDMAIL: ${ data.to }/${ data.cc }/${ data.bcc }:${ data.subject }`);
          await self.nodeMailer.sendMail(data);
          self.log.info(`SENDMAIL: ${ data.to }/${ data.cc }/${ data.bcc }:${ data.subject } - OK`);
        } catch (exc) {
          self.log.error(`SENDMAIL: ${ data.to }/${ data.cc }/${ data.bcc }:${ data.subject } - ERROR`);
          self.log.error(exc);
        }
      });
      self.onEvent<IMailTemplateRequest>(null, 'send-email-template', async (data) => {
        let mailOpts = data.mail;
        try {
          self.log.debug(`SENDMAIL-TEMPLATE: ${ mailOpts.to }/${ mailOpts.cc }/${ mailOpts.bcc }:${ mailOpts.subject }`);

          if (!Tools.isString(mailOpts.html)) {
            self.log.debug(`SENDMAIL-TEMPLATE: ${ mailOpts.to }/${ mailOpts.cc }/${ mailOpts.bcc }:${ mailOpts.subject } - TMP HTML`);
            let hbHtmlTemplate = handleBarCompile(mailOpts.html);
            mailOpts.html = hbHtmlTemplate(data.data);
            self.log.debug(`SENDMAIL-TEMPLATE: ${ mailOpts.to }/${ mailOpts.cc }/${ mailOpts.bcc }:${ mailOpts.subject } - TMP HTML - OK`);
          }
          if (!Tools.isString(mailOpts.text)) {
            self.log.debug(`SENDMAIL-TEMPLATE: ${ mailOpts.to }/${ mailOpts.cc }/${ mailOpts.bcc }:${ mailOpts.subject } - TMP TEXT`);
            let hbTextTemplate = handleBarCompile(mailOpts.text);
            mailOpts.text = hbTextTemplate(data.data);
            self.log.debug(`SENDMAIL-TEMPLATE: ${ mailOpts.to }/${ mailOpts.cc }/${ mailOpts.bcc }:${ mailOpts.subject } - TMP TEXT - OK`);
          }

          await self.nodeMailer.sendMail(mailOpts);
          self.log.info(`SENDMAIL-TEMPLATE: ${ mailOpts.to }/${ mailOpts.cc }/${ mailOpts.bcc }:${ mailOpts.subject } - OK`);
        } catch (exc) {
          self.log.error(`SENDMAIL-TEMPLATE: ${ mailOpts.to }/${ mailOpts.cc }/${ mailOpts.bcc }:${ mailOpts.subject } - ERROR`);
          self.log.error(exc);
        }
      });
      resolve();
    });
  }
}