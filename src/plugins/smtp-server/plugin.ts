import { CPlugin, } from '@bettercorp/service-base/lib/ILib';
import { getEmailSpecific, ISMTPServerConfig, ISMTPServerEvents } from './config';

const SMTPServer = require("smtp-server").SMTPServer;
const simpleParser = require('mailparser').simpleParser;
const SPF = require('spf-check');

export class Plugin extends CPlugin<ISMTPServerConfig> {
  init(): Promise<void> {
    const self = this;
    return new Promise((resolve) => {
      let SMTP_SERVER: any = null;
      SMTP_SERVER = new SMTPServer({
        banner: self.getPluginConfig().banner || 'BetterCorp SMTP Server',
        onAuth: self.onAuth,
        onConnect: self.onConnect,
        onClose: self.onClose,
        onMailFrom: self.onMailFrom,
        onRcptTo: self.onRcptTo,
        onData: self.onData,
        ...(self.getPluginConfig().serverOptions || {})
      });

      SMTP_SERVER.on("error", (err: any) => {
        self.log.info("Error %s", err.message);
        self.emitEvent(null, ISMTPServerEvents.onError, err);
      });

      SMTP_SERVER.listen(self.getPluginConfig().port || 2525);
      self.log.info(`Server started on port ${ self.getPluginConfig().port || 2525 }`);
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
  
  // TODO: Fix SPF Validation
  SPFValidate (email: string, clientIp: string): Promise<any> {
    /*return new Promise((resolve) => {
      resolve({
        result: SPF.Neutral
      });
    });*/
    let cleanEmail = this.CleanData(email);
    let emailData = cleanEmail.split('@');
    return new SPF.SPF(emailData[1], cleanEmail, this.getPluginConfig().spfOptions || {}).check(clientIp);
  }

  onAuth(auth: any, session: any, callback: any) {
    this.log.info('Auth Request');
    this.log.debug(auth);
    if (this.getPluginConfig().events.onAuth === true) {
      return this.emitEventAndReturn(null, ISMTPServerEvents.onAuth, {
        auth: auth,
        session: session
      }).then(x => callback(null, x)).catch(x => callback(x || new Error('Unknown Error')));
    }
    return callback(new Error("Invalid username or password"));
  }

  onConnect(session: any, callback: any) {
    this.log.info(`Received SMTP request from ${ session.remoteAddress }`);
    if (this.getPluginConfig().events.onConnect === true) {
      return this.emitEventAndReturn(null, ISMTPServerEvents.onConnect, {
        session: session
      }).then(x => callback()).catch(x => callback(x || new Error('Unknown Error')));
    }
    return callback();
  }

  onClose(session: any) {
    this.log.info(`Received SMTP request from ${ session.remoteAddress } - CLOSED`);
    if (this.getPluginConfig().events.onClose === true)
      return this.emitEvent(null, ISMTPServerEvents.onClose, {
        session: session
      });
  }

  onMailFrom(address: any, session: any, callback: any) {
    const self = this;
    this.log.info(`Received SMTP request from ${ session.remoteAddress } {FROM} ${ address.address }`);
    session._sender = address;
    if (this.getPluginConfig().events.onMailFrom === true)
      return this.emitEventAndReturn(null, ISMTPServerEvents.onMailFrom, {
        address: address,
        session: session
      }).then(x => callback()).catch(x => callback(x || new Error('Unknown Error')));

    return this.SPFValidate(address.address, session.remoteAddress).then(result => {
      if (result.result === SPF.Pass || result.result === SPF.Neutral) {
        self.log.info(`Received SMTP request from ${ session.remoteAddress } {FROM} ${ address.address } - SPF PASS: ${ result.result }`);
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
  }

  onRcptTo(address: any, session: any, callback: any) {
    this.log.info(`Received SMTP request from ${ session.remoteAddress } {TO} ${ address.address }`);
    session._receiver = address;
    if (this.getPluginConfig().events.onRcptTo === true)
      return this.emitEventAndReturn(null, ISMTPServerEvents.onRcptTo, {
        address: address,
        session: session
      }).then(x => callback()).catch(x => callback(x || new Error('Unknown Error')));
    //if (features.runningInDebug)
    //  return callback();

    let cleanEmail = this.CleanData(address.address);
    let emailData = cleanEmail.split('@');
    for (let mailHost of (this.getPluginConfig() || {}).domains || []) {
      let debugHost = emailData[1].toLowerCase();
      this.log.debug(`Received SMTP request from ${ session.remoteAddress } {TO} ${ address.address } - [${ debugHost }] ==? [${ mailHost }]`);
      if (mailHost === debugHost) {
        return callback();
      }
    }
    this.log.error(`Received SMTP request from ${ session.remoteAddress } {TO} ${ address.address } - DOMAIN NOT VALID`);
    return callback(
      new Error("Server error occured!")
    );
  }

  onData(stream: any, session: any, callback: any) {
    if (session._quiet === true) {
      return callback(null, "Message okay... mr monitor...");
    }
    const self = this;
    this.log.info(`Received SMTP request from ${ session.remoteAddress } {BODY}`);
    //stream.pipe(process.stdout); // print message to console
    let dataOkay = false;
    this.streamToString(stream).then(x => {
      if (!dataOkay) {
        return self.log.info(`Received SMTP request from ${ session.remoteAddress } {BODY} - TOO LARGE, NO PASS`);
      }
      simpleParser(x)
        .then((parsed: any) => {
          self.emitEvent(null, ISMTPServerEvents.onEmail, {
            receiver: session._receiver.address,
            sender: session._sender.address,
            body: parsed
          });
          self.emitEvent(null, getEmailSpecific(session._receiver.address), {
            receiver: session._receiver.address,
            sender: session._sender.address,
            body: parsed
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
  }
}
