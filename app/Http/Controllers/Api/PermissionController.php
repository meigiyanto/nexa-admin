<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Spatie\Permission\Models\Permission;

class PermissionController extends Controller
{
    public function index()
    {
        $permissions = Permission::query()
            ->where('guard_name', 'web')
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json([
            'data' => $permissions,
            'groups' => $permissions->groupBy(
                fn ($permission) => explode('.', $permission->name)[0]
            ),
        ]);
    }
}
