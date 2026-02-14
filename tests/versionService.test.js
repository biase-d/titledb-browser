
import { describe, it, expect, vi } from 'vitest';
import * as versionService from '../src/lib/services/versionService.js';

vi.mock('$app/environment', () => ({
    version: '1.0.0',
    browser: false,
    dev: true
}));

describe('Version Service', () => {
    it('should return valid version info', () => {
        const info = versionService.getVersionInfo();
        expect(info).toHaveProperty('version');
        expect(info).toHaveProperty('features');
        // expect(info).toHaveProperty('environment'); // Removed as not in service
    });

    it('should check feature flags', () => {
        expect(versionService.isFeatureEnabled('newContributionFlow')).toBe(true);
        expect(versionService.isFeatureEnabled('gamification')).toBe(false);
        expect(versionService.isFeatureEnabled('cloudStorage')).toBe(true);
        expect(versionService.isFeatureEnabled('nonExistentFeature')).toBe(false);
    });
});
