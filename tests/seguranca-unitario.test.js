const { encrypt, decrypt, pseudonimizar } = require('../src/security/crypto');
const { redigir, maskEmail } = require('../src/observability/logger');

describe('Criptografia local (AES-256-GCM)', () => {
  test('cifra e decifra; o texto cifrado não contém o dado original', () => {
    const cifrado = encrypt('(11) 98765-4321');
    expect(cifrado).not.toContain('98765');
    expect(decrypt(cifrado)).toBe('(11) 98765-4321');
  });

  test('cada cifragem usa IV novo (mesmo dado gera saídas diferentes)', () => {
    expect(encrypt('ABC-1234')).not.toBe(encrypt('ABC-1234'));
  });

  test('dado adulterado é detectado pela tag de autenticação', () => {
    const [versao, iv, tag] = encrypt('ABC-1234').split(':');
    const adulterado = [versao, iv, tag, Buffer.from('XYZ-9999').toString('base64')].join(':');
    expect(() => decrypt(adulterado)).toThrow();
  });

  test('pseudonimização é estável e não expõe o identificador', () => {
    expect(pseudonimizar('usr_003')).toBe(pseudonimizar('usr_003'));
    expect(pseudonimizar('usr_003')).not.toContain('usr_003');
  });
});

describe('Logs sem dados sensíveis', () => {
  test('senha, token, telefone e authorization são redigidos', () => {
    const saida = redigir({ email: 'x', password: 'Segredo@1', accessToken: 'eyJ', phone: '11999', nested: { authorization: 'Bearer x' } });
    expect(saida.password).toBe('[REDACTED]');
    expect(saida.accessToken).toBe('[REDACTED]');
    expect(saida.phone).toBe('[REDACTED]');
    expect(saida.nested.authorization).toBe('[REDACTED]');
  });

  test('e-mail é mascarado nos eventos de segurança', () => {
    expect(maskEmail('felipe@example.com')).toBe('fe***@example.com');
  });
});
