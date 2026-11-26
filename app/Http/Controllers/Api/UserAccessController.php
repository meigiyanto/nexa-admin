<?php

namespace App\\Http\\Controllers\\Api;

use App\\Http\\Controllers\\Controller;
use App\\Models\\User;
use Illuminate\\Http\\JsonResponse;
use Illuminate\\Http\\Request;
use Illuminate\\Validation\\Rule;
use Spatie\\Permission\\Models\\Permission;
use Spatie\\Permission\\Models\\Role;

class UserAccessController extends Controller
{
    public function show(User $user): JsonResponse
    {
        return response()->json([
            'user' => $user->only(['id', 'name', 'email', 'status']),
            'roles' => $user->getRoleNames()->values(),
            'permissions' => $user->getAllPermissions()->pluck('name')->values(),
            'direct_permissions' => $user->getDirectPermissions()->pluck('name')->values(),
        ]);
    }

    public function assignRoles(Request $request, User $user): JsonResponse
    {
        abort_if($request->user()->is($user), 403, 'You cannot change your own roles.');

        $validated = $request->validate([
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['required', 'string', 'distinct', Rule::exists('roles', 'name')->where('guard_name', 'web')],
        ]);

        $roles = Role::query()
            ->where('guard_name', 'web')
            ->whereIn('name', $validated['roles'])
            ->get();

        if ($roles->count() !== count($validated['roles'])) {
            return response()->json(['message' => 'One or more roles are invalid.'], 422);
        }

        if ($roles->contains('name', 'admin') && ! $request->user()->can('users.assign-admin-role')) {
            abort(403, 'You cannot assign the admin role.');
        }

        $willRemainAdmin = $roles->contains('name', 'admin');
        if ($user->hasRole('admin') && ! $willRemainAdmin && $user->status === 'active') {
            abort_if(
                User::role('admin')->where('status', 'active')->count() <= 1,
                422,
                'The last active administrator cannot lose the admin role.'
            );
        }

        $user->syncRoles($roles);

        return $this->show($user);
    }

    public function assignPermissions(Request $request, User $user): JsonResponse
    {
        abort_if($request->user()->is($user), 403, 'You cannot change your own permissions.');

        $validated = $request->validate([
            'permissions' => ['present', 'array'],
            'permissions.*' => ['required', 'string', 'distinct', Rule::exists('permissions', 'name')->where('guard_name', 'web')],
        ]);

        if (in_array('users.assign-admin-role', $validated['permissions'], true) && ! $request->user()->can('users.assign-admin-role')) {
            abort(403, 'You cannot grant administrator assignment permission.');
        }

        $permissions = Permission::query()
            ->where('guard_name', 'web')
            ->whereIn('name', $validated['permissions'])
            ->get();

        $user->syncPermissions($permissions);

        return $this->show($user);
    }
}
