<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * ── Your auth here ──────────────────────────────────────────────────────────
 * A stand-in so the example runs: it signs your team's requests in as the
 * user whose email is BUILDERSET_DEV_USER, outside production only, and
 * answers 401 to anyone else. routes/api.php puts it in front of your team's
 * routes only, so a visitor on a public route is never signed in by it.
 * Replace it with your guard there: `auth:sanctum`, or `auth` for a session.
 */
final class SignInStandIn
{
    public function handle(Request $request, Closure $next): Response
    {
        $email = config('builderset.dev_user');
        $user = $email !== null && ! app()->isProduction()
            ? User::query()->firstWhere('email', $email)
            : null;
        if ($user === null) {
            throw new AuthenticationException('Sign in to edit.');
        }
        Auth::setUser($user);

        return $next($request);
    }
}
