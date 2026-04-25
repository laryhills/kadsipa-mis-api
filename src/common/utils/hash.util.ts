import * as bcrypt from 'bcrypt';

/**
 * True when the string is already a bcrypt modular crypt hash (e.g. from DB).
 * Used so entity hooks do not double-hash on update when only other columns changed.
 */
export const isBcryptHash = (value: string): boolean =>
  /^\$2[abxy]?\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

export const comparePassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};
