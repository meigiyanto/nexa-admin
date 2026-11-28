<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class TwoFactorService
{
    private const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    public function generateSecret(): string
    {
        return $this->base32Encode(random_bytes(20));
    }

    public function provisioningUri(User $user, string $secret): string
    {
        $label = rawurlencode('Nexa Admin:'.$user->email);

        return 'otpauth://totp/'.$label.'?'.http_build_query([
            'secret' => $secret,
            'issuer' => 'Nexa Admin',
            'algorithm' => 'SHA1',
            'digits' => 6,
            'period' => 30,
        ]);
    }

    public function verifyCode(string $secret, string $code): bool
    {
        return $this->counterForCode($secret, $code) !== null;
    }

    public function counterForCode(string $secret, string $code): ?int
    {
        return $this->matchingCounter($secret, $code);
    }

    public function consumeTotpCode(User $user, string $code): bool
    {
        return DB::transaction(function () use ($user, $code): bool {
            $lockedUser = User::query()->lockForUpdate()->find($user->getKey());

            if (! $lockedUser || ! $lockedUser->two_factor_secret || ! $lockedUser->two_factor_confirmed_at) {
                return false;
            }

            $counter = $this->matchingCounter($lockedUser->two_factor_secret, $code);

            if ($counter === null || $counter <= (int) ($lockedUser->two_factor_last_used_at ?? -1)) {
                return false;
            }

            $lockedUser->forceFill(['two_factor_last_used_at' => $counter])->save();

            return true;
        });
    }

    public function generateRecoveryCodes(): array
    {
        return array_map(
            fn () => strtoupper(bin2hex(random_bytes(4))).'-'.strtoupper(bin2hex(random_bytes(4))),
            range(1, 10),
        );
    }

    public function hashRecoveryCodes(array $codes): array
    {
        return array_map(fn (string $code) => Hash::make($code), $codes);
    }

    public function consumeRecoveryCode(User $user, string $code): bool
    {
        return DB::transaction(function () use ($user, $code): bool {
            $lockedUser = User::query()->lockForUpdate()->find($user->getKey());

            if (! $lockedUser) {
                return false;
            }

            $codes = $lockedUser->two_factor_recovery_codes ?? [];

            foreach ($codes as $index => $hash) {
                if (Hash::check(strtoupper(trim($code)), $hash)) {
                    unset($codes[$index]);
                    $lockedUser->forceFill(['two_factor_recovery_codes' => array_values($codes)])->save();

                    return true;
                }
            }

            return false;
        });
    }

    private function matchingCounter(string $secret, string $code): ?int
    {
        $code = preg_replace('/\\s+/', '', $code);

        if (! preg_match('/^\\d{6}$/', $code)) {
            return null;
        }

        $key = $this->base32Decode($secret);
        $counter = intdiv(time(), 30);
        $matched = null;

        for ($offset = -1; $offset <= 1; $offset++) {
            $value = $counter + $offset;
            if ($value < 0) {
                continue;
            }

            $message = pack('N2', 0, $value);
            $hash = hash_hmac('sha1', $message, $key, true);
            $position = ord($hash[19]) & 0x0F;
            $binary = ((ord($hash[$position]) & 0x7F) << 24)
                | ((ord($hash[$position + 1]) & 0xFF) << 16)
                | ((ord($hash[$position + 2]) & 0xFF) << 8)
                | (ord($hash[$position + 3]) & 0xFF);
            $expected = str_pad((string) ($binary % 1000000), 6, '0', STR_PAD_LEFT);

            if (hash_equals($expected, $code) && ($matched === null || $value > $matched)) {
                $matched = $value;
            }
        }

        return $matched;
    }

    private function base32Encode(string $value): string
    {
        $binary = '';
        foreach (str_split($value) as $character) {
            $binary .= str_pad(decbin(ord($character)), 8, '0', STR_PAD_LEFT);
        }

        $encoded = '';
        foreach (str_split($binary, 5) as $chunk) {
            if (strlen($chunk) < 5) {
                $chunk = str_pad($chunk, 5, '0');
            }
            $encoded .= self::BASE32[bindec($chunk)];
        }

        return $encoded;
    }

    private function base32Decode(string $value): string
    {
        $value = strtoupper(rtrim($value, '='));
        $binary = '';

        foreach (str_split($value) as $character) {
            $position = strpos(self::BASE32, $character);
            if ($position === false) {
                throw new \InvalidArgumentException('Invalid TOTP secret.');
            }
            $binary .= str_pad(decbin($position), 5, '0', STR_PAD_LEFT);
        }

        $decoded = '';
        foreach (str_split($binary, 8) as $chunk) {
            if (strlen($chunk) === 8) {
                $decoded .= chr(bindec($chunk));
            }
        }

        return $decoded;
    }
}
