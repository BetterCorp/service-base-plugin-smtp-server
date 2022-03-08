import { CPlugin, CPluginClient } from "@bettercorp/service-base/lib/interfaces/plugins";
import { MyPluginConfig } from './sec.config';
import { createTransport, Transporter } from 'nodemailer';
import Mail = require('nodemailer/lib/mailer');

export class mailServer extends CPluginClient<MyPluginConfig> {
  public readonly _pluginName: string = "mail-server";

  async sendEmail(data: Mail.Options): Promise<any> {
    this.refPlugin.emitEvent(null, "send-email", data);
  }
}

export class Plugin extends CPlugin<MyPluginConfig> {
  private nodeMailer!: Transporter;
  init(): Promise<void> {
    const self = this;
    return new Promise(async (resolve) => {
      self.nodeMailer = createTransport((await self.getPluginConfig()).transport, (await self.getPluginConfig()).defaults);

      self.onEvent(null, 'send-email', async (data) => {
        await self.nodeMailer.sendMail(data);
      });
      resolve();
    });
  }
}