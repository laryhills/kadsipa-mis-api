export const EMAIL_QUEUE = 'email-queue';

export interface SendOtpEmailJob {
  email: string;
  code: string;
}

export enum EmailJobType {
  SEND_OTP = 'send-otp',
}
