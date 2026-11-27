<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\TwoFactorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->status !== 'active') {
            throw ValidationException::withMessages([
                'email' => ['Your account is inactive.'],
            ]);
        }

        if ($user->two_factor_confirmed_at && $user->two_factor_secret) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
            $request->session()->regenerate();
            $request->session()->put([
                'two_factor_login_user_id' => $user->id,
                'two_factor_login_remember' => $request->boolean('remember'),
                'two_factor_login_expires_at' => now()->addMinutes(5)->timestamp,
            ]);

            return response()->json([
                'requires_two_factor' => true,
                'message' => 'Enter the code from your authenticator app.',
            ]);
        }

        Auth::guard('web')->login($user, $request->boolean('remember'));
        $request->session()->regenerate();

        return $this->userResponse($user);
    }

    public function verifyTwoFactor(Request $request, TwoFactorService $twoFactor): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'min:6', 'max:32'],
        ]);
        $userId = $request->session()->get('two_factor_login_user_id');
        $expiresAt = $request->session()->get('two_factor_login_expires_at');

        abort_unless($userId && $expiresAt && now()->timestamp <= $expiresAt, 422,
            'The two-factor login challenge has expired. Please sign in again.');

        $user = User::find($userId);

        abort_unless($user && $user->status === 'active' && $user->two_factor_confirmed_at, 422,
            'The two-factor login challenge is no longer valid.');

        $code = trim($validated['code']);
        $valid = preg_match('/^\d{6}$/', $code)
            ? $twoFactor->verifyCode($user->two_factor_secret, $code)
            : $twoFactor->consumeRecoveryCode($user, $code);

        if (! $valid) {
            throw ValidationException::withMessages([
                'code' => ['The verification code is invalid.'],
            ]);
        }

        $remember = (bool) $request->session()->get('two_factor_login_remember');
        $request->session()->forget([
            'two_factor_login_user_id',
            'two_factor_login_remember',
            'two_factor_login_expires_at',
        ]);

        Auth::guard('web')->login($user, $remember);
        $request->session()->regenerate();

        return $this->userResponse($user);
    }

    public function user(Request $request): JsonResponse
    {
        return $this->userResponse($request->user('web'));
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    private function userResponse(User $user): JsonResponse
    {
        return response()->json([
            'user' => [
                ...$user->only(['id', 'name', 'email', 'status']),
                'profile_photo_url' => $user->profile_photo_url,
                'two_factor_enabled' => (bool) $user->two_factor_confirmed_at,
            ],
            'roles' => $user->getRoleNames()->values(),
            'permissions' => $user->getAllPermissions()->pluck('name')->values(),
        ]);
    }
}
