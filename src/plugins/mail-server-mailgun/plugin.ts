import { Tools } from '@bettercorp/tools/lib/Tools';
import { CPlugin, CPluginClient } from "@bettercorp/service-base/lib/interfaces/plugins";
import { compile as handleBarCompile } from 'handlebars';
import { CreateSMail, Mailgun, MailGunSavedMailRequest } from './mailgunClient';
import { CreateMail, IMailTemplateRequest, MailgunRegion, MailGunRequest } from './mailgunClient';
import { MyPluginConfig } from './sec.config';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export class mailgun extends CPluginClient<MyPluginConfig> {
  public readonly _pluginName: string = "mail-server-mailgun";

  async sendEmail(mail: CreateMail): Promise<any>;
  async sendEmail(mail: CreateMail, domain: string, apiKey: string, region: MailgunRegion): Promise<any>;
  async sendEmail(mail: CreateMail, domain?: string, apiKey?: string, region?: MailgunRegion): Promise<any> {
    if (Tools.isNullOrUndefined(domain) || Tools.isNullOrUndefined(apiKey) || Tools.isNullOrUndefined(region)) {
      const mailgunDefaults = (await this.getPluginConfig()).mailgunDefaults;
      if (Tools.isNullOrUndefined(mailgunDefaults)) throw 'Defaults for smtp plugin not set, so you need to pass in domain, apiKey';
      region = (await this.getPluginConfig()).region!;
      if (Tools.isNullOrUndefined(region)) throw 'Defaults for smtp plugin not set, you need to set the region in config';
      domain = mailgunDefaults!.domain;
      apiKey = mailgunDefaults!.apiKey;
    }
    this.refPlugin.emitEvent<MailGunRequest<CreateMail>>(null, `send-email-${ region }`, {
      domain: domain!,
      apiKey: apiKey!,
      data: mail
    });
  }

  async sendEmailTemplate(mail: CreateMail, data: any): Promise<any>;
  async sendEmailTemplate(mail: CreateMail, data: any, domain: string, apiKey: string, region: MailgunRegion): Promise<any>;
  async sendEmailTemplate(mail: CreateMail, data: any, domain?: string, apiKey?: string, region?: MailgunRegion): Promise<any> {
    if (Tools.isNullOrUndefined(domain) || Tools.isNullOrUndefined(apiKey) || Tools.isNullOrUndefined(region)) {
      const mailgunDefaults = (await this.getPluginConfig()).mailgunDefaults;
      if (Tools.isNullOrUndefined(mailgunDefaults)) throw 'Defaults for smtp plugin not set, so you need to pass in domain, apiKey';
      region = (await this.getPluginConfig()).region!;
      if (Tools.isNullOrUndefined(region)) throw 'Defaults for smtp plugin not set, you need to set the region in config';
      domain = mailgunDefaults!.domain;
      apiKey = mailgunDefaults!.apiKey;
    }
    this.refPlugin.emitEvent<IMailTemplateRequest<CreateMail>>(null, `send-email-template-${ region }`, {
      mail: {
        domain: domain!,
        apiKey: apiKey!,
        data: mail
      },
      data
    });
  }

  async sendSavedEmailTemplate(mail: CreateSMail, data: any, templateId: string): Promise<any>;
  async sendSavedEmailTemplate(mail: CreateSMail, data: any, templateId: string, domain: string, apiKey: string, region: MailgunRegion): Promise<any>;
  async sendSavedEmailTemplate(mail: CreateSMail, data: any, templateId: string, domain?: string, apiKey?: string, region?: MailgunRegion): Promise<any> {
    if (Tools.isNullOrUndefined(domain) || Tools.isNullOrUndefined(apiKey) || Tools.isNullOrUndefined(region)) {
      const mailgunDefaults = (await this.getPluginConfig()).mailgunDefaults;
      if (Tools.isNullOrUndefined(mailgunDefaults)) throw 'Defaults for smtp plugin not set, so you need to pass in domain, apiKey';
      region = (await this.getPluginConfig()).region!;
      if (Tools.isNullOrUndefined(region)) throw 'Defaults for smtp plugin not set, you need to set the region in config';
      domain = mailgunDefaults!.domain;
      apiKey = mailgunDefaults!.apiKey;
    }
    this.refPlugin.emitEvent<IMailTemplateRequest<CreateSMail, MailGunSavedMailRequest<CreateSMail>>>(null, `send-saved-email-template-${ region }`, {
      mail: {
        templateId,
        domain: domain!,
        apiKey: apiKey!,
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
      const sendMail = async (region: MailgunRegion, data: MailGunRequest<CreateMail>): Promise<any> => {
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
      const sendMailTemplate = async (region: MailgunRegion, data: IMailTemplateRequest<CreateMail>) => {
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
      const sendSavedMailTemplate = async (region: MailgunRegion, data: IMailTemplateRequest<CreateSMail, MailGunSavedMailRequest<CreateSMail>>) => {
        let mailOpts = data.mail;
        try {
          self.log.debug(`SENDMAIL-TEMPLATE-[${ data.mail.templateId }]: ${ mailOpts.data.to }`);

          const safeTId = mailOpts.templateId.replace(/(?![,-:~ ])[\W]/g, '').substring(0, 255);
          let html: string | null = null;
          let htmlFile = join((await self.getPluginConfig()).templatesPath, `./${ safeTId }.html.hbs`);
          let text: string | null = null;
          let textFile = join((await self.getPluginConfig()).templatesPath, `./${ safeTId }.text.hbs`);
          let subject: string | null = null;
          let subjectFile = join((await self.getPluginConfig()).templatesPath, `./${ safeTId }.subject.hbs`);

          if (existsSync(htmlFile))
            html = readFileSync(htmlFile).toString();
          if (existsSync(textFile))
            text = readFileSync(textFile).toString();
          if (existsSync(subjectFile))
            subject = readFileSync(subjectFile).toString();

          if (!Tools.isString(html)) throw 'html not set!';
          if (!Tools.isString(text)) throw 'text not set!';
          if (!Tools.isString(subject)) throw 'subject not set!';

          self.log.debug(`SENDMAIL-TEMPLATE-[${ data.mail.templateId }]: ${ mailOpts.data.to } - TMP SUBJECT`);
          let hbSubjectTemplate = handleBarCompile(subject);
          subject = hbSubjectTemplate(data.data);
          self.log.debug(`SENDMAIL-TEMPLATE-[${ data.mail.templateId }]: ${ mailOpts.data.to }:${ subject } - TMP SUBJECT - OK`);

          self.log.debug(`SENDMAIL-TEMPLATE-[${ data.mail.templateId }]: ${ mailOpts.data.to }:${ subject } - TMP HTML`);
          let hbHtmlTemplate = handleBarCompile(html);
          html = hbHtmlTemplate(data.data);
          self.log.debug(`SENDMAIL-TEMPLATE-[${ data.mail.templateId }]: ${ mailOpts.data.to }:${ subject } - TMP HTML - OK`);

          self.log.debug(`SENDMAIL-TEMPLATE-[${ data.mail.templateId }]: ${ mailOpts.data.to }:${ subject } - TMP TEXT`);
          let hbTextTemplate = handleBarCompile(text);
          text = hbTextTemplate(data.data);
          self.log.debug(`SENDMAIL-TEMPLATE-[${ data.mail.templateId }]: ${ mailOpts.data.to }:${ subject } - TMP TEXT - OK`);

          await new Mailgun(mailOpts.apiKey, region).create(mailOpts.domain, {
            ...data.mail.data,
            html: html,
            text: text,
            subject
          });
          self.log.info(`SENDMAIL-TEMPLATE-[${ data.mail.templateId }]: ${ mailOpts.data.to }:${ subject } - OK`);
        } catch (exc) {
          self.log.error(`SENDMAIL-TEMPLATE-[${ data.mail.templateId }]: ${ mailOpts.data.to } - ERROR`);
          self.log.error(exc);
        }
      };

      if (Tools.isNullOrUndefined((await self.getPluginConfig()).region)) {
        self.log.warn('Running regionless - will respond to requests for all regions!');
        for (let region of Tools.enumKeys(MailgunRegion)) {
          self.onEvent<MailGunRequest<CreateMail>>(null, `send-email-${ region }`, async (data) => await sendMail(MailgunRegion[region], data));
          self.onEvent<IMailTemplateRequest<CreateMail>>(null, `send-email-template-${ region }`, async (data) => await sendMailTemplate(MailgunRegion[region], data));
          self.onEvent<IMailTemplateRequest<CreateSMail, MailGunSavedMailRequest<CreateSMail>>>(null, `send-saved-email-template-${ region }`, async (data) => await sendSavedMailTemplate(MailgunRegion[region], data));
        }
      } else {
        self.log.warn(`Running regionlocked - will respond to requests for ${ (await self.getPluginConfig()).region } specific region requests`);
        self.onEvent<MailGunRequest<CreateMail>>(null, `send-email-${ (await self.getPluginConfig()).region }`, async (data) => sendMail((await self.getPluginConfig()).region!, data));
        self.onEvent<IMailTemplateRequest<CreateMail>>(null, `send-email-template-${ (await self.getPluginConfig()).region }`, async (data) => await sendMailTemplate((await self.getPluginConfig()).region!, data));
        self.onEvent<IMailTemplateRequest<CreateSMail, MailGunSavedMailRequest<CreateSMail>>>(null, `send-saved-email-template-${ (await self.getPluginConfig()).region }`, async (data) => await sendSavedMailTemplate((await self.getPluginConfig()).region!, data));
      }
      resolve();
    });
  }
}