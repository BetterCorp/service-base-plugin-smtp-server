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
  banner: string;
  domains: Array<string>;
  serverOptions: any;
  events: ISMTPServerEventsConfig;
  spfOptions: any;
}
export enum ISMTPServerEvents {
  onAuth = 'on-auth',
  onConnect = 'on-connect',
  onClose = 'on-close',
  onMailFrom = 'on-mail-from',
  onRcptTo = 'on-recpt-to',
  onError = 'on-error',
  onEmail = 'email',
  _onEmailSpecific = 'email-'
}