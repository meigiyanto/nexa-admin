<?php

use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SecurityController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\UserAccessController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])
    ->middleware(['web', 'throttle:login']);
Route::post('/login/two-factor', [AuthController::class, 'verifyTwoFactor'])
    ->middleware(['web', 'throttle:two-factor']);
Route::post('/forgot-password', [AuthController::class, 'sendPasswordResetLink'])
    ->middleware(['web', 'throttle:5,1']);
Route::post('/reset-password', [AuthController::class, 'resetPassword'])
    ->middleware(['web', 'throttle:5,1']);

Route::middleware(['web', 'auth:web'])->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::post('/profile', [ProfileController::class, 'update']);
    Route::put('/profile/password', [ProfileController::class, 'updatePassword'])->middleware('throttle:5,1');

    Route::get('/security/sessions', [SecurityController::class, 'sessions']);
    Route::delete('/security/sessions/{key}', [SecurityController::class, 'revokeSession'])->middleware('throttle:5,1');
    Route::post('/security/sessions/revoke-others', [SecurityController::class, 'revokeOtherSessions'])->middleware('throttle:5,1');
    Route::post('/security/two-factor/setup', [SecurityController::class, 'setupTwoFactor'])->middleware('throttle:5,1');
    Route::post('/security/two-factor/enable', [SecurityController::class, 'enableTwoFactor'])->middleware('throttle:5,1');
    Route::delete('/security/two-factor', [SecurityController::class, 'disableTwoFactor'])->middleware('throttle:5,1');
    Route::post('/security/two-factor/recovery-codes', [SecurityController::class, 'regenerateRecoveryCodes'])->middleware('throttle:5,1');

    Route::get('/settings', [SettingsController::class, 'show'])->middleware('can:settings.view');
    Route::put('/settings', [SettingsController::class, 'update'])->middleware('can:settings.update');

    Route::get('/notifications', [NotificationController::class, 'index'])->middleware('can:notifications.view');
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount'])->middleware('can:notifications.view');
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markAsRead'])->middleware('can:notifications.view');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead'])->middleware('can:notifications.view');
    Route::delete('/notifications/{notification}', [NotificationController::class, 'destroy'])->middleware('can:notifications.view');
    Route::delete('/notifications', [NotificationController::class, 'destroyAll'])->middleware('can:notifications.manage');

    Route::get('/dashboard', DashboardController::class)->middleware('can:dashboard.view');
    Route::get('/analytics', [AnalyticsController::class, 'index'])->middleware('can:analytics.view');
    Route::get('/analytics/export', [AnalyticsController::class, 'export'])->middleware('can:analytics.export');

    Route::get('/users', [UserController::class, 'index'])->middleware('can:users.view');
    Route::post('/users', [UserController::class, 'store'])->middleware('can:users.create');
    Route::get('/users/{user}', [UserController::class, 'show'])->middleware('can:users.view');
    Route::match(['put', 'patch'], '/users/{user}', [UserController::class, 'update'])->middleware('can:users.update');
    Route::delete('/users/{user}', [UserController::class, 'destroy'])->middleware('can:users.delete');

    Route::get('/users/{user}/access', [UserAccessController::class, 'show']);
    Route::put('/users/{user}/roles', [UserAccessController::class, 'assignRoles'])->middleware('can:users.assign-roles');
    Route::put('/users/{user}/permissions', [UserAccessController::class, 'assignPermissions'])->middleware('can:users.assign-permissions');

    Route::get('/roles', [RoleController::class, 'index'])->middleware('can:roles.view');
    Route::post('/roles', [RoleController::class, 'store'])->middleware('can:roles.create');
    Route::get('/roles/{role}', [RoleController::class, 'show'])->middleware('can:roles.view');
    Route::put('/roles/{role}', [RoleController::class, 'update'])->middleware('can:roles.update');
    Route::delete('/roles/{role}', [RoleController::class, 'destroy'])->middleware('can:roles.delete');

    Route::get('/permissions', [PermissionController::class, 'index'])->middleware('can:permissions.view');
});
