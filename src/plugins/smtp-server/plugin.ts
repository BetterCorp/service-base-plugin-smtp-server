import { CPlugin, CPluginClient, } from '@bettercorp/service-base/lib/interfaces/plugins';
import { getEmailSpecific, ISMTPServerConfig, ISMTPServerEvents } from './config';

const SMTPServer = require("smtp-server").SMTPServer;
const simpleParser = require('mailparser').simpleParser;
const SPF = require('spf-check');

export enum ISMTPServerOnAuthRequestMethod {
  PLAIN = 'PLAIN',
  LOGIN = 'LOGIN',
  XOAUTH2 = 'XOAUTH2'
}
export interface ISMTPServerOnAuthRequestAuth {
  method: ISMTPServerOnAuthRequestMethod;
  username: string;
  password?: string;
  accessToken?: string;
  //validatePassword ; function
}
export interface ISMTPServerOnAuthRequest extends ISMTPServerOnRequest {
  auth: ISMTPServerOnAuthRequestAuth;
}
export interface ISMTPServerOnAuthResponsePlain {
  user: any;
  data?: any;
}
export interface ISMTPServerOnAuthResponseOAuth {
  user?: any;
  data: any;
}
export interface ISMTPServerOnAuthResponseAddress {
  address: any;
  args: any;
}
export interface ISMTPServerOnMailFromRequest extends ISMTPServerOnRequest {
  address: any;
}
export interface ISMTPServerOnRequestSessionEnvelope {
  mailFrom: string | boolean | any;
  rcptTo: Array<string | boolean | any>;
}
export interface ISMTPServerOnRequestSession {
  id: string;
  remoteAddress: string;
  clientHostname: string;
  openingCommand: string;
  transmissionType: string;
  transaction: number;
  envelope: ISMTPServerOnRequestSessionEnvelope;
  user?: any;
  _quiet?: boolean;
}
export interface ISMTPServerOnRequest {
  session: ISMTPServerOnRequestSession;
}
export interface ISMTPServerOnMailRequestBody {
  attachments: Array<{
    type: string | null,
    content: any | null,
    contentType: string | null,
    partId: string | null,
    release: string | null,
    contentDisposition: string | null,
    filename: string | null,
    headers: any,
    checksum: string,
    size: number;
  }>,
  headers: any,
  headerLines: Array<{
    key: string,
    line: string;
  }>,
  text: string | null,
  textAsHtml: string | null,
  subject: string,
  date: string,
  to: {
    text: string;
  },
  from: {
    text: string;
  },
  messageId: string | null,
  html: boolean;
}
export interface ISMTPServerOnMailRequest extends ISMTPServerOnRequest {
  receiver: any;
  sender: any;
  body: ISMTPServerOnMailRequestBody;
}
export type PromiseResolve<TData = any, TReturn = void> = (data: TData) => TReturn;
export class smtpServer extends CPluginClient<ISMTPServerConfig> {
  public readonly _pluginName: string = "smtp-server";

  async onError(listener: { (err: any): Promise<void>; }) {
    await this.onEvent<any>(ISMTPServerEvents.onError, listener);
  }
  async onAuth(listener: { (request?: ISMTPServerOnAuthRequest): Promise<ISMTPServerOnAuthResponsePlain | ISMTPServerOnAuthResponseOAuth>; }) {
    await this.onReturnableEvent<ISMTPServerOnAuthRequest, ISMTPServerOnAuthResponsePlain | ISMTPServerOnAuthResponseOAuth>(ISMTPServerEvents.onAuth, listener);
  }
  async onConnect(listener: { (request?: ISMTPServerOnRequest): Promise<void>; }) {
    await this.onReturnableEvent<ISMTPServerOnRequest>(ISMTPServerEvents.onConnect, listener);
  }
  async onClose(listener: { (request: ISMTPServerOnRequest): Promise<void>; }) {
    await this.onEvent<ISMTPServerOnRequest>(ISMTPServerEvents.onClose, listener);
  }
  async onEmail(listener: { (request: ISMTPServerOnMailRequest): Promise<void>; }) {
    await this.onEvent<ISMTPServerOnMailRequest>(ISMTPServerEvents.onEmail, listener);
  }
  async onEmailSpecific(emailAddress: string, listener: { (request: ISMTPServerOnMailRequest): Promise<void>; }) {
    await this.onEvent<ISMTPServerOnMailRequest>(getEmailSpecific(emailAddress), listener);
  }
  async onMailFrom(listener: { (request?: ISMTPServerOnMailFromRequest): Promise<void>; }) {
    await this.onReturnableEvent<ISMTPServerOnMailFromRequest, void>(ISMTPServerEvents.onMailFrom, listener);
  }
  async onRcptTo(listener: { (request?: ISMTPServerOnMailFromRequest): Promise<void>; }) {
    await this.onReturnableEvent<ISMTPServerOnMailFromRequest>(ISMTPServerEvents.onRcptTo, listener);
  }
}

export class Plugin extends CPlugin<ISMTPServerConfig> {
  init(): Promise<void> {
    const self = this;
    return new Promise(async (resolve) => {
      let SMTP_SERVER: any = null;
      SMTP_SERVER = new SMTPServer({
        banner: (await self.getPluginConfig()).banner || 'Better SMTP Server',
        onAuth: async (auth: ISMTPServerOnAuthRequestAuth, session: any, callback: any) => {
          self.log.info('Auth Request');
          self.log.debug(auth);
          if (Object.keys(ISMTPServerOnAuthRequestMethod).indexOf(auth.method) < 0) return callback(new Error('Unsupported auth!'));
          if ((await self.getPluginConfig()).events.onAuth === true) {
            return self.emitEventAndReturn<ISMTPServerOnAuthRequest, ISMTPServerOnAuthResponsePlain | ISMTPServerOnAuthResponseOAuth>(null, ISMTPServerEvents.onAuth, {
              auth: auth,
              session: session
            }).then(x => callback(null, x)).catch(x => callback(x || new Error('Unknown Error')));
          }
          return callback(new Error("Invalid username or password"));
        },
        onConnect: async (session: any, callback: any) => {
          self.log.info(`Received SMTP request from ${ session.remoteAddress }`);
          if ((await self.getPluginConfig()).events.onConnect === true) {
            return self.emitEventAndReturn(null, ISMTPServerEvents.onConnect, {
              session: session
            }).then(x => callback()).catch(x => callback(x || new Error('Unknown Error')));
          }
          return callback();
        },
        onClose: async (session: any) => {
          self.log.info(`Received SMTP request from ${ session.remoteAddress } - CLOSED`);
          if ((await self.getPluginConfig()).events.onClose === true)
            return self.emitEvent(null, ISMTPServerEvents.onClose, {
              session: session
            });
        },
        onMailFrom: async (address: ISMTPServerOnAuthResponseAddress, session: any, callback: any) => {
          self.log.info(`Received SMTP request from ${ session.remoteAddress } {FROM} ${ address.address }`);
          session._sender = address;
          if ((await self.getPluginConfig()).events.onMailFrom === true)
            return self.emitEventAndReturn<ISMTPServerOnMailFromRequest, void>(null, ISMTPServerEvents.onMailFrom, {
              address: address,
              session: session
            }).then(x => callback()).catch(x => callback(x || new Error('Unknown Error')));

          return self.SPFValidate(address.address, session.remoteAddress).then(result => {
            if (result.result === SPF.Pass) {
              self.log.info(`Received SMTP request from ${ session.remoteAddress } {FROM} ${ address.address } - SPF PASS: ${ result.result }`);
              return callback();
            }
            if (result.result === SPF.Neutral) {
              self.log.info(`Received SMTP request from ${ session.remoteAddress } {FROM} ${ address.address } - SPF NEUTRAL: ${ result.result }`);
              return callback();
            }
            self.log.error(`Received SMTP request from ${ session.remoteAddress } {FROM} ${ address.address } - SPF FAILED: ${ result.result }`);
            return callback(
              new Error("Server error occured!")
            );
          }).catch(x => {
            self.log.error(`Received SMTP request from ${ session.remoteAddress } {FROM} ${ address.address } - SPF FAILED ERR`);
            self.log.error(x);
            return callback(
              new Error("Server error occured!")
            );
          });
        },
        onRcptTo: async (address: any, session: any, callback: any) => {
          self.log.info(`Received SMTP request from ${ session.remoteAddress } {TO} ${ address.address }`);
          session._receiver = address;
          if ((await self.getPluginConfig()).events.onRcptTo === true)
            return self.emitEventAndReturn(null, ISMTPServerEvents.onRcptTo, {
              address: address,
              session: session
            }).then(x => callback()).catch(x => callback(x || new Error('Unknown Error')));
          //if (features.runningInDebug)
          //  return callback();

          let cleanEmail = self.CleanData(address.address);
          let emailData = cleanEmail.split('@');
          for (let mailHost of ((await self.getPluginConfig()) || {}).domains || []) {
            let debugHost = emailData[1].toLowerCase();
            self.log.debug(`Received SMTP request from ${ session.remoteAddress } {TO} ${ address.address } - [${ debugHost }] ==? [${ mailHost }]`);
            if (mailHost === debugHost) {
              return callback();
            }
          }
          self.log.error(`Received SMTP request from ${ session.remoteAddress } {TO} ${ address.address } - DOMAIN NOT VALID`);
          return callback(
            new Error("Server error occured!")
          );
        },
        onData: async (stream: any, session: any, callback: any) => {
          if (session._quiet === true) {
            return callback(null, "Message okay... mr monitor...");
          }
          self.log.info(`Received SMTP request from ${ session.remoteAddress } {BODY}`);
          //stream.pipe(process.stdout); // print message to console
          let dataOkay = false;
          self.streamToString(stream).then(async x => {
            if (!dataOkay) {
              return self.log.info(`Received SMTP request from ${ session.remoteAddress } {BODY} - TOO LARGE, NO PASS`);
            }
            simpleParser(x)
              .then(async (parsed: any) => {
                if ((await self.getPluginConfig()).events.onEmail === true)
                  self.emitEvent(null, ISMTPServerEvents.onEmail, {
                    receiver: session._receiver.address,
                    sender: session._sender.address,
                    body: parsed,
                    session: session
                  });

                if ((await self.getPluginConfig()).events.onEmailSpecific === true)
                  self.emitEvent(null, getEmailSpecific(session._receiver.address), {
                    receiver: session._receiver.address,
                    sender: session._sender.address,
                    body: parsed,
                    session: session
                  });

                self.log.info(`Received SMTP request from ${ session.remoteAddress } {SUBJECT} - ${ parsed.subject }`);
                self.log.info(`Received SMTP request from ${ session.remoteAddress } {BODY} - COMPLETED (emit: smtp-email-in, smtp-email-in-${ session._receiver.address })`);
                self.log.debug({
                  receiver: session._receiver.address,
                  sender: session._sender.address,
                  body: parsed
                });
              })
              .catch((err: any) => {
                self.log.info(`Received SMTP request from ${ session.remoteAddress } {BODY} - BODY FAILED TO PARSE CONTENT`);
                self.log.error(err);
              });
          }).catch((err: any) => {
            self.log.info(`Received SMTP request from ${ session.remoteAddress } {BODY} - BODY FAILED TO PARSE`);
            self.log.error(err);
            callback(
              new Error("Server error occured!")
            );
          });
          stream.on("end", () => {
            let err: any;
            if (stream.sizeExceeded) {
              err = new Error("Message exceeds fixed maximum message size");
              self.log.warn("Message exceeds fixed maximum message size");
              err.responseCode = 552;
              return callback(err);
            }
            dataOkay = true;
            self.log.warn("Message queued");
            callback(null, "Message queued.");
          });
        },
        ...((await self.getPluginConfig()).serverOptions || {})
      });

      SMTP_SERVER.on("error", (err: any) => {
        self.log.info("Error %s", err.message);
        self.emitEvent(null, ISMTPServerEvents.onError, err);
      });

      SMTP_SERVER.listen((await self.getPluginConfig()).port || 2525);
      self.log.info(`Server started on port ${ (await self.getPluginConfig()).port || 2525 }`);
      resolve();
    });
  }

  private cleanRegex = /([^0-9a-zA-Z@\+\.\-])/g;
  private CleanData(data: any) {
    let newData = `${ data }`.replace(this.cleanRegex, '');
    if (newData.length > 255)
      return newData.substring(0, 255);
    return newData;
  };
  private streamToString(stream: any) {
    const chunks: any = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: any) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
  };

  async SPFValidate(email: string, clientIp: string): Promise<any> {
    let cleanEmail = this.CleanData(email);
    let emailData = cleanEmail.split('@');
    return new SPF.SPF(emailData[1], cleanEmail, (await this.getPluginConfig()).spfOptions || {}).check(clientIp);
  }
}
