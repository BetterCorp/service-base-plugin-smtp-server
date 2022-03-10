import { IDictionary } from '@bettercorp/tools/lib/Interfaces';
import { Tools } from '@bettercorp/tools/lib/Tools';

const formData = require('form-data');
const MG = require('mailgun.js');

export enum MailgunRegion {
  US = 'US',
  EU = 'EU',
}
export interface CreateMail {
  to: Array<string>;
  html: string;
  text: string;
  subject: string;
  mime?: string;
  attachment?: any;
  tag?: string;
  campaign?: string;
  deliverytime?: number;
  dkim?: boolean;
  tracking?: boolean;
  trackClicks?: boolean;
  trackOpens?: boolean;
  headers?: Array<IDictionary<string>>;
  vars?: Array<IDictionary<string>>;
}
export class Mailgun {
  private getAPIUrlFromRegion(region: MailgunRegion): string {
    if (region === MailgunRegion.US)
      return 'https://api.mailgun.net';
    if (region === MailgunRegion.EU)
      return 'https://api.eu.mailgun.net';
    throw `Unknown Region (${ region })`;
  }
  private mailgun: any;
  private mailgunClient: any;
  constructor(apiKey: string, region: MailgunRegion) {
    this.mailgun = new MG(formData);
    this.mailgunClient = this.mailgun.client({
      username: 'api',
      key: apiKey,
      url: this.getAPIUrlFromRegion(region)
    });
  }

  public create(domain: string, data: CreateMail) {
    const self = this;
    return new Promise((resolve, reject) => {
      let sendMailData = {
        to: data.to,
        html: data.html,
        text: data.text,
        message: data.mime,
        attachment: data.attachment,
        'o:tag': data.tag,
        'o:campaign': data.campaign,
        'o:deliverytime': Tools.isNullOrUndefined(data.deliverytime) ? undefined : new Date(data.deliverytime!).toISOString(),
        'o:dkim': data.dkim !== true ? 'no' : 'yes',
        'o:tracking': data.tracking !== true ? 'no' : 'yes',
        'o:tracking-clicks': data.trackClicks !== true ? 'no' : 'yes',
        'o:tracking-opens': data.trackOpens !== true ? 'no' : 'yes',
      };
      self.mailgunClient.messages.create(domain, sendMailData).then(resolve).catch(reject);
    })
  }
}

export interface IMailTemplateRequest {
  mail: MailGunRequest;
  data: any;
}

export interface MailGunRequest {
  domain: string;
  apiKey: string;
  data: CreateMail;
}
