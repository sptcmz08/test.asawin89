<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Trust all proxies (Cloudflare) so Laravel sees HTTPS correctly
        $middleware->trustProxies(at: '*');

        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \App\Http\Middleware\CaptureReferralCode::class,
            \App\Http\Middleware\SecurityHeaders::class,
            \App\Http\Middleware\TrackUserActivity::class,
        ]);

        $middleware->alias([
            'admin' => \App\Http\Middleware\AdminMiddleware::class,
        ]);

        // Exclude routes from CSRF verification
        // หมายเหตุ: เฉพาะ webhook ภายนอกเท่านั้นที่ควร exempt CSRF
        $middleware->validateCsrfTokens(except: [
            'webhook/line',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
