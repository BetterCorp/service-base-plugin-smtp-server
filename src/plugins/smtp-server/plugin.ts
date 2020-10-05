import { PluginFeature } from '@bettercorp/service-base/lib/ILib';
import { ISMTPServerConfig } from './config';

const SMTPServer = require("smtp-server").SMTPServer;
const simpleParser = require('mailparser').simpleParser;
const SPF = require('spf-check');

const cleanRegex = /([^0-9a-zA-Z@\+\.\-])/g;
const CleanData = (data: any) => {
  let newData = `${data}`.replace(cleanRegex, '');
  if (newData.length > 255)
    return newData.substring(0, 255);
  return newData;
};
// TODO: Fix SPF Validation
const SPFValidate = (email: string, clientIp: string): Promise<any> => {
  return new Promise((resolve) => {
    resolve({
      result: SPF.Neutral
    });
  });
  /*let cleanEmail = CleanData(email);
  let emailData = cleanEmail.split('@');
  return new SPF.SPF(emailData[1], cleanEmail, PLUGIN_FEATURES.config['plugin-smtp'].spfOptions || {}).check(clientIp);*/
};
const streamToString = (stream: any) => {
  const chunks: any = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: any) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
};


module.exports.init = (features: PluginFeature) => {
  let SMTP_SERVER: any = null;
  SMTP_SERVER = new SMTPServer({
    banner: features.getPluginConfig<ISMTPServerConfig>().banner || 'BetterCorp SMTP Server',
    onAuth (auth: any, session: any, callback: any) {
      features.log.info('Auth Request');
      features.log.info(auth);
      return callback(new Error("Invalid username or password"));
    },
    onConnect (session: any, callback: any) {
      features.log.info(`Received SMTP request from ${session.remoteAddress}`);
      callback();
    },
    onClose (session: any) {
      features.log.info(`Received SMTP request from ${session.remoteAddress} - CLOSED`);
    },
    onMailFrom (address: any, session: any, callback: any) {
      features.log.info(`Received SMTP request from ${session.remoteAddress} {FROM} ${address.address}`);
      session._sender = address;

      SPFValidate(address.address, session.remoteAddress).then(result => {
        if (result.result === SPF.Pass || result.result === SPF.Neutral) {
          features.log.info(`Received SMTP request from ${session.remoteAddress} {FROM} ${address.address} - SPF PASS: ${result.result}`);
          return callback();
        }
        features.log.error(`Received SMTP request from ${session.remoteAddress} {FROM} ${address.address} - SPF FAILED: ${result.result}`);
        return callback(
          new Error("Server error occured!")
        );
      }).catch(x => {
        features.log.error(`Received SMTP request from ${session.remoteAddress} {FROM} ${address.address} - SPF FAILED ERR`);
        features.log.error(x);
        return callback(
          new Error("Server error occured!")
        );
      });
    },
    onRcptTo (address: any, session: any, callback: any) {
      features.log.info(`Received SMTP request from ${session.remoteAddress} {TO} ${address.address}`);
      session._receiver = address;
      //if (features.runningInDebug)
      //  return callback();

      let cleanEmail = CleanData(address.address);
      let emailData = cleanEmail.split('@');
      for (let mailHost of (features.getPluginConfig<ISMTPServerConfig>() || {}).domains || []) {
        if (mailHost === emailData[1].toLowerCase()) {
          return callback();
        }
      }
      features.log.error(`Received SMTP request from ${session.remoteAddress} {TO} ${address.address} - DOMAIN NOT VALID`);
      return callback(
        new Error("Server error occured!")
      );
    },
    onData (stream: any, session: any, callback: any) {
      if (session._quiet === true) {
        return callback(null, "Message okay... mr monitor...");
      }
      features.log.info(`Received SMTP request from ${session.remoteAddress} {BODY}`);
      //stream.pipe(process.stdout); // print message to console
      let dataOkay = false;
      streamToString(stream).then(x => {
        if (!dataOkay) {
          return features.log.info(`Received SMTP request from ${session.remoteAddress} {BODY} - TOO LARGE, NO PASS`);
        }
        simpleParser(x)
          .then((parsed: any) => {
            features.emitEvent(null, `email`, {
              receiver: session._receiver.address,
              sender: session._sender.address,
              body: parsed
            });
            features.emitEvent(null, `email-${session._receiver.address}`, {
              receiver: session._receiver.address,
              sender: session._sender.address,
              body: parsed
            });
            features.log.info(`Received SMTP request from ${session.remoteAddress} {SUBJECT} - ${parsed.subject}`);
            features.log.info(`Received SMTP request from ${session.remoteAddress} {BODY} - COMPLETED (emit: smtp-email-in, smtp-email-in-${session._receiver.address})`);
            features.log.debug({
              receiver: session._receiver.address,
              sender: session._sender.address,
              body: parsed
            });
          })
          .catch((err: any) => {
            features.log.info(`Received SMTP request from ${session.remoteAddress} {BODY} - BODY FAILED TO PARSE CONTENT`);
            features.log.error(err);
          });
      }).catch(err => {
        features.log.info(`Received SMTP request from ${session.remoteAddress} {BODY} - BODY FAILED TO PARSE`);
        features.log.error(err);
        callback(
          new Error("Server error occured!")
        );
      });
      stream.on("end", () => {
        let err: any;
        if (stream.sizeExceeded) {
          err = new Error("Message exceeds fixed maximum message size");
          features.log.warn("Message exceeds fixed maximum message size");
          err.responseCode = 552;
          return callback(err);
        }
        dataOkay = true;
        features.log.warn("Message queued");
        callback(null, "Message queued.");
      });
    },
    ...(features.getPluginConfig<ISMTPServerConfig>().serverOptions || {})
  });

  SMTP_SERVER.on("error", (err: any) => {
    features.log.info("Error %s", err.message);
  });

  SMTP_SERVER.listen(features.getPluginConfig<ISMTPServerConfig>().port || 25);
  features.log.info(`Server started on port ${features.getPluginConfig<ISMTPServerConfig>().port || 25}`);
};