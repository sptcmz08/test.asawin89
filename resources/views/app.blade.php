<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title inertia>{{ config('app.name', 'Laravel') }}</title>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600&display=swap" rel="stylesheet">

    <!-- Scripts -->
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.jsx'])
    @inertiaHead

    <style>
        body {
            font-family: 'Kanit', sans-serif;
        }

        /* Loading spinner - shows while JS bundle loads */
        #app:empty {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }

        #app:empty::after {
            content: '';
            width: 48px;
            height: 48px;
            border: 4px solid rgba(255, 255, 255, 0.1);
            border-top-color: #fbbf24;
            border-radius: 50%;
            animation: app-spinner 0.8s linear infinite;
        }

        @keyframes app-spinner {
            to { transform: rotate(360deg); }
        }
    </style>
</head>

<body class="font-sans antialiased bg-gray-950 text-white">
    @inertia
</body>

</html>