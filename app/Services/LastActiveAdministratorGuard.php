<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Collection;

class LastActiveAdministratorGuard
{
    /**
     * Lock active administrator rows in a consistent order.
     *
     * Call this inside a transaction before locking the target user.
     */
    public function lockActiveAdminIds(): Collection
    {
        return collect(
            User::role('admin')
                ->where('status', 'active')
                ->orderBy('users.id')
                ->lockForUpdate()
                ->get(['users.id'])
                ->modelKeys(),
        );
    }

    public function isLastActiveAdmin(User $user, Collection $activeAdminIds): bool
    {
        return $activeAdminIds->count() === 1 &&
            $activeAdminIds->contains($user->getKey());
    }
}
