import {
  serializeExpiredCookie,
  serializeSessionCookie,
} from './cookies.js';

describe('cookie serializers', () => {
  it('defaults to SameSite=Lax without Secure', () => {
    const cookie = serializeSessionCookie('access_token', 't', 900);
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).not.toContain('Secure');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Max-Age=900');
  });

  it('marks explicit secure cookies', () => {
    const cookie = serializeSessionCookie('access_token', 't', 900, {
      secure: true,
    });
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Secure');
  });

  it('SameSite=None always rides with Secure (browser requirement)', () => {
    const session = serializeSessionCookie('access_token', 't', 900, {
      sameSite: 'None',
    });
    expect(session).toContain('SameSite=None; Secure');
    const expired = serializeExpiredCookie('access_token', 'None');
    expect(expired).toContain('SameSite=None; Secure');
    expect(expired).toContain('Max-Age=0');
  });

  it('encodes the cookie value', () => {
    const cookie = serializeSessionCookie('cart_token', 'a/b+c', 60);
    expect(cookie).toContain('cart_token=a%2Fb%2Bc;');
  });
});
