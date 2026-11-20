<?php

return [
    // The Builderset checker, on a port only this app can reach.
    'checker' => [
        'url' => env('BUILDERSET_CHECKER_URL', 'http://127.0.0.1:4319'),
        // Seconds. A document is checked in milliseconds: a slow answer is a sick checker.
        'timeout' => (float) env('BUILDERSET_CHECKER_TIMEOUT', 2),
    ],

    // Your email types' keys: the same as the keys of EMAIL_TYPES in the checker.
    'email_types' => [],

    // Whether a popup submission keeps the visitor's IP address. Off unless your privacy rules allow it.
    'popup_store_ip' => (bool) env('BUILDERSET_POPUP_STORE_IP', false),

    // The stand-in sign-in's user, outside production. See SignInStandIn.
    'dev_user' => env('BUILDERSET_DEV_USER'),
];
