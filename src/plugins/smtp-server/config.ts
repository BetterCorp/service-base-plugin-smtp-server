export interface ISMTPServerEventsConfig {
  onAuth: Boolean;
  onConnect: Boolean;
  onClose: Boolean;
  onMailFrom: Boolean;
  onRcptTo: Boolean;
  onError: Boolean;
  onEmail: Boolean;
  onEmailSpecific: Boolean;
}
export interface ISMTPServerConfig {
  port: number;
  banner: string | null;
  domains: Array<string>;
  serverOptions: any;
  events: ISMTPServerEventsConfig;
  spfOptions: any;
}
export enum ISMTPServerEvents {
  onAuth = 'onAuth',
  onConnect = 'onConnect',
  onClose = 'onClose',
  onMailFrom = 'onMailFrom',
  onRcptTo = 'onRecptTo',
  onError = 'onError',
  onEmail = 'email'
}
export function getEmailSpecific(emailAddress: string) {
  return `email-${emailAddress}`;
}