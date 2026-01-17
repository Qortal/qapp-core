import { describe, it, expect } from 'vitest';
import { createAvatarLink, createQortalLink } from './qortal';

describe('qortal utility functions', () => {
  describe('createAvatarLink', () => {
    it('should create avatar link for valid name', () => {
      const result = createAvatarLink('testuser');
      expect(result).toBe('/arbitrary/THUMBNAIL/testuser/qortal_avatar?async=true');
    });

    it('should encode special characters in name', () => {
      const result = createAvatarLink('test user');
      expect(result).toBe('/arbitrary/THUMBNAIL/test%20user/qortal_avatar?async=true');
    });

    it('should encode unicode characters', () => {
      const result = createAvatarLink('user@name');
      expect(result).toBe('/arbitrary/THUMBNAIL/user%40name/qortal_avatar?async=true');
    });

    it('should return empty string for empty name', () => {
      expect(createAvatarLink('')).toBe('');
    });

    it('should return empty string for whitespace-only name', () => {
      expect(createAvatarLink('   ')).toBe('');
    });

    it('should return empty string for null/undefined name', () => {
      expect(createAvatarLink(null as unknown as string)).toBe('');
      expect(createAvatarLink(undefined as unknown as string)).toBe('');
    });

    it('should handle name with leading/trailing spaces', () => {
      const result = createAvatarLink('  testuser  ');
      expect(result).toBe('/arbitrary/THUMBNAIL/%20%20testuser%20%20/qortal_avatar?async=true');
    });
  });

  describe('createQortalLink', () => {
    describe('APP type', () => {
      it('should create basic APP link without path', () => {
        const result = createQortalLink('APP', 'MyApp', '');
        expect(result).toBe('qortal://APP/MyApp');
      });

      it('should create APP link with path starting with slash', () => {
        const result = createQortalLink('APP', 'MyApp', '/page/1');
        expect(result).toBe('qortal://APP/MyApp/page/1');
      });

      it('should create APP link with path not starting with slash', () => {
        const result = createQortalLink('APP', 'MyApp', 'page/1');
        expect(result).toBe('qortal://APP/MyApp/page/1');
      });

      it('should remove trailing slash from path', () => {
        const result = createQortalLink('APP', 'MyApp', '/page/');
        expect(result).toBe('qortal://APP/MyApp/page');
      });

      it('should encode special characters in app name', () => {
        const result = createQortalLink('APP', 'My App', '/page');
        expect(result).toBe('qortal://APP/My%20App/page');
      });
    });

    describe('WEBSITE type', () => {
      it('should create basic WEBSITE link without path', () => {
        const result = createQortalLink('WEBSITE', 'MySite', '');
        expect(result).toBe('qortal://WEBSITE/MySite');
      });

      it('should create WEBSITE link with path', () => {
        const result = createQortalLink('WEBSITE', 'MySite', '/about');
        expect(result).toBe('qortal://WEBSITE/MySite/about');
      });

      it('should handle complex paths', () => {
        const result = createQortalLink('WEBSITE', 'MySite', '/blog/posts/123');
        expect(result).toBe('qortal://WEBSITE/MySite/blog/posts/123');
      });
    });

    describe('edge cases', () => {
      it('should handle single slash path', () => {
        const result = createQortalLink('APP', 'MyApp', '/');
        expect(result).toBe('qortal://APP/MyApp');
      });

      it('should handle path with query parameters', () => {
        const result = createQortalLink('APP', 'MyApp', '/page?id=1');
        expect(result).toBe('qortal://APP/MyApp/page?id=1');
      });

      it('should handle path with hash', () => {
        const result = createQortalLink('APP', 'MyApp', '/page#section');
        expect(result).toBe('qortal://APP/MyApp/page#section');
      });
    });
  });
});
