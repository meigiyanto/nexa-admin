<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::view('/{path?}', 'app')->where('path', '^(?!api|sanctum|up).*$')->name('dashboard');
