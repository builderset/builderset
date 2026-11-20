using System.Security.Claims;
using System.Text.Encodings.Web;
using Builderset.Api.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Builderset.Api.Auth;

// ── Your auth here ───────────────────────────────────────────────────────────
// A stand-in so the example runs: it signs your team's requests in as the user
// whose email is in DEV_USER_EMAIL, who may publish, and leaves the public
// routes to visitors, who are signed out. Replace it with your own scheme —
// cookies, JWT bearer, OpenID Connect — whose principal carries the same
// claims, and your own rule for who may publish.
public sealed class DevAuthentication(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    AppDb db,
    IConfiguration configuration)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Dev";

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var email = configuration["DEV_USER_EMAIL"];
        if (string.IsNullOrEmpty(email) || Request.Path.StartsWithSegments("/api/public"))
            return AuthenticateResult.NoResult();

        var user = await db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == email, Context.RequestAborted);
        if (user is null) return AuthenticateResult.NoResult();

        Claim[] claims =
        [
            new(AppClaims.UserId, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Uuid.ToString()),
            new(ClaimTypes.Name, user.Name),
            new(AppClaims.CanPublish, "true"),
        ];
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, SchemeName));
        return AuthenticateResult.Success(new AuthenticationTicket(principal, SchemeName));
    }
}
// ─────────────────────────────────────────────────────────────────────────────
