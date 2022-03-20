import { ISMTPServerConfig } from './config';

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
      onEmailSpecific: false
    }
  };
};