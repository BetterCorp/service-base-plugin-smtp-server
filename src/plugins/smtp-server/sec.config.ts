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

export default (): ISMTPServerConfig => {
  return {
    port: 25,
    serverOptions: {},
    spfOptions: {},
    banner: null,
    domains: [],
    events: {
      onAuth: false,
      onConnect: false,
      onClose: false,
      onMailFrom: false,
      onRcptTo: false,
      onError: false,
      onEmail: false,
      onEmailSpecific: false,
    },
  };
};
