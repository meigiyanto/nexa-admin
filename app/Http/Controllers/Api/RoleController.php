<?php

namespace App\\Http\\Controllers\\Api;

use App\\Http\\Controllers\\Controller;
use Illuminate\\Http\\JsonResponse;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\DB;
use Illuminate\\Validation\\Rule;
use Spatie\\Permission\\Models\\Permission;
use Spatie\\Permission\\Models\\Role;

class RoleController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            Role::query()
                ->with('permissions:id,name')
                ->where('guard_name', 'web')
                ->orderBy('name')
                ->paginate(100)
        );
    }

    public function show(Role $role): JsonResponse
    {
        abort_unless($role->guard_name === 'web', 404);

        return response()->json($role->load('permissions:id,name'));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9_-]+$/', Rule::unique('roles')->where('guard_name', 'web')],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', 'distinct', Rule::exists('permissions', 'name')->where('guard_name', 'web')],
        ]);

        $this->ensureCanGrantPermissions($request, $validated['permissions'] ?? []);

        $role = DB::transaction(function () use ($validated): Role {
            $role = Role::create([
                'name' => $validated['name'],
                'guard_name' => 'web',
            ]);

            $permissions = Permission::query()
                ->where('guard_name', 'web')
                ->whereIn('name', $validated['permissions'] ?? [])
                ->get();

            $role->syncPermissions($permissions);

            return $role;
        });

        return response()->json($role->load('permissions:id,name'), 201);
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        abort_unless($role->guard_name === 'web', 404);
        abort_if($role->name === 'admin', 403, 'The admin role is protected.');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9_-]+$/', Rule::unique('roles')->where('guard_name', 'web')->ignore($role->id)],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', 'distinct', Rule::exists('permissions', 'name')->where('guard_name', 'web')],
        ]);

        abort_if(
            in_array($role->name, ['admin', 'editor', 'viewer'], true) && $validated['name'] !== $role->name,
            403,
            'Built-in role names cannot be changed.'
        );

        if (array_key_exists('permissions', $validated)) {
            $this->ensureCanGrantPermissions($request, $validated['permissions']);
        }

        DB::transaction(function () use ($role, $validated): void {
            $role->update(['name' => $validated['name']]);

            if (array_key_exists('permissions', $validated)) {
                $permissions = Permission::query()
                    ->where('guard_name', 'web')
                    ->whereIn('name', $validated['permissions'])
                    ->get();

                $role->syncPermissions($permissions);
            }
        });

        return response()->json($role->fresh()->load('permissions:id,name'));
    }

    private function ensureCanGrantPermissions(Request $request, array $permissionNames): void
    {
        $actorPermissions = $request->user()->getAllPermissions()->pluck('name');

        abort_if(
            collect($permissionNames)->diff($actorPermissions)->isNotEmpty(),
            403,
            'You cannot grant permissions that you do not have.'
        );
    }

    public function destroy(Role $role): JsonResponse
    {
        abort_unless($role->guard_name === 'web', 404);
        abort_if(in_array($role->name, ['admin', 'editor', 'viewer'], true), 403, 'Built-in roles cannot be deleted.');

        $isAssigned = DB::table('model_has_roles')
            ->where('role_id', $role->id)
            ->exists();

        if ($isAssigned) {
            return response()->json([
                'message' => 'This role is assigned to users and cannot be deleted.',
            ], 422);
        }

        $role->delete();

        return response()->json(['message' => 'Role deleted successfully.']);
    }
}
