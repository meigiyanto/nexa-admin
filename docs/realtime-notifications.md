# Realtime notifications

Nexa Admin stores each system notification in the database and broadcasts it to the recipient's private `App.Models.User.{id}` channel. The browser subscribes only to the authenticated user's channel through Laravel Echo.

## Install the Reverb broadcasting stack

After checking out this branch, install the Laravel broadcasting stack:

```bash
composer require laravel/reverb
php artisan reverb:install
npm install --save-dev laravel-echo pusher-js
```

The Laravel installer adds the Reverb server package, Laravel Echo, Pusher JS, broadcasting configuration, and Reverb environment variables. Keep the generated `REVERB_APP_ID`, `REVERB_APP_KEY`, and `REVERB_APP_SECRET` values private. The corresponding `VITE_REVERB_APP_KEY`, `VITE_REVERB_HOST`, `VITE_REVERB_PORT`, and `VITE_REVERB_SCHEME` values must match the Reverb application configuration.

The application's private channel authorization is defined in `routes/channels.php`; only the user whose ID matches the channel can subscribe.

## Run the application

Run the Laravel app, Vite, Reverb, and a queue worker in separate terminal sessions:

```bash
php artisan serve --host=127.0.0.1
npm run dev
php artisan reverb:start
php artisan queue:work
```

For production, run Reverb and the queue worker under a process supervisor and configure HTTPS/WSS and the allowed origins in `config/reverb.php`.

## Fallback and persistence

The database remains the source of truth. If a browser is disconnected, it retrieves missed notifications from `GET /api/notifications` when the notification panel is opened. Realtime delivery does not replace database history.
