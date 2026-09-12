export const BACKUP_PBKDF2_ITERATIONS = 100000;
export const BACKUP_KDF = 'PBKDF2-SHA256';
export const BACKUP_CIPHER = 'AES-256-CBC-HMAC-SHA256';

export interface BackupEnvelopeParams {
  salt: string;
  iv: string;
  data: string;
  mac: string;
}

export interface BackupEnvelope extends BackupEnvelopeParams {
  encrypted: true;
  kdf: string;
  iterations: number;
  cipher: string;
}

export function buildBackupEnvelope({ salt, iv, data, mac }: BackupEnvelopeParams): string {
  return JSON.stringify({
    encrypted: true,
    kdf: BACKUP_KDF,
    iterations: BACKUP_PBKDF2_ITERATIONS,
    cipher: BACKUP_CIPHER,
    salt,
    iv,
    data,
    mac,
  });
}

export function parseBackupEnvelope(text: string): BackupEnvelope {
  const envelope = JSON.parse(text);
  if (
    !envelope ||
    envelope.encrypted !== true ||
    envelope.kdf !== BACKUP_KDF ||
    envelope.iterations !== BACKUP_PBKDF2_ITERATIONS ||
    envelope.cipher !== BACKUP_CIPHER ||
    !envelope.salt ||
    !envelope.iv ||
    !envelope.data ||
    !envelope.mac
  )
    throw new Error('Invalid encrypted backup');
  return envelope as BackupEnvelope;
}
