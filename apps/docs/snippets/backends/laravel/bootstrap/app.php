<?php

use App\Builderset\Issue;
use App\Exceptions\ApiError;
use App\Http\Middleware\SignInStandIn;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias(['sign-in-stand-in' => SignInStandIn::class]);
    })
    // The one place an exception becomes an answer. Controllers and services
    // throw; none of them builds an error response of its own.
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => $request->is('api/*'));

        $exceptions->render(fn (ApiError $error) => response()->json(
            ['message' => $error->getMessage(), ...$error->body],
            $error->status,
        ));

        // A form request's refusal, in the shape the editor reads: one issue per field.
        $exceptions->render(fn (ValidationException $invalid) => response()->json([
            'message' => 'Refused: see the issues.',
            'issues' => collect($invalid->errors())
                ->map(fn (array $messages, string $field) => Issue::error(
                    "{$field}.invalid", path: $field, params: ['message' => $messages[0]],
                ))
                ->values(),
        ], 422));

        // A restore whose address another live row took meanwhile.
        $exceptions->render(fn (UniqueConstraintViolationException $taken) => response()->json(
            ['message' => 'Another live row has its address now.'],
            409,
        ));

        // No such row, or a deleted one: the same answer, which names no model.
        $exceptions->render(fn (NotFoundHttpException $missing, Request $request) => $request->is('api/*')
            ? response()->json(['message' => 'There is no such thing here.'], 404)
            : null);
    })->create();
