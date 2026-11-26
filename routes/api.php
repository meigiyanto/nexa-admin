<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\UserAccessController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])
    ->middleware(['web', 'throttle:login']);

Route::middleware(['web', 'auth:sanctum'])->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/dashboard', DashboardController::class)
        ->middleware('can:dashboard.view');

    // User management
    Route::get('/users', [UserController::class, 'index'])
        ->middleware('can:users.view');

    Route::post('/users', [UserController::class, 'store'])
        ->middleware('can:users.create');

    Route::get('/users/{user}', [UserController::class, 'show'])
        ->middleware('can:users.view');

    Route::match(['put', 'patch'], '/users/{user}', [UserController::class, 'update'])
        ->middleware('can:users.update');

    Route::delete('/users/{user}', [UserController::class, 'destroy'])
        ->middleware('can:users.delete');

    // User access management
    Route::get('/users/{user}/access', [UserAccessController::class, 'show']);

    Route::put('/users/{user}/roles', [UserAccessController::class, 'assignRoles'])
        ->middleware('can:users.assign-roles');

    Route::put('/users/{user}/permissions', [UserAccessController::class, 'assignPermissions'])
        ->middleware('can:users.assign-permissions');

    // Role management
    Route::get('/roles', [RoleController::class, 'index'])
        ->middleware('can:roles.view');

    Route::post('/roles', [RoleController::class, 'store'])
        ->middleware('can:roles.create');

    Route::get('/roles/{role}', [RoleController::class, 'show'])
        ->middleware('can:roles.view');

    Route::put('/roles/{role}', [RoleController::class, 'update'])
        ->middleware('can:roles.update');

    Route::delete('/roles/{role}', [RoleController::class, 'destroy'])
        ->middleware('can:roles.delete');

    // Permission catalog
    Route::get('/permissions', [PermissionController::class, 'index'])
        ->middleware('can:permissions.view');
});
