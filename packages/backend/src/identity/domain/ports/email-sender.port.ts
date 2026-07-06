export interface EmailSenderPort {
  sendPasswordResetEmail(toEmail: string, resetLink: string): Promise<void>;
}
