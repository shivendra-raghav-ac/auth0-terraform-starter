import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onExecutePostLogin } from '../post-login-action';

describe('Post Login Action - Enforce Verified Email', () => {
    let mockApi: any;
    let mockEvent: any;

    beforeEach(() => {
        mockApi = {
            access: {
                deny: vi.fn(),
            },
        };

        mockEvent = {
            user: {
                email: 'test@example.com',
                email_verified: true,
            },
        };
    });

    it('should allow login when email is verified', async () => {
        await onExecutePostLogin(mockEvent, mockApi);

        expect(mockApi.access.deny).not.toHaveBeenCalled();
    });

    it('should deny login when email is not verified', async () => {
        mockEvent.user.email_verified = false;

        await onExecutePostLogin(mockEvent, mockApi);

        expect(mockApi.access.deny).toHaveBeenCalledWith(
            'Please verify your email address to continue.'
        );
    });

    it('should deny login when email_verified is undefined', async () => {
        delete mockEvent.user.email_verified;

        await onExecutePostLogin(mockEvent, mockApi);

        expect(mockApi.access.deny).toHaveBeenCalledWith(
            'Please verify your email address to continue.'
        );
    });

    it('should handle missing user object gracefully', async () => {
        mockEvent.user = undefined;

        await onExecutePostLogin(mockEvent, mockApi);

        expect(mockApi.access.deny).toHaveBeenCalledWith(
            'Please verify your email address to continue.'
        );
    });

    it('should deny when email_verified is false (explicit)', async () => {
        mockEvent.user.email_verified = false;

        await onExecutePostLogin(mockEvent, mockApi);

        expect(mockApi.access.deny).toHaveBeenCalledTimes(1);
    });
});