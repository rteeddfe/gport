import { SettingsService } from './settings.service.js';

const ROW = {
  id: 1,
  siteName: 'GPort',
  supportEmail: 'support@gport.ru',
  logoUrl: '/logo2.png',
  socials: [{ label: 'Telegram', url: 'https://t.me/gport' }],
  seoTitle: 'GPort',
  seoDescription: 'desc',
  ogImageUrl: null,
  faviconUrl: '/icons/icon.svg',
  robotsTxt: 'User-agent: *',
  manifestName: 'GPort',
  manifestShortName: 'GPort',
  manifestThemeColor: '#0B0D12',
  manifestBackgroundColor: '#0B0D12',
  manifestIcon192Url: '/icons/icon-192.png',
  manifestIcon512Url: '/icons/icon-512.png',
  metrikaCounterId: '',
  metrikaWebvisor: false,
  yandexVerification: '',
  updatedAt: new Date(),
};

describe('SettingsService', () => {
  it('creates the singleton row on first read (self-healing)', async () => {
    const created: unknown[] = [];
    const service = new SettingsService({
      siteSettings: {
        findUnique: async () => null,
        create: async (args: unknown) => {
          created.push(args);
          return ROW;
        },
      },
    } as never);

    const result = await service.find();
    expect(created).toHaveLength(1);
    expect(result.socials).toEqual([{ label: 'Telegram', url: 'https://t.me/gport' }]);
  });

  it('upserts on update and returns socials as a typed array', async () => {
    const upsertArgs: Array<Record<string, unknown>> = [];
    const service = new SettingsService({
      siteSettings: {
        upsert: async (args: Record<string, unknown>) => {
          upsertArgs.push(args);
          return ROW;
        },
      },
    } as never);

    const result = await service.update({
      siteName: 'GPort',
      supportEmail: 'support@gport.ru',
      logoUrl: '/logo2.png',
      socials: [{ label: 'VK', url: 'https://vk.com/gport' }],
      seoTitle: 'GPort',
      seoDescription: 'desc',
      faviconUrl: '/icons/icon.svg',
      robotsTxt: 'User-agent: *',
      manifestName: 'GPort',
      manifestShortName: 'GPort',
      manifestThemeColor: '#0B0D12',
      manifestBackgroundColor: '#0B0D12',
      manifestIcon192Url: '/icons/icon-192.png',
      manifestIcon512Url: '/icons/icon-512.png',
      metrikaCounterId: '12345678',
      metrikaWebvisor: true,
      yandexVerification: '<meta name="yandex-verification" content="abc" />',
    });

    expect(upsertArgs[0]?.where).toEqual({ id: 1 });
    const data = upsertArgs[0]?.update as Record<string, unknown>;
    expect(data.metrikaCounterId).toBe('12345678');
    expect(data.metrikaWebvisor).toBe(true);
    expect(data.yandexVerification).toContain('abc');
    expect(result.socials).toHaveLength(1);
  });
});
