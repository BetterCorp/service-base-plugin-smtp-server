import { Tools } from '@bettercorp/tools/lib/Tools';
import { CPlugin, CPluginClient } from "@bettercorp/service-base/lib/interfaces/plugins";
import { compile as handleBarCompile } from 'handlebars';
import { Mailgun } from './mailgunClient';
import { CreateMail, IMailTemplateRequest, MailgunRegion, MailGunRequest } from './mailgunClient';
import { MyPluginConfig } from './sec.config';

export class mailgun extends CPluginClient<MyPluginConfig> {
  public readonly _pluginName: string = "mail-server-mailgun";

  async sendEmail(domain: string, apiKey: string, region: MailgunRegion, mail: CreateMail): Promise<any> {
    this.refPlugin.emitEvent<MailGunRequest>(null, `send-email-${ region }`, {
      domain,
      apiKey,
      data: mail
    });
  }

  async sendEmailTemplate(domain: string, apiKey: string, region: MailgunRegion, mail: CreateMail, data: any): Promise<any> {
    this.refPlugin.emitEvent<IMailTemplateRequest>(null, `send-email-template-${ region }`, {
      mail: {
        domain,
        apiKey,
        data: mail
      },
      data
    });
  }
}

export class Plugin extends CPlugin<MyPluginConfig> {
  init(): Promise<void> {
    const self = this;
    return new Promise(async (resolve) => {
      const sendMail = async (region: MailgunRegion, data: MailGunRequest): Promise<any> => {
        try {
          self.log.debug(`SENDMAIL: ${ data.data.to }:${ data.data.subject }`);
          const mgR = await new Mailgun(data.apiKey, region).create(data.domain, data.data);
          self.log.info(`SENDMAIL: ${ data.data.to }:${ data.data.subject } - OK`);
          return mgR;
        } catch (exc) {
          self.log.error(`SENDMAIL: ${ data.data.to }:${ data.data.subject } - ERROR`);
          self.log.error(exc);
        }
      };
      const sendMailTemplate = async (region: MailgunRegion, data: IMailTemplateRequest) => {
        let mailOpts = data.mail;
        try {
          self.log.debug(`SENDMAIL-TEMPLATE: ${ mailOpts.data.to }:${ mailOpts.data.subject }`);

          if (!Tools.isString(mailOpts.data.html)) {
            self.log.debug(`SENDMAIL-TEMPLATE: ${ mailOpts.data.to }:${ mailOpts.data.subject } - TMP HTML`);
            let hbHtmlTemplate = handleBarCompile(mailOpts.data.html);
            mailOpts.data.html = hbHtmlTemplate(data.data);
            self.log.debug(`SENDMAIL-TEMPLATE: ${ mailOpts.data.to }:${ mailOpts.data.subject } - TMP HTML - OK`);
          }
          if (!Tools.isString(mailOpts.data.text)) {
            self.log.debug(`SENDMAIL-TEMPLATE: ${ mailOpts.data.to }:${ mailOpts.data.subject } - TMP TEXT`);
            let hbTextTemplate = handleBarCompile(mailOpts.data.text);
            mailOpts.data.text = hbTextTemplate(data.data);
            self.log.debug(`SENDMAIL-TEMPLATE: ${ mailOpts.data.to }:${ mailOpts.data.subject } - TMP TEXT - OK`);
          }

          await new Mailgun(mailOpts.apiKey, region).create(mailOpts.domain, mailOpts.data);
          self.log.info(`SENDMAIL-TEMPLATE: ${ mailOpts.data.to }:${ mailOpts.data.subject } - OK`);
        } catch (exc) {
          self.log.error(`SENDMAIL-TEMPLATE: ${ mailOpts.data.to }:${ mailOpts.data.subject } - ERROR`);
          self.log.error(exc);
        }
      };

      if (Tools.isNullOrUndefined((await self.getPluginConfig()).region)) {
        self.log.warn('Running regionless - will respond to requests for all regions!');
        for (let region of Tools.enumKeys(MailgunRegion)) {
          self.onEvent<MailGunRequest>(null, `send-email-${ region }`, async (data) => sendMail(MailgunRegion[region], data));
          self.onEvent<IMailTemplateRequest>(null, `send-email-template-${ region }`, async (data) => sendMailTemplate(MailgunRegion[region], data));
        }
      } else {
        self.log.warn(`Running regionlocked - will respond to requests for ${ (await self.getPluginConfig()).region } specific region requests`);
        self.onEvent<MailGunRequest>(null, `send-email-${ (await self.getPluginConfig()).region }`, async (data) => sendMail((await self.getPluginConfig()).region!, data));
        self.onEvent<IMailTemplateRequest>(null, `send-email-template-${ (await self.getPluginConfig()).region }`, async (data) => sendMailTemplate((await self.getPluginConfig()).region!, data));
      }
      resolve();
    });
  }
}