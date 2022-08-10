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