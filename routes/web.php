<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::view('/forgot-password', 'app')->name('password.request');
Route::view('/reset-password/{token}', 'app')->name('password.reset');

Route::view('/{path?}', 'app')->where('path', '^(?!api|sanctum|up).*$')->name('dashboard');
